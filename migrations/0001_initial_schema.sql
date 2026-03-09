-- ================================================================
-- 0001_initial_schema.sql
-- casino-production 공유 데이터베이스 초기 스키마
-- user-site / admin-site 양쪽에서 동일하게 사용합니다.
-- ================================================================

-- ── 회원 테이블 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  username    TEXT     UNIQUE NOT NULL,
  email       TEXT     NOT NULL,
  phone       TEXT     DEFAULT '',
  status      TEXT     DEFAULT 'pending',  -- active | suspended | pending
  balance     INTEGER  DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_status     ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ── 공지 / 이벤트 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  title       TEXT     NOT NULL,
  content     TEXT     DEFAULT '',
  type        TEXT     DEFAULT 'notice',   -- notice | event
  is_active   INTEGER  DEFAULT 1,          -- 1=활성, 0=비활성
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notices_type      ON notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON notices(is_active);
