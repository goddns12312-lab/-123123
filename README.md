# 카지노 플랫폼 백엔드 — 완전 무료 스택

> **Node.js + Express + Supabase(PostgreSQL) + Render**  
> 신용카드 없이, 완전 무료로 운영 가능한 풀스택 REST API

---

## 💰 무료 서비스 구성

| 서비스 | 역할 | 무료 한도 |
|--------|------|-----------|
| **[Supabase](https://supabase.com)** | PostgreSQL DB | 0.5GB DB, 월 50,000 API 요청, 2개 프로젝트 |
| **[Render](https://render.com)** | Node.js 서버 호스팅 | 월 750시간, 512MB 메모리 |
| **[Cloudflare Pages](https://pages.cloudflare.com)** | 프론트엔드(user/admin) | 무제한 |

---

## 📁 백엔드 디렉토리 구조

```
backend/
├── src/
│   ├── index.js                 ← Express 앱 진입점 (port 4000)
│   ├── config/
│   │   └── database.js          ← Supabase 클라이언트 설정
│   ├── middleware/
│   │   ├── auth.js              ← JWT 인증 + 관리자 권한
│   │   ├── validate.js          ← express-validator 헬퍼
│   │   └── errorHandler.js      ← 전역 에러 핸들러
│   ├── routes/
│   │   ├── auth.js              ← 회원가입/로그인 API
│   │   ├── users.js             ← 회원 CRUD API
│   │   ├── notices.js           ← 공지/이벤트 API
│   │   └── stats.js             ← 대시보드 통계 API
│   └── utils/
│       ├── migrate.js           ← 테이블 생성 SQL 가이드
│       └── seed.js              ← 테스트 데이터 삽입
├── package.json
└── .env.example                 ← 환경변수 템플릿
```

---

## 🔌 전체 API 엔드포인트

### 인증 (Auth)
| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/auth/register` | 회원가입 | ❌ |
| POST | `/api/auth/login` | 유저 로그인 (JWT) | ❌ |
| POST | `/api/auth/admin/login` | 관리자 로그인 | ❌ |
| GET  | `/api/auth/me` | 내 정보 조회 | ✅ JWT |
| POST | `/api/auth/logout` | 로그아웃 | ✅ JWT |

### 회원 (Users)
| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET    | `/api/users` | 회원 목록 (검색·페이지) | ✅ 관리자 |
| GET    | `/api/users/me` | 내 정보 | ✅ JWT |
| GET    | `/api/users/:id` | 특정 회원 조회 | ✅ 관리자 |
| POST   | `/api/users` | 회원 추가 | ✅ 관리자 |
| PUT    | `/api/users/me` | 내 정보 수정 | ✅ JWT |
| PUT    | `/api/users/:id` | 회원 수정 | ✅ 관리자 |
| DELETE | `/api/users/me` | 회원 탈퇴 | ✅ JWT |
| DELETE | `/api/users/:id` | 회원 강제 삭제 | ✅ 관리자 |
| PATCH  | `/api/users/:id/status` | 상태 변경 | ✅ 관리자 |

### 공지/이벤트 (Notices)
| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET    | `/api/notices` | 공지 목록 (공개) | ❌ |
| GET    | `/api/notices/:id` | 공지 상세 | ❌ |
| POST   | `/api/notices` | 공지 등록 | ✅ 관리자 |
| PUT    | `/api/notices/:id` | 공지 수정 | ✅ 관리자 |
| DELETE | `/api/notices/:id` | 공지 삭제 | ✅ 관리자 |
| PATCH  | `/api/notices/:id/toggle` | 활성/비활성 토글 | ✅ 관리자 |

### 통계 (Stats)
| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET    | `/api/stats` | 대시보드 통계 | ✅ 관리자 |
| POST   | `/api/stats/init-db` | 테이블 생성 SQL 반환 | ✅ 관리자 |

---

## 🛠️ 1단계 — Supabase 프로젝트 설정

### 1-1. 프로젝트 생성

1. [https://supabase.com](https://supabase.com) → **"Start your project"** (GitHub 로그인)
2. **"New Project"** 클릭
3. 설정:
   - **Name**: `casino-production`
   - **Database Password**: 안전한 비밀번호 설정 후 복사 보관
   - **Region**: `Northeast Asia (Seoul)` 선택 ← 한국 최저 지연
4. **"Create new project"** → 약 2분 대기

### 1-2. 연결 정보(API Keys) 확인

```
Supabase Dashboard
  → 프로젝트 선택
  → 좌측 메뉴 ⚙️ Settings
  → API 탭
```

복사할 정보:

| 항목 | 위치 | .env 변수명 |
|------|------|------------|
| Project URL | "Project URL" 섹션 | `SUPABASE_URL` |
| service_role key | "Project API keys" → service_role | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **`service_role` key는 DB의 모든 권한을 가집니다!**  
> 절대 클라이언트(브라우저)에 노출하거나 공개 저장소에 커밋하지 마세요.

### 1-3. 테이블 생성 (SQL Editor 사용)

```
Supabase Dashboard
  → SQL Editor (좌측 메뉴 아이콘)
  → + New Query
  → 아래 SQL 전체 복사 후 붙여넣기
  → ▶ Run 클릭
```

```sql
-- ① users 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id            BIGSERIAL    PRIMARY KEY,
  username      VARCHAR(30)  UNIQUE NOT NULL,
  email         VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  phone         VARCHAR(20)  DEFAULT '',
  status        TEXT         DEFAULT 'pending'
                             CHECK (status IN ('active','suspended','pending')),
  balance       INTEGER      DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_status     ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- ② notices 테이블
CREATE TABLE IF NOT EXISTS public.notices (
  id         BIGSERIAL    PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         DEFAULT '',
  type       TEXT         DEFAULT 'notice'
                          CHECK (type IN ('notice','event')),
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notices_type      ON public.notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON public.notices(is_active);

-- ③ RLS 비활성화 (백엔드 service_role key로 접근)
ALTER TABLE public.users   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices DISABLE ROW LEVEL SECURITY;
```

실행 후 `Success. No rows returned` 메시지가 나오면 성공입니다.

### 1-4. 테이블 확인

```
Dashboard → Table Editor → users, notices 테이블 확인
```

---

## 💻 2단계 — 로컬 개발 실행

```bash
# 백엔드 폴더로 이동
cd backend

# 1. 환경변수 파일 생성
cp .env.example .env
```

`.env` 파일 편집:

```env
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

JWT_SECRET=최소32자이상랜덤문자열여기에입력하세요!!
ADMIN_USER=admin
ADMIN_PASS=안전한관리자비밀번호
```

```bash
# 2. 의존성 설치
npm install

# 3. 연결 확인 & 테이블 SQL 가이드 출력 (1단계가 완료된 경우 연결 성공)
npm run migrate

# 4. 테스트 데이터 삽입 (선택)
npm run seed

# 5. 개발 서버 실행 (자동 재시작)
npm run dev

# 또는 일반 실행
npm start
```

서버 확인:
```bash
curl http://localhost:4000/health
# → {"status":"ok","service":"casino-backend","db":"supabase-postgresql",...}
```

---

## 🔧 3단계 — API 사용 예시

### 회원가입
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "pass1234",
    "phone": "010-1234-5678"
  }'
```
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "data": { "id": 6, "username": "newuser", "email": "newuser@example.com", "token": "eyJhbGci..." }
}
```

### 로그인
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "pass1234"}'
```

### 회원 목록 조회 (관리자)
```bash
# 1. 관리자 로그인 → 토큰 획득
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 2. 회원 목록
curl "http://localhost:4000/api/users?page=1&limit=20&status=active" \
  -H "Authorization: Bearer $TOKEN"
```

### 회원 상태 변경 (관리자)
```bash
curl -X PATCH http://localhost:4000/api/users/3/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended"}'
```

### 테이블 생성 SQL 가이드 조회
```bash
curl -X POST http://localhost:4000/api/stats/init-db \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 4단계 — Render 배포

### 4-1. GitHub 푸시

```bash
git add .
git commit -m "feat: migrate to Supabase PostgreSQL (free tier)"
git push origin main
```

### 4-2. Render 서비스 생성

#### 방법 A — render.yaml 자동 감지 (권장)

1. [dashboard.render.com](https://dashboard.render.com) 접속
2. **"New +"** → **"Blueprint"** 클릭
3. GitHub 저장소 `goddns12312-lab/-123123` 연결
4. `render.yaml` 자동 감지 → **"Apply"** 클릭

#### 방법 B — 수동 생성

1. **"New +"** → **"Web Service"**
2. GitHub 저장소 연결
3. 설정:

| 항목 | 값 |
|------|-----|
| Name | `casino-backend` |
| **Root Directory** | `backend` ← 반드시 입력! |
| Environment | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | `Free` |

### 4-3. 환경변수 설정 (필수!)

```
Render 대시보드 → casino-backend → Environment 탭 → Add Environment Variable
```

| Key | Value | 비고 |
|-----|-------|------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase Settings → API → service_role |
| `JWT_SECRET` | 랜덤 32자+ 문자열 | `openssl rand -base64 32` |
| `ADMIN_USER` | 관리자 아이디 | |
| `ADMIN_PASS` | 관리자 비밀번호 | |
| `ALLOWED_ORIGINS` | `https://user-site.pages.dev,...` | 실제 배포 URL |
| `NODE_ENV` | `production` | |

### 4-4. 배포 확인

```bash
curl https://casino-backend.onrender.com/health
# → {"status":"ok","service":"casino-backend","db":"supabase-postgresql",...}
```

---

## ⚠️ 무료 플랜 주의사항 & 해결책

### Supabase 무료 플랜

| 제한 | 내용 | 해결책 |
|------|------|--------|
| **7일 비활성 정지** | 7일간 요청이 없으면 프로젝트 일시정지 | Render health check가 자동으로 주기적 요청 → 비활성 방지 |
| DB 용량 | 0.5GB | 카지노 플랫폼 초기 운영에 충분 |
| 월 API 요청 | 50,000건 (무료) | 트래픽 증가 시 Pro 플랜 고려 |
| 프로젝트 수 | 2개 (무료) | 현재 1개 사용 |

> 💡 **정지 방지**: Supabase Dashboard → Settings → General → "Pause project" 섹션에서  
> `"Pause on inactivity"` 옵션이 있으면 비활성화하거나, UptimeRobot으로 14분마다 /health 핑 설정

### Render 무료 플랜

| 제한 | 내용 | 해결책 |
|------|------|--------|
| **Cold Start** | 15분 비활성 후 첫 요청 30~60초 딜레이 | UptimeRobot으로 14분마다 /health 핑 |
| 월 사용량 | 750시간 (서비스 1개면 상시 가동 가능) | |
| 메모리 | 512MB | Node.js 백엔드로 충분 |

### UptimeRobot 무료 설정 (Cold Start 방지)

1. [uptimerobot.com](https://uptimerobot.com) 무료 가입
2. **"Add New Monitor"** 클릭
3. 설정:
   - Monitor Type: `HTTP(s)`
   - URL: `https://casino-backend.onrender.com/health`
   - Monitoring Interval: `14 minutes`
4. Save → Render Cold Start 완전 해결!

---

## 🔐 보안 체크리스트

- [ ] `.env` 파일을 절대 git commit 하지 않기 (`.gitignore` 확인)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 를 클라이언트에 노출하지 않기
- [ ] `JWT_SECRET` 을 32자 이상 랜덤 문자열로 설정
  ```bash
  # 안전한 JWT_SECRET 생성
  openssl rand -base64 32
  ```
- [ ] `ADMIN_PASS` 를 추측 불가능한 비밀번호로 변경
- [ ] Supabase RLS (Row Level Security) 정책 검토 (필요 시 활성화)
- [ ] Render 환경변수에 민감 정보 직접 입력 (YAML에 포함 금지)

---

## 🛠️ 기술 스택

| 구분 | 기술 | 비용 |
|------|------|------|
| Runtime | Node.js 20+ | 무료 |
| Framework | Express 4 | 무료 |
| Database | Supabase PostgreSQL | **무료** |
| SDK | @supabase/supabase-js | 무료 |
| 인증 | JWT + bcryptjs | 무료 |
| 유효성검사 | express-validator | 무료 |
| 보안 | helmet, cors, rate-limit | 무료 |
| 호스팅 | Render Web Service | **무료** |
| 프론트엔드 | Cloudflare Pages | **무료** |

---

## 🔄 트러블슈팅

### `SUPABASE_URL이 설정되지 않았습니다` 경고
`.env` 파일에 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 정확히 입력되었는지 확인하세요.

### `Row not found` 오류
Supabase `.single()` 메서드는 결과가 없으면 에러를 반환합니다.  
API가 404를 반환하면 정상 동작입니다.

### Supabase `permission denied for table users`
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE public.users   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices DISABLE ROW LEVEL SECURITY;
```
또는 `service_role` key 대신 `anon` key를 사용 중인 경우 `service_role` key로 교체하세요.

### Render 배포 시 `Cannot find module` 오류
`render.yaml`의 `rootDir: backend` 설정과 Render 대시보드의 **Root Directory** 가 `backend`인지 확인하세요.

### CORS 오류
`ALLOWED_ORIGINS` 환경변수에 프론트엔드의 실제 배포 URL을 추가하세요.
```
ALLOWED_ORIGINS=https://user-site.pages.dev,https://admin-site.pages.dev
```
