-- Keep article moderation aligned with the single admin account.
drop policy if exists "articles_admin_read" on public.articles;
drop policy if exists "articles_admin_update" on public.articles;
drop policy if exists "articles_admin_delete" on public.articles;

create policy "articles_admin_read"
on public.articles
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
);

create policy "articles_admin_update"
on public.articles
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
);

create policy "articles_admin_delete"
on public.articles
for delete
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
);