-- Allow authenticated users to manage their own proposal records and access codes,
-- while letting the admin account manage all generated writer codes.

create policy "kv_store_access_codes_select"
on public.kv_store
for select
to authenticated
using (
  path like 'access_codes/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'forEmail', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(value ->> 'forEmail', '') = ''
  )
);

create policy "kv_store_access_codes_insert"
on public.kv_store
for insert
to authenticated
with check (
  path like 'access_codes/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'forEmail', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(value ->> 'forEmail', '') = ''
  )
);

create policy "kv_store_access_codes_update"
on public.kv_store
for update
to authenticated
using (
  path like 'access_codes/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'forEmail', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(value ->> 'forEmail', '') = ''
  )
)
with check (
  path like 'access_codes/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'forEmail', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(value ->> 'forEmail', '') = ''
  )
);

create policy "kv_store_access_codes_delete"
on public.kv_store
for delete
to authenticated
using (
  path like 'access_codes/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'forEmail', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(value ->> 'forEmail', '') = ''
  )
);

create policy "kv_store_proposals_select"
on public.kv_store
for select
to authenticated
using (
  path like 'proposals/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create policy "kv_store_proposals_insert"
on public.kv_store
for insert
to authenticated
with check (
  path like 'proposals/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create policy "kv_store_proposals_update"
on public.kv_store
for update
to authenticated
using (
  path like 'proposals/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  path like 'proposals/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create policy "kv_store_proposals_delete"
on public.kv_store
for delete
to authenticated
using (
  path like 'proposals/%' and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower('econglobe26@gmail.com')
    or lower(coalesce(value ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
