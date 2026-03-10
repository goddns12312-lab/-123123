-- ================================================================
-- seed.sql  –  로컬 개발용 테스트 데이터
-- 명령: npx wrangler d1 execute casino-production --local --file=./seed.sql
-- ================================================================

INSERT OR IGNORE INTO users (username, nickname, password, email, phone, exchange_password, status, balance) VALUES
  ('user01',   '홍길동',   'pass1234', 'user01@example.com',  '010-1234-5678', '1111', 'active',    50000),
  ('hong99',   '홍구구',   'pass1234', 'hong@example.com',    '010-9876-5432', '2222', 'active',   120000),
  ('test123',  '테스터',   'pass1234', 'test@example.com',    '010-0000-1111', '3333', 'pending',       0),
  ('vip_kim',  'VIP김',    'pass1234', 'kim@vip.com',         '010-5555-6666', '4444', 'active',   980000),
  ('blocked1', '차단유저', 'pass1234', 'block@example.com',   '010-1111-2222', '5555', 'suspended',     0);

INSERT OR IGNORE INTO notices (title, content, type, is_active) VALUES
  ('서비스 점검 안내',      '3월 10일 새벽 2시~4시 서버 점검이 있습니다.', 'notice', 1),
  ('신규 회원 가입 이벤트', '가입 시 5만 포인트 지급!',                   'event',  1),
  ('봄 시즌 보너스',        '3월 한 달간 첫 충전 100% 보너스 지급.',       'event',  1),
  ('이용약관 변경 안내',    '2026년 2월 1일자로 이용약관이 변경되었습니다.','notice', 0);
