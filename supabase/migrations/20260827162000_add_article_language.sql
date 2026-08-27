alter table public.articles add column if not exists lang text not null default 'fr';
update public.articles set lang = 'fr' where lang is null or lang not in ('fr', 'en');