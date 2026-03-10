import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { cors } from 'hono/cors'

type Bindings = { DB?: D1Database; KV?: KVNamespace; ADMIN_USER?: string; ADMIN_PASS?: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

/* ═══════════════════════════════════════════════
   인메모리 스토어 (D1 미연결 시 사용)
═══════════════════════════════════════════════ */
let memUsers: any[] = [
  { id:1, username:'user01',   email:'user01@example.com',  phone:'010-1234-5678', status:'active',    balance:50000,  created_at:'2026-01-15 10:00:00' },
  { id:2, username:'hong99',   email:'hong@example.com',    phone:'010-9876-5432', status:'active',    balance:120000, created_at:'2026-02-01 14:20:00' },
  { id:3, username:'test123',  email:'test@example.com',    phone:'010-0000-1111', status:'pending',   balance:0,      created_at:'2026-03-01 09:10:00' },
  { id:4, username:'vip_kim',  email:'kim@vip.com',         phone:'010-5555-6666', status:'active',    balance:980000, created_at:'2026-01-05 18:30:00' },
  { id:5, username:'blocked1', email:'block@example.com',   phone:'010-1111-2222', status:'suspended', balance:0,      created_at:'2026-01-20 11:00:00' },
  { id:6, username:'park77',   email:'park@example.com',    phone:'010-3333-4444', status:'active',    balance:75000,  created_at:'2026-02-10 16:45:00' },
  { id:7, username:'lee_s',    email:'lee@example.com',     phone:'010-7777-8888', status:'active',    balance:230000, created_at:'2026-02-20 13:00:00' },
  { id:8, username:'choi02',   email:'choi@example.com',    phone:'010-2222-3333', status:'pending',   balance:0,      created_at:'2026-03-05 08:00:00' },
]
let memNotices: any[] = [
  { id:1, title:'서비스 점검 안내',      content:'3월 10일 새벽 2~4시 점검.',    type:'notice', is_active:true,  created_at:'2026-03-01 09:00:00' },
  { id:2, title:'신규 가입 이벤트',      content:'가입 시 5만 포인트 지급!',     type:'event',  is_active:true,  created_at:'2026-03-05 10:00:00' },
  { id:3, title:'봄 시즌 보너스',        content:'첫 충전 100% 보너스.',         type:'event',  is_active:true,  created_at:'2026-03-07 12:00:00' },
  { id:4, title:'이용약관 변경 안내',    content:'2026년 2월 이용약관 변경.',    type:'notice', is_active:false, created_at:'2026-02-28 15:00:00' },
]
let memGames = {
  live: [
    { id:'live1', label:'에볼루션',   img:'/static/card_03.jpg', section:'live1' },
    { id:'live2', label:'프라그마틱', img:'/static/card_07.jpg', section:'live1' },
    { id:'live3', label:'아시아게이밍',img:'/static/card_11.jpg',section:'live1' },
    { id:'live4', label:'마이크로게이밍',img:'/static/card_05.jpg',section:'live1'},
    { id:'live5', label:'드림게임즈', img:'/static/card_09.jpg', section:'live1' },
    { id:'live6', label:'WM카지노',   img:'/static/card_01.jpg', section:'live1' },
    { id:'live7', label:'넷엔트',     img:'/static/card_06.jpg', section:'live2' },
    { id:'live8', label:'도윈카지노', img:'/static/card_12.jpg', section:'live2' },
    { id:'live9', label:'위닝',       img:'/static/card_04.jpg', section:'live2' },
    { id:'live10',label:'에즈기',     img:'/static/card_10.jpg', section:'live2' },
    { id:'live11',label:'N8 카지노',  img:'/static/card_02.jpg', section:'live2' },
    { id:'live12',label:'게임즈카지노',img:'/static/card_08.jpg',section:'live2' },
  ],
  slot: [
    { id:'slot1', label:'프라그마틱', img:'/static/card_05.jpg' },
    { id:'slot2', label:'넷엔트',     img:'/static/card_11.jpg' },
    { id:'slot3', label:'노리밋시티', img:'/static/card_03.jpg' },
    { id:'slot4', label:'핵소우',     img:'/static/card_09.jpg' },
    { id:'slot5', label:'플레이엔고', img:'/static/card_01.jpg' },
    { id:'slot6', label:'릴렉스게이밍',img:'/static/card_07.jpg'},
    { id:'slot7', label:'부운고',     img:'/static/card_02.jpg' },
    { id:'slot8', label:'CQ9',        img:'/static/card_08.jpg' },
    { id:'slot9', label:'스카이윈드', img:'/static/card_04.jpg' },
    { id:'slot10',label:'이보플레이', img:'/static/card_10.jpg' },
    { id:'slot11',label:'드래군소프트',img:'/static/card_06.jpg'},
    { id:'slot12',label:'게임아트',   img:'/static/card_12.jpg' },
  ]
}
let nextUserId = 9
let nextNoticeId = 5

/* ═══════════════════════════════════════════════
   헬퍼
═══════════════════════════════════════════════ */
const ok  = (data: any, extra?: any) => ({ success:true,  data, ...extra })
const err = (msg: string, s=400)     => new Response(JSON.stringify({success:false,error:msg}),{status:s,headers:{'Content-Type':'application/json'}})
const useDB = (c: any) => !!c.env?.DB

/* ═══════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════ */
app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json()
  const adminUser = c.env?.ADMIN_USER ?? 'admin'
  const adminPass = c.env?.ADMIN_PASS ?? 'admin1234'
  if (username === adminUser && password === adminPass)
    return c.json(ok({ token: `admin-${Date.now()}`, username: adminUser }))
  return c.json({ success:false, error:'인증 실패' }, 401)
})

