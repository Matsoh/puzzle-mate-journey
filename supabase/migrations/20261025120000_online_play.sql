create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Spiller',
  friend_code text not null unique,
  avatar jsonb,
  rating integer not null default 1550,
  level integer not null default 1,
  streak integer not null default 0,
  games integer not null default 0,
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;

create or replace function public.gen_friend_code() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
begin
  loop
    code := substr(alphabet, 1 + floor(random() * 24)::int, 1)
         || substr(alphabet, 1 + floor(random() * 24)::int, 1)
         || substr(alphabet, 1 + floor(random() * 24)::int, 1)
         || substr(alphabet, 1 + floor(random() * 24)::int, 1)
         || '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end $$;

create or replace function public.ensure_profile(p_name text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  r public.profiles;
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  insert into public.profiles (user_id, name, friend_code)
  values (auth.uid(), coalesce(nullif(trim(p_name), ''), 'Spiller'), public.gen_friend_code())
  on conflict (user_id) do update set last_seen = now()
  returning * into r;
  return r;
end $$;


create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(user_id) on delete cascade,
  addressee uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);
alter table public.friendships enable row level security;
grant select, delete on public.friendships to authenticated;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a))
  );
$$;

create policy "profiles: approved players read all" on public.profiles
  for select to authenticated using (public.is_approved_player());
create policy "profiles: own update" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "friendships: mine" on public.friendships
  for select to authenticated using (requester = auth.uid() or addressee = auth.uid());
create policy "friendships: remove mine" on public.friendships
  for delete to authenticated using (requester = auth.uid() or addressee = auth.uid());

create or replace function public.send_friend_request(p_code text)
returns public.friendships
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  r public.friendships;
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  select user_id into target from public.profiles where friend_code = upper(trim(p_code));
  if target is null then raise exception 'unknown code'; end if;
  if target = auth.uid() then raise exception 'own code'; end if;
  -- the other side already asked us: accept straight away
  update public.friendships set status = 'accepted'
    where requester = target and addressee = auth.uid() and status = 'pending'
    returning * into r;
  if r.id is not null then return r; end if;
  insert into public.friendships (requester, addressee) values (auth.uid(), target)
    on conflict (requester, addressee) do update set created_at = public.friendships.created_at
    returning * into r;
  return r;
end $$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  if p_accept then
    update public.friendships set status = 'accepted' where id = p_id and addressee = auth.uid();
  else
    delete from public.friendships where id = p_id and addressee = auth.uid();
  end if;
end $$;

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(user_id) on delete cascade,
  to_user uuid not null references public.profiles(user_id) on delete cascade,
  initial_ms integer not null default 600000,
  inc_ms integer not null default 0,
  color text not null default 'random' check (color in ('w', 'b', 'random')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  game_id uuid,
  created_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
grant select on public.challenges to authenticated;
create policy "challenges: mine" on public.challenges
  for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());

