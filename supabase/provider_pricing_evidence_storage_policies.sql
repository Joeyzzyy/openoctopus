drop policy if exists "provider_pricing_evidence_admin_read" on storage.objects;
create policy "provider_pricing_evidence_admin_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'provider-pricing-evidence'
  and exists (
    select 1
    from public.workspace_members
    where workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
  )
);

drop policy if exists "provider_pricing_evidence_admin_insert" on storage.objects;
create policy "provider_pricing_evidence_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'provider-pricing-evidence'
  and exists (
    select 1
    from public.workspace_members
    where workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
  )
);
