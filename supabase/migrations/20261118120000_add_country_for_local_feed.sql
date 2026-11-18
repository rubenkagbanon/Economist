-- Pays (code ISO 3166-1 alpha-2, ex. 'CI', 'FR') pour personnaliser « À la une ».
-- Donnée CACHÉE : jamais lisible par les visiteurs ni par les membres, seulement
-- par l'admin (tableau de bord Supabase ou fonction admin_country_overview).
--
--   profiles.country          : pays du membre (position GPS, sinon fuseau horaire)
--   article_countries.country : pays d'un article (= pays de son auteur à la publication)
--   local_article_ids(pays)   : ids des articles publiés de ce pays, sans révéler le pays

-- ── 1. Pays des membres ─────────────────────────────────────
alter table public.profiles add column if not exists country text;
alter table public.profiles drop constraint if exists profiles_country_format;
alter table public.profiles add constraint profiles_country_format
  check (country is null or country ~ '^[A-Z]{2}$');
-- Lecture publique inchangée : la liste de colonnes lisibles n'inclut PAS country
revoke select on public.profiles from anon, authenticated;
grant select (id, first, last, joined, avatar, bio, level) on public.profiles to anon, authenticated;

-- ── 2. Pays des articles (table séparée, aucun accès client) ──
create table if not exists public.article_countries (
  article_id bigint primary key references public.articles(id) on delete cascade,
  country    text not null check (country ~ '^[A-Z]{2}$'),
  updated_at timestamptz not null default now()
);
alter table public.article_countries enable row level security;
revoke all on public.article_countries from anon, authenticated;
grant select, insert, update, delete on public.article_countries to authenticated;
drop policy if exists "article_countries_admin_all" on public.article_countries;
create policy "article_countries_admin_all" on public.article_countries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- À la création d'un article : on reprend le pays de son auteur
create or replace function public.set_article_country()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_country text;
begin
  select p.country into v_country from public.profiles p where p.id = new.owner_id;
  if v_country is not null then
    insert into public.article_countries (article_id, country)
    values (new.id, v_country)
    on conflict (article_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.set_article_country() from public, anon, authenticated;
drop trigger if exists articles_set_country on public.articles;
create trigger articles_set_country after insert on public.articles
  for each row execute function public.set_article_country();

-- Quand le pays d'un membre est connu pour la 1re fois : ses articles sans pays le reçoivent
create or replace function public.fill_owner_article_countries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.country is not null and new.country is distinct from old.country then
    insert into public.article_countries (article_id, country)
    select a.id, new.country from public.articles a where a.owner_id = new.id
    on conflict (article_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.fill_owner_article_countries() from public, anon, authenticated;
drop trigger if exists profiles_fill_article_countries on public.profiles;
create trigger profiles_fill_article_countries after update of country on public.profiles
  for each row execute function public.fill_owner_article_countries();

-- ── 3. Feed : ids des articles du pays du lecteur (le pays n'est jamais renvoyé) ──
create or replace function public.local_article_ids(p_country text)
returns setof bigint
language sql
stable
security definer
set search_path = public
as $$
  select ac.article_id
  from public.article_countries ac
  join public.articles a on a.id = ac.article_id
  where ac.country = upper(p_country)
    and (a.status = 'published' or a.status is null);
$$;
revoke execute on function public.local_article_ids(text) from public;
grant execute on function public.local_article_ids(text) to anon, authenticated;

-- ── 4. Vue admin : pays des membres et des articles ─────────
create or replace function public.admin_country_overview()
returns table (kind text, id text, label text, country text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;
  return query
    select 'membre'::text, p.id::text, trim(coalesce(p.first,'') || ' ' || coalesce(p.last,'')), p.country
      from public.profiles p
    union all
    select 'article'::text, a.id::text, a.title, ac.country
      from public.articles a left join public.article_countries ac on ac.article_id = a.id;
end;
$$;
revoke execute on function public.admin_country_overview() from public, anon;
grant execute on function public.admin_country_overview() to authenticated;

-- ── 5. Localisation des visiteurs (statistiques : où se trouvent les lecteurs) ──
-- Une ligne par navigateur (clé anonyme), reliée au compte si le visiteur est
-- connecté. Pays / région / ville + coordonnées GPS exactes (si le visiteur a accepté).
-- Écriture uniquement via record_visitor_location ; lecture réservée à l'admin.
create table if not exists public.visitor_locations (
  visitor_key text primary key check (char_length(visitor_key) between 8 and 64),
  user_id     uuid references auth.users(id) on delete set null,
  country     text check (country is null or country ~ '^[A-Z]{2}$'),
  region      text check (region is null or char_length(region) <= 100),
  city        text check (city is null or char_length(city) <= 100),
  latitude    double precision check (latitude is null or latitude between -90 and 90),
  longitude   double precision check (longitude is null or longitude between -180 and 180),
  accuracy_m  real check (accuracy_m is null or accuracy_m >= 0),
  source     text not null default 'gps' check (source in ('gps','timezone')),
  first_seen  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists visitor_locations_country_idx on public.visitor_locations (country);
alter table public.visitor_locations enable row level security;
revoke all on public.visitor_locations from anon, authenticated;
grant select on public.visitor_locations to authenticated;
drop policy if exists "visitor_locations_admin_read" on public.visitor_locations;
create policy "visitor_locations_admin_read" on public.visitor_locations
  for select to authenticated using (public.is_admin());

drop function if exists public.record_visitor_location(text, text, text, text, text);
create or replace function public.record_visitor_location(
  p_visitor_key text, p_country text, p_region text default null,
  p_city text default null, p_source text default 'gps',
  p_latitude double precision default null, p_longitude double precision default null,
  p_accuracy real default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_country text := upper(nullif(trim(p_country), ''));
begin
  if p_visitor_key is null or char_length(p_visitor_key) not between 8 and 64 then return; end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then return; end if;
  if p_source not in ('gps','timezone') then return; end if;
  if p_latitude is not null and (p_latitude not between -90 and 90
     or p_longitude is null or p_longitude not between -180 and 180) then return; end if;
  insert into public.visitor_locations as v
    (visitor_key, user_id, country, region, city, latitude, longitude, accuracy_m, source)
  values (p_visitor_key, auth.uid(), v_country,
          left(nullif(trim(p_region), ''), 100), left(nullif(trim(p_city), ''), 100),
          p_latitude, p_longitude, greatest(p_accuracy, 0), p_source)
  on conflict (visitor_key) do update set
    user_id    = coalesce(auth.uid(), v.user_id),
    -- une position GPS n'est jamais écrasée par une simple estimation
    country    = case when v.source = 'gps' and excluded.source = 'timezone' then v.country else excluded.country end,
    region     = case when v.source = 'gps' and excluded.source = 'timezone' then v.region  else excluded.region  end,
    city       = case when v.source = 'gps' and excluded.source = 'timezone' then v.city    else excluded.city    end,
    latitude   = coalesce(excluded.latitude,   v.latitude),
    longitude  = coalesce(excluded.longitude,  v.longitude),
    accuracy_m = coalesce(excluded.accuracy_m, v.accuracy_m),
    source     = case when v.source = 'gps' then 'gps' else excluded.source end,
    updated_at = now();
end;
$$;
revoke execute on function public.record_visitor_location(text, text, text, text, text, double precision, double precision, real) from public;
grant execute on function public.record_visitor_location(text, text, text, text, text, double precision, double precision, real) to anon, authenticated;

-- Statistiques admin : nombre de visiteurs par pays / région / ville
--   select * from admin_location_stats();
create or replace function public.admin_location_stats()
returns table (country text, region text, city text, visitors bigint, members bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return; end if;
  return query
    select v.country, v.region, v.city, count(*), count(v.user_id)
    from public.visitor_locations v
    group by v.country, v.region, v.city
    order by count(*) desc;
end;
$$;
revoke execute on function public.admin_location_stats() from public, anon;
grant execute on function public.admin_location_stats() to authenticated;
