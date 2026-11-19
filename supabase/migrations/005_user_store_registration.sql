-- 로그인 사용자가 가게 등록을 요청할 수 있다.
-- 사용자가 만든 매장은 반드시 pending이며 관리자 승인 전에는 공개 목록에 나타나지 않는다.
drop policy if exists "users can create pending linked stores" on public.stores;
drop policy if exists "users can create pending stores" on public.stores;

create policy "users can create pending stores"
  on public.stores for insert
  with check (
    auth.uid() is not null
    and status = 'pending'
    and auth.uid() = created_by
  );

drop policy if exists "users can read own pending stores" on public.stores;
create policy "users can read own pending stores"
  on public.stores for select
  using (status = 'pending' and auth.uid() = created_by);
