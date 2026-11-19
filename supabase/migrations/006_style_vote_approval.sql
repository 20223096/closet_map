-- 기존에 승인된 스타일(tag) 제보를 제보자별 스타일 투표로 백필한다.
insert into public.store_votes (store_id, user_id, vote_type, vote_value)
select
  contribution.store_id,
  contribution.created_by,
  'style',
  contribution.payload ->> 'tag'
from public.store_contributions as contribution
where contribution.status = 'approved'
  and contribution.contribution_type = 'tag'
  and coalesce(contribution.payload ->> 'kind', 'style') = 'style'
  and contribution.store_id is not null
  and contribution.created_by is not null
  and nullif(trim(contribution.payload ->> 'tag'), '') is not null
on conflict (store_id, user_id, vote_type)
where user_id is not null
do update set vote_value = excluded.vote_value;

-- 로그인하지 않은 상태에서 남긴 과거 제보는 같은 값이 아직 없을 때 한 표로 복원한다.
insert into public.store_votes (store_id, user_id, vote_type, vote_value)
select
  contribution.store_id,
  null,
  'style',
  contribution.payload ->> 'tag'
from public.store_contributions as contribution
where contribution.status = 'approved'
  and contribution.contribution_type = 'tag'
  and coalesce(contribution.payload ->> 'kind', 'style') = 'style'
  and contribution.store_id is not null
  and contribution.created_by is null
  and nullif(trim(contribution.payload ->> 'tag'), '') is not null
  and not exists (
    select 1
    from public.store_votes as vote
    where vote.store_id = contribution.store_id
      and vote.user_id is null
      and vote.vote_type = 'style'
      and vote.vote_value = contribution.payload ->> 'tag'
  );

-- 승인된 스타일 투표 종류를 상단 사용자 태그에 추가한다.
insert into public.store_tags (store_id, tag, source, confidence_score)
select distinct
  vote.store_id,
  vote.vote_value,
  'user',
  0.7
from public.store_votes as vote
where vote.vote_type = 'style'
  and nullif(trim(vote.vote_value), '') is not null
on conflict (store_id, tag, source)
do update set confidence_score = excluded.confidence_score;