create table if not exists public.live_games (
  id uuid primary key default gen_random_uuid(),
  white uuid not null references public.profiles(user_id) on delete cascade,
  black uuid not null references public.profiles(user_id) on delete cascade,
  initial_ms integer not null,
  inc_ms integer not null default 0,
  moves text[] not null default '{}',
  sans text[] not null default '{}',
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  status text not null default 'playing' check (status in ('playing', 'finished')),
  result text check (result in ('w', 'b', 'd')),
  reason text,
  white_ms integer not null,
  black_ms integer not null,
  last_move_at timestamptz not null default now(),
  draw_offer uuid,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.live_games enable row level security;
grant select on public.live_games to authenticated;
create policy "live_games: players and friends" on public.live_games
  for select to authenticated using (
    white = auth.uid() or black = auth.uid()
    or public.are_friends(auth.uid(), white) or public.are_friends(auth.uid(), black)
  );
create index if not exists live_games_white_idx on public.live_games (white, created_at desc);
create index if not exists live_games_black_idx on public.live_games (black, created_at desc);

create or replace function public.create_challenge(p_to uuid, p_initial_ms integer, p_inc_ms integer, p_color text)
returns public.challenges
language plpgsql security definer set search_path = public as $$
declare r public.challenges;
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  if not public.are_friends(auth.uid(), p_to) then raise exception 'not friends'; end if;
  if p_initial_ms < 60000 or p_initial_ms > 3600000 or p_inc_ms < 0 or p_inc_ms > 60000 then raise exception 'bad time control'; end if;
  -- one open challenge per pair at a time
  update public.challenges set status = 'cancelled' where from_user = auth.uid() and to_user = p_to and status = 'pending';
  insert into public.challenges (from_user, to_user, initial_ms, inc_ms, color)
    values (auth.uid(), p_to, p_initial_ms, p_inc_ms, p_color) returning * into r;
  return r;
end $$;

create or replace function public.answer_challenge(p_id uuid, p_action text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.challenges;
  g uuid;
  w uuid; b uuid;
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  select * into c from public.challenges where id = p_id for update;
  if c.id is null then raise exception 'no challenge'; end if;
  if p_action = 'cancel' then
    if c.from_user is distinct from auth.uid() then raise exception 'not yours'; end if;
    update public.challenges set status = 'cancelled' where id = p_id and status = 'pending';
    return null;
  end if;
  if c.to_user is distinct from auth.uid() then raise exception 'not yours'; end if;
  if c.status <> 'pending' then raise exception 'not pending'; end if;
  if p_action = 'decline' then
    update public.challenges set status = 'declined' where id = p_id;
    return null;
  end if;
  if c.color = 'w' then w := c.from_user; b := c.to_user;
  elsif c.color = 'b' then w := c.to_user; b := c.from_user;
  elsif random() < 0.5 then w := c.from_user; b := c.to_user;
  else w := c.to_user; b := c.from_user; end if;
  insert into public.live_games (white, black, initial_ms, inc_ms, white_ms, black_ms)
    values (w, b, c.initial_ms, c.inc_ms, c.initial_ms, c.initial_ms) returning id into g;
  update public.challenges set status = 'accepted', game_id = g where id = p_id;
  return g;
end $$;

create or replace function public.play_move(p_game uuid, p_uci text, p_san text, p_fen text, p_plies integer, p_result text default null, p_reason text default null)
returns public.live_games
language plpgsql security definer set search_path = public as $$
declare
  g public.live_games;
  mover_white boolean;
  elapsed integer;
  remaining integer;
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  select * into g from public.live_games where id = p_game for update;
  if g.id is null then raise exception 'no game'; end if;
  if auth.uid() is distinct from g.white and auth.uid() is distinct from g.black then raise exception 'not your game'; end if;
  if g.status <> 'playing' then return g; end if;
  if coalesce(array_length(g.moves, 1), 0) <> p_plies then return g; end if;
  mover_white := (p_plies % 2 = 0);
  if auth.uid() is distinct from (case when mover_white then g.white else g.black end) then raise exception 'not your turn'; end if;
  elapsed := case when p_plies < 2 then 0 else greatest(0, (extract(epoch from (now() - g.last_move_at)) * 1000)::integer) end;
  remaining := (case when mover_white then g.white_ms else g.black_ms end) - elapsed;
  if remaining <= 0 then
    update public.live_games set status = 'finished', result = case when mover_white then 'b' else 'w' end, reason = 'Tiden gikk ut.',
      white_ms = case when mover_white then 0 else white_ms end, black_ms = case when mover_white then black_ms else 0 end, finished_at = now()
      where id = p_game returning * into g;
    return g;
  end if;
  remaining := remaining + g.inc_ms;
  update public.live_games set
    moves = array_append(moves, p_uci),
    sans = array_append(sans, p_san),
    fen = p_fen,
    white_ms = case when mover_white then remaining else white_ms end,
    black_ms = case when mover_white then black_ms else remaining end,
    last_move_at = now(),
    draw_offer = null,
    status = case when p_result is not null then 'finished' else 'playing' end,
    result = p_result,
    reason = p_reason,
    finished_at = case when p_result is not null then now() else null end
    where id = p_game returning * into g;
  return g;
end $$;

create or replace function public.game_action(p_game uuid, p_action text)
returns public.live_games
language plpgsql security definer set search_path = public as $$
declare
  g public.live_games;
  me_white boolean;
  plies integer;
  to_move_white boolean;
  elapsed integer;
  remaining integer;
begin
  if auth.uid() is null or not public.is_approved_player() then raise exception 'not approved'; end if;
  select * into g from public.live_games where id = p_game for update;
  if g.id is null then raise exception 'no game'; end if;
  if auth.uid() is distinct from g.white and auth.uid() is distinct from g.black then raise exception 'not your game'; end if;
  if g.status <> 'playing' then return g; end if;
  me_white := (g.white = auth.uid());
  plies := coalesce(array_length(g.moves, 1), 0);
  if p_action = 'resign' then
    update public.live_games set status = 'finished', result = case when me_white then 'b' else 'w' end, reason = 'Oppgitt.', finished_at = now() where id = p_game returning * into g;
  elsif p_action = 'abort' and plies < 2 then
    update public.live_games set status = 'finished', result = null, reason = 'Avbrutt.', finished_at = now() where id = p_game returning * into g;
  elsif p_action = 'offer_draw' then
    update public.live_games set draw_offer = auth.uid() where id = p_game returning * into g;
  elsif p_action = 'accept_draw' then
    if g.draw_offer is not null and g.draw_offer is distinct from auth.uid() then
      update public.live_games set status = 'finished', result = 'd', reason = 'Remis avtalt.', finished_at = now() where id = p_game returning * into g;
    end if;
  elsif p_action = 'claim_timeout' then
    to_move_white := (plies % 2 = 0);
    if plies >= 2 then
      elapsed := greatest(0, (extract(epoch from (now() - g.last_move_at)) * 1000)::integer);
      remaining := (case when to_move_white then g.white_ms else g.black_ms end) - elapsed;
      if remaining <= 0 then
        update public.live_games set status = 'finished', result = case when to_move_white then 'b' else 'w' end, reason = 'Tiden gikk ut.',
          white_ms = case when to_move_white then 0 else white_ms end, black_ms = case when to_move_white then black_ms else 0 end, finished_at = now()
          where id = p_game returning * into g;
      end if;
    end if;
  end if;
  return g;
end $$;

create table if not exists public.game_chat (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.live_games(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table public.game_chat enable row level security;
grant select, insert on public.game_chat to authenticated;
create policy "game_chat: participants read" on public.game_chat
  for select to authenticated using (exists (select 1 from public.live_games g where g.id = game_id and (g.white = auth.uid() or g.black = auth.uid())));
create policy "game_chat: participants write" on public.game_chat
  for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.live_games g where g.id = game_id and (g.white = auth.uid() or g.black = auth.uid())));
create index if not exists game_chat_game_idx on public.game_chat (game_id, id);

alter table public.live_games replica identity full;
alter table public.challenges replica identity full;
alter table public.friendships replica identity full;
alter publication supabase_realtime add table public.live_games;
alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.game_chat;

grant execute on function public.ensure_profile(text), public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.create_challenge(uuid, integer, integer, text), public.answer_challenge(uuid, text),
  public.play_move(uuid, text, text, text, integer, text, text), public.game_action(uuid, text), public.are_friends(uuid, uuid)
  to authenticated;revoke execute on function public.ensure_profile(text), public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.create_challenge(uuid, integer, integer, text), public.answer_challenge(uuid, text),
  public.play_move(uuid, text, text, text, integer, text, text), public.game_action(uuid, text), public.are_friends(uuid, uuid), public.gen_friend_code()
  from public, anon;
