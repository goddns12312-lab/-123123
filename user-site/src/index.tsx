import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

// ── Admin API URL 설정 ──────────────────────────────────────────
// 로컬 sandbox 환경: admin-site가 포트 3001에서 실행
// 실제 배포 시: ADMIN_API_URL 환경변수로 admin-site URL 지정
const ADMIN_API_URL = 'http://localhost:3001'

type Bindings = { ADMIN_API_URL?: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('/static/*', serveStatic({ root: './' }))

app.get('/', (c) => c.html(mainPage()))
app.get('/games', (c) => c.html(gamesPage()))
app.get('/promotions', (c) => c.html(promotionsPage()))

app.get('/api/winners', (c) => c.json({ winners: recentWinners }))
app.get('/api/deposits', (c) => c.json({ deposits: recentDeposits }))

// ── Admin 데이터 프록시 엔드포인트 (CORS 우회용) ───────────────────
// user-site 프론트엔드 → /api/admin/* → admin-site API 전달
app.get('/api/admin/games', async (c) => {
  try {
    const adminUrl = c.env?.ADMIN_API_URL ?? ADMIN_API_URL
    const res = await fetch(`${adminUrl}/api/games`)
    const data = await res.json() as any
    return c.json(data)
  } catch {
    // admin-site 미연결 시 기본값 반환
    return c.json({ success: true, data: { live: defaultLiveGames, slot: defaultSlotGames } })
  }
})

app.get('/api/admin/notices', async (c) => {
  try {
    const adminUrl = c.env?.ADMIN_API_URL ?? ADMIN_API_URL
    const res = await fetch(`${adminUrl}/api/notices`)
    const data = await res.json() as any
    return c.json(data)
  } catch {
    return c.json({ success: true, data: defaultNotices })
  }
})

const recentWinners = [
  { user: 'kim***', game: '바카라', amount: '370,000', time: '02:13' },
  { user: 'lee***', game: '블랙잭', amount: '270,000', time: '02:11' },
  { user: 'par***', game: '룰렛', amount: '560,000', time: '02:09' },
  { user: 'cho***', game: '포커', amount: '250,000', time: '02:07' },
  { user: 'han***', game: '슬롯', amount: '240,000', time: '02:05' },
]

const recentDeposits = [
  { user: 'min***', amount: '128,000', time: '02:14' },
  { user: 'seo***', amount: '380,000', time: '02:12' },
  { user: 'yoo***', amount: '360,000', time: '02:10' },
  { user: 'kang***', amount: '30,000', time: '02:08' },
  { user: 'lim***', amount: '220,000', time: '02:06' },
]

// ── 기본 게임 데이터 (admin-site 미연결 시 fallback) ───────────────
const defaultLiveGames = [
  { id:'live1',  label:'에볼루션',     img:'/static/card_03.jpg', section:'live1' },
  { id:'live2',  label:'프라그마틱',   img:'/static/card_07.jpg', section:'live1' },
  { id:'live3',  label:'아시아게이밍', img:'/static/card_11.jpg', section:'live1' },
  { id:'live4',  label:'마이크로게이밍',img:'/static/card_05.jpg',section:'live1' },
  { id:'live5',  label:'드림게임즈',   img:'/static/card_09.jpg', section:'live1' },
  { id:'live6',  label:'WM카지노',     img:'/static/card_01.jpg', section:'live1' },
  { id:'live7',  label:'넷엔트',       img:'/static/card_06.jpg', section:'live2' },
  { id:'live8',  label:'도윈카지노',   img:'/static/card_12.jpg', section:'live2' },
  { id:'live9',  label:'위닝',         img:'/static/card_04.jpg', section:'live2' },
  { id:'live10', label:'에즈기',       img:'/static/card_10.jpg', section:'live2' },
  { id:'live11', label:'N8 카지노',    img:'/static/card_02.jpg', section:'live2' },
  { id:'live12', label:'게임즈카지노', img:'/static/card_08.jpg', section:'live2' },
]
const defaultSlotGames = [
  { id:'slot1',  label:'프라그마틱',   img:'/static/card_05.jpg' },
  { id:'slot2',  label:'넷엔트',       img:'/static/card_11.jpg' },
  { id:'slot3',  label:'노리밋시티',   img:'/static/card_03.jpg' },
  { id:'slot4',  label:'핵소우',       img:'/static/card_09.jpg' },
  { id:'slot5',  label:'플레이엔고',   img:'/static/card_01.jpg' },
  { id:'slot6',  label:'릴렉스게이밍', img:'/static/card_07.jpg' },
  { id:'slot7',  label:'부운고',       img:'/static/card_02.jpg' },
  { id:'slot8',  label:'CQ9',          img:'/static/card_08.jpg' },
  { id:'slot9',  label:'스카이윈드',   img:'/static/card_04.jpg' },
  { id:'slot10', label:'이보플레이',   img:'/static/card_10.jpg' },
  { id:'slot11', label:'드래군소프트', img:'/static/card_06.jpg' },
  { id:'slot12', label:'게임아트',     img:'/static/card_12.jpg' },
]
const defaultNotices = [
  { id:1, title:'벳머니 해킹 안전 확인 안내',    type:'notice', is_active:true },
  { id:2, title:'카카오 채널 이용방법 안내',      type:'notice', is_active:true },
  { id:3, title:'파트너 도메인 안내',             type:'notice', is_active:true },
  { id:4, title:'배팅 배당률 산정 기준',          type:'notice', is_active:true },
  { id:5, title:'출금 운영 시간 안내',            type:'notice', is_active:true },
]

// 하위 호환용 alias (기존 렌더 함수에서 사용)
const liveGames  = defaultLiveGames.filter(g => g.section === 'live1')
const liveGames2 = defaultLiveGames.filter(g => g.section === 'live2')

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');

:root {
  --black:   #060608;
  --black2:  #0a0a0e;
  --black3:  #0f0f14;
  --black4:  #141418;
  --black5:  #1a1a20;
  --gold:    #c8a84b;
  --gold2:   #e2c46a;
  --gold3:   #f5d87a;
  --gold-dim:#7a6020;
  --gold-bg: rgba(200,168,75,0.06);
  --gold-border: rgba(200,168,75,0.25);
  --gold-border2: rgba(200,168,75,0.12);
  --text:    #d8c89a;
  --text2:   #8a7a5a;
  --text3:   #4a4030;
  --white:   #f0e8d0;
}

*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{
  background:var(--black);
  color:var(--text);
  font-family:'Noto Sans KR',sans-serif;
  overflow-x:hidden;
  min-width:1200px;
}

::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:var(--black2);}
::-webkit-scrollbar-thumb{background:var(--gold-dim);border-radius:3px;}

/* ── GOLD TEXT ── */
.gold-text{
  background:linear-gradient(135deg,#c8a84b 0%,#f5d87a 45%,#c8a84b 70%,#8a6020 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.gold-text-sm{
  background:linear-gradient(135deg,#b89840,#e2c46a,#b89840);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

/* ── HERO ── */
.hero{
  position:relative;
  width:100%;
  height:420px;
  overflow:hidden;
  background:radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.08) 0%, transparent 65%),
             linear-gradient(180deg, #060604 0%, #0a0904 50%, #060604 100%);
  display:flex;align-items:center;justify-content:center;
  text-align:center;
}
#hero-particles{
  position:absolute;inset:0;
  width:100%;height:100%;
  pointer-events:none;z-index:2;
}

/* Background grid */
.hero-bg{position:absolute;inset:0;z-index:0;}
.hero-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(200,168,75,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,168,75,0.05) 1px, transparent 1px);
  background-size:50px 50px;
  mask-image:radial-gradient(ellipse at center, black 20%, transparent 75%);
}





/* Hero body */
.hero-body{
  position:relative;z-index:3;
  width:100%;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  text-align:center;padding:20px 20px 0;
  margin:0 auto;
}
.hero-tag{
  font-family:'Cinzel',serif;
  font-size:0.65rem;letter-spacing:0.3em;
  color:var(--gold-dim);
  margin-bottom:14px;
  opacity:0.8;
}
.hero-h1{
  font-family:'Cinzel',serif;
  font-size:3.8rem;font-weight:900;
  letter-spacing:0.15em;
  background:linear-gradient(180deg,#ffffff 0%,#f5d87a 30%,#c8a84b 65%,#8a6020 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  line-height:1.05;
  text-align:center;
  width:100%;
  display:block;
  margin:0 auto 10px;
  filter:drop-shadow(0 0 30px rgba(200,168,75,0.25));
}
.hero-sub{
  font-size:0.9rem;
  color:var(--text2);
  letter-spacing:0.2em;
  text-transform:uppercase;
  font-family:'Cinzel',serif;
  margin-bottom:18px;
}
.hero-divider{
  width:180px;height:1px;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);
  margin:0 auto 22px;
}
.hero-btns{display:flex;gap:12px;justify-content:center;margin-bottom:28px;}
.hero-cta{padding:10px 32px;font-size:0.88rem;letter-spacing:0.06em;}
.hero-cta2{
  padding:10px 28px;font-size:0.88rem;letter-spacing:0.04em;
  background:transparent;border:1px solid var(--gold-border);
  color:var(--text);cursor:pointer;border-radius:3px;
  font-family:'Noto Sans KR',sans-serif;font-weight:500;
  transition:all 0.2s;
}
.hero-cta2:hover{border-color:var(--gold);color:var(--gold2);}

