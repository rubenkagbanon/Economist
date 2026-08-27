create policy "kv_store_writer_session_select"
on public.kv_store
for select
to authenticated
using (path = 'writer_sessions/' || (select auth.uid())::text);

create policy "kv_store_writer_session_insert"
on public.kv_store
for insert
to authenticated
with check (path = 'writer_sessions/' || (select auth.uid())::text);

create policy "kv_store_writer_session_update"
on public.kv_store
for update
to authenticated
using (path = 'writer_sessions/' || (select auth.uid())::text)
with check (path = 'writer_sessions/' || (select auth.uid())::text);

create policy "kv_store_writer_session_delete"
on public.kv_store
for delete
to authenticated
using (path = 'writer_sessions/' || (select auth.uid())::text);