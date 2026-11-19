create type public.user_role as enum ('user', 'owner', 'admin');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.request_type as enum ('new_store', 'edit_store', 'owner_claim');
create type public.vote_type as enum ('style', 'size', 'price', 'shopping', 'comfort', 'instagram_match');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  kakao_place_id text,
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  area text not null,
  instagram_url text,
  store_type text,
  size_label text check (size_label in ('작음', '보통', '큼')),
  price_label text check (price_label in ('저렴', '보통', '비쌈')),
  fitting_available boolean not null default false,
  description text,
  recommendation text,
  visit_checklist text,
  editor_comment text,
  cover_image_url text,
  status public.review_status not null default 'pending',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_tags (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  tag text not null,
  source text not null default 'admin' check (source in ('admin', 'user', 'owner')),
  confidence_score numeric(4, 3) not null default 1.0 check (confidence_score >= 0 and confidence_score <= 1),
  created_at timestamptz not null default now(),
  unique (store_id, tag, source)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type public.vote_type not null,
  vote_value text not null,
  created_at timestamptz not null default now(),
  unique (store_id, user_id, vote_type)
);

create table public.store_requests (
  id uuid primary key default gen_random_uuid(),
  request_type public.request_type not null,
  store_id uuid references public.stores(id) on delete set null,
  requester_id uuid references public.profiles(id) on delete set null,
  name text not null,
  address text,
  instagram_url text,
  tags text[],
  description text,
  status public.review_status not null default 'pending',
  admin_memo text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.saved_stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, store_id)
);

create table public.shopping_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text not null,
  style text,
  description text,
  created_at timestamptz not null default now()
);

create table public.shopping_track_stores (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.shopping_tracks(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_no integer not null,
  unique (track_id, store_id),
  unique (track_id, order_no)
);

create index stores_area_status_idx on public.stores (area, status);
create index stores_location_idx on public.stores (lat, lng);
create index store_tags_tag_idx on public.store_tags (tag);
create index votes_store_type_idx on public.votes (store_id, vote_type);
create index store_requests_status_idx on public.store_requests (status);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_tags enable row level security;
alter table public.votes enable row level security;
alter table public.store_requests enable row level security;
alter table public.saved_stores enable row level security;
alter table public.shopping_tracks enable row level security;
alter table public.shopping_track_stores enable row level security;

create policy "public approved stores are readable"
  on public.stores for select
  using (status = 'approved');

create policy "public store tags are readable"
  on public.store_tags for select
  using (
    exists (
      select 1 from public.stores
      where stores.id = store_tags.store_id
      and stores.status = 'approved'
    )
  );

create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "users can create own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "admins can manage profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can read all stores"
  on public.stores for select
  using (public.is_admin());

create policy "admins can create stores"
  on public.stores for insert
  with check (public.is_admin());

create policy "admins can update stores"
  on public.stores for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete stores"
  on public.stores for delete
  using (public.is_admin());

create policy "admins can manage store tags"
  on public.store_tags for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users can create votes"
  on public.votes for insert
  with check (auth.uid() = user_id);

create policy "users can update own votes"
  on public.votes for update
  using (auth.uid() = user_id);

create policy "users can read vote aggregates source"
  on public.votes for select
  using (true);

create policy "users can create store requests"
  on public.store_requests for insert
  with check (auth.uid() = requester_id or requester_id is null);

create policy "users can read own store requests"
  on public.store_requests for select
  using (auth.uid() = requester_id);

create policy "admins can manage store requests"
  on public.store_requests for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users can manage own saved stores"
  on public.saved_stores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins can read saved stores"
  on public.saved_stores for select
  using (public.is_admin());

create policy "public tracks are readable"
  on public.shopping_tracks for select
  using (true);

create policy "admins can manage shopping tracks"
  on public.shopping_tracks for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public track stores are readable"
  on public.shopping_track_stores for select
  using (true);

create policy "admins can manage shopping track stores"
  on public.shopping_track_stores for all
  using (public.is_admin())
  with check (public.is_admin());