/* ═══════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════ */
app.get('/api/stats', async (c) => {
  if (useDB(c)) {
    try {
      const db = c.env!.DB!
      const today = new Date().toISOString().slice(0,10)
      const [total, active, newToday, notices] = await Promise.all([
        db.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>(),
        db.prepare("SELECT COUNT(*) as n FROM users WHERE status='active'").first<{n:number}>(),
        db.prepare("SELECT COUNT(*) as n FROM users WHERE date(created_at)=?").bind(today).first<{n:number}>(),
        db.prepare("SELECT COUNT(*) as n FROM notices WHERE is_active=1").first<{n:number}>(),
      ])
      return c.json(ok({ total_users:total?.n??0, active_users:active?.n??0, new_today:newToday?.n??0, active_notices:notices?.n??0 }))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  const today = new Date().toISOString().slice(0,10)
  return c.json(ok({
    total_users:   memUsers.length,
    active_users:  memUsers.filter(u=>u.status==='active').length,
    new_today:     memUsers.filter(u=>u.created_at.startsWith(today)).length,
    active_notices:memNotices.filter(n=>n.is_active).length,
    suspended_users: memUsers.filter(u=>u.status==='suspended').length,
    pending_users:   memUsers.filter(u=>u.status==='pending').length,
    total_balance:   memUsers.reduce((s,u)=>s+u.balance,0),
  }))
})

/* ═══════════════════════════════════════════════
   USERS
═══════════════════════════════════════════════ */
app.get('/api/users', async (c) => {
  const status = c.req.query('status')
  const q      = c.req.query('q')?.toLowerCase()
  const limit  = parseInt(c.req.query('limit')?? '200')
  if (useDB(c)) {
    try {
      let sql = 'SELECT * FROM users'
      const params: any[] = []
      const wheres: string[] = []
      if (status) { wheres.push('status=?'); params.push(status) }
      if (q)      { wheres.push('(username LIKE ? OR email LIKE ?)'); params.push(`%${q}%`,`%${q}%`) }
      if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ')
      sql += ` ORDER BY created_at DESC LIMIT ${limit}`
      const r = await c.env!.DB!.prepare(sql).bind(...params).all()
      return c.json(ok(r.results, { total: r.results.length }))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  let list = [...memUsers]
  if (status) list = list.filter(u=>u.status===status)
  if (q)      list = list.filter(u=>u.username.toLowerCase().includes(q)||u.email.toLowerCase().includes(q))
  list = list.slice(0, limit)
  return c.json(ok(list, { total: list.length }))
})

app.post('/api/users', async (c) => {
  const body = await c.req.json()
  const { username, email, phone='', status='pending', balance=0 } = body
  if (!username||!email) return err('username, email 필수')
  if (useDB(c)) {
    try {
      const r = await c.env!.DB!.prepare('INSERT INTO users (username,email,phone,status,balance) VALUES (?,?,?,?,?)').bind(username,email,phone,status,balance).run()
      return c.json(ok({ id: r.meta.last_row_id }))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  if (memUsers.find(u=>u.username===username)) return err('이미 존재하는 아이디')
  const user = { id:nextUserId++, username, email, phone, status, balance, created_at: new Date().toISOString().slice(0,19).replace('T',' ') }
  memUsers.push(user)
  return c.json(ok(user))
})

app.put('/api/users/:id', async (c) => {
  const id   = parseInt(c.req.param('id'))
  const body = await c.req.json()
  if (useDB(c)) {
    try {
      const fields = Object.keys(body).map(k=>`${k}=?`).join(',')
      await c.env!.DB!.prepare(`UPDATE users SET ${fields} WHERE id=?`).bind(...Object.values(body),id).run()
      return c.json(ok(null))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  const u = memUsers.find(u=>u.id===id)
  if (!u) return err('사용자 없음', 404)
  Object.assign(u, body)
  return c.json(ok(u))
})

app.delete('/api/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (useDB(c)) {
    try { await c.env!.DB!.prepare('DELETE FROM users WHERE id=?').bind(id).run(); return c.json(ok(null)) }
    catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  memUsers = memUsers.filter(u=>u.id!==id)
  return c.json(ok(null))
})

// 머니 지급/회수
app.post('/api/users/:id/money', async (c) => {
  const id     = parseInt(c.req.param('id'))
  const { amount, type, memo='' } = await c.req.json()  // type: 'add'|'sub'
  const delta = type==='add' ? Math.abs(amount) : -Math.abs(amount)
  if (useDB(c)) {
    try {
      await c.env!.DB!.prepare('UPDATE users SET balance=MAX(0,balance+?) WHERE id=?').bind(delta,id).run()
      return c.json(ok(null))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  const u = memUsers.find(u=>u.id===id)
  if (!u) return err('사용자 없음', 404)
  u.balance = Math.max(0, u.balance + delta)
  return c.json(ok({ balance: u.balance, memo }))
})

/* ═══════════════════════════════════════════════
   NOTICES
═══════════════════════════════════════════════ */
app.get('/api/notices', async (c) => {
  const type = c.req.query('type')
  if (useDB(c)) {
    try {
      let sql = 'SELECT * FROM notices'
      const params: any[] = []
      if (type) { sql += ' WHERE type=?'; params.push(type) }
      sql += ' ORDER BY created_at DESC'
      const r = await c.env!.DB!.prepare(sql).bind(...params).all()
      return c.json(ok(r.results))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  let list = [...memNotices]
  if (type) list = list.filter(n=>n.type===type)
  return c.json(ok(list))
})

app.post('/api/notices', async (c) => {
  const { title, content='', type='notice', is_active=true } = await c.req.json()
  if (!title) return err('title 필수')
  if (useDB(c)) {
    try {
      const r = await c.env!.DB!.prepare('INSERT INTO notices (title,content,type,is_active) VALUES (?,?,?,?)').bind(title,content,type,is_active?1:0).run()
      return c.json(ok({ id: r.meta.last_row_id }))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  const notice = { id:nextNoticeId++, title, content, type, is_active, created_at: new Date().toISOString().slice(0,19).replace('T',' ') }
  memNotices.push(notice)
  return c.json(ok(notice))
})

app.put('/api/notices/:id', async (c) => {
  const id   = parseInt(c.req.param('id'))
  const body = await c.req.json()
  if (useDB(c)) {
    try {
      const vals = Object.values(body).map(v=>typeof v==='boolean'?(v?1:0):v)
      const fields = Object.keys(body).map(k=>`${k}=?`).join(',')
      await c.env!.DB!.prepare(`UPDATE notices SET ${fields} WHERE id=?`).bind(...vals,id).run()
      return c.json(ok(null))
    } catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  const n = memNotices.find(n=>n.id===id)
  if (!n) return err('공지 없음', 404)
  Object.assign(n, body)
  return c.json(ok(n))
})

app.delete('/api/notices/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (useDB(c)) {
    try { await c.env!.DB!.prepare('DELETE FROM notices WHERE id=?').bind(id).run(); return c.json(ok(null)) }
    catch(e:any){ return c.json({ success:false, error:e.message },500) }
  }
  memNotices = memNotices.filter(n=>n.id!==id)
  return c.json(ok(null))
})

/* ═══════════════════════════════════════════════
   GAMES
═══════════════════════════════════════════════ */
app.get('/api/games', (c) => c.json(ok(memGames)))

app.put('/api/games/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  const body = await c.req.json()
  const list = type === 'live' ? memGames.live : memGames.slot
  const item = list.find((g:any) => g.id === id)
  if (!item) return err('게임 없음', 404)
  Object.assign(item, body)
  return c.json(ok(item))
})

/* ═══════════════════════════════════════════════
   HEALTH
═══════════════════════════════════════════════ */
app.get('/api/health', (c) => c.json({ status:'ok', mode: useDB(c)?'D1':'memory' }))

/* ═══════════════════════════════════════════════
   UI
═══════════════════════════════════════════════ */
app.get('*', (c) => c.html(adminHTML()))

function adminHTML() { return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>어드민 대시보드</title>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:#c8a84b;--gold2:#8a6020;--gold-dim:rgba(200,168,75,0.15);
  --bg:#080600;--surface:#100e06;--surface2:#1a1800;--surface3:#221f00;
  --border:rgba(200,168,75,0.18);--border2:rgba(200,168,75,0.08);
  --text:#e8e0cc;--text2:#b0a070;--text3:#706040;
  --red:#f87171;--green:#4ade80;--yellow:#fbbf24;--blue:#60a5fa;
}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',sans-serif;font-size:14px}

/* ── SIDEBAR ── */
.sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);height:100vh;position:fixed;top:0;left:0;display:flex;flex-direction:column;z-index:10}
.logo{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--gold),var(--gold2));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#000}
.logo-text{font-size:1rem;font-weight:700;color:var(--gold)}
.logo-sub{font-size:0.65rem;color:var(--text3)}
nav{flex:1;padding:8px 0;overflow-y:auto}
.nav-group{padding:12px 16px 4px;font-size:0.65rem;color:var(--text3);letter-spacing:0.1em;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 20px;cursor:pointer;transition:all .2s;color:var(--text2);font-size:0.84rem;border-left:3px solid transparent}
.nav-item:hover{background:var(--gold-dim);color:var(--gold)}
.nav-item.active{background:var(--gold-dim);color:var(--gold);border-left-color:var(--gold)}
.nav-item i{width:16px;text-align:center}
.sidebar-footer{padding:14px 16px;border-top:1px solid var(--border)}
.admin-info{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.avatar{width:30px;height:30px;background:linear-gradient(135deg,var(--gold),var(--gold2));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#000;font-weight:700}
.admin-name{font-size:0.82rem;color:var(--gold);font-weight:600}
.admin-role{font-size:0.68rem;color:var(--text3)}
.btn-logout{width:100%;padding:7px;background:transparent;border:1px solid var(--border);color:var(--text2);border-radius:5px;cursor:pointer;font-size:0.78rem;transition:all .2s}
.btn-logout:hover{border-color:var(--red);color:var(--red)}

/* ── MAIN ── */
.main{margin-left:220px;min-height:100vh;display:flex;flex-direction:column}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:5}
.page-title{font-size:1rem;font-weight:700;color:var(--gold);display:flex;align-items:center;gap:8px}
.topbar-right{display:flex;align-items:center;gap:12px}
.mode-badge{padding:3px 10px;border-radius:20px;font-size:0.68rem;font-weight:700;background:rgba(74,222,128,0.12);color:var(--green);border:1px solid rgba(74,222,128,0.25)}
.content{padding:20px 24px;flex:1}
.page{display:none}
.page.active{display:block}

/* ── CARDS ── */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold),transparent)}
.stat-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.stat-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px}
.stat-label{font-size:0.72rem;color:var(--text3)}
.stat-value{font-size:1.7rem;font-weight:700;color:var(--gold);line-height:1}
.stat-change{font-size:0.7rem;margin-top:6px;display:flex;align-items:center;gap:4px}

/* ── TABLE CARD ── */
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;overflow:hidden}
.card-header{padding:14px 18px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between}
.card-title{font-size:0.88rem;font-weight:600;color:var(--gold);display:flex;align-items:center;gap:6px}
.card-body{padding:0}
table{width:100%;border-collapse:collapse;font-size:0.8rem}
th{padding:10px 14px;text-align:left;color:var(--text3);font-weight:500;border-bottom:1px solid var(--border2);white-space:nowrap;background:var(--surface2)}
td{padding:10px 14px;border-bottom:1px solid var(--border2);color:var(--text2)}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(200,168,75,0.03)}

/* ── BADGE ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:0.7rem;font-weight:600}
.badge-active{background:rgba(74,222,128,0.12);color:var(--green);border:1px solid rgba(74,222,128,0.2)}
.badge-suspended{background:rgba(248,113,113,0.12);color:var(--red);border:1px solid rgba(248,113,113,0.2)}
.badge-pending{background:rgba(251,191,36,0.12);color:var(--yellow);border:1px solid rgba(251,191,36,0.2)}
.badge-notice{background:rgba(96,165,250,0.12);color:var(--blue);border:1px solid rgba(96,165,250,0.2)}
.badge-event{background:rgba(200,168,75,0.12);color:var(--gold);border:1px solid rgba(200,168,75,0.2)}
.badge-on{background:rgba(74,222,128,0.12);color:var(--green);border:1px solid rgba(74,222,128,0.2)}
.badge-off{background:rgba(100,100,100,0.12);color:#666;border:1px solid rgba(100,100,100,0.2)}

/* ── BUTTONS ── */
.btn{padding:7px 14px;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;border:none;transition:all .2s;display:inline-flex;align-items:center;gap:5px}
.btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#000}
.btn-gold:hover{opacity:.85;transform:translateY(-1px)}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text2)}
.btn-outline:hover{border-color:var(--gold);color:var(--gold)}
.btn-red{background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.25);color:var(--red)}
.btn-red:hover{background:rgba(248,113,113,0.2)}
.btn-green{background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.25);color:var(--green)}
.btn-blue{background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.25);color:var(--blue)}
.btn-sm{padding:4px 10px;font-size:0.72rem}

