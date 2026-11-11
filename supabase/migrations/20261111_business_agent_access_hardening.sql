-- Close inherited PUBLIC grants as well as explicit anon grants.
-- Authenticated access remains governed by the existing workspace RLS policies.
begin;
revoke all on table public.workspaces, public.workspace_members,
 public.business_projects, public.business_project_records, public.ledger_entries
 from public, anon;
grant select, insert, update, delete on table public.workspaces,
 public.workspace_members, public.business_projects,
 public.business_project_records, public.ledger_entries to authenticated;
revoke all on table public.business_types from public, anon;
revoke all on table public.business_types from public, anon, authenticated;
grant select on table public.business_types to anon, authenticated;
revoke all on function public.create_workspace(text,text) from public, anon;
revoke all on function public.create_invite(uuid,text) from public, anon;
revoke all on function public.join_workspace(text) from public, anon;
grant execute on function public.create_workspace(text,text) to authenticated;
grant execute on function public.create_invite(uuid,text) to authenticated;
grant execute on function public.join_workspace(text) to authenticated;
commit;