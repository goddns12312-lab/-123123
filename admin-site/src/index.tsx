import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'

// API 라우터
import { usersRoute } from './routes/users'
import { noticesRoute } from './routes/notices'
import { statsRoute } from './routes/stats'
import { authRoute } from './routes/auth'

const app = new Hono<{ Bindings: Bindings }>()

// ── CORS (user-site에서 admin API 호출 가능) ──────────
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'https://user-site.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// ── 정적 파일 ─────────────────────────────────────────
app.use('/static/*', serveStatic({ root: './public' }))

// ── API 라우트 ────────────────────────────────────────
app.route('/api/auth',    authRoute)
app.route('/api/users',   usersRoute)
app.route('/api/notices', noticesRoute)
app.route('/api/stats',   statsRoute)

// ── 헬스체크 ─────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', site: 'admin' }))

// ── 어드민 대시보드 UI (모든 경로 → SPA) ──────────────
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>어드민 대시보드</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    :root {
      --gold: #c8a84b;
      --gold-dim: #8a6c2a;
      --bg: #0a0800;
      --surface: #14120a;
      --border: rgba(200,168,75,0.2);
    }
    body { background: var(--bg); color: #e8e0cc; font-family: 'Segoe UI', sans-serif; margin: 0; }
    .sidebar { width: 240px; background: var(--surface); border-right: 1px solid var(--border); height: 100vh; position: fixed; top: 0; left: 0; display: flex; flex-direction: column; }
    .logo { padding: 20px; border-bottom: 1px solid var(--border); font-size: 1.1rem; font-weight: 700; color: var(--gold); }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 12px 20px; cursor: pointer; transition: all 0.2s; color: #b0a080; font-size: 0.9rem; }
    .nav-item:hover, .nav-item.active { background: rgba(200,168,75,0.08); color: var(--gold); border-left: 3px solid var(--gold); }
    .main { margin-left: 240px; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
    .page-title { font-size: 1.3rem; font-weight: 700; color: var(--gold); }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; }
    .stat-label { font-size: 0.75rem; color: #888; margin-bottom: 6px; }
    .stat-value { font-size: 1.6rem; font-weight: 700; color: var(--gold); }
    .stat-change { font-size: 0.72rem; margin-top: 4px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 16px; }
    .card-title { font-size: 0.9rem; font-weight: 600; color: var(--gold); margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th { text-align: left; padding: 10px 12px; color: #888; border-bottom: 1px solid var(--border); font-weight: 500; }
    td { padding: 10px 12px; border-bottom: 1px solid rgba(200,168,75,0.06); }
    tr:hover td { background: rgba(200,168,75,0.03); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; font-weight: 600; }
    .badge-active { background: rgba(74,222,128,0.15); color: #4ade80; }
    .badge-suspended { background: rgba(248,113,113,0.15); color: #f87171; }
    .badge-pending { background: rgba(251,191,36,0.15); color: #fbbf24; }
    .btn { padding: 7px 16px; border-radius: 5px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-gold { background: linear-gradient(135deg, var(--gold), var(--gold-dim)); color: #000; }
    .btn-outline { background: transparent; border: 1px solid var(--border); color: #b0a080; }
    .btn:hover { opacity: 0.85; transform: translateY(-1px); }
    input, select, textarea { background: #1a1800; border: 1px solid var(--border); color: #e8e0cc; padding: 8px 12px; border-radius: 5px; font-size: 0.84rem; width: 100%; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--gold); }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: none; z-index: 100; justify-content: center; align-items: center; }
    .modal-overlay.open { display: flex; }
    .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 28px; width: 420px; max-width: 90vw; }
    .modal-title { font-size: 1rem; font-weight: 700; color: var(--gold); margin-bottom: 18px; }
    .form-row { margin-bottom: 12px; }
    .form-label { font-size: 0.78rem; color: #888; margin-bottom: 4px; display: block; }
    .login-wrap { min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .login-box { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 36px; width: 360px; text-align: center; }
    .login-title { font-size: 1.4rem; font-weight: 700; color: var(--gold); margin-bottom: 6px; }
    .login-sub { font-size: 0.82rem; color: #888; margin-bottom: 24px; }
    #toast { position: fixed; bottom: 24px; right: 24px; background: #1a1800; border: 1px solid var(--gold); color: var(--gold); padding: 12px 20px; border-radius: 8px; font-size: 0.85rem; display: none; z-index: 999; }
  </style>
</head>
<body>

<!-- 로그인 화면 -->
<div id="login-screen">
  <div class="login-wrap">
    <div class="login-box">
      <div class="login-title"><i class="fas fa-shield-alt"></i> 어드민</div>
      <div class="login-sub">관리자 전용 페이지</div>
      <div class="form-row"><input type="text" id="login-id" placeholder="관리자 ID" /></div>
      <div class="form-row" style="margin-bottom:20px"><input type="password" id="login-pw" placeholder="비밀번호" /></div>
      <button class="btn btn-gold" style="width:100%;padding:11px" onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> 로그인</button>
      <div id="login-err" style="color:#f87171;font-size:0.8rem;margin-top:10px;display:none">ID 또는 비밀번호가 올바르지 않습니다.</div>
    </div>
  </div>
</div>

<!-- 어드민 메인 -->
<div id="admin-main" style="display:none">
  <!-- 사이드바 -->
  <div class="sidebar">
    <div class="logo"><i class="fas fa-crown"></i> 카지노 어드민</div>
    <nav style="flex:1;padding-top:8px">
      <div class="nav-item active" onclick="showPage('dashboard')"><i class="fas fa-chart-line fa-fw"></i> 대시보드</div>
      <div class="nav-item" onclick="showPage('users')"><i class="fas fa-users fa-fw"></i> 회원 관리</div>
      <div class="nav-item" onclick="showPage('notices')"><i class="fas fa-bullhorn fa-fw"></i> 공지 관리</div>
      <div class="nav-item" onclick="showPage('events')"><i class="fas fa-gift fa-fw"></i> 이벤트 관리</div>
      <div class="nav-item" onclick="showPage('settings')"><i class="fas fa-cog fa-fw"></i> 사이트 설정</div>
    </nav>
    <div style="padding:16px;border-top:1px solid var(--border)">
      <div style="font-size:0.75rem;color:#666;margin-bottom:8px">관리자 계정</div>
      <div style="font-size:0.82rem;color:var(--gold);margin-bottom:10px"><i class="fas fa-user-shield"></i> admin</div>
      <button class="btn btn-outline" style="width:100%" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i> 로그아웃</button>
    </div>
  </div>

  <!-- 메인 콘텐츠 -->
  <div class="main">
    <!-- 대시보드 -->
    <div id="page-dashboard">
      <div class="header">
        <div class="page-title"><i class="fas fa-chart-line"></i> 대시보드</div>
        <div style="font-size:0.8rem;color:#666" id="last-updated"></div>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">전체 회원</div>
          <div class="stat-value" id="stat-users">-</div>
          <div class="stat-change" style="color:#4ade80">↑ 오늘 +3</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">활성 회원</div>
          <div class="stat-value" id="stat-active">-</div>
          <div class="stat-change" style="color:#4ade80">↑ 전일 대비 +2%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">오늘 신규 가입</div>
          <div class="stat-value" id="stat-new">-</div>
          <div class="stat-change" style="color:#fbbf24">→ 어제와 동일</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">공지 / 이벤트</div>
          <div class="stat-value" id="stat-notices">-</div>
          <div class="stat-change" style="color:#888">활성 게시물</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><i class="fas fa-users"></i> 최근 가입 회원</div>
        <table>
          <thead><tr><th>ID</th><th>아이디</th><th>이메일</th><th>상태</th><th>가입일</th></tr></thead>
          <tbody id="recent-users-tbody"><tr><td colspan="5" style="text-align:center;color:#666;padding:20px">데이터 없음</td></tr></tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-title"><i class="fas fa-bullhorn"></i> 최근 공지</div>
        <table>
          <thead><tr><th>ID</th><th>제목</th><th>유형</th><th>상태</th><th>날짜</th></tr></thead>
          <tbody id="recent-notices-tbody"><tr><td colspan="5" style="text-align:center;color:#666;padding:20px">데이터 없음</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- 회원 관리 -->
    <div id="page-users" style="display:none">
      <div class="header">
        <div class="page-title"><i class="fas fa-users"></i> 회원 관리</div>
        <button class="btn btn-gold" onclick="openAddUserModal()"><i class="fas fa-plus"></i> 회원 추가</button>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;gap:10px">
          <input type="text" id="user-search" placeholder="아이디 / 이메일 검색..." style="max-width:280px" oninput="filterUsers()">
          <select id="user-status-filter" onchange="filterUsers()" style="max-width:140px">
            <option value="">전체 상태</option>
            <option value="active">활성</option>
            <option value="suspended">정지</option>
            <option value="pending">대기</option>
          </select>
        </div>
      </div>
      <div class="card">
        <table>
          <thead><tr><th>ID</th><th>아이디</th><th>이메일</th><th>연락처</th><th>상태</th><th>잔액</th><th>가입일</th><th>관리</th></tr></thead>
          <tbody id="users-tbody"><tr><td colspan="8" style="text-align:center;color:#666;padding:20px">로딩 중...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- 공지 관리 -->
    <div id="page-notices" style="display:none">
      <div class="header">
        <div class="page-title"><i class="fas fa-bullhorn"></i> 공지 관리</div>
        <button class="btn btn-gold" onclick="openAddNoticeModal()"><i class="fas fa-plus"></i> 공지 작성</button>
      </div>
      <div class="card">
        <table>
          <thead><tr><th>ID</th><th>제목</th><th>유형</th><th>상태</th><th>작성일</th><th>관리</th></tr></thead>
          <tbody id="notices-tbody"><tr><td colspan="6" style="text-align:center;color:#666;padding:20px">로딩 중...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- 이벤트 관리 -->
    <div id="page-events" style="display:none">
      <div class="header">
        <div class="page-title"><i class="fas fa-gift"></i> 이벤트 관리</div>
        <button class="btn btn-gold" onclick="openAddNoticeModal('event')"><i class="fas fa-plus"></i> 이벤트 작성</button>
      </div>
      <div class="card">
        <table>
          <thead><tr><th>ID</th><th>제목</th><th>유형</th><th>상태</th><th>작성일</th><th>관리</th></tr></thead>
          <tbody id="events-tbody"><tr><td colspan="6" style="text-align:center;color:#666;padding:20px">로딩 중...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- 사이트 설정 -->
    <div id="page-settings" style="display:none">
      <div class="header">
        <div class="page-title"><i class="fas fa-cog"></i> 사이트 설정</div>
      </div>
      <div class="card">
        <div class="card-title">API 연동 정보</div>
        <div style="font-size:0.82rem;color:#b0a080;line-height:1.8">
          <div>User Site API: <span style="color:var(--gold)" id="user-site-url">-</span></div>
          <div>Admin Site API: <span style="color:var(--gold)" id="admin-site-url">-</span></div>
          <div style="margin-top:12px;padding:12px;background:rgba(200,168,75,0.05);border-radius:6px;border:1px solid var(--border)">
            <div style="color:var(--gold);margin-bottom:6px;font-weight:600"><i class="fas fa-database"></i> 공유 DB 구조</div>
            <div style="color:#888;font-size:0.78rem">user-site와 admin-site는 동일한 Cloudflare D1 데이터베이스를 공유합니다.</div>
            <div style="color:#888;font-size:0.78rem;margin-top:4px">wrangler.jsonc의 d1_databases binding ID를 동일하게 설정하세요.</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">데이터베이스 초기화</div>
        <div style="font-size:0.82rem;color:#888;margin-bottom:12px">공유 D1 데이터베이스 테이블을 초기화합니다.</div>
        <button class="btn btn-gold" onclick="initDb()"><i class="fas fa-database"></i> DB 초기화 (DDL 실행)</button>
      </div>
    </div>
  </div>
</div>

<!-- 회원 추가 모달 -->
<div class="modal-overlay" id="user-modal">
  <div class="modal">
    <div class="modal-title"><i class="fas fa-user-plus"></i> 회원 추가</div>
    <div class="form-row"><label class="form-label">아이디</label><input type="text" id="new-username" placeholder="아이디"></div>
    <div class="form-row"><label class="form-label">이메일</label><input type="email" id="new-email" placeholder="email@example.com"></div>
    <div class="form-row"><label class="form-label">연락처</label><input type="text" id="new-phone" placeholder="010-0000-0000"></div>
    <div class="form-row" style="margin-bottom:20px"><label class="form-label">상태</label>
      <select id="new-status"><option value="pending">대기</option><option value="active">활성</option><option value="suspended">정지</option></select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="closeModal('user-modal')">취소</button>
      <button class="btn btn-gold" onclick="addUser()">추가</button>
    </div>
  </div>
</div>

<!-- 공지 작성 모달 -->
<div class="modal-overlay" id="notice-modal">
  <div class="modal">
    <div class="modal-title" id="notice-modal-title"><i class="fas fa-bullhorn"></i> 공지 작성</div>
    <input type="hidden" id="notice-type-hidden" value="notice">
    <div class="form-row"><label class="form-label">제목</label><input type="text" id="new-notice-title" placeholder="공지 제목"></div>
    <div class="form-row"><label class="form-label">내용</label><textarea id="new-notice-content" rows="4" placeholder="공지 내용을 입력하세요..."></textarea></div>
    <div class="form-row" style="margin-bottom:20px"><label class="form-label">상태</label>
      <select id="new-notice-active"><option value="1">활성</option><option value="0">비활성</option></select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-outline" onclick="closeModal('notice-modal')">취소</button>
      <button class="btn btn-gold" onclick="addNotice()">등록</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
// ── 상태 ──────────────────────────────────────────────
const API_BASE = window.location.origin
let users = []
let notices = []
let filteredUsers = []

// ── 로그인 ────────────────────────────────────────────
async function doLogin() {
  const id = document.getElementById('login-id').value.trim()
  const pw = document.getElementById('login-pw').value.trim()

  try {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: id, password: pw })
    })
    const data = await res.json()
    if (data.success) {
      sessionStorage.setItem('admin_token', data.data.token)
      document.getElementById('login-screen').style.display = 'none'
      document.getElementById('admin-main').style.display = 'block'
      loadDashboard()
    } else {
      document.getElementById('login-err').style.display = 'block'
    }
  } catch {
    // API 미연결 시 데모 모드
    if (id === 'admin' && pw === 'admin1234') {
      sessionStorage.setItem('admin_token', 'demo-token')
      document.getElementById('login-screen').style.display = 'none'
      document.getElementById('admin-main').style.display = 'block'
      loadDashboard()
    } else {
      document.getElementById('login-err').style.display = 'block'
    }
  }
}

function doLogout() {
  sessionStorage.removeItem('admin_token')
  document.getElementById('login-screen').style.display = 'block'
  document.getElementById('admin-main').style.display = 'none'
}

// Enter 키로 로그인
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin()
})

// ── 페이지 전환 ───────────────────────────────────────
function showPage(name) {
  ['dashboard','users','notices','events','settings'].forEach(p => {
    const el = document.getElementById('page-' + p)
    if (el) el.style.display = p === name ? 'block' : 'none'
  })
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
  event.currentTarget.classList.add('active')
  if (name === 'dashboard') loadDashboard()
  if (name === 'users') loadUsers()
  if (name === 'notices') loadNoticesList('notice')
  if (name === 'events') loadNoticesList('event')
  if (name === 'settings') {
    document.getElementById('user-site-url').textContent = 'https://user-site.pages.dev/api'
    document.getElementById('admin-site-url').textContent = window.location.origin + '/api'
  }
}

// ── 대시보드 ─────────────────────────────────────────
async function loadDashboard() {
  document.getElementById('last-updated').textContent = '업데이트: ' + new Date().toLocaleTimeString('ko-KR')
  try {
    const [statsRes, usersRes, noticesRes] = await Promise.all([
      fetch(API_BASE + '/api/stats', { headers: authHeader() }),
      fetch(API_BASE + '/api/users?limit=5', { headers: authHeader() }),
      fetch(API_BASE + '/api/notices?limit=5', { headers: authHeader() }),
    ])
    if (statsRes.ok) {
      const s = (await statsRes.json()).data
      document.getElementById('stat-users').textContent = s.total_users ?? '-'
      document.getElementById('stat-active').textContent = s.active_users ?? '-'
      document.getElementById('stat-new').textContent = s.new_today ?? '-'
      document.getElementById('stat-notices').textContent = s.active_notices ?? '-'
    }
    if (usersRes.ok) {
      const list = (await usersRes.json()).data ?? []
      document.getElementById('recent-users-tbody').innerHTML = list.length ? list.map(u => \`
        <tr><td>\${u.id}</td><td>\${u.username}</td><td>\${u.email}</td>
        <td><span class="badge badge-\${u.status}">\${statusLabel(u.status)}</span></td>
        <td>\${u.created_at?.slice(0,10)??''}</td></tr>
      \`).join('') : '<tr><td colspan="5" style="text-align:center;color:#666;padding:16px">데이터 없음</td></tr>'
    }
    if (noticesRes.ok) {
      const list = (await noticesRes.json()).data ?? []
      document.getElementById('recent-notices-tbody').innerHTML = list.length ? list.map(n => \`
        <tr><td>\${n.id}</td><td>\${n.title}</td>
        <td><span class="badge" style="background:rgba(200,168,75,0.15);color:var(--gold)">\${n.type==='event'?'이벤트':'공지'}</span></td>
        <td><span class="badge \${n.is_active?'badge-active':'badge-suspended'}">\${n.is_active?'활성':'비활성'}</span></td>
        <td>\${n.created_at?.slice(0,10)??''}</td></tr>
      \`).join('') : '<tr><td colspan="5" style="text-align:center;color:#666;padding:16px">데이터 없음</td></tr>'
    }
  } catch {
    // 데모 데이터
    document.getElementById('stat-users').textContent = '247'
    document.getElementById('stat-active').textContent = '189'
    document.getElementById('stat-new').textContent = '3'
    document.getElementById('stat-notices').textContent = '5'
  }
}

// ── 회원 관리 ─────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await fetch(API_BASE + '/api/users', { headers: authHeader() })
    if (res.ok) {
      users = (await res.json()).data ?? []
      filteredUsers = [...users]
      renderUsers(filteredUsers)
      return
    }
  } catch {}
  // 데모 데이터
  users = [
    { id:1, username:'user01', email:'user01@email.com', phone:'010-1234-5678', status:'active', balance:50000, created_at:'2026-01-15' },
    { id:2, username:'hong99', email:'hong@email.com', phone:'010-9876-5432', status:'active', balance:120000, created_at:'2026-02-01' },
    { id:3, username:'test123', email:'test@email.com', phone:'010-0000-1111', status:'pending', balance:0, created_at:'2026-03-01' },
    { id:4, username:'vip_kim', email:'kim@vip.com', phone:'010-5555-6666', status:'active', balance:980000, created_at:'2026-01-05' },
    { id:5, username:'blocked01', email:'block@email.com', phone:'010-1111-2222', status:'suspended', balance:0, created_at:'2026-01-20' },
  ]
  filteredUsers = [...users]
  renderUsers(filteredUsers)
}

function renderUsers(list) {
  document.getElementById('users-tbody').innerHTML = list.length ? list.map(u => \`
    <tr>
      <td>\${u.id}</td>
      <td><strong>\${u.username}</strong></td>
      <td>\${u.email}</td>
      <td>\${u.phone??'-'}</td>
      <td><span class="badge badge-\${u.status}">\${statusLabel(u.status)}</span></td>
      <td>\${(u.balance??0).toLocaleString()}원</td>
      <td>\${u.created_at?.slice(0,10)??''}</td>
      <td>
        <button class="btn btn-outline" style="padding:4px 10px;font-size:0.75rem;margin-right:4px" onclick="toggleStatus(\${u.id})">
          \${u.status==='active'?'정지':'활성화'}
        </button>
        <button class="btn" style="padding:4px 10px;font-size:0.75rem;background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3)" onclick="deleteUser(\${u.id})">삭제</button>
      </td>
    </tr>
  \`).join('') : '<tr><td colspan="8" style="text-align:center;color:#666;padding:20px">검색 결과 없음</td></tr>'
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase()
  const s = document.getElementById('user-status-filter').value
  filteredUsers = users.filter(u =>
    (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!s || u.status === s)
  )
  renderUsers(filteredUsers)
}

async function toggleStatus(id) {
  const u = users.find(x => x.id === id)
  if (!u) return
  const newStatus = u.status === 'active' ? 'suspended' : 'active'
  try {
    await fetch(API_BASE + '/api/users/' + id, {
      method: 'PUT', headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
  } catch {}
  u.status = newStatus
  filterUsers()
  showToast('상태가 변경되었습니다.')
}

async function deleteUser(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    await fetch(API_BASE + '/api/users/' + id, { method: 'DELETE', headers: authHeader() })
  } catch {}
  users = users.filter(x => x.id !== id)
  filteredUsers = filteredUsers.filter(x => x.id !== id)
  renderUsers(filteredUsers)
  showToast('회원이 삭제되었습니다.')
}

function openAddUserModal() { document.getElementById('user-modal').classList.add('open') }

async function addUser() {
  const body = {
    username: document.getElementById('new-username').value,
    email: document.getElementById('new-email').value,
    phone: document.getElementById('new-phone').value,
    status: document.getElementById('new-status').value,
  }
  try {
    await fetch(API_BASE + '/api/users', {
      method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {}
  closeModal('user-modal')
  showToast('회원이 추가되었습니다.')
  loadUsers()
}

// ── 공지/이벤트 ───────────────────────────────────────
async function loadNoticesList(type) {
  const tbodyId = type === 'event' ? 'events-tbody' : 'notices-tbody'
  try {
    const res = await fetch(API_BASE + '/api/notices?type=' + type, { headers: authHeader() })
    if (res.ok) {
      notices = (await res.json()).data ?? []
      renderNotices(notices, tbodyId)
      return
    }
  } catch {}
  notices = [
    { id:1, title:'서비스 점검 안내', type:'notice', is_active:true, created_at:'2026-03-01' },
    { id:2, title:'신규 게임 출시 이벤트', type:'event', is_active:true, created_at:'2026-03-05' },
    { id:3, title:'보너스 이벤트 종료', type:'event', is_active:false, created_at:'2026-02-28' },
  ].filter(n => n.type === type)
  renderNotices(notices, tbodyId)
}

function renderNotices(list, tbodyId) {
  document.getElementById(tbodyId).innerHTML = list.length ? list.map(n => \`
    <tr>
      <td>\${n.id}</td>
      <td>\${n.title}</td>
      <td><span class="badge" style="background:rgba(200,168,75,0.15);color:var(--gold)">\${n.type==='event'?'이벤트':'공지'}</span></td>
      <td><span class="badge \${n.is_active?'badge-active':'badge-suspended'}">\${n.is_active?'활성':'비활성'}</span></td>
      <td>\${n.created_at?.slice(0,10)??''}</td>
      <td>
        <button class="btn btn-outline" style="padding:4px 10px;font-size:0.75rem;margin-right:4px" onclick="toggleNotice(\${n.id})">
          \${n.is_active?'비활성':'활성화'}
        </button>
        <button class="btn" style="padding:4px 10px;font-size:0.75rem;background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3)" onclick="deleteNotice(\${n.id})">삭제</button>
      </td>
    </tr>
  \`).join('') : \`<tr><td colspan="6" style="text-align:center;color:#666;padding:20px">데이터 없음</td></tr>\`
}

function openAddNoticeModal(type = 'notice') {
  document.getElementById('notice-type-hidden').value = type
  document.getElementById('notice-modal-title').innerHTML = type === 'event'
    ? '<i class="fas fa-gift"></i> 이벤트 작성'
    : '<i class="fas fa-bullhorn"></i> 공지 작성'
  document.getElementById('notice-modal').classList.add('open')
}

async function addNotice() {
  const body = {
    title: document.getElementById('new-notice-title').value,
    content: document.getElementById('new-notice-content').value,
    type: document.getElementById('notice-type-hidden').value,
    is_active: document.getElementById('new-notice-active').value === '1',
  }
  try {
    await fetch(API_BASE + '/api/notices', {
      method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {}
  closeModal('notice-modal')
  showToast('등록되었습니다.')
  loadNoticesList(body.type)
}

async function toggleNotice(id) {
  const n = notices.find(x => x.id === id)
  if (!n) return
  try {
    await fetch(API_BASE + '/api/notices/' + id, {
      method: 'PUT', headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !n.is_active })
    })
  } catch {}
  n.is_active = !n.is_active
  const tbodyId = n.type === 'event' ? 'events-tbody' : 'notices-tbody'
  renderNotices(notices, tbodyId)
  showToast('상태가 변경되었습니다.')
}

async function deleteNotice(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  const n = notices.find(x => x.id === id)
  try { await fetch(API_BASE + '/api/notices/' + id, { method: 'DELETE', headers: authHeader() }) } catch {}
  notices = notices.filter(x => x.id !== id)
  const tbodyId = n?.type === 'event' ? 'events-tbody' : 'notices-tbody'
  renderNotices(notices, tbodyId)
  showToast('삭제되었습니다.')
}

async function initDb() {
  try {
    const res = await fetch(API_BASE + '/api/stats/init-db', { method: 'POST', headers: authHeader() })
    const d = await res.json()
    showToast(d.success ? 'DB 초기화 완료!' : '오류: ' + d.error)
  } catch { showToast('DB 초기화 요청 (API 연결 필요)') }
}

// ── 유틸 ─────────────────────────────────────────────
function authHeader() { return { 'Authorization': 'Bearer ' + (sessionStorage.getItem('admin_token') || '') } }
function statusLabel(s) { return s === 'active' ? '활성' : s === 'suspended' ? '정지' : '대기' }
function closeModal(id) { document.getElementById(id).classList.remove('open') }
function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.style.display = 'block'
  setTimeout(() => t.style.display = 'none', 3000)
}

// 모달 바깥 클릭 시 닫기
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', (e) => { if (e.target === el) el.classList.remove('open') })
})
</script>
</body>
</html>`)
})

export default app
