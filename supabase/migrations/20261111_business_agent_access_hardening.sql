-- Business Agent access hardening: public users may read only the business type catalogue.
begin;
revoke all on table public.workspaces from anon;
revoke all on table public.workspace_members from anon;
revoke all on table public.business_projects from anon;
revoke all on table public.business_project_records from anon;
revoke all on table public.ledger_entries from anon;
grant select on table public.business_types to anon, authenticated;
revoke all on function public.create_workspace(text,text) from anon;
revoke all on function public.create_invite(uuid,text) from anon;
revoke all on function public.join_workspace(text) from anon;
grant execute on function public.create_workspace(text,text) to authenticated;
grant execute on function public.create_invite(uuid,text) to authenticated;
grant execute on function public.join_workspace(text) to authenticated;
commit;