/* ── TOOLBAR ── */
.toolbar{padding:12px 18px;border-bottom:1px solid var(--border2);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
input[type=text],input[type=email],input[type=password],input[type=number],select,textarea{
  background:var(--surface2);border:1px solid var(--border);color:var(--text);
  padding:7px 11px;border-radius:6px;font-size:0.8rem;transition:border .2s;width:100%
}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--gold)}
input[type=text].inline,input[type=number].inline,select.inline{width:auto}

/* ── MODAL ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100;display:none;justify-content:center;align-items:center}
.overlay.open{display:flex}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;width:460px;max-width:94vw;max-height:90vh;overflow-y:auto}
.modal-header{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.modal-title{font-size:0.95rem;font-weight:700;color:var(--gold);display:flex;align-items:center;gap:7px}
.modal-close{background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:2px 6px;border-radius:4px}
.modal-close:hover{color:var(--red)}
.modal-body{padding:20px}
.modal-footer{padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}
.form-row{margin-bottom:13px}
.form-label{font-size:0.75rem;color:var(--text3);margin-bottom:5px;display:block;font-weight:500}
.form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* ── LOGIN ── */
#login-screen{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(200,168,75,.08) 0%,transparent 60%),var(--bg);display:flex;justify-content:center;align-items:center;z-index:999}
.login-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:36px;width:360px;text-align:center}
.login-logo{width:52px;height:52px;background:linear-gradient(135deg,var(--gold),var(--gold2));border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#000;margin:0 auto 14px}
.login-title{font-size:1.3rem;font-weight:700;color:var(--gold);margin-bottom:4px}
.login-sub{font-size:0.78rem;color:var(--text3);margin-bottom:24px}
.login-err{color:var(--red);font-size:0.78rem;margin-top:10px;display:none}

/* ── GAME GRID ── */
.game-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;padding:16px}
.game-item{background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden;transition:all .2s}
.game-item:hover{border-color:var(--gold)}
.game-thumb{height:90px;overflow:hidden;position:relative}
.game-thumb img{width:100%;height:100%;object-fit:cover}
.game-info{padding:7px 8px}
.game-name{font-size:0.75rem;color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.game-edit-btn{width:100%;padding:4px;background:rgba(200,168,75,.1);border:none;border-top:1px solid var(--border);color:var(--gold);font-size:0.7rem;cursor:pointer;transition:all .2s}
.game-edit-btn:hover{background:rgba(200,168,75,.2)}

/* ── CHART AREA ── */
.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.mini-chart{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px}
.mini-chart-title{font-size:0.8rem;color:var(--gold);font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:6px}
.bar-list{display:flex;flex-direction:column;gap:8px}
.bar-row{display:flex;align-items:center;gap:8px;font-size:0.75rem}
.bar-label{width:90px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar-track{flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--gold),var(--gold2))}
.bar-val{width:50px;text-align:right;color:var(--text3)}

/* ── MISC ── */
.section-tabs{display:flex;gap:0;margin-bottom:16px;border:1px solid var(--border);border-radius:8px;overflow:hidden;width:fit-content}
.section-tab{padding:7px 18px;font-size:0.8rem;cursor:pointer;color:var(--text2);background:var(--surface);border:none;transition:all .2s}
.section-tab.active{background:var(--gold-dim);color:var(--gold);font-weight:600}
#toast{position:fixed;bottom:20px;right:20px;background:var(--surface2);border:1px solid var(--gold);color:var(--gold);padding:11px 18px;border-radius:8px;font-size:0.82rem;display:none;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.4)}
.empty{text-align:center;color:var(--text3);padding:30px;font-size:0.82rem}
.money-input-row{display:flex;gap:8px;align-items:center}
.divider{height:1px;background:var(--border2);margin:14px 0}
</style>
</head>
<body>

<!-- ══ LOGIN ══ -->
<div id="login-screen">
  <div class="login-card">
    <div class="login-logo"><i class="fas fa-shield-alt"></i></div>
    <div class="login-title">어드민 센터</div>
    <div class="login-sub">관리자 전용 페이지입니다</div>
    <div class="form-row"><input type="text" id="l-id" placeholder="관리자 ID" autocomplete="username"></div>
    <div class="form-row"><input type="password" id="l-pw" placeholder="비밀번호" autocomplete="current-password"></div>
    <button class="btn btn-gold" style="width:100%;padding:10px;justify-content:center;font-size:0.88rem" onclick="doLogin()">
      <i class="fas fa-sign-in-alt"></i> 로그인
    </button>
    <div class="login-err" id="l-err">아이디 또는 비밀번호가 올바르지 않습니다.</div>
  </div>
</div>

<!-- ══ SIDEBAR ══ -->
<div class="sidebar" id="sidebar">
  <div class="logo">
    <div class="logo-icon"><i class="fas fa-crown"></i></div>
    <div><div class="logo-text">Casino Admin</div><div class="logo-sub">Management Center</div></div>
  </div>
  <nav>
    <div class="nav-group">메인</div>
    <div class="nav-item active" data-page="dashboard"><i class="fas fa-chart-pie"></i> 대시보드</div>
    <div class="nav-group">관리</div>
    <div class="nav-item" data-page="users"><i class="fas fa-users"></i> 회원 관리</div>
    <div class="nav-item" data-page="notices"><i class="fas fa-bullhorn"></i> 공지 관리</div>
    <div class="nav-item" data-page="events"><i class="fas fa-gift"></i> 이벤트 관리</div>
    <div class="nav-group">사이트</div>
    <div class="nav-item" data-page="games"><i class="fas fa-gamepad"></i> 게임 설정</div>
  </nav>
  <div class="sidebar-footer">
    <div class="admin-info">
      <div class="avatar">A</div>
      <div><div class="admin-name" id="admin-name-disp">admin</div><div class="admin-role">슈퍼관리자</div></div>
    </div>
    <button class="btn-logout" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i> 로그아웃</button>
  </div>
</div>

