-- Commune / quartier du visiteur (ex. Cocody, Yopougon pour Abidjan),
-- en plus du pays, de la région et de la ville. Lecture réservée à l'admin.

alter table public.visitor_locations add column if not exists commune text;
alter table public.visitor_locations drop constraint if exists visitor_locations_commune_len;
alter table public.visitor_locations add constraint visitor_locations_commune_len
  check (commune is null or char_length(commune) <= 100);

-- Nouvelle version de la fonction d'enregistrement (paramètre p_commune en plus)
drop function if exists public.record_visitor_location(text, text, text, text, text, double precision, double precision, real);
create or replace function public.record_visitor_location(
  p_visitor_key text, p_country text, p_region text default null,
  p_city text default null, p_source text default 'gps',
  p_latitude double precision default null, p_longitude double precision default null,
  p_accuracy real default null, p_commune text default null)
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
    (visitor_key, user_id, country, region, city, commune, latitude, longitude, accuracy_m, source)
  values (p_visitor_key, auth.uid(), v_country,
          left(nullif(trim(p_region), ''), 100), left(nullif(trim(p_city), ''), 100),
          left(nullif(trim(p_commune), ''), 100),
          p_latitude, p_longitude, greatest(p_accuracy, 0), p_source)
  on conflict (visitor_key) do update set
    user_id    = coalesce(auth.uid(), v.user_id),
    -- une position GPS n'est jamais écrasée par une simple estimation
    country    = case when v.source = 'gps' and excluded.source = 'timezone' then v.country else excluded.country end,
    region     = case when v.source = 'gps' and excluded.source = 'timezone' then v.region  else excluded.region  end,
    city       = case when v.source = 'gps' and excluded.source = 'timezone' then v.city    else excluded.city    end,
    commune    = case when v.source = 'gps' and excluded.source = 'timezone' then v.commune else coalesce(excluded.commune, v.commune) end,
    latitude   = coalesce(excluded.latitude,   v.latitude),
    longitude  = coalesce(excluded.longitude,  v.longitude),
    accuracy_m = coalesce(excluded.accuracy_m, v.accuracy_m),
    source     = case when v.source = 'gps' then 'gps' else excluded.source end,
    updated_at = now();
end;
$$;
revoke execute on function public.record_visitor_location(text, text, text, text, text, double precision, double precision, real, text) from public;
grant execute on function public.record_visitor_location(text, text, text, text, text, double precision, double precision, real, text) to anon, authenticated;

-- Statistiques admin avec la commune
drop function if exists public.admin_location_stats();
create or replace function public.admin_location_stats()
returns table (country text, region text, city text, commune text, visitors bigint, members bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return; end if;
  return query
    select v.country, v.region, v.city, v.commune, count(*), count(v.user_id)
    from public.visitor_locations v
    group by v.country, v.region, v.city, v.commune
    order by count(*) desc;
end;
$$;
revoke execute on function public.admin_location_stats() from public, anon;
grant execute on function public.admin_location_stats() to authenticated;
