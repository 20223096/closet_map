-- 주의: 사용자 계정/profiles는 유지하지만 매장 관련 데이터는 모두 삭제한다.
-- 실행 후 등록 매장은 아래 샘플 3개만 남는다.

begin;

-- 관리자 승인 대기와 사용자 참여 데이터 초기화
delete from public.store_contributions;
delete from public.store_photos;
delete from public.store_votes;
delete from public.votes;
delete from public.saved_stores;
delete from public.saved_kakao_places;
delete from public.store_requests;
delete from public.shopping_track_stores;
delete from public.store_tags;
delete from public.stores;

insert into public.stores (
  id, name, address, lat, lng, area, instagram_url, store_type,
  size_label, price_label, fitting_available, description,
  recommendation, visit_checklist, editor_comment, status
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '오브닝 성수',
    '서울 성동구 연무장길 28',
    37.5437, 127.0541, '성수',
    'https://www.instagram.com/',
    '편집샵', '큼', '보통', true,
    '깔끔한 데일리룩과 기본템 중심의 편집샵입니다.',
    '성수에서 미니멀한 데일리룩을 찾는 사용자',
    '주말 오후에는 붐비는 편입니다.',
    '동선이 넓고 아이템 구성이 안정적입니다.',
    'approved'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '루즈룸',
    '서울 성동구 성수이로 77',
    37.5414, 127.0562, '성수',
    'https://www.instagram.com/',
    '쇼룸', '보통', '비쌈', true,
    '러블리한 색감과 페미닌한 소재가 강점인 쇼룸입니다.',
    '주말룩과 데이트룩을 찾는 사용자',
    '피팅 대기가 생길 수 있습니다.',
    '인스타그램 분위기와 실제 매장 톤이 비슷합니다.',
    'approved'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '스탠드 29',
    '서울 성동구 아차산로 92',
    37.5451, 127.0602, '성수',
    'https://www.instagram.com/',
    '보세', '작음', '저렴', false,
    '가성비 좋은 스트릿 포인트 아이템을 빠르게 둘러보기 좋습니다.',
    '스트릿 무드의 보세 아이템을 찾는 사용자',
    '매장이 작아 빠르게 둘러보는 코스에 적합합니다.',
    '가격 접근성이 좋고 상품 회전이 빠른 편입니다.',
    'approved'
  );

insert into public.store_tags (store_id, tag, source, confidence_score)
values
  ('10000000-0000-4000-8000-000000000001', '미니멀', 'admin', 1),
  ('10000000-0000-4000-8000-000000000001', '캐주얼', 'admin', 1),
  ('10000000-0000-4000-8000-000000000001', '편집샵', 'admin', 1),
  ('10000000-0000-4000-8000-000000000002', '러블리', 'admin', 1),
  ('10000000-0000-4000-8000-000000000002', '페미닌', 'admin', 1),
  ('10000000-0000-4000-8000-000000000002', '쇼룸', 'admin', 1),
  ('10000000-0000-4000-8000-000000000003', '힙', 'admin', 1),
  ('10000000-0000-4000-8000-000000000003', '스트릿', 'admin', 1),
  ('10000000-0000-4000-8000-000000000003', '보세', 'admin', 1);

commit;
