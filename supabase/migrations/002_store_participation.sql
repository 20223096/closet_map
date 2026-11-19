create table if not exists public.store_votes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  vote_type text not null check (vote_type in ('style', 'size', 'price', 'shopping', 'comfort')),
  vote_value text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists store_votes_user_type_idx
  on public.store_votes (store_id, user_id, vote_type)
  where user_id is not null;

create index if not exists store_votes_store_type_idx
  on public.store_votes (store_id, vote_type);

create table if not exists public.store_contributions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete set null,
  kakao_place_id text,
  contribution_type text not null check (contribution_type in ('description', 'instagram_url', 'new_store', 'edit_store', 'tag')),
  payload jsonb not null default '{}'::jsonb,
  status public.review_status not null default 'pending',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists store_contributions_status_idx
  on public.store_contributions (status, created_at desc);

create index if not exists store_contributions_store_idx
  on public.store_contributions (store_id);

create table if not exists public.store_photos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  image_url text not null,
  source text not null default 'user' check (source in ('user', 'admin', 'owner')),
  status public.review_status not null default 'pending',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists store_photos_store_status_idx
  on public.store_photos (store_id, status, created_at desc);

create unique index if not exists stores_kakao_place_id_unique_idx
  on public.stores (kakao_place_id)
  where kakao_place_id is not null;

alter table public.store_votes enable row level security;
alter table public.store_contributions enable row level security;
alter table public.store_photos enable row level security;

drop policy if exists "users can create pending linked stores" on public.stores;
create policy "users can create pending linked stores"
  on public.stores for insert
  with check (
    status = 'pending'
    and kakao_place_id is not null
    and (auth.uid() = created_by or created_by is null)
  );

drop policy if exists "users can read own pending stores" on public.stores;
create policy "users can read own pending stores"
  on public.stores for select
  using (status = 'pending' and auth.uid() = created_by);

drop policy if exists "store votes are readable" on public.store_votes;
create policy "store votes are readable"
  on public.store_votes for select
  using (true);

drop policy if exists "users can insert store votes" on public.store_votes;
create policy "users can insert store votes"
  on public.store_votes for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "users can update own store votes" on public.store_votes;
create policy "users can update own store votes"
  on public.store_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admins can manage store votes" on public.store_votes;
create policy "admins can manage store votes"
  on public.store_votes for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "users can create store contributions" on public.store_contributions;
create policy "users can create store contributions"
  on public.store_contributions for insert
  with check (status = 'pending' and (auth.uid() = created_by or created_by is null));

drop policy if exists "users can read own store contributions" on public.store_contributions;
create policy "users can read own store contributions"
  on public.store_contributions for select
  using (auth.uid() = created_by);

drop policy if exists "admins can manage store contributions" on public.store_contributions;
create policy "admins can manage store contributions"
  on public.store_contributions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "approved store photos are readable" on public.store_photos;
create policy "approved store photos are readable"
  on public.store_photos for select
  using (status = 'approved');

drop policy if exists "users can read own store photos" on public.store_photos;
create policy "users can read own store photos"
  on public.store_photos for select
  using (auth.uid() = created_by);

drop policy if exists "users can create store photos" on public.store_photos;
create policy "users can create store photos"
  on public.store_photos for insert
  with check (status = 'pending' and (auth.uid() = created_by or created_by is null));

drop policy if exists "admins can manage store photos" on public.store_photos;
create policy "admins can manage store photos"
  on public.store_photos for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('store-photos', 'store-photos', true)
on conflict (id) do nothing;

drop policy if exists "store photo files are publicly readable" on storage.objects;
create policy "store photo files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'store-photos');

drop policy if exists "users can upload pending store photos" on storage.objects;
create policy "users can upload pending store photos"
  on storage.objects for insert
  with check (bucket_id = 'store-photos');
