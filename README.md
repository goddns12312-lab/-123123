# my-project

카지노 플랫폼 모노레포 — **user-site** (유저 사이트)와 **admin-site** (어드민 대시보드)가  
동일한 **Cloudflare D1 데이터베이스(`casino-production`)**를 공유합니다.

---

## 프로젝트 구조

```
my-project/
├── migrations/
│   └── 0001_initial_schema.sql   # 공유 DB 스키마
├── seed.sql                       # 로컬 테스트 데이터
├── package.json                   # 루트 편의 스크립트
├── user-site/                     # 유저용 카지노 사이트
│   ├── public/static/
│   ├── src/index.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── wrangler.jsonc  ← DB binding 설정 위치
└── admin-site/                    # 관리자 대시보드
    ├── src/
    │   ├── index.tsx
    │   ├── types.ts
    │   └── routes/  (auth / users / notices / stats)
    ├── package.json
    ├── vite.config.ts
    └── wrangler.jsonc  ← DB binding 설정 위치 (user-site와 동일 ID)
```

---

## ⚡ 공유 DB 연동 — 3단계 설정

### 1단계 · D1 데이터베이스 생성

```bash
# 프로젝트 루트에서 실행
npx wrangler d1 create casino-production
```

출력 예시:
```
✅ Successfully created DB 'casino-production'

[[d1_databases]]
binding = "DB"
database_name = "casino-production"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← 이 ID를 복사
```

---

### 2단계 · 두 wrangler.jsonc에 동일한 ID 입력

**`user-site/wrangler.jsonc`** 와 **`admin-site/wrangler.jsonc`** 에서  
`REPLACE_WITH_YOUR_DATABASE_ID` 를 위의 ID로 교체합니다.

```jsonc
// user-site/wrangler.jsonc  AND  admin-site/wrangler.jsonc  — 동일하게 설정
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "casino-production",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  // ← 실제 ID로 교체
    }
  ]
}
```

---

### 3단계 · DB 스키마 적용

```bash
# 로컬 개발용
npm run db:migrate:local   # migrations/ 폴더의 SQL 실행
npm run db:seed:local      # seed.sql 테스트 데이터 삽입

# 프로덕션 배포 후
npm run db:migrate:prod
```

---

## 공유 DB 테이블 구조

```sql
-- 회원 테이블 (user-site 가입 → admin-site에서 관리)
users (id, username, email, phone, status, balance, created_at)

-- 공지/이벤트 (admin-site 등록 → user-site에서 표시 가능)
notices (id, title, content, type, is_active, created_at)
```

---

## Admin API 엔드포인트

| Method | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 관리자 로그인 |
| GET | `/api/users` | 회원 목록 |
| POST | `/api/users` | 회원 추가 |
| PUT | `/api/users/:id` | 회원 수정 |
| DELETE | `/api/users/:id` | 회원 삭제 |
| GET | `/api/notices` | 공지/이벤트 목록 |
| POST | `/api/notices` | 공지/이벤트 등록 |
| PUT | `/api/notices/:id` | 공지 수정 |
| DELETE | `/api/notices/:id` | 공지 삭제 |
| GET | `/api/stats` | 대시보드 통계 |
| POST | `/api/stats/init-db` | DB 테이블 초기화 |

---

## 로컬 개발 실행

```bash
# 의존성 설치
npm run install:all

# DB 초기화 (최초 1회)
npm run db:reset:local

# user-site 빌드 → port 3000
cd user-site && npm run build
pm2 start ecosystem.config.cjs

# admin-site 빌드 → port 3001
cd admin-site && npm run build
pm2 start ecosystem.config.cjs
```

어드민 기본 로그인: **admin / admin1234**  
(운영 환경에서는 반드시 wrangler secret으로 변경)

---

## Cloudflare Pages 배포

```bash
# 전체 빌드 & 배포
npm run deploy:all

# 어드민 시크릿 설정
npx wrangler pages secret put ADMIN_USER --project-name admin-site
npx wrangler pages secret put ADMIN_PASS --project-name admin-site
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Hono 4 (Cloudflare Workers) |
| Build | Vite + @hono/vite-build |
| Database | Cloudflare D1 (SQLite, 공유) |
| Hosting | Cloudflare Pages |
| Frontend | Tailwind CSS (CDN) + FontAwesome |
