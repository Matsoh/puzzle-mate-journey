-- Public stats on the profile page (mirrored from each player's own progress; only the owner can update their row).
alter table public.profiles add column if not exists wins integer not null default 0;
alter table public.profiles add column if not exists draws integer not null default 0;
alter table public.profiles add column if not exists beaten integer not null default 0;
alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add constraint profiles_stats_nonneg check (wins >= 0 and draws >= 0 and beaten >= 0 and xp >= 0 and games >= 0);