<!-- ══ MAIN ══ -->
<div class="main" id="main-wrap" style="display:none">
  <div class="topbar">
    <div class="page-title" id="topbar-title"><i class="fas fa-chart-pie"></i> 대시보드</div>
    <div class="topbar-right">
      <div class="mode-badge" id="mode-badge">메모리 모드</div>
      <div style="font-size:0.75rem;color:var(--text3)" id="topbar-time"></div>
    </div>
  </div>
  <div class="content">

    <!-- ── 대시보드 ── -->
    <div class="page active" id="page-dashboard">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-top">
            <div><div class="stat-label">전체 회원</div><div class="stat-value" id="s-total">-</div></div>
            <div class="stat-icon" style="background:rgba(200,168,75,.15)"><i class="fas fa-users" style="color:var(--gold)"></i></div>
          </div>
          <div class="stat-change" style="color:var(--green)"><i class="fas fa-arrow-up"></i><span id="s-new">0</span>명 오늘 가입</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <div><div class="stat-label">활성 회원</div><div class="stat-value" id="s-active">-</div></div>
            <div class="stat-icon" style="background:rgba(74,222,128,.12)"><i class="fas fa-user-check" style="color:var(--green)"></i></div>
          </div>
          <div class="stat-change" style="color:var(--text3)"><span id="s-suspended">0</span>명 정지 · <span id="s-pending">0</span>명 대기</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <div><div class="stat-label">전체 잔액</div><div class="stat-value" id="s-balance">-</div></div>
            <div class="stat-icon" style="background:rgba(96,165,250,.12)"><i class="fas fa-coins" style="color:var(--blue)"></i></div>
          </div>
          <div class="stat-change" style="color:var(--text3)">회원 총 보유 금액</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <div><div class="stat-label">활성 공지</div><div class="stat-value" id="s-notices">-</div></div>
            <div class="stat-icon" style="background:rgba(251,191,36,.12)"><i class="fas fa-bullhorn" style="color:var(--yellow)"></i></div>
          </div>
          <div class="stat-change" style="color:var(--text3)">현재 게시 중</div>
        </div>
      </div>

      <div class="chart-row">
        <div class="mini-chart">
          <div class="mini-chart-title"><i class="fas fa-chart-bar"></i> 회원 상태 분포</div>
          <div class="bar-list" id="chart-status"></div>
        </div>
        <div class="mini-chart">
          <div class="mini-chart-title"><i class="fas fa-trophy"></i> 잔액 TOP 5</div>
          <div class="bar-list" id="chart-balance"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="card">
          <div class="card-header"><div class="card-title"><i class="fas fa-user-plus"></i> 최근 가입 회원</div></div>
          <table>
            <thead><tr><th>아이디</th><th>상태</th><th>가입일</th></tr></thead>
            <tbody id="dash-users"></tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title"><i class="fas fa-bullhorn"></i> 최근 공지/이벤트</div></div>
          <table>
            <thead><tr><th>제목</th><th>유형</th><th>상태</th></tr></thead>
            <tbody id="dash-notices"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 회원 관리 ── -->
    <div class="page" id="page-users">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-users"></i> 회원 목록 <span id="user-count" style="font-size:.72rem;color:var(--text3);font-weight:400"></span></div>
          <button class="btn btn-gold btn-sm" onclick="openModal('m-add-user')"><i class="fas fa-plus"></i> 회원 추가</button>
        </div>
        <div class="toolbar">
          <input type="text" class="inline" id="u-search" placeholder="아이디 / 이메일 검색" style="width:220px" oninput="renderUsers()">
          <select class="inline" id="u-filter" onchange="renderUsers()" style="width:110px">
            <option value="">전체 상태</option>
            <option value="active">활성</option>
            <option value="suspended">정지</option>
            <option value="pending">대기</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="loadUsers()"><i class="fas fa-sync"></i> 새로고침</button>
        </div>
        <table>
          <thead><tr><th>ID</th><th>아이디</th><th>이메일</th><th>연락처</th><th>상태</th><th>잔액</th><th>가입일</th><th>관리</th></tr></thead>
          <tbody id="users-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ── 공지 관리 ── -->
    <div class="page" id="page-notices">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-bullhorn"></i> 공지 관리</div>
          <button class="btn btn-gold btn-sm" onclick="openNoticeModal('notice')"><i class="fas fa-plus"></i> 공지 작성</button>
        </div>
        <table>
          <thead><tr><th>ID</th><th>제목</th><th>상태</th><th>작성일</th><th>관리</th></tr></thead>
          <tbody id="notices-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ── 이벤트 관리 ── -->
    <div class="page" id="page-events">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-gift"></i> 이벤트 관리</div>
          <button class="btn btn-gold btn-sm" onclick="openNoticeModal('event')"><i class="fas fa-plus"></i> 이벤트 작성</button>
        </div>
        <table>
          <thead><tr><th>ID</th><th>제목</th><th>상태</th><th>작성일</th><th>관리</th></tr></thead>
          <tbody id="events-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ── 게임 설정 ── -->
    <div class="page" id="page-games">
      <div class="section-tabs">
        <button class="section-tab active" onclick="switchGameTab('live',this)">라이브 카지노</button>
        <button class="section-tab" onclick="switchGameTab('slot',this)">슬롯 머신</button>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title" id="game-section-title"><i class="fas fa-play-circle"></i> 라이브 카지노 카드</div>
          <div style="font-size:.75rem;color:var(--text3)">카드를 클릭하면 이름/이미지를 수정할 수 있습니다</div>
        </div>
        <div class="game-grid" id="game-grid"></div>
      </div>
    </div>

  </div><!-- content -->
</div><!-- main -->

<!-- ══ MODALS ══ -->
<!-- 회원 추가 -->
<div class="overlay" id="m-add-user">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-user-plus"></i> 회원 추가</div>
      <button class="modal-close" onclick="closeModal('m-add-user')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-row-2">
        <div class="form-row"><label class="form-label">아이디 *</label><input type="text" id="nu-username" placeholder="아이디"></div>
        <div class="form-row"><label class="form-label">이메일 *</label><input type="email" id="nu-email" placeholder="email@example.com"></div>
      </div>
      <div class="form-row-2">
        <div class="form-row"><label class="form-label">연락처</label><input type="text" id="nu-phone" placeholder="010-0000-0000"></div>
        <div class="form-row"><label class="form-label">초기 잔액</label><input type="number" id="nu-balance" placeholder="0" value="0"></div>
      </div>
      <div class="form-row"><label class="form-label">상태</label>
        <select id="nu-status"><option value="pending">대기</option><option value="active">활성</option><option value="suspended">정지</option></select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('m-add-user')">취소</button>
      <button class="btn btn-gold" onclick="addUser()"><i class="fas fa-check"></i> 추가</button>
    </div>
  </div>
</div>

<!-- 머니 지급/회수 -->
<div class="overlay" id="m-money">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-coins"></i> 머니 지급 / 회수</div>
      <button class="modal-close" onclick="closeModal('m-money')">×</button>
    </div>
    <div class="modal-body">
      <div style="padding:10px 14px;background:var(--surface2);border-radius:8px;margin-bottom:14px;border:1px solid var(--border)">
        <div style="font-size:.75rem;color:var(--text3)">대상 회원</div>
        <div style="font-size:.95rem;color:var(--gold);font-weight:700;margin-top:3px" id="money-target-name">-</div>
        <div style="font-size:.78rem;color:var(--text2);margin-top:2px">현재 잔액: <span id="money-current-bal" style="color:var(--gold)">-</span></div>
      </div>
      <div class="form-row">
        <label class="form-label">유형</label>
        <div style="display:flex;gap:8px">
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:.82rem;color:var(--green)">
            <input type="radio" name="money-type" value="add" checked> <i class="fas fa-plus-circle"></i> 지급
          </label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:.82rem;color:var(--red)">
            <input type="radio" name="money-type" value="sub"> <i class="fas fa-minus-circle"></i> 회수
          </label>
        </div>
      </div>
      <div class="form-row"><label class="form-label">금액</label><input type="number" id="money-amount" placeholder="금액 입력" min="0"></div>
      <div class="form-row"><label class="form-label">메모 (선택)</label><input type="text" id="money-memo" placeholder="처리 사유"></div>
      <input type="hidden" id="money-user-id">
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('m-money')">취소</button>
      <button class="btn btn-gold" onclick="processMoney()"><i class="fas fa-check"></i> 처리</button>
    </div>
  </div>
