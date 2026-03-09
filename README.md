# my-project

카지노 플랫폼 모노레포 — **user-site** (유저 사이트)와 **admin-site** (어드민 대시보드)가 동일한 Cloudflare D1 데이터베이스와 KV를 공유합니다.

## 프로젝트 구조

```
my-project/
├── user-site/        # 유저용 카지노 사이트 (Hono + Cloudflare Pages)
│   ├── public/static/  # 이미지, CSS 등 정적 파일
│   ├── src/
│   │   └── index.tsx   # 메인 앱 (라이브 카지노, 슬롯머신 UI)
│   ├── package.json
│   ├── vite.config.ts
│   ├── wrangler.jsonc
│   └── tsconfig.json
├── admin-site/       # 관리자 대시보드 (Hono + Cloudflare Pages)
│   ├── src/
│   │   ├── index.tsx           # 어드민 UI (대시보드, 회원·공지 관리)
│   │   ├── types.ts            # 공유 타입 정의
│   │   └── routes/
│   │       ├── auth.ts         # 로그인 API
│   │       ├── users.ts        # 회원 CRUD API
│   │       ├── notices.ts      # 공지/이벤트 CRUD API
│   │       └── stats.ts        # 통계 + DB 초기화 API
│   ├── package.json
│   ├── vite.config.ts
│   ├── wrangler.jsonc
│   └── tsconfig.json
└── README.md
```

## 공유 데이터베이스 구조

두 사이트가 **동일한 Cloudflare D1 DB**를 바인딩합니다.

```sql
-- 회원 테이블
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',   -- active | suspended | pending
  balance INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 공지/이벤트 테이블
CREATE TABLE notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  type TEXT DEFAULT 'notice',      -- notice | event
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 어드민 API 엔드포인트

| Method | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 관리자 로그인 |
| GET | `/api/users` | 회원 목록 조회 |
| POST | `/api/users` | 회원 추가 |
| PUT | `/api/users/:id` | 회원 정보 수정 |
| DELETE | `/api/users/:id` | 회원 삭제 |
| GET | `/api/notices` | 공지/이벤트 목록 |
| POST | `/api/notices` | 공지/이벤트 등록 |
| PUT | `/api/notices/:id` | 공지 수정 |
| DELETE | `/api/notices/:id` | 공지 삭제 |
| GET | `/api/stats` | 대시보드 통계 |
| POST | `/api/stats/init-db` | DB 테이블 초기화 |

## 연동 설정 방법

### 1. Cloudflare D1 데이터베이스 생성

```bash
# 공유 DB 생성 (한 번만)
npx wrangler d1 create casino-production
# → database_id를 복사해 두 wrangler.jsonc에 동일하게 설정
```

### 2. wrangler.jsonc에 D1 binding 추가 (두 사이트 동일하게)

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "casino-production",
    "database_id": "YOUR_DATABASE_ID"   // ← 위에서 복사한 ID
  }
]
```

### 3. DB 테이블 초기화

```bash
# 어드민 사이트 배포 후 API로 초기화
curl -X POST https://admin-site.pages.dev/api/stats/init-db \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. 관리자 계정 설정 (wrangler secret)

```bash
cd admin-site
npx wrangler pages secret put ADMIN_USER   # 관리자 ID
npx wrangler pages secret put ADMIN_PASS   # 관리자 비밀번호 (기본값: admin1234)
```

## 로컬 개발

```bash
# user-site
cd user-site && npm install && npm run build
pm2 start ecosystem.config.cjs   # port 3000

# admin-site
cd admin-site && npm install && npm run build
pm2 start ecosystem.config.cjs   # port 3001
```

## 배포 (Cloudflare Pages)

```bash
# user-site 배포
cd user-site && npm run build
npx wrangler pages deploy dist --project-name user-site

# admin-site 배포
cd admin-site && npm run build
npx wrangler pages deploy dist --project-name admin-site
```

## 기술 스택

- **Framework**: Hono (Cloudflare Workers)
- **Build**: Vite + @hono/vite-build
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages
- **Frontend**: Tailwind CSS (CDN) + FontAwesome
