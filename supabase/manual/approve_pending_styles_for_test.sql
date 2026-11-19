-- 개발 확인용: 현재 대기 중인 카카오 매장과 스타일(tag) 제보를 승인한다.
-- 운영 환경에서 전체 대기 건을 일괄 승인하는 용도로 사용하지 마세요.

begin;

update public.stores
set status = 'approved',
    updated_at = now()
where status = 'pending'
  and kakao_place_id is not null;

insert into public.store_votes (store_id, user_id, vote_type, vote_value)
select
  contribution.store_id,
  contribution.created_by,
  'style',
  contribution.payload ->> 'tag'
from public.store_contributions as contribution
where contribution.status = 'pending'
  and contribution.contribution_type = 'tag'
  and coalesce(contribution.payload ->> 'kind', 'style') = 'style'
  and contribution.store_id is not null
  and contribution.created_by is not null
  and nullif(trim(contribution.payload ->> 'tag'), '') is not null
on conflict (store_id, user_id, vote_type)
where user_id is not null
do update set vote_value = excluded.vote_value;

insert into public.store_tags (store_id, tag, source, confidence_score)
select
  contribution.store_id,
  contribution.payload ->> 'tag',
  'user',
  0.7
from public.store_contributions as contribution
where contribution.status = 'pending'
  and contribution.contribution_type = 'tag'
  and contribution.store_id is not null
  and nullif(trim(contribution.payload ->> 'tag'), '') is not null
on conflict (store_id, tag, source)
do update set confidence_score = excluded.confidence_score;

update public.store_contributions
set status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
where status = 'pending'
  and contribution_type = 'tag';

commit;