</div>

<!-- 공지/이벤트 작성 -->
<div class="overlay" id="m-notice">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="notice-modal-title"><i class="fas fa-bullhorn"></i> 공지 작성</div>
      <button class="modal-close" onclick="closeModal('m-notice')">×</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="notice-edit-id">
      <input type="hidden" id="notice-type-val" value="notice">
      <div class="form-row"><label class="form-label">제목 *</label><input type="text" id="notice-title" placeholder="제목 입력"></div>
      <div class="form-row"><label class="form-label">내용</label><textarea id="notice-content" rows="4" placeholder="내용을 입력하세요..."></textarea></div>
      <div class="form-row"><label class="form-label">상태</label>
        <select id="notice-active"><option value="1">활성 (공개)</option><option value="0">비활성 (숨김)</option></select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('m-notice')">취소</button>
      <button class="btn btn-gold" onclick="saveNotice()"><i class="fas fa-check"></i> 저장</button>
    </div>
  </div>
</div>

<!-- 게임 카드 편집 -->
<div class="overlay" id="m-game">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-edit"></i> 게임 카드 수정</div>
      <button class="modal-close" onclick="closeModal('m-game')">×</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="game-edit-type">
      <input type="hidden" id="game-edit-id">
      <div style="text-align:center;margin-bottom:14px">
        <div style="width:120px;height:80px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
          <img id="game-preview-img" src="" style="width:100%;height:100%;object-fit:cover">
        </div>
      </div>
      <div class="form-row"><label class="form-label">게임 이름</label><input type="text" id="game-edit-name" placeholder="게임 이름"></div>
      <div class="form-row"><label class="form-label">이미지 경로</label>
        <input type="text" id="game-edit-img" placeholder="/static/card_01.jpg" oninput="document.getElementById('game-preview-img').src=this.value">
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">사용 가능: /static/card_01.jpg ~ /static/card_12.jpg</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:8px">
        ${Array.from({length:12},(_,i)=>`
          <div onclick="selectCardImg(${i+1})" style="cursor:pointer;border-radius:4px;overflow:hidden;border:1px solid var(--border);transition:all .2s" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <img src="/static/card_0${i<9?'':''}${i+1}.jpg" onerror="this.src=''" style="width:100%;height:36px;object-fit:cover;display:block">
            <div style="font-size:.6rem;text-align:center;color:var(--text3);padding:2px">${i+1}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('m-game')">취소</button>
      <button class="btn btn-gold" onclick="saveGame()"><i class="fas fa-check"></i> 저장</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
const API = location.origin
let token = sessionStorage.getItem('admin_token') || ''
let allUsers = [], allNotices = [], gameData = { live:[], slot:[] }
let curGameTab = 'live'

/* ══ AUTH ══ */
async function doLogin() {
  const id = document.getElementById('l-id').value.trim()
  const pw = document.getElementById('l-pw').value.trim()
  try {
    const r = await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:id,password:pw})})
    const d = await r.json()
    if (d.success) {
      token = d.data.token
      sessionStorage.setItem('admin_token', token)
      document.getElementById('admin-name-disp').textContent = d.data.username
      startApp()
    } else { showErr() }
  } catch { showErr() }
}
function showErr(){ const e=document.getElementById('l-err'); e.style.display='block'; setTimeout(()=>e.style.display='none',3000) }
function doLogout(){ sessionStorage.clear(); location.reload() }
document.addEventListener('keydown', e=>{ if(e.key==='Enter'&&document.getElementById('login-screen').style.display!=='none') doLogin() })

function startApp() {
  document.getElementById('login-screen').style.display='none'
  document.getElementById('main-wrap').style.display='flex'
  checkMode()
  loadDashboard()
  setInterval(()=>{ document.getElementById('topbar-time').textContent = new Date().toLocaleTimeString('ko-KR') }, 1000)
}

async function checkMode() {
  try {
    const r = await fetch(API+'/api/health')
    const d = await r.json()
    const b = document.getElementById('mode-badge')
    if (d.mode==='D1') { b.textContent='D1 DB 연결됨'; b.style.background='rgba(74,222,128,.12)'; b.style.color='var(--green)' }
    else { b.textContent='메모리 모드'; b.style.background='rgba(251,191,36,.12)'; b.style.color='var(--yellow)' }
  } catch {}
}

/* ══ NAV ══ */
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    const page = el.dataset.page
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'))
    el.classList.add('active')
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
    document.getElementById('page-'+page)?.classList.add('active')
    const titles = { dashboard:'대시보드', users:'회원 관리', notices:'공지 관리', events:'이벤트 관리', games:'게임 설정' }
    const icons  = { dashboard:'chart-pie', users:'users', notices:'bullhorn', events:'gift', games:'gamepad' }
    document.getElementById('topbar-title').innerHTML = \`<i class="fas fa-\${icons[page]}"></i> \${titles[page]}\`
    if (page==='dashboard') loadDashboard()
    if (page==='users')   loadUsers()
    if (page==='notices') loadNotices('notice')
    if (page==='events')  loadNotices('event')
    if (page==='games')   loadGames()
  })
})

/* ══ DASHBOARD ══ */
async function loadDashboard() {
  try {
    const r = await fetch(API+'/api/stats', { headers: authH() })
    const d = (await r.json()).data
    document.getElementById('s-total').textContent    = d.total_users?.toLocaleString() ?? '-'
    document.getElementById('s-active').textContent   = d.active_users?.toLocaleString() ?? '-'
    document.getElementById('s-new').textContent      = d.new_today ?? 0
    document.getElementById('s-notices').textContent  = d.active_notices ?? '-'
    document.getElementById('s-suspended').textContent= d.suspended_users ?? 0
    document.getElementById('s-pending').textContent  = d.pending_users ?? 0
    document.getElementById('s-balance').textContent  = (d.total_balance ?? 0).toLocaleString() + '원'
    renderStatusChart(d)
  } catch(e) { console.error(e) }
  // 최근 회원
  try {
    const ru = await fetch(API+'/api/users?limit=5', { headers: authH() })
    const users = (await ru.json()).data ?? []
    document.getElementById('dash-users').innerHTML = users.length
      ? users.map(u=>\`<tr><td><strong>\${u.username}</strong></td><td>\${badgeStatus(u.status)}</td><td style="color:var(--text3)">\${(u.created_at||'').slice(0,10)}</td></tr>\`).join('')
      : '<tr><td colspan="3" class="empty">데이터 없음</td></tr>'
    renderBalanceChart(users)
  } catch {}
  // 최근 공지
  try {
    const rn = await fetch(API+'/api/notices', { headers: authH() })
    const notices = (await rn.json()).data ?? []
    document.getElementById('dash-notices').innerHTML = notices.slice(0,5).length
      ? notices.slice(0,5).map(n=>\`<tr><td>\${n.title}</td><td>\${n.type==='event'?'<span class="badge badge-event">이벤트</span>':'<span class="badge badge-notice">공지</span>'}</td><td>\${n.is_active?'<span class="badge badge-on">활성</span>':'<span class="badge badge-off">비활성</span>'}</td></tr>\`).join('')
      : '<tr><td colspan="3" class="empty">데이터 없음</td></tr>'
  } catch {}
}

function renderStatusChart(d) {
  const total = d.total_users || 1
  const items = [
    { label:'활성', val:d.active_users||0, color:'var(--green)' },
    { label:'정지', val:d.suspended_users||0, color:'var(--red)' },
    { label:'대기', val:d.pending_users||0, color:'var(--yellow)' },
  ]
  document.getElementById('chart-status').innerHTML = items.map(it=>\`
    <div class="bar-row">
      <div class="bar-label">\${it.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:\${Math.round(it.val/total*100)}%;background:\${it.color}"></div></div>
      <div class="bar-val">\${it.val}명</div>
    </div>
  \`).join('')
}

function renderBalanceChart(users) {
  const sorted = [...users].sort((a,b)=>b.balance-a.balance).slice(0,5)
  const max = sorted[0]?.balance || 1
  document.getElementById('chart-balance').innerHTML = sorted.map(u=>\`
    <div class="bar-row">
      <div class="bar-label">\${u.username}</div>
      <div class="bar-track"><div class="bar-fill" style="width:\${Math.round(u.balance/max*100)}%"></div></div>
      <div class="bar-val">\${(u.balance||0).toLocaleString()}</div>
    </div>
  \`).join('')
}

/* ══ USERS ══ */
async function loadUsers() {
  try {
    const r = await fetch(API+'/api/users', { headers: authH() })
    allUsers = (await r.json()).data ?? []
    renderUsers()
  } catch(e){ toast('회원 로드 실패') }
}

function renderUsers() {
  const q = document.getElementById('u-search').value.toLowerCase()
  const s = document.getElementById('u-filter').value
  let list = allUsers.filter(u=>
    (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!s || u.status===s)
  )
  document.getElementById('user-count').textContent = \`(\${list.length}명)\`
  document.getElementById('users-tbody').innerHTML = list.length ? list.map(u=>\`
    <tr>
      <td style="color:var(--text3)">\${u.id}</td>
      <td><strong style="color:var(--text)">\${u.username}</strong></td>
      <td style="color:var(--text2)">\${u.email}</td>
      <td style="color:var(--text2)">\${u.phone||'-'}</td>
      <td>\${badgeStatus(u.status)}</td>
      <td style="color:var(--gold);font-weight:600">\${(u.balance||0).toLocaleString()}원</td>
      <td style="color:var(--text3)">\${(u.created_at||'').slice(0,10)}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-blue btn-sm" onclick="openMoneyModal(\${u.id},'\${u.username}',\${u.balance})"><i class="fas fa-coins"></i> 머니</button>
          <button class="btn btn-outline btn-sm" onclick="toggleUserStatus(\${u.id},'\${u.status}')">\${u.status==='active'?'<i class="fas fa-ban"></i> 정지':'<i class="fas fa-check"></i> 활성화'}</button>
          <button class="btn btn-red btn-sm" onclick="deleteUser(\${u.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  \`).join('') : '<tr><td colspan="8" class="empty">검색 결과 없음</td></tr>'
}

async function addUser() {
  const body = { username:$('nu-username').value.trim(), email:$('nu-email').value.trim(), phone:$('nu-phone').value.trim(), status:$('nu-status').value, balance:parseInt($('nu-balance').value)||0 }
  if (!body.username||!body.email){ toast('아이디와 이메일은 필수입니다', true); return }
  const r = await fetch(API+'/api/users',{method:'POST',headers:{...authH(),'Content-Type':'application/json'},body:JSON.stringify(body)})
  const d = await r.json()
  if (d.success){ closeModal('m-add-user'); toast('회원이 추가되었습니다'); loadUsers() }
  else toast(d.error||'추가 실패', true)
}

async function toggleUserStatus(id, cur) {
  const ns = cur==='active' ? 'suspended' : 'active'
  const r = await fetch(API+\`/api/users/\${id}\`,{method:'PUT',headers:{...authH(),'Content-Type':'application/json'},body:JSON.stringify({status:ns})})
  const d = await r.json()
  if (d.success){ toast(\`상태 변경: \${ns==='active'?'활성':'정지'}\`); loadUsers() }
}

async function deleteUser(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  const r = await fetch(API+\`/api/users/\${id}\`,{method:'DELETE',headers:authH()})
  const d = await r.json()
  if (d.success){ toast('삭제되었습니다'); loadUsers() }
}

function openMoneyModal(id, name, bal) {
  $('money-user-id').value = id
  $('money-target-name').textContent = name
  $('money-current-bal').textContent = (bal||0).toLocaleString()+'원'
  $('money-amount').value = ''
  $('money-memo').value = ''
  document.querySelector('input[name="money-type"][value="add"]').checked = true
  openModal('m-money')
}

async function processMoney() {
  const id     = parseInt($('money-user-id').value)
  const amount = parseInt($('money-amount').value)||0
  const type   = document.querySelector('input[name="money-type"]:checked').value
  const memo   = $('money-memo').value
  if (!amount){ toast('금액을 입력하세요', true); return }
  const r = await fetch(API+\`/api/users/\${id}/money\`,{method:'POST',headers:{...authH(),'Content-Type':'application/json'},body:JSON.stringify({amount,type,memo})})
  const d = await r.json()
  if (d.success){ closeModal('m-money'); toast(type==='add'?\`\${amount.toLocaleString()}원 지급 완료\`:\`\${amount.toLocaleString()}원 회수 완료\`); loadUsers() }
  else toast(d.error||'처리 실패', true)
}

/* ══ NOTICES ══ */
async function loadNotices(type) {
  try {
    const r = await fetch(API+\`/api/notices?type=\${type}\`, { headers: authH() })
    allNotices = (await r.json()).data ?? []
    const tbId = type==='event' ? 'events-tbody' : 'notices-tbody'
    renderNoticeTable(allNotices, tbId)
  } catch { toast('로드 실패') }
}

function renderNoticeTable(list, tbId) {
  document.getElementById(tbId).innerHTML = list.length ? list.map(n=>\`
    <tr>
      <td style="color:var(--text3)">\${n.id}</td>
      <td style="color:var(--text)">\${n.title}</td>
      <td>\${n.is_active?'<span class="badge badge-on">활성</span>':'<span class="badge badge-off">비활성</span>'}</td>
      <td style="color:var(--text3)">\${(n.created_at||'').slice(0,10)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-outline btn-sm" onclick="editNotice(\${n.id})"><i class="fas fa-edit"></i> 수정</button>
          <button class="btn btn-outline btn-sm" onclick="toggleNotice(\${n.id},\${n.is_active})">\${n.is_active?'숨김':'공개'}</button>
          <button class="btn btn-red btn-sm" onclick="deleteNotice(\${n.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  \`).join('') : \`<tr><td colspan="5" class="empty">데이터 없음</td></tr>\`
}

function openNoticeModal(type, data=null) {
  $('notice-type-val').value = type
  $('notice-edit-id').value  = data?.id || ''
  $('notice-title').value    = data?.title || ''
  $('notice-content').value  = data?.content || ''
  $('notice-active').value   = data ? (data.is_active?'1':'0') : '1'
  $('notice-modal-title').innerHTML = type==='event'
    ? '<i class="fas fa-gift"></i> '+(data?'이벤트 수정':'이벤트 작성')
    : '<i class="fas fa-bullhorn"></i> '+(data?'공지 수정':'공지 작성')
  openModal('m-notice')
}

function editNotice(id) {
  const n = allNotices.find(x=>x.id===id)
  if (n) openNoticeModal(n.type, n)
}

async function saveNotice() {
  const id      = $('notice-edit-id').value
  const type    = $('notice-type-val').value
  const body    = { title:$('notice-title').value.trim(), content:$('notice-content').value.trim(), type, is_active:$('notice-active').value==='1' }
  if (!body.title){ toast('제목은 필수입니다', true); return }
  const method  = id ? 'PUT' : 'POST'
  const url     = id ? \`/api/notices/\${id}\` : '/api/notices'
  const r = await fetch(API+url,{method,headers:{...authH(),'Content-Type':'application/json'},body:JSON.stringify(body)})
  const d = await r.json()
  if (d.success){ closeModal('m-notice'); toast(id?'수정되었습니다':'등록되었습니다'); loadNotices(type) }
  else toast(d.error||'실패', true)
}

async function toggleNotice(id, cur) {
  const n = allNotices.find(x=>x.id===id)
  const type = n?.type || 'notice'
  const r = await fetch(API+\`/api/notices/\${id}\`,{method:'PUT',headers:{...authH(),'Content-Type':'application/json'},body:JSON.stringify({is_active:!cur})})
  const d = await r.json()
  if (d.success){ toast('상태 변경됨'); loadNotices(type) }
}

async function deleteNotice(id) {
  if (!confirm('삭제하시겠습니까?')) return
  const n = allNotices.find(x=>x.id===id)
  const type = n?.type || 'notice'
  const r = await fetch(API+\`/api/notices/\${id}\`,{method:'DELETE',headers:authH()})
  const d = await r.json()
  if (d.success){ toast('삭제되었습니다'); loadNotices(type) }
}

/* ══ GAMES ══ */
async function loadGames() {
  try {
    const r = await fetch(API+'/api/games', { headers: authH() })
    gameData = (await r.json()).data
    renderGameGrid()
  } catch { toast('게임 데이터 로드 실패') }
}

function switchGameTab(tab, el) {
  curGameTab = tab
  document.querySelectorAll('.section-tab').forEach(t=>t.classList.remove('active'))
  el.classList.add('active')
  $('game-section-title').innerHTML = tab==='live'
    ? '<i class="fas fa-play-circle"></i> 라이브 카지노 카드'
    : '<i class="fas fa-slot-machine"></i> 슬롯 머신 카드'
  renderGameGrid()
}

function renderGameGrid() {
  const list = curGameTab==='live' ? gameData.live : gameData.slot
  document.getElementById('game-grid').innerHTML = list.map(g=>\`
    <div class="game-item">
      <div class="game-thumb"><img src="\${g.img}" alt="\${g.label}" onerror="this.style.display='none'"></div>
      <div class="game-info"><div class="game-name" title="\${g.label}">\${g.label}</div></div>
      <button class="game-edit-btn" onclick="openGameEdit('\${g.id}','\${curGameTab}',\${JSON.stringify(g).replace(/'/g,'&#39;')})">
        <i class="fas fa-edit"></i> 수정
      </button>
    </div>
  \`).join('')
}

function openGameEdit(id, type, g) {
  $('game-edit-id').value   = id
  $('game-edit-type').value = type
  $('game-edit-name').value = g.label
  $('game-edit-img').value  = g.img
  $('game-preview-img').src = g.img
  openModal('m-game')
}

function selectCardImg(num) {
  const p = num < 10 ? \`/static/card_0\${num}.jpg\` : \`/static/card_\${num}.jpg\`
  $('game-edit-img').value = p
  $('game-preview-img').src = p
}

async function saveGame() {
  const id   = $('game-edit-id').value
  const type = $('game-edit-type').value
  const body = { label: $('game-edit-name').value.trim(), img: $('game-edit-img').value.trim() }
  const r = await fetch(API+\`/api/games/\${type}/\${id}\`,{method:'PUT',headers:{...authH(),'Content-Type':'application/json'},body:JSON.stringify(body)})
  const d = await r.json()
  if (d.success){ closeModal('m-game'); toast('저장되었습니다'); loadGames() }
  else toast(d.error||'실패', true)
}

/* ══ UTILS ══ */
function authH(){ return { 'Authorization': 'Bearer '+token } }
function $(id){ return document.getElementById(id) }
function openModal(id){ document.getElementById(id).classList.add('open') }
function closeModal(id){ document.getElementById(id).classList.remove('open') }
function badgeStatus(s){ return s==='active'?'<span class="badge badge-active"><i class="fas fa-circle" style="font-size:.5em"></i> 활성</span>':s==='suspended'?'<span class="badge badge-suspended"><i class="fas fa-ban" style="font-size:.7em"></i> 정지</span>':'<span class="badge badge-pending"><i class="fas fa-clock" style="font-size:.7em"></i> 대기</span>' }
function toast(msg, err=false) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.style.borderColor = err ? 'var(--red)' : 'var(--gold)'
  t.style.color = err ? 'var(--red)' : 'var(--gold)'
  t.style.display = 'block'
  setTimeout(()=>t.style.display='none', 3000)
}
document.querySelectorAll('.overlay').forEach(el=>{
  el.addEventListener('click', e=>{ if(e.target===el) el.classList.remove('open') })
})
</script>
</body>
</html>`
}

export default app
