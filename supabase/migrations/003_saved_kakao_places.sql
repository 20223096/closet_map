-- 카카오 장소 찜은 매장 등록/승인 요청과 분리한다.
create table if not exists public.saved_kakao_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kakao_place_id text not null,
  place_name text not null,
  address_name text not null default '',
  road_address_name text not null default '',
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now(),
  unique (user_id, kakao_place_id)
);

alter table public.saved_kakao_places enable row level security;

drop policy if exists "users can manage own saved kakao places" on public.saved_kakao_places;
create policy "users can manage own saved kakao places"
  on public.saved_kakao_places for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admins can read saved kakao places" on public.saved_kakao_places;
create policy "admins can read saved kakao places"
  on public.saved_kakao_places for select
  using (public.is_admin());

-- 같은 카카오 매장에 여러 사용자가 제보할 수 있도록 연결된 대기 매장을 조회할 수 있게 한다.
drop policy if exists "users can read pending linked stores" on public.stores;
create policy "users can read pending linked stores"
  on public.stores for select
  using (auth.uid() is not null and status = 'pending' and kakao_place_id is not null);

-- 이전 버전에서 카카오 장소를 찜하면서 만들어진 pending 매장을 새 찜 테이블로 옮긴다.
insert into public.saved_kakao_places (
  user_id,
  kakao_place_id,
  place_name,
  address_name,
  road_address_name,
  lat,
  lng,
  created_at
)
select
  saved.user_id,
  stores.kakao_place_id,
  stores.name,
  stores.address,
  stores.address,
  stores.lat,
  stores.lng,
  saved.created_at
from public.saved_stores as saved
join public.stores as stores on stores.id = saved.store_id
where stores.status = 'pending'
  and stores.kakao_place_id is not null
on conflict (user_id, kakao_place_id) do nothing;

delete from public.saved_stores as saved
using public.stores as stores
where saved.store_id = stores.id
  and stores.status = 'pending'
  and stores.kakao_place_id is not null;

-- 찜 때문에만 생성됐고 실제 제보가 전혀 없는 대기 매장은 승인 목록에서 제거한다.
delete from public.stores as stores
where stores.status = 'pending'
  and stores.kakao_place_id is not null
  and not exists (select 1 from public.store_votes votes where votes.store_id = stores.id)
  and not exists (select 1 from public.store_contributions contributions where contributions.store_id = stores.id)
  and not exists (select 1 from public.store_photos photos where photos.store_id = stores.id);
