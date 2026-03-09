-- ================================================================
-- seed.sql  –  로컬 개발용 테스트 데이터
-- 명령: npx wrangler d1 execute casino-production --local --file=./seed.sql
-- ================================================================

INSERT OR IGNORE INTO users (username, email, phone, status, balance) VALUES
  ('user01',   'user01@example.com',  '010-1234-5678', 'active',    50000),
  ('hong99',   'hong@example.com',    '010-9876-5432', 'active',   120000),
  ('test123',  'test@example.com',    '010-0000-1111', 'pending',       0),
  ('vip_kim',  'kim@vip.com',         '010-5555-6666', 'active',   980000),
  ('blocked1', 'block@example.com',   '010-1111-2222', 'suspended',     0);

INSERT OR IGNORE INTO notices (title, content, type, is_active) VALUES
  ('서비스 점검 안내',      '3월 10일 새벽 2시~4시 서버 점검이 있습니다.', 'notice', 1),
  ('신규 회원 가입 이벤트', '가입 시 5만 포인트 지급!',                   'event',  1),
  ('봄 시즌 보너스',        '3월 한 달간 첫 충전 100% 보너스 지급.',       'event',  1),
  ('이용약관 변경 안내',    '2026년 2월 1일자로 이용약관이 변경되었습니다.','notice', 0);
