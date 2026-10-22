-- PELEX: sends a "new person joined" message to your n8n workflow, which then emails the welcome message.
-- Run in Supabase > SQL Editor AFTER the n8n workflow (see pelex_email_setup.md, step 5) exists.
-- 1) Replace the two CHANGE_ME values. 2) Run. Safe to run again.

create extension if not exists pg_net;

create or replace function public.send_welcome_hook() returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
declare
  hook   text := 'https://pelexn8n.onrender.com/webhook/pelex-welcome';   -- CHANGE_ME if your n8n webhook path differs
  secret text := 'CHANGE_ME_to_a_long_random_password';                  -- CHANGE_ME: the same value goes in the n8n Header Auth credential
begin
  perform net.http_post(
    url     := hook,
    headers := jsonb_build_object('Content-Type','application/json','x-pelex-secret',secret),
    body    := jsonb_build_object(
      'id',       new.id,
      'email',    new.email,
      'name',     split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1),
      'provider', coalesce(new.raw_app_meta_data->>'provider','email')));
  return new;
exception when others then
  return new;      -- a problem with the welcome email must never block someone from signing up
end $$;

revoke execute on function public.send_welcome_hook() from public, anon, authenticated;

-- Email sign-ups: send once, at the moment they confirm their email
drop trigger if exists pelex_welcome_confirmed on auth.users;
create trigger pelex_welcome_confirmed
  after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.send_welcome_hook();

-- Google and GitHub sign-ups arrive already confirmed
drop trigger if exists pelex_welcome_oauth on auth.users;
create trigger pelex_welcome_oauth
  after insert on auth.users
  for each row when (new.email_confirmed_at is not null)
  execute function public.send_welcome_hook();

-- Newsletter list (for "what's new on Pelex"). Private: only your n8n (service key) can read or write it.
create table if not exists public.newsletter_subscribers (
  email text primary key,
  user_id uuid,
  subscribed boolean not null default false,       -- stays false until the person opts in
  unsub_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
revoke all on table public.newsletter_subscribers from anon, authenticated;