/* Stats row */
.hero-stats{
  display:flex;align-items:center;gap:0;
  background:rgba(200,168,75,0.04);
  border:1px solid var(--gold-border2);
  border-radius:4px;padding:10px 28px;
}
.h-stat{display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 20px;}
.h-stat-num{
  font-family:'Cinzel',serif;font-size:1rem;font-weight:700;
  background:linear-gradient(135deg,#f5d87a,#c8a84b);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.h-stat-label{font-size:0.65rem;color:var(--text2);letter-spacing:0.05em;}
.h-stat-sep{width:1px;height:32px;background:var(--gold-border2);}

/* ── HEADER ── */
header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 28px;
  height:64px;
  background:linear-gradient(180deg,#080806 0%,#0c0a04 100%);
  border-bottom:1px solid var(--gold-border);
  position:sticky;top:0;z-index:1000;
  transition:transform 0.3s ease, opacity 0.3s ease;
}
header.hidden{
  transform:translateY(-100%);
  opacity:0;
  pointer-events:none;
}
.logo{
  font-family:'Cinzel',serif;
  font-size:1.35rem;
  font-weight:900;
  letter-spacing:0.15em;
  background:linear-gradient(135deg,#f5d87a 0%,#c8a84b 45%,#8a6020 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  cursor:pointer;
  line-height:1;
  user-select:none;
}
.logo small{
  display:block;
  font-size:0.52rem;
  letter-spacing:0.35em;
  color:var(--gold-dim);
  -webkit-text-fill-color:var(--gold-dim);
  margin-top:3px;
  font-weight:500;
}
.hdr-right{
  display:flex;align-items:center;gap:10px;
}
.btn-ghost{
  background:transparent;
  border:1px solid var(--gold-border);
  color:var(--text);
  padding:6px 18px;border-radius:3px;
  font-size:0.8rem;font-weight:500;cursor:pointer;
  font-family:'Noto Sans KR',sans-serif;
  transition:all 0.2s;letter-spacing:0.02em;
}
.btn-ghost:hover{border-color:var(--gold);color:var(--gold2);}
.btn-filled{
  background:linear-gradient(135deg,#c8a84b,#8a6020);
  border:none;color:#000;
  padding:6px 20px;border-radius:3px;
  font-size:0.8rem;font-weight:700;cursor:pointer;
  font-family:'Noto Sans KR',sans-serif;
  box-shadow:0 2px 14px rgba(200,168,75,0.3);
  transition:all 0.2s;letter-spacing:0.03em;
}
.btn-filled:hover{background:linear-gradient(135deg,#e2c46a,#c8a84b);box-shadow:0 2px 22px rgba(200,168,75,0.5);}
.hamburger{
  display:none;
  flex-direction:column;gap:5px;
  background:transparent;border:none;cursor:pointer;padding:4px;
}
.hamburger span{
  display:block;width:22px;height:2px;
  background:var(--gold);border-radius:2px;
  transition:all 0.3s;
}

/* ── NAVBAR ── */
.navbar{
  background:linear-gradient(180deg,#080808 0%,#0a0a0a 100%);
  border-top:1px solid rgba(200,168,75,0.5);
  border-bottom:1px solid rgba(200,168,75,0.5);
  box-shadow:0 0 18px rgba(200,168,75,0.08), inset 0 1px 0 rgba(200,168,75,0.1);
  height:48px;display:flex;align-items:center;
  position:sticky;top:64px;z-index:998;
  transition:top 0.3s ease;
}
.navbar.top-fixed{
  top:0;
}
.nav-inner{
  max-width:1400px;margin:0 auto;width:100%;
  padding:0 20px;
  display:flex;align-items:center;justify-content:center;
}
.nav-links{display:flex;align-items:center;}
.nav-link{
  color:rgba(255,255,255,0.85);font-size:0.95rem;
  padding:0 22px;height:48px;
  display:flex;align-items:center;gap:6px;
  cursor:pointer;transition:color 0.2s;
  border-bottom:2px solid transparent;
  white-space:nowrap;font-weight:500;
  letter-spacing:0.02em;
  position:relative;overflow:hidden;
}
/* 닦아내기 효과 - 좌상단 → 우하단 */
.nav-link::before{
  content:'';
  position:absolute;
  top:-200%;left:-200%;width:200%;height:200%;
  background:linear-gradient(135deg,
    transparent 0%,
    rgba(200,168,75,0.1) 35%,
    rgba(245,216,122,0.28) 50%,
    rgba(200,168,75,0.1) 65%,
    transparent 100%);
  transition:top 0.7s ease, left 0.7s ease;
  pointer-events:none;
}
.nav-link:hover::before{
  top:100%;left:100%;
}
.nav-link i{font-size:0.85rem;color:rgba(255,255,255,0.6);transition:color 0.2s;}
.nav-link:hover,.nav-link.active{color:var(--gold2);border-bottom-color:var(--gold);}
.nav-link:hover i,.nav-link.active i{color:var(--gold);}

.nav-right{display:flex;align-items:center;gap:7px;}
.nav-input{
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(200,168,75,0.2);
  color:var(--white);padding:5px 11px;
  border-radius:3px;font-size:0.75rem;width:108px;
  font-family:'Noto Sans KR',sans-serif;
  transition:border-color 0.2s;
}
.nav-input:focus{outline:none;border-color:var(--gold);}
.nav-input::placeholder{color:var(--text3);}
.btn-login{
  background:transparent;
  border:1px solid var(--gold-border);
  color:var(--text);padding:5px 15px;
  border-radius:3px;font-size:0.77rem;cursor:pointer;
  transition:all 0.2s;font-family:'Noto Sans KR',sans-serif;
}
.btn-login:hover{border-color:var(--gold);color:var(--gold2);}
.btn-join{
  background:linear-gradient(135deg,#c8a84b,#8a6020);
  border:none;color:#000;
  padding:5px 18px;border-radius:3px;
  font-size:0.77rem;font-weight:700;cursor:pointer;
  font-family:'Noto Sans KR',sans-serif;
  box-shadow:0 2px 12px rgba(200,168,75,0.3);
  transition:all 0.2s;letter-spacing:0.03em;
}
.btn-join:hover{background:linear-gradient(135deg,#e2c46a,#c8a84b);box-shadow:0 2px 20px rgba(200,168,75,0.5);}

/* ── TICKER ── */
.ticker-bar{
  background:linear-gradient(90deg,#0a0800,#0f0c02,#0a0800);
  border-bottom:1px solid var(--gold-border2);
  height:28px;overflow:hidden;display:flex;align-items:center;
}
.ticker-label{
  background:linear-gradient(135deg,#1a1200,#2a1e00);
  border-right:1px solid var(--gold-border);
  color:var(--gold);font-size:0.7rem;font-weight:700;
  padding:0 14px;height:100%;display:flex;align-items:center;
  white-space:nowrap;flex-shrink:0;font-family:'Cinzel',serif;
  letter-spacing:0.1em;
}
.ticker-scroll{display:flex;animation:ticker 28s linear infinite;white-space:nowrap;}
.ticker-scroll:hover{animation-play-state:paused;}
@keyframes ticker{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
.ticker-item{font-size:0.72rem;color:var(--text2);padding:0 22px;}
.ticker-item b{color:var(--gold2);font-weight:700;}

/* ── GAME TABS ── */
.game-tabs{
  position:relative;
  background:radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.07) 0%, transparent 60%), linear-gradient(180deg,#060604 0%,#0a0904 50%,#060604 100%);
  border-bottom:1px solid var(--gold-border2);
  padding:5px 0;
  overflow:hidden;
}
.game-tabs::before{
  content:'';
  position:absolute;inset:0;
  background-image:linear-gradient(rgba(200,168,75,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,75,0.04) 1px,transparent 1px);
  background-size:50px 50px;
  mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%);
  pointer-events:none;
}
.game-tabs-inner{
  max-width:1400px;margin:0 auto;
  padding:0 20px;display:flex;align-items:center;justify-content:center;
  gap:8px;
}
.tab-deco{
  display:flex;align-items:center;justify-content:center;
  padding:0 30px;
  font-size:3rem;
  color:rgba(200,168,75,0.45);
  pointer-events:none;
  filter:drop-shadow(0 0 8px rgba(200,168,75,0.3));
  transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1), color 0.3s;
}
.tab-deco.tilt-left{
  transform:rotate(-90deg);
  color:rgba(200,168,75,0.8);
  filter:drop-shadow(0 0 14px rgba(200,168,75,0.6));
}
.tab-deco.tilt-right{
  transform:rotate(90deg);
  color:rgba(200,168,75,0.8);
  filter:drop-shadow(0 0 14px rgba(200,168,75,0.6));
}
.toggle-btn{
  display:flex;align-items:center;gap:14px;
  background:transparent;
  border:1px solid rgba(200,168,75,0.12);
  border-radius:8px;
  padding:16px 48px;
  cursor:pointer;
  position:relative;overflow:hidden;
  transition:border-color 0.3s, box-shadow 0.3s;
  white-space:nowrap;
}
/* 호버 골드 글로우 */
.toggle-btn::before{
  content:'';
  position:absolute;inset:0;
  background:linear-gradient(135deg,
    rgba(200,168,75,0) 0%,
    rgba(200,168,75,0.08) 50%,
    rgba(200,168,75,0) 100%);
  opacity:0;
  transition:opacity 0.35s;
  pointer-events:none;
}
/* 하단 골드 라인 슬라이드인 */
.toggle-btn::after{
  content:'';
  position:absolute;
  bottom:0;left:50%;width:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--gold),transparent);
  transition:width 0.35s ease, left 0.35s ease;
  pointer-events:none;
}
.toggle-btn:hover::before,
.toggle-btn.active::before{opacity:1;}
.toggle-btn:hover::after,
.toggle-btn.active::after{width:100%;left:0;}
.toggle-btn:hover,
.toggle-btn.active{
  border-color:rgba(200,168,75,0.45);
  box-shadow:0 0 18px rgba(200,168,75,0.12);
}
.tab-icon{
  font-size:2.2rem;
  transition:transform 0.3s, filter 0.3s;
  filter:grayscale(0.6) brightness(0.8);
  line-height:1;
}
.toggle-btn:hover .tab-icon,
.toggle-btn.active .tab-icon{
  transform:scale(1.18) rotate(-6deg);
  filter:grayscale(0) brightness(1.2) drop-shadow(0 0 6px rgba(200,168,75,0.6));
}
.text-panel{
  display:flex;flex-direction:column;align-items:flex-start;gap:2px;
}
.text-kr{
  font-size:1.05rem;font-weight:700;
  color:rgba(255,255,255,0.6);
  font-family:'Noto Sans KR',sans-serif;
  transition:color 0.25s;
  letter-spacing:0.02em;
}
.text-en{
  font-size:0.65rem;font-weight:600;
  color:rgba(200,168,75,0.35);
  font-family:'Cinzel',serif;
  letter-spacing:0.14em;
  transition:color 0.25s;
}
.toggle-btn:hover .text-kr,
.toggle-btn.active .text-kr{color:var(--gold2);}
.toggle-btn:hover .text-en,
.toggle-btn.active .text-en{color:var(--gold);}

/* ── SUB TABS ── */


/* ── MAIN WRAP ── */
.main-wrap{max-width:1400px;margin:0 auto;padding:0 20px;}

/* ── SECTION TITLE ── */
.sec-title{
  display:flex;align-items:center;gap:10px;
  padding:12px 0 8px;
}
.sec-title-line{
  flex:1;height:1px;
  background:linear-gradient(90deg,var(--gold-border),transparent);
}
.sec-title-text{
  font-family:'Cinzel',serif;
  font-size:0.75rem;letter-spacing:0.2em;
  color:var(--gold-dim);text-transform:uppercase;
}

/* ── LIVE GRID ── */
.live-grid{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:8px;padding-bottom:10px;
}
/* 슬롯 그리드 */
.slot-grid{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:8px;padding-bottom:10px;
}
.slot-btn{
  background:linear-gradient(180deg,#14120a 0%,#0a0800 100%);
  border-radius:8px;
  overflow:hidden;
  cursor:pointer;
  transition:all 0.3s;
  position:relative;
  outline:1px solid rgba(200,168,75,0.25);
  outline-offset:2px;
  border:1px solid rgba(200,168,75,0.15);
  box-shadow:0 2px 12px rgba(0,0,0,0.5);
}
.slot-btn:hover{
  border-color:rgba(200,168,75,0.5);
  outline:1px solid rgba(200,168,75,0.7);
  outline-offset:3px;
  box-shadow:
    0 6px 30px rgba(200,168,75,0.25),
    0 0 20px rgba(200,168,75,0.08);
  transform:translateY(-4px);
}
.slot-btn:active{
  transform:translateY(-1px) scale(0.97);
  box-shadow:0 2px 10px rgba(200,168,75,0.35);
}
.slot-btn::after{
  content:'';
  position:absolute;
  top:0;left:10%;right:10%;
  height:1px;
  background:linear-gradient(90deg,transparent,rgba(200,168,75,0.5),transparent);
  pointer-events:none;
  z-index:2;
}
/* 슬롯 호버 효과 */
.main-wrap:has(.slot-btn:hover) .slot-btn{
  opacity:0.4;
  filter:brightness(0.6);
  transform:scale(0.97);
  transition:all 0.3s;
}
.main-wrap:has(.slot-btn:hover) .slot-btn:hover{
  opacity:1;
  filter:none;
  transform:translateY(-4px) scale(1.03);
  border-color:var(--gold);
  outline-color:rgba(200,168,75,0.5);
  box-shadow:0 6px 30px rgba(200,168,75,0.35);
}
/* 슬롯버튼 shine 효과 */
.slot-btn .shine{
  position:absolute;
  top:0;left:-120%;
  width:60%;height:100%;
  background:linear-gradient(
    105deg,
    transparent 20%,
    rgba(255,220,100,0.08) 40%,
    rgba(245,216,122,0.22) 50%,
    rgba(255,220,100,0.08) 60%,
    transparent 80%
  );
  transform:skewX(-15deg);
  pointer-events:none;
  z-index:6;
  transition:none;
}
.slot-btn:hover .shine{
  left:160%;
  transition:left 0.65s ease;
}
/* 슬롯버튼 enter-overlay */
.slot-btn .enter-overlay{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,0);
  display:flex;align-items:center;justify-content:center;
  opacity:0;
  transition:opacity 0.25s;
  z-index:5;
  pointer-events:none;
  border-radius:8px;
}
.slot-btn:hover .enter-overlay{
  opacity:1;
}
/* 섹션 전체에서 카드에 호버 시 모든 카드 흐리게 */
.main-wrap:has(.live-card:hover) .live-card{
  opacity:0.4;
  filter:brightness(0.6);
  transform:scale(0.97);
  transition:all 0.3s;
}
/* 호버된 카드만 선명하게 */
.main-wrap:has(.live-card:hover) .live-card:hover{
  opacity:1;
  filter:none;
  transform:translateY(-4px) scale(1.03);
  border-color:var(--gold);
  box-shadow:0 6px 30px rgba(200,168,75,0.35);
}
.live-card{
  background:linear-gradient(180deg,#14120a 0%,#0a0800 100%);
  border-radius:8px;
  overflow:hidden;
  cursor:pointer;
  transition:all 0.3s;
  position:relative;
  /* 바깥 테두리 — outline은 overflow:hidden 영향 안받음 */
  outline:1px solid rgba(200,168,75,0.25);
  outline-offset:2px;
  border:1px solid rgba(200,168,75,0.15);
  box-shadow:0 2px 12px rgba(0,0,0,0.5);
}
/* 상단 골드 라인 */
.live-card::after{
  content:'';
  position:absolute;
  top:0;left:10%;right:10%;
  height:1px;
  background:linear-gradient(90deg,transparent,rgba(200,168,75,0.5),transparent);
  pointer-events:none;
  z-index:2;
  transition:opacity 0.3s;
}
.live-card:hover{
  border-color:rgba(200,168,75,0.5);
  outline:1px solid rgba(200,168,75,0.7);
  outline-offset:3px;
  box-shadow:
    0 6px 30px rgba(200,168,75,0.25),
    0 0 20px rgba(200,168,75,0.08);
  transform:translateY(-4px);
}
.live-card:active{
  transform:translateY(-1px) scale(0.97);
  box-shadow:0 2px 10px rgba(200,168,75,0.35);
}
/* ── 닦아내기 효과 ── */
.live-card .shine{
  position:absolute;
  top:0;left:-120%;
  width:60%;height:100%;
  background:linear-gradient(
    105deg,
    transparent 20%,
    rgba(255,220,100,0.08) 40%,
    rgba(245,216,122,0.22) 50%,
    rgba(255,220,100,0.08) 60%,
    transparent 80%
  );
  transform:skewX(-15deg);
  pointer-events:none;
  z-index:6;
  transition:none;
}
.live-card:hover .shine{
  left:160%;
  transition:left 0.65s ease;
}
.live-card .enter-overlay{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,0);
  display:flex;align-items:center;justify-content:center;
  opacity:0;
  transition:opacity 0.25s;
  z-index:5;
  pointer-events:none;
  border-radius:8px;
}

.live-card:hover .enter-overlay{
  opacity:1;
}
.enter-label{
  display:flex;align-items:center;gap:8px;
  background:linear-gradient(135deg,#c8a84b,#8a6020);
  color:#000;
  font-size:0.88rem;font-weight:700;
  padding:9px 22px;border-radius:4px;
  letter-spacing:0.08em;
  font-family:'Noto Sans KR',sans-serif;
  box-shadow:0 2px 18px rgba(200,168,75,0.45);
  transform:translateY(6px);
  transition:transform 0.25s;
}
.live-card:hover .enter-label{
  transform:translateY(0);
}
}
/* ripple */
.ripple-wave{
  position:absolute;
  border-radius:50%;
  background:radial-gradient(circle, rgba(200,168,75,0.55) 0%, rgba(200,168,75,0.15) 50%, transparent 70%);
  transform:scale(0);
  animation:ripple-anim 0.55s ease-out forwards;
  pointer-events:none;
  z-index:10;
}
@keyframes ripple-anim{
  to{ transform:scale(4); opacity:0; }
}
/* flash overlay */
.card-flash{
  position:absolute;inset:0;
  background:radial-gradient(circle at center, rgba(200,168,75,0.22) 0%, transparent 70%);
  opacity:0;
  animation:flash-anim 0.4s ease-out forwards;
  pointer-events:none;
  z-index:9;
}
@keyframes flash-anim{
  0%{ opacity:1; }
  100%{ opacity:0; }
}
.live-thumb{
  height:200px;position:relative;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
}
.live-thumb-bg{
  position:absolute;inset:0;
  background:#000000;
}
.live-thumb-glow{
  position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 100%,rgba(200,168,75,0.12) 0%,transparent 65%);
}
.live-logo{
  position:absolute;
  top:50%;left:50%;
  transform:translate(-50%,-50%);
  font-size:1.1rem;font-weight:900;
  color:var(--gold2);
  background:rgba(0,0,0,0.55);
  border:1px solid var(--gold-border2);
  padding:6px 16px;border-radius:4px;
  letter-spacing:0.1em;font-family:'Cinzel',serif;
  z-index:2;
  text-align:center;
  white-space:nowrap;
  text-shadow:0 0 12px rgba(200,168,75,0.4);
}
.live-badge{
  position:absolute;top:7px;right:7px;z-index:2;
  display:flex;align-items:center;gap:3px;
  background:rgba(0,0,0,0.7);
  border:1px solid rgba(200,168,75,0.3);
  padding:2px 7px;border-radius:2px;
  font-size:0.6rem;color:var(--gold);
  font-family:'Cinzel',serif;letter-spacing:0.08em;
}
.live-emoji{display:none;}
.live-footer{
  padding:7px 9px;
  background:linear-gradient(180deg,#100e06,#080600);
  border-top:1px solid var(--gold-border2);
  display:flex;align-items:center;justify-content:center;text-align:center;
}
.live-name{font-size:0.9rem;color:var(--text2);font-weight:600;}

/* ── 카드 이미지 텍스트 오버레이 ── */
.card-label-overlay{
  position:absolute;
  bottom:0;left:0;right:0;
  padding:28px 10px 10px;
  background:linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%);
  z-index:3;
  pointer-events:none;
}
.card-label-text{
  display:block;
  font-family:'Noto Sans KR',sans-serif;
  font-size:1.1rem;
  font-weight:900;
  letter-spacing:0.06em;
  text-align:center;
  background:linear-gradient(135deg,#f5d87a 0%,#c8a84b 45%,#f5d87a 80%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  filter:drop-shadow(0 1px 6px rgba(200,168,75,0.6));
}
.live-count{
  font-size:0.67rem;color:var(--gold);
  display:flex;align-items:center;gap:3px;
}

/* Live dot */
@keyframes live-pulse{0%,100%{opacity:1;box-shadow:0 0 4px rgba(200,168,75,0.8);}50%{opacity:0.4;box-shadow:none;}}
.live-dot{
  width:5px;height:5px;border-radius:50%;
  background:var(--gold);
  animation:live-pulse 1.6s ease-in-out infinite;
  display:inline-block;
}

/* ── MIDDLE DIVIDER WITH CHARS ── */

/* ── BANNER STRIP ── */
.banner-strip{
  position:relative;
  background:radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.07) 0%, transparent 60%), linear-gradient(180deg,#060604 0%,#0a0904 50%,#060604 100%);
  border-top:1px solid var(--gold-border2);
  border-bottom:1px solid var(--gold-border2);
  padding:12px 0;
  overflow:hidden;
}
.banner-strip::before{
  content:'';
  position:absolute;inset:0;
  background-image:linear-gradient(rgba(200,168,75,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,75,0.04) 1px,transparent 1px);
  background-size:50px 50px;
  mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%);
  pointer-events:none;
}
.banner-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.banner-card{
  background:linear-gradient(135deg,#12100a,#0c0a04);
  border:1px solid var(--gold-border2);
  border-radius:5px;padding:10px 14px;
  display:flex;align-items:center;gap:12px;
  cursor:pointer;transition:all 0.2s;
}
.banner-card:hover{border-color:var(--gold);background:linear-gradient(135deg,#18140a,#120e06);}
.banner-icon{font-size:1.7rem;flex-shrink:0;}
.banner-label{font-size:0.65rem;color:var(--gold);font-weight:700;letter-spacing:0.05em;margin-bottom:2px;}
.banner-title{font-size:0.8rem;color:var(--white);font-weight:700;}
.banner-sub{font-size:0.67rem;color:var(--text2);margin-top:1px;}
.banner-arrow{color:var(--gold-dim);font-size:0.75rem;margin-left:auto;}

/* ── INFO SECTION ── */
.info-section{
  position:relative;
  background:radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.07) 0%, transparent 60%), linear-gradient(180deg,#060604 0%,#0a0904 50%,#060604 100%);
  border-top:1px solid var(--gold-border2);
  padding:16px 0 20px;
  overflow:hidden;
}
.info-section::before{
  content:'';
  position:absolute;inset:0;
  background-image:linear-gradient(rgba(200,168,75,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,75,0.04) 1px,transparent 1px);
  background-size:50px 50px;
  mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%);
  pointer-events:none;
  z-index:0;
}
.info-section .main-wrap{
  position:relative;z-index:1;
}
.info-grid{display:grid;grid-template-columns:1.05fr 1fr 1fr 0.95fr;gap:10px;}
.info-box{
  background:linear-gradient(180deg,#12100a,#0a0800);
  border:1px solid var(--gold-border2);
  border-radius:6px;overflow:hidden;
}
.info-header{
  background:linear-gradient(180deg,#1a1608,#12100a);
  border-bottom:1px solid var(--gold-border2);
  padding:8px 12px;
  display:flex;align-items:center;gap:7px;
}
.info-header-icon{color:var(--gold);font-size:0.78rem;}
.info-header-title{font-size:0.8rem;font-weight:700;color:var(--text);letter-spacing:0.03em;}
.info-body{padding:8px;}

/* Notice circle */
.notice-ring{
  width:108px;height:108px;border-radius:50%;
  border:2px solid var(--gold-border);
  background:radial-gradient(circle,#1a1404,#080600);
  box-shadow:0 0 20px rgba(200,168,75,0.1),inset 0 0 14px rgba(200,168,75,0.06);
  display:flex;align-items:center;justify-content:center;flex-direction:column;
  margin:6px auto;position:relative;gap:2px;
  font-size:0.72rem;color:var(--text2);text-align:center;
}
.notice-ring::before{
  content:'';position:absolute;inset:6px;
  border-radius:50%;border:1px solid var(--gold-border2);
}
.notice-ring-icon{font-size:1.5rem;display:block;}

.notice-list{padding:0 2px 4px;}
.notice-item{
  display:flex;align-items:center;gap:6px;
  padding:4px 4px;cursor:pointer;
  border-bottom:1px solid rgba(200,168,75,0.06);
}
.notice-item:last-child{border-bottom:none;}
.n-dot{width:4px;height:4px;background:var(--gold-dim);border-radius:50%;flex-shrink:0;}
.n-text{font-size:0.72rem;color:var(--text2);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;transition:color 0.2s;}
.notice-item:hover .n-text{color:var(--gold2);}
.notice-more{
  display:flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:50%;
  background:rgba(200,168,75,0.06);
  border:1px solid var(--gold-border2);
  color:var(--gold-dim);font-size:0.7rem;cursor:pointer;
  margin:6px auto 2px;transition:all 0.2s;
}
.notice-more:hover{background:rgba(200,168,75,0.14);color:var(--gold);}

/* Table rows */
.t-row{
  display:grid;grid-template-columns:1fr 1.2fr 0.55fr;
  padding:5px 6px;font-size:0.72rem;
  border-bottom:1px solid rgba(200,168,75,0.05);gap:4px;
}
.t-row:last-child{border-bottom:none;}
.t-user{color:var(--text2);display:flex;align-items:center;gap:4px;}
.t-avatar{
  width:17px;height:17px;border-radius:50%;
  background:linear-gradient(135deg,#2a1e04,#1a1202);
  border:1px solid var(--gold-border2);
  display:flex;align-items:center;justify-content:center;
  font-size:0.52rem;flex-shrink:0;
}
.t-amount{color:var(--gold2);font-weight:700;text-align:right;}
.t-amount.green{color:#80d890;}
.t-time{color:var(--text3);text-align:right;}

/* Event */
.ev-item{
  padding:5px 6px;
  border-bottom:1px solid rgba(200,168,75,0.05);
  cursor:pointer;
}
.ev-item:last-child{border-bottom:none;}
.ev-item:hover .ev-title{color:var(--gold2);}
.ev-row{display:flex;align-items:center;gap:5px;margin-bottom:2px;}
.ev-title{font-size:0.72rem;color:var(--text2);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;transition:color 0.2s;}
.ev-date{font-size:0.65rem;color:var(--text3);padding-left:2px;}
.badge{font-size:0.6rem;padding:1px 6px;border-radius:2px;font-weight:700;flex-shrink:0;}
.badge-new{background:#8a1010;color:#ffcccc;}
.badge-hot{background:#7a4a00;color:#ffd090;}

/* ── PARTNERS ── */
.partners{
  position:relative;
  background:radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.07) 0%, transparent 60%), linear-gradient(180deg,#060604 0%,#0a0904 50%,#060604 100%);
  border-top:1px solid var(--gold-border2);
  padding:14px 0;
  overflow:hidden;
}
.partners::before{
  content:'';
  position:absolute;inset:0;
  background-image:linear-gradient(rgba(200,168,75,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,75,0.04) 1px,transparent 1px);
  background-size:50px 50px;
  mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%);
  pointer-events:none;
  z-index:0;
}
.partners .main-wrap{
  position:relative;z-index:1;
}
.partner-logo-grid{
  display:flex;flex-wrap:wrap;gap:10px;
  align-items:center;justify-content:center;
}
.p-logo-img{
  display:flex;align-items:center;justify-content:center;
  padding:8px 14px;
  transition:all 0.25s;cursor:pointer;
}
.p-logo-img:hover{
  transform:translateY(-2px);
}
.p-logo-img img{
  height:28px;width:auto;
  object-fit:contain;
  opacity:0.65;
  filter:brightness(1.1) grayscale(100%);
  transition:all 0.3s;
}
.p-logo-img:hover img{
  opacity:1;
  filter:brightness(1.1) grayscale(0%);
}

/* ── GOLD DIVIDER ── */
/* ── MODAL ── */
.modal-overlay{
  display:none;position:fixed;inset:0;
  background:rgba(0,0,0,0.88);z-index:2000;
  align-items:center;justify-content:center;
  backdrop-filter:blur(6px);
}
.modal-overlay.active{display:flex;}
.modal-box{
  background:linear-gradient(180deg,#16120a 0%,#0c0a06 100%);
  border:1px solid var(--gold-border);
  border-radius:8px;padding:30px 32px;width:390px;
  position:relative;
  box-shadow:0 0 50px rgba(200,168,75,0.15);
}
.modal-close{
  position:absolute;top:12px;right:14px;
  color:var(--text2);cursor:pointer;font-size:1rem;transition:color 0.2s;
}
.modal-close:hover{color:var(--gold);}
.modal-title{
  font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;
  text-align:center;margin-bottom:5px;
  background:linear-gradient(135deg,#f5d87a,#c8a84b);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  letter-spacing:0.1em;
}
.modal-sub{text-align:center;font-size:0.75rem;color:var(--text2);margin-bottom:18px;}
.m-input{
  width:100%;background:rgba(200,168,75,0.04);
  border:1px solid var(--gold-border2);color:var(--white);
  padding:9px 12px;border-radius:4px;font-size:0.84rem;
  margin-bottom:10px;font-family:'Noto Sans KR',sans-serif;
  transition:border-color 0.2s;
}
.m-input:focus{outline:none;border-color:var(--gold);}
.m-input::placeholder{color:var(--text3);}
.m-btn{
  width:100%;
  background:linear-gradient(135deg,#c8a84b,#8a6020);
  border:none;color:#000;padding:11px;border-radius:4px;
  font-size:0.9rem;font-weight:700;cursor:pointer;
  font-family:'Noto Sans KR',sans-serif;
  box-shadow:0 2px 16px rgba(200,168,75,0.3);
  transition:all 0.2s;letter-spacing:0.02em;
}
.m-btn:hover{background:linear-gradient(135deg,#e2c46a,#c8a84b);box-shadow:0 2px 24px rgba(200,168,75,0.45);}
.m-divider{height:1px;background:linear-gradient(90deg,transparent,var(--gold-border2),transparent);margin:14px 0;}
.m-switch{text-align:center;font-size:0.77rem;color:var(--text2);}
.m-switch a{color:var(--gold);cursor:pointer;font-weight:700;transition:color 0.2s;}
.m-switch a:hover{color:var(--gold2);}

/* Shine animation */
@keyframes shine{0%{left:-80%;}100%{left:120%;}}
.shine-wrap{position:relative;overflow:hidden;}
.shine-wrap::after{
  content:'';position:absolute;top:0;left:-80%;
  width:40%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,220,100,0.08),transparent);
  transform:skewX(-15deg);
  animation:shine 3.5s ease-in-out infinite;
}
`

function mainPage() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>토르카지노 — 프리미엄 온라인 카지노</title>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>

<!-- ════ HEADER ════ -->
<header>
  <div class="logo" onclick="closeModal()">
    BLACK CASINO
    <small>PREMIUM ONLINE CASINO</small>
  </div>

  <div class="hdr-right">
    <button class="btn-ghost" onclick="openModal('login')">로그인</button>
    <button class="btn-filled" onclick="openModal('register')">회원가입</button>
    <button class="hamburger" id="ham" onclick="toggleMobile()">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<!-- ════ HERO ════ -->
<section class="hero">
  <canvas id="hero-particles"></canvas>
  <div class="hero-bg">
    <div class="hero-grid"></div>


  </div>
  <div class="hero-body">
    <h1 class="hero-h1">BLACK CASINO</h1>
    <p class="hero-sub">Premium Casino &amp; Slots</p>
    <div class="hero-divider"></div>


  </div>
</section>

<!-- ════ NAVBAR ════ -->
<nav class="navbar">
  <div class="nav-inner">
    <div class="nav-links">
      <div class="nav-link active" data-tab="casino" onclick="switchTab('casino',this)"><i class="fas fa-play-circle"></i>카지노게임</div>
      <div class="nav-link" data-tab="slot" onclick="switchTab('slot',this)"><i class="fas fa-coins"></i>슬롯게임</div>
      <div class="nav-link" onclick="openModal('register')"><i class="fas fa-dice"></i>미니게임</div>
      <div class="nav-link" onclick="openModal('register')"><i class="fas fa-gamepad"></i>E-스포츠</div>
      <div class="nav-link" onclick="openModal('register')"><i class="fas fa-gift"></i>이벤트</div>
      <div class="nav-link" onclick="openModal('register')"><i class="fas fa-headset"></i>고객센터</div>
    </div>

  </div>
</nav>

<!-- ════ GAME TABS ════ -->
<div class="game-tabs">
  <div class="game-tabs-inner">
    <button class="g-tab toggle-btn active" onclick="setGTab(this)" data-side="left">
      <span class="tab-icon">🎰</span>
      <div class="text-panel">
        <span class="text-kr">라이브 카지노</span>
        <span class="text-en">LIVE CASINO</span>
      </div>
    </button>
    <div class="tab-deco" id="gem-deco"><i class="fas fa-gem"></i></div>
    <button class="g-tab toggle-btn" onclick="setGTab(this)" data-side="right">
      <span class="tab-icon">🎲</span>
      <div class="text-panel">
        <span class="text-kr">슬롯머신</span>
        <span class="text-en">SLOT MACHINE</span>
      </div>
    </button>
  </div>
</div>



<!-- ════ LIVE CASINO ════ -->
<div id="live-section" style="position:relative;background:radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.07) 0%, transparent 60%), linear-gradient(180deg,#060604 0%,#0a0904 50%,#060604 100%);padding:6px 0 4px;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(200,168,75,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,75,0.04) 1px,transparent 1px);background-size:50px 50px;mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%);pointer-events:none;"></div>
  <div class="main-wrap">

    <!-- Section title -->
    <div class="sec-title">
      <div class="sec-title-line"></div>
      <div class="sec-title-text">Live Casino — Row 1</div>
      <div class="sec-title-line" style="background:linear-gradient(90deg,transparent,var(--gold-border));transform:scaleX(-1);"></div>
    </div>

    <!-- Row 1 -->
    <div class="live-grid" id="live-grid-row1">
      ${liveGames.map((g) => `
      <div class="live-card" onclick="openModal('register')">
        <div class="shine"></div>
        <div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>
        <div class="live-thumb">
          <img src="${g.img}" alt="${g.label}" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;">
          <div class="card-label-overlay"><span class="card-label-text">${g.label}</span></div>
        </div>
        <div class="live-footer">
          <span class="live-name">${g.label}</span>
        </div>
      </div>
      `).join('')}
    </div>

    <!-- Row 2 -->
    <div class="live-grid" id="live-grid-row2" style="margin-top:10px;">
      ${liveGames2.map((g) => `
      <div class="live-card" onclick="openModal('register')">
        <div class="shine"></div>
        <div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>
        <div class="live-thumb">
          <img src="${g.img}" alt="${g.label}" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;">
          <div class="card-label-overlay"><span class="card-label-text">${g.label}</span></div>
        </div>
        <div class="live-footer">
          <span class="live-name">${g.label}</span>
        </div>
      </div>
      `).join('')}
    </div>

  </div>
</div>

<!-- ════ SLOT SECTION ════ -->
<div id="slot-section" style="display:none;position:relative;background:radial-gradient(ellipse at 50% 0%, rgba(200,168,75,0.07) 0%, transparent 60%), linear-gradient(180deg,#060604 0%,#0a0904 50%,#060604 100%);padding:6px 0 4px;overflow:hidden;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(200,168,75,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,75,0.04) 1px,transparent 1px);background-size:50px 50px;mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%);pointer-events:none;"></div>
  <div class="main-wrap">

    <!-- Section title -->
    <div class="sec-title">
      <div class="sec-title-line"></div>
      <div class="sec-title-text">Slot Machine — Row 1</div>
      <div class="sec-title-line" style="background:linear-gradient(90deg,transparent,var(--gold-border));transform:scaleX(-1);"></div>
    </div>

    <!-- Row 1 -->
    <div class="live-grid" id="slot-grid-row1">
      ${defaultSlotGames.slice(0,6).map(g => `
      <div class="live-card" onclick="openModal('register')">
        <div class="shine"></div>
        <div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>
        <div class="live-thumb"><img src="${g.img}" alt="${g.label}" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;"><div class="card-label-overlay"><span class="card-label-text">${g.label}</span></div></div>
        <div class="live-footer"><span class="live-name">${g.label}</span></div>
      </div>`).join('')}
    </div>

    <!-- Row 2 -->
    <div class="live-grid" id="slot-grid-row2" style="margin-top:10px;">
      ${defaultSlotGames.slice(6,12).map(g => `
      <div class="live-card" onclick="openModal('register')">
        <div class="shine"></div>
        <div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>
        <div class="live-thumb"><img src="${g.img}" alt="${g.label}" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;"><div class="card-label-overlay"><span class="card-label-text">${g.label}</span></div></div>
        <div class="live-footer"><span class="live-name">${g.label}</span></div>
      </div>`).join('')}
    </div>

  </div>
</div>

<!-- ════ BANNER STRIP ════ -->
<div class="banner-strip">
  <div class="main-wrap">
    <div class="banner-grid">
      <div class="banner-card">
        <div class="banner-icon">📱</div>
        <div style="flex:1;">
          <div class="banner-label">★ 이벤트 공식 채널</div>
          <div class="banner-title">텔레그램 바로가기</div>
          <div class="banner-sub">토르카지노 공식 채널 ▶</div>
        </div>
        <div class="banner-arrow"><i class="fas fa-chevron-right"></i></div>
      </div>
      <div class="banner-card">
        <div class="banner-icon">⚽</div>
        <div style="flex:1;">
          <div class="banner-label">★ 스포츠 베팅</div>
          <div class="banner-title">토르 스포츠 바로가기</div>
          <div class="banner-sub">승패 · 무승부 · 핸디캡 ▶</div>
        </div>
        <div class="banner-arrow"><i class="fas fa-chevron-right"></i></div>
      </div>
      <div class="banner-card">
        <div class="banner-icon">🚫</div>
        <div style="flex:1;">
          <div class="banner-label">★ 안전 이용 안내</div>
          <div class="banner-title">미성년자 이용불가</div>
          <div class="banner-sub">만 19세 미만 접속 차단 ▶</div>
        </div>
        <div class="banner-arrow"><i class="fas fa-chevron-right"></i></div>
      </div>
    </div>
  </div>
</div>

<!-- ════ INFO SECTION ════ -->
<div class="info-section">
  <div class="main-wrap">
    <div class="info-grid">

      <!-- 공지사항 -->
      <div class="info-box">
        <div class="info-header">
          <i class="fas fa-bullhorn info-header-icon"></i>
          <span class="info-header-title">공지사항</span>
        </div>
        <div class="info-body">
          <div class="notice-ring">
            <span class="notice-ring-icon">📋</span>
            <span style="font-size:0.7rem;color:var(--gold-dim);font-weight:700;letter-spacing:0.05em;">NOTICE</span>
          </div>
          <div class="notice-list" id="notice-list">
            ${defaultNotices.map(t => `
            <div class="notice-item">
              <div class="n-dot"></div>
              <div class="n-text">${t.title}</div>
            </div>`).join('')}
            <div style="text-align:center;margin-top:4px;">
              <div class="notice-more">+</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 실시간당첨 -->
      <div class="info-box">
        <div class="info-header">
          <i class="fas fa-trophy info-header-icon"></i>
          <span class="info-header-title">실시간 당첨</span>
        </div>
        <div class="info-body">
          <div style="padding:2px 0;">
            ${recentWinners.map(w => `
            <div class="t-row">
              <div class="t-user"><div class="t-avatar">👤</div>${w.user}</div>
              <div class="t-amount">₩${w.amount}</div>
              <div class="t-time">${w.time}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- 입금현황 -->
      <div class="info-box">
        <div class="info-header">
          <i class="fas fa-arrow-circle-down info-header-icon" style="color:#70c880;"></i>
          <span class="info-header-title">입금 현황</span>
        </div>
        <div class="info-body">
          <div style="padding:2px 0;">
            ${recentDeposits.map(d => `
            <div class="t-row">
              <div class="t-user"><div class="t-avatar">👤</div>${d.user}</div>
              <div class="t-amount green">₩${d.amount}</div>
              <div class="t-time">${d.time}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- 이벤트 -->
      <div class="info-box">
        <div class="info-header">
          <i class="fas fa-star info-header-icon"></i>
          <span class="info-header-title">이벤트</span>
        </div>
        <div class="info-body">
          ${[
            {title:'신규 가입 보너스 이벤트 진행중', tag:'NEW', date:'2025.03.09'},
            {title:'매일 출석 체크 이벤트 안내', tag:'HOT', date:'2025.03.08'},
            {title:'첫 입금 100% 보너스 이벤트', tag:'HOT', date:'2025.03.07'},
            {title:'친구 추천 이벤트 안내', tag:'NEW', date:'2025.03.06'},
            {title:'주간 베스트 플레이어 선정', tag:'', date:'2025.03.05'},
          ].map(e => `
          <div class="ev-item">
            <div class="ev-row">
              ${e.tag ? `<span class="badge ${e.tag==='NEW'?'badge-new':'badge-hot'}">${e.tag}</span>` : ''}
              <span class="ev-title">${e.title}</span>
            </div>
            <div class="ev-date">${e.date}</div>
          </div>`).join('')}
        </div>
      </div>

    </div>
  </div>
</div>

<!-- ════ PARTNERS ════ -->
<div class="partners">
  <div class="main-wrap">
    <div style="text-align:center;margin-bottom:14px;">
      <span style="font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.25em;color:var(--text3);">— OFFICIAL GAME PARTNERS —</span>
    </div>
    <div class="partner-logo-grid">
      <div class="p-logo-img"><img src="/static/logos/logo_ag.png" alt="AG"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_bbin.png" alt="BBIN"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_blue.png" alt="Blue"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_booongo.png" alt="Booongo"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_cq9.png" alt="CQ9"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_dragoonsoft.png" alt="Dragoon Soft"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_dreamgaming.png" alt="Dream Gaming"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_elk.png" alt="ELK"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_evoplay.png" alt="Evoplay"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_fantasma.png" alt="Fantasma"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_gameart.png" alt="GameArt"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_hacksaw.png" alt="Hacksaw"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_mobilots.png" alt="Mobilots"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_nolimit.png" alt="Nolimit"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_1x2gaming.png" alt="1x2 Gaming"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_misc1.png" alt="Partner"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_playngo.png" alt="Play'n GO"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_playtech.png" alt="Playtech"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_pragmatic.png" alt="Pragmatic"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_relax.png" alt="Relax"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_spribe.png" alt="Spribe"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_white1.png" alt="Partner"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_skywind.png" alt="Skywind"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_white2.png" alt="Partner"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_white3.png" alt="Partner"></div>
      <div class="p-logo-img"><img src="/static/logos/logo_vmcasino.png" alt="VM Casino"></div>
    </div>
  </div>
</div>

<!-- ════ LOGIN MODAL ════ -->
<div id="modal-login" class="modal-overlay">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal('login')"><i class="fas fa-times"></i></button>
    <div class="modal-title">LOGIN</div>
    <div class="modal-sub">계정에 로그인하세요</div>
    <input class="m-input" type="text" placeholder="아이디">
    <input class="m-input" type="password" placeholder="비밀번호">
    <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
      <label style="font-size:0.74rem;color:var(--text2);display:flex;align-items:center;gap:5px;cursor:pointer;">
        <input type="checkbox" style="accent-color:var(--gold);"> 자동 로그인
      </label>
      <span style="font-size:0.74rem;color:var(--gold-dim);cursor:pointer;">아이디/비밀번호 찾기</span>
    </div>
    <button class="m-btn shine-wrap">로그인</button>
    <div class="m-divider"></div>
    <div class="m-switch">계정이 없으신가요? <a onclick="switchModal('login','register')">회원가입 →</a></div>
  </div>
</div>

<!-- ════ REGISTER MODAL ════ -->
<div id="modal-register" class="modal-overlay">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal('register')"><i class="fas fa-times"></i></button>
    <div class="modal-title">REGISTER</div>
    <div class="modal-sub">🎁 가입 즉시 신규 보너스 지급</div>
    <input class="m-input" type="text" placeholder="아이디 (영문+숫자 6~12자)">
    <input class="m-input" type="password" placeholder="비밀번호 (8자 이상)">
    <input class="m-input" type="password" placeholder="비밀번호 확인">
    <input class="m-input" type="text" placeholder="닉네임">
    <input class="m-input" type="text" placeholder="추천인 코드 (선택)">
    <label style="display:flex;align-items:flex-start;gap:8px;font-size:0.72rem;color:var(--text2);margin-bottom:14px;cursor:pointer;line-height:1.5;">
      <input type="checkbox" style="accent-color:var(--gold);margin-top:2px;flex-shrink:0;">
      만 19세 이상이며 이용약관 및 개인정보처리방침에 동의합니다
    </label>
    <button class="m-btn shine-wrap">가입하기</button>
    <div class="m-divider"></div>
    <div class="m-switch">이미 계정이 있으신가요? <a onclick="switchModal('register','login')">로그인 →</a></div>
  </div>
</div>

<script>
function openModal(t){document.getElementById('modal-'+t).classList.add('active');document.body.style.overflow='hidden';}
function closeModal(t){if(t){document.getElementById('modal-'+t).classList.remove('active');}else{document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('active'));}document.body.style.overflow='';}
function switchModal(a,b){closeModal(a);setTimeout(()=>openModal(b),150);}
function toggleMobile(){const h=document.getElementById('ham');h.classList.toggle('open');}
document.querySelectorAll('.modal-overlay').forEach(el=>{
  el.addEventListener('click',e=>{if(e.target===el){el.classList.remove('active');document.body.style.overflow='';}});
});

// ── LIVE CARD RIPPLE ──
document.querySelectorAll('.live-card').forEach(card=>{
  card.addEventListener('click', function(e){
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 1.2;

    // ripple
    const ripple = document.createElement('div');
    ripple.className = 'ripple-wave';
    ripple.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+(x - size/2)+'px;top:'+(y - size/2)+'px;';
    this.appendChild(ripple);

    // flash overlay
    const flash = document.createElement('div');
    flash.className = 'card-flash';
    this.appendChild(flash);

    // 정리
    setTimeout(()=>{ ripple.remove(); flash.remove(); }, 600);
  });
});
// ── HERO PARTICLES ──
(function(){
  const cv = document.getElementById('hero-particles');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const heroSection = cv.closest('section') || cv.parentElement;
  function resize(){cv.width=cv.offsetWidth;cv.height=cv.offsetHeight;}
  resize();
  window.addEventListener('resize', resize);

  // 마우스 위치 추적 — section 전체에서 받기
  const mouse = { x: -9999, y: -9999 };
  const REPEL_RADIUS = 120;
  const REPEL_FORCE = 6;

  heroSection.addEventListener('mousemove', e => {
    const rect = cv.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  heroSection.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  const N = 70;
  const pts = Array.from({length:N}, () => ({
    x: Math.random() * cv.width,
    y: Math.random() * cv.height,
    ox: 0, oy: 0,
    r: Math.random() * 0.8 + 0.3,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    a: Math.random() * 0.5 + 0.5,
  }));
  pts.forEach(p => { p.ox = p.vx; p.oy = p.vy; });

  function draw(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    pts.forEach(p => {
      // 마우스 반발력 계산
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < REPEL_RADIUS && dist > 0){
        const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
        p.vx += (dx / dist) * force * REPEL_FORCE * 0.08;
        p.vy += (dy / dist) * force * REPEL_FORCE * 0.08;
      }

      // 원래 속도로 서서히 복귀 (마찰)
      p.vx += (p.ox - p.vx) * 0.04;
      p.vy += (p.oy - p.vy) * 0.04;

      // 최대 속도 제한
      const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if(speed > 4){ p.vx = (p.vx/speed)*4; p.vy = (p.vy/speed)*4; }

      p.x += p.vx; p.y += p.vy;
      if(p.x < 0) p.x = cv.width;
      if(p.x > cv.width) p.x = 0;
      if(p.y < 0) p.y = cv.height;
      if(p.y > cv.height) p.y = 0;

      // dot glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grd.addColorStop(0, \`rgba(245,216,122,\${p.a})\`);
      grd.addColorStop(0.4, \`rgba(200,168,75,\${p.a * 0.6})\`);
      grd.addColorStop(1, \`rgba(200,168,75,0)\`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI*2);
      ctx.fillStyle = grd;
      ctx.fill();

      // dot core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = \`rgba(255,235,150,\${p.a})\`;
      ctx.fill();

      // lines to nearby
      pts.forEach(q => {
        const lx = p.x - q.x, ly = p.y - q.y;
        const ldist = Math.sqrt(lx*lx + ly*ly);
        if(ldist < 130){
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = \`rgba(200,168,75,\${(1 - ldist/130) * 0.18})\`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
})();
function setGTab(el){
  document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const gem = document.getElementById('gem-deco');
  if(!gem) return;
  const side = el.dataset.side;
  gem.classList.remove('tilt-left','tilt-right');
  if(side === 'left') gem.classList.add('tilt-left');
  else if(side === 'right') gem.classList.add('tilt-right');
  // 섹션 전환
  const liveSection = document.getElementById('live-section');
  const slotSection = document.getElementById('slot-section');
  if(side === 'left'){
    if(liveSection) liveSection.style.display = '';
    if(slotSection) slotSection.style.display = 'none';
    // nav-link 동기화
    document.querySelectorAll('.nav-link[data-tab]').forEach(n=>n.classList.remove('active'));
    const casinoNav = document.querySelector('.nav-link[data-tab="casino"]');
    if(casinoNav) casinoNav.classList.add('active');
  } else {
    if(liveSection) liveSection.style.display = 'none';
    if(slotSection) slotSection.style.display = '';
    // nav-link 동기화
    document.querySelectorAll('.nav-link[data-tab]').forEach(n=>n.classList.remove('active'));
    const slotNav = document.querySelector('.nav-link[data-tab="slot"]');
    if(slotNav) slotNav.classList.add('active');
  }
}
function switchTab(tab, el){
  // nav-link active 처리
  document.querySelectorAll('.nav-link[data-tab]').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
  // 섹션 전환
  const liveSection = document.getElementById('live-section');
  const slotSection = document.getElementById('slot-section');
  if(tab === 'casino'){
    if(liveSection) liveSection.style.display = '';
    if(slotSection) slotSection.style.display = 'none';
    // game-tab 버튼 동기화
    document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
    const leftTab = document.querySelector('.g-tab[data-side="left"]');
    if(leftTab) leftTab.classList.add('active');
    const gem = document.getElementById('gem-deco');
    if(gem){ gem.classList.remove('tilt-left','tilt-right'); gem.classList.add('tilt-left'); }
  } else {
    if(liveSection) liveSection.style.display = 'none';
    if(slotSection) slotSection.style.display = '';
    // game-tab 버튼 동기화
    document.querySelectorAll('.g-tab').forEach(t=>t.classList.remove('active'));
    const rightTab = document.querySelector('.g-tab[data-side="right"]');
    if(rightTab) rightTab.classList.add('active');
    const gem = document.getElementById('gem-deco');
    if(gem){ gem.classList.remove('tilt-left','tilt-right'); gem.classList.add('tilt-right'); }
  }
  // 해당 섹션으로 스크롤
  const target = tab === 'casino' ? liveSection : slotSection;
  if(target){
    const offset = target.getBoundingClientRect().top + window.scrollY - 50;
    window.scrollTo({top: offset, behavior: 'smooth'});
  }
}
// 마우스오버시 다이아 기울기
document.querySelectorAll('.g-tab.toggle-btn').forEach(btn => {
  btn.addEventListener('mouseenter', function(){
    const gem = document.getElementById('gem-deco');
    if(!gem) return;
    gem.classList.remove('tilt-left','tilt-right');
    if(this.dataset.side === 'left') gem.classList.add('tilt-left');
    else if(this.dataset.side === 'right') gem.classList.add('tilt-right');
  });
  btn.addEventListener('mouseleave', function(){
    const gem = document.getElementById('gem-deco');
    if(!gem) return;
    gem.classList.remove('tilt-left','tilt-right');
  });
});
function setSTab(el){document.querySelectorAll('.s-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');}
document.querySelectorAll('.nav-link').forEach(el=>{
  el.addEventListener('click',function(){document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));this.classList.add('active');});
});

// 스크롤시 헤더 숨기고 navbar 상단 고정
(function(){
  const hdr = document.querySelector('header');
  const nav = document.querySelector('.navbar');
  const HDR_H = 64;
  let lastY = 0;
  window.addEventListener('scroll', function(){
    const y = window.scrollY;
    if(y > HDR_H){
      hdr.classList.add('hidden');
      nav.classList.add('top-fixed');
    } else {
      hdr.classList.remove('hidden');
      nav.classList.remove('top-fixed');
    }
    lastY = y;
  }, {passive:true});
})();

// ── Admin 연동: 게임카드 & 공지 실시간 반영 ────────────────────────
(function(){
  function makeCard(g) {
    return '<div class="live-card" onclick="openModal(&apos;register&apos;)">'
      + '<div class="shine"></div>'
      + '<div class="enter-overlay"><span class="enter-label"><i class="fas fa-play"></i>게임입장</span></div>'
      + '<div class="live-thumb"><img src="'+g.img+'" alt="'+g.label+'" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;">'
      + '<div class="card-label-overlay"><span class="card-label-text">'+g.label+'</span></div></div>'
      + '<div class="live-footer"><span class="live-name">'+g.label+'</span></div>'
      + '</div>';
  }

  // 게임 데이터 fetch 및 반영
  fetch('/api/admin/games')
    .then(function(r){ return r.json(); })
    .then(function(res){
      if(!res.success || !res.data) return;
      var live = res.data.live || [];
      var slot = res.data.slot || [];
      var row1 = document.getElementById('live-grid-row1');
      var row2 = document.getElementById('live-grid-row2');
      var srow1 = document.getElementById('slot-grid-row1');
      var srow2 = document.getElementById('slot-grid-row2');
      if(row1) row1.innerHTML = live.filter(function(g){ return g.section==='live1'; }).map(makeCard).join('');
      if(row2) row2.innerHTML = live.filter(function(g){ return g.section==='live2'; }).map(makeCard).join('');
      if(srow1) srow1.innerHTML = slot.slice(0,6).map(makeCard).join('');
      if(srow2) srow2.innerHTML = slot.slice(6,12).map(makeCard).join('');
    })
    .catch(function(){});  // admin 미연결 시 기본값 유지

  // 공지 데이터 fetch 및 반영
  fetch('/api/admin/notices')
    .then(function(r){ return r.json(); })
    .then(function(res){
      if(!res.success || !res.data) return;
      var notices = res.data.filter(function(n){ return n.is_active; }).slice(0,5);
      var list = document.getElementById('notice-list');
      if(!list || !notices.length) return;
      list.innerHTML = notices.map(function(n){
        return '<div class="notice-item"><div class="n-dot"></div><div class="n-text">'+n.title+'</div></div>';
      }).join('') + '<div style="text-align:center;margin-top:4px;"><div class="notice-more">+</div></div>';
    })
    .catch(function(){});  // admin 미연결 시 기본값 유지
})();
</script>
</body>
</html>`
}

function gamesPage() {
  const all = [...liveGames, ...liveGames2]
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>게임목록 — 토르카지노</title>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    ${CSS}
    body{min-width:1200px;}
    .page-header{background:linear-gradient(180deg,#0a0800,#080600);border-bottom:1px solid var(--gold-border2);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;}
    .back-btn{background:transparent;border:1px solid var(--gold-border2);color:var(--text2);padding:6px 14px;border-radius:3px;cursor:pointer;font-size:0.78rem;transition:all 0.2s;text-decoration:none;}
    .back-btn:hover{border-color:var(--gold);color:var(--gold2);}
  </style>
</head>
<body>
<div class="page-header">
  <div class="logo-text" style="font-size:1.2rem;">⚡ 토르카지노</div>
  <a href="/" class="back-btn">← 메인으로</a>
</div>
<div style="max-width:1400px;margin:0 auto;padding:20px;">
  <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">
    <span style="font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.2em;color:var(--gold-dim);">— GAME LOBBY —</span>
  </div>
  <div class="live-grid">
    ${all.map(g=>`
    <div class="live-card" onclick="window.location='/'">
      <div class="live-thumb">
        <img src="" alt="${g.label}" style="width:100%;height:100%;object-fit:cover;display:block;background:#0a0800;">
        <div class="live-badge"><span class="live-dot"></span>LIVE</div>
      </div>
      <div class="live-footer">
        <span class="live-name">${g.label}</span>
        <span class="live-count"><span class="live-dot"></span>${g.players.toLocaleString()}명</span>
      </div>
    </div>`).join('')}
  </div>
</div>
</body>
</html>`
}

function promotionsPage() {
  const promos = [
    {icon:'🎁',title:'신규 가입 보너스',desc:'가입 즉시 보너스 지급',badge:'NEW'},
    {icon:'💰',title:'첫 입금 100% 보너스',desc:'첫 입금 100% 매칭 보너스',badge:'HOT'},
    {icon:'🔄',title:'매일 출석 체크',desc:'매일 로그인 포인트 지급',badge:''},
    {icon:'👥',title:'친구 추천 이벤트',desc:'추천인 양쪽 보너스 지급',badge:'NEW'},
    {icon:'🏆',title:'주간 베스트 플레이어',desc:'주간 최다 베팅자 특별 보상',badge:''},
    {icon:'🎰',title:'슬롯 무료 스핀',desc:'매주 50회 무료 스핀 제공',badge:'HOT'},
  ]
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>이벤트 — 토르카지노</title>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    ${CSS}
    body{min-width:1200px;}
    .page-header{background:linear-gradient(180deg,#0a0800,#080600);border-bottom:1px solid var(--gold-border2);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;}
    .back-btn{background:transparent;border:1px solid var(--gold-border2);color:var(--text2);padding:6px 14px;border-radius:3px;cursor:pointer;font-size:0.78rem;transition:all 0.2s;text-decoration:none;}
    .back-btn:hover{border-color:var(--gold);color:var(--gold2);}
    .promo-card{background:linear-gradient(180deg,#14120a,#0a0800);border:1px solid var(--gold-border2);border-radius:7px;padding:20px;transition:all 0.25s;cursor:pointer;}
    .promo-card:hover{border-color:var(--gold);transform:translateY(-4px);box-shadow:0 8px 28px rgba(200,168,75,0.12);}
  </style>
</head>
<body>
<div class="page-header">
  <div class="logo-text" style="font-size:1.2rem;">⚡ 토르카지노</div>
  <a href="/" class="back-btn">← 메인으로</a>
</div>
<div style="max-width:1400px;margin:0 auto;padding:20px;">
  <div style="margin-bottom:14px;">
    <span style="font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.2em;color:var(--gold-dim);">— EVENTS & PROMOTIONS —</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
    ${promos.map(p=>`
    <div class="promo-card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="font-size:2.3rem;">${p.icon}</div>
        <div>
          ${p.badge?`<span class="badge ${p.badge==='NEW'?'badge-new':'badge-hot'}">${p.badge}</span>`:''}
          <div style="font-size:0.92rem;font-weight:700;color:var(--white);margin-top:2px;">${p.title}</div>
        </div>
      </div>
      <div style="height:1px;background:linear-gradient(90deg,var(--gold-border2),transparent);margin-bottom:10px;"></div>
      <p style="font-size:0.78rem;color:var(--text2);margin-bottom:14px;">${p.desc}</p>
      <button class="m-btn" style="padding:7px 0;font-size:0.8rem;">참여하기</button>
    </div>`).join('')}
  </div>
</div>
</body>
</html>`
}

export default app
