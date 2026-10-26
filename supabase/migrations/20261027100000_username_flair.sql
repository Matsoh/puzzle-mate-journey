alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists flair text;
create unique index if not exists profiles_username_idx on public.profiles (lower(username));
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,16}$');

create or replace function public.set_username(p_name text)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  n text := lower(trim(p_name));
  r public.profiles;
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  if n !~ '^[a-z0-9_]{3,16}$' then raise exception 'bad username'; end if;
  if exists (select 1 from public.profiles where lower(username) = n and user_id <> auth.uid()) then raise exception 'username taken'; end if;
  update public.profiles set username = n, updated_at = now() where user_id = auth.uid() returning * into r;
  if r.user_id is null then raise exception 'no profile'; end if;
  return r;
end $$;

create or replace function public.send_friend_request(p_code text)
returns public.friendships
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  r public.friendships;
  q text := trim(p_code);
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  select user_id into target from public.profiles where friend_code = upper(q);
  if target is null then select user_id into target from public.profiles where lower(username) = lower(ltrim(q, '@')); end if;
  if target is null then raise exception 'unknown code'; end if;
  if target = auth.uid() then raise exception 'own code'; end if;
  update public.friendships set status = 'accepted'
    where requester = target and addressee = auth.uid() and status = 'pending'
    returning * into r;
  if r.id is not null then return r; end if;
  insert into public.friendships (requester, addressee) values (auth.uid(), target)
    on conflict (requester, addressee) do update set created_at = public.friendships.created_at
    returning * into r;
  return r;
end $$;

grant execute on function public.set_username(text) to authenticated;
revoke execute on function public.set_username(text) from public, anon;