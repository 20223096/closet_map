# Closet Map

성수 지역 오프라인 옷가게를 스타일 태그로 탐색하는 React Native/Expo MVP입니다.

## 구현된 것

- Expo SDK 51 + TypeScript 앱 구조
- React Navigation 기반 탭/스택 라우팅
- Zustand 상태 관리
- Supabase Auth 회원가입/로그인 연결
- Supabase `stores`, `store_tags` CRUD 연결
- 관리자 매장 직접 등록/수정 화면
- 카카오 장소 키워드 검색 연동
- 현재 위치 권한 요청 및 지도 중심 이동
- React Native Maps 기반 매장 핀 표시
- 중복 매장 후보 감지 화면
- 관리자 RLS 정책이 포함된 Supabase 마이그레이션

기존 정적 웹 프로토타입 파일은 참고용으로 남아 있습니다.

## 실행

```bash
npm install
npm run start -- --localhost
```

환경값은 `.env.example`을 참고해 `.env`에 넣습니다.

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_KAKAO_REST_API_KEY=
```

Supabase 값이 없으면 로컬 관리자 모드와 샘플 매장으로 동작합니다.

## Supabase 적용

`supabase/migrations/001_initial_schema.sql`을 Supabase SQL editor 또는 CLI로 적용합니다.

관리자 계정은 가입 후 `profiles.role`을 `admin`으로 바꿔야 관리자 탭과 DB 쓰기 권한을 사용할 수 있습니다.

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

## 개발 메모

현재 환경에서는 Expo Metro 실행 중 macOS 파일 감시 오류(`EMFILE: too many open files, watch`)가 발생할 수 있습니다. 이 경우 Watchman 설치 후 다시 실행하는 것이 가장 안정적입니다.

```bash
brew install watchman
npm run start -- --localhost
```
