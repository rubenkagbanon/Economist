-- « Campagne de localisation » : quand l'admin augmente ce numéro, chaque
-- membre connecté se voit redemander sa position UNE fois (puis elle est
-- enregistrée dans visitor_locations). Valeur initiale 1 : une première
-- campagne démarre dès la mise en ligne du code.
--
-- Pour relancer une campagne plus tard :
--   update public.site_settings set value = (value::int + 1)::text, updated_at = now()
--   where key = 'geo_request_round';

create table if not exists public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

insert into public.site_settings (key, value) values ('geo_request_round', '1')
on conflict (key) do nothing;

-- Lecture du seul numéro de campagne (aucune autre donnée exposée)
create or replace function public.geo_request_round()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value::int from public.site_settings where key = 'geo_request_round'), 0);
$$;
revoke execute on function public.geo_request_round() from public;
grant execute on function public.geo_request_round() to anon, authenticated;
