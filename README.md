# Welfin 재고관리

Welfin 사내 재고 관리 어드민입니다. 매입처에서 들어온 제품을 스타팩·쿠팡 창고에 입고하고, 일 단위 출고와 창고 간 이동을 기록해서 매일 재고를 확인합니다.

## 기술 스택

| 역할 | 사용 |
|---|---|
| 코어 | React 19, TypeScript |
| 빌드 | Vite (`@vitejs/plugin-react-swc`) |
| 라우팅 | React Router |
| 서버 상태 | TanStack Query |
| 클라이언트 상태 | Jotai |
| 스타일 | Vanilla Extract (디자인 토큰: `src/styles/theme.css.ts`) |
| 백엔드 | Supabase (Postgres + Auth). 이후 Spring으로 교체 예정 |
| 패키지 매니저 | pnpm |
| CI/CD | GitHub Actions → Vercel |

## 처음 설정하기

1. [supabase.com](https://supabase.com)에서 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/migrations/0001_init.sql` → `0002_product_guard.sql` → `0003_returns.sql` → `0004_products_sales.sql` 순서로 실행합니다. (0004는 기존 엑셀의 제품·초기 재고(2026-11-19)와 매출 목표를 함께 넣습니다)
3. `.env.example`을 `.env.local`로 복사하고 Project Settings > API의 URL과 Publishable key를 넣습니다.
4. `supabase/create_user.sql` 안내대로 첫 관리자 계정을 만듭니다.
5. 실행합니다.

```bash
pnpm install
pnpm dev
```

## 배포 (GitHub Actions → Vercel)

`main`에 push하면 타입 검사와 빌드를 거쳐 프로덕션에 배포되고, PR을 올리면 미리보기 URL이 생성됩니다.
`vercel.json`에서 Vercel 자체 Git 자동 배포는 꺼두었습니다. 배포는 Actions에서만 실행되어 두 번 배포되지 않습니다.

최초 1회 설정:

1. 로컬에서 `npx vercel link`를 실행해 Vercel 프로젝트를 만들거나 연결합니다. `.vercel/project.json`에 `orgId`와 `projectId`가 생깁니다.
2. Vercel 대시보드 > Project > Settings > Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 Production과 Preview 둘 다에 추가합니다.
3. [Vercel 토큰](https://vercel.com/account/tokens)을 발급합니다.
4. GitHub 저장소 > Settings > Secrets and variables > Actions에 아래 3개를 추가합니다.
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

## 회수 (반품·교환)

`/returns` 화면에서 회수 접수 → 회수 송장 등록 → 회수완료 → 검수완료까지 관리합니다.

- 입력칸에 엑셀·메신저 내용을 그대로 붙여넣으면 줄마다 형태를 판별합니다 (`src/features/returns/parse.ts`).
  - 접수: `관리번호 주문번호 발주일 배송일 수령자 판매처상품 수량` 또는 `수령자 주소 제품 수량 연락처`
  - 송장: `관리번호 회수송장` 또는 `회수송장 이름 연락처` (줄에 `롯데`/`직접`이 있으면 그 택배사)
  - 구분: `이름 반품(사유)` / `이름 교환(사유)` (동명이인은 앞에 관리번호)
- 접수 후 4일이 지나도 회수가 끝나지 않으면 장기 미수로 표시하고, 페이지에 들어올 때 팝업으로 알려줍니다.
- 배송조회는 Vercel 서버 함수 `api/track.ts`가 [tracker.delivery](https://tracker.delivery)를 호출합니다. 배달완료가 되면 회수완료로 자동 변경됩니다.
  - Vercel 환경변수에 `TRACKER_DELIVERY_CLIENT_ID`, `TRACKER_DELIVERY_CLIENT_SECRET`을 추가해야 합니다.
  - 로컬에서 배송조회까지 확인하려면 `pnpm dev` 대신 `npx vercel dev`로 실행합니다.

## 구조

```
src/
  api/          백엔드 접근 계층 (Supabase). Spring 전환 시 이 폴더만 교체
    types.ts    화면에서 쓰는 도메인 타입 (백엔드와 무관하게 유지)
    inventory.ts / auth.ts   실제 호출
    queries.ts  TanStack Query 훅
  components/   토스 톤 공용 UI (Button, Field, Card, Badge, Toast …)
  features/     인증, 재고 계산 로직
  layouts/      반응형 레이아웃 (데스크톱 사이드바 / 모바일 하단 탭)
  pages/        화면
  styles/       디자인 토큰, 전역 스타일
supabase/
  migrations/   DB 스키마
```

## 재고 계산 방식

"현재 재고" 숫자를 따로 저장하지 않고, 모든 입고·출고·이동·조정 기록(`stock_movements`)을 합산해서 계산합니다.

- 특정 날짜 기준 재고를 언제든 다시 계산할 수 있습니다 (재고 현황의 기준일).
- 숫자가 틀리면 기록을 따라가며 원인을 찾을 수 있습니다.
- 출고·이동으로 재고가 마이너스가 되면 DB(`create_movements`)에서 등록 전체를 취소합니다.
- 기록은 수정·삭제할 수 없고, 잘못 입력한 건은 조정 기록으로 바로잡아 이력을 남깁니다.

## Spring 전환 메모

- 화면은 `src/api/types.ts`의 타입과 `src/api/queries.ts`의 훅만 사용합니다.
- `inventory.ts`와 `auth.ts`의 함수를 같은 이름과 시그니처의 `fetch` 호출로 바꾸면 됩니다.
- 엔드포인트로 옮겨야 할 DB 로직은 `stock_as_of`(재고 집계)와 `create_movements`(일괄 등록 + 재고 부족 검사)입니다.
