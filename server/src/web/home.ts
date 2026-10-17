/**
 * Landing page served at GET /. A self-contained marketing / showcase page for Caddie Coach,
 * built to stand on its own as a portfolio thumbnail. No build step, no external JS — only
 * Google Fonts and inline SVG. Links out to GitHub and the /capture swing page.
 */
export const HOME_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Caddie Coach — a voice caddie that learns your game</title>
<meta name="description" content="A voice-first golf caddie and swing coach for Alexa+. It learns your real distances, your misses and your swing faults, then clubs you up, calls out your patterns, and coaches your swing from your phone.">
<meta name="color-scheme" content="dark">
<meta property="og:title" content="Caddie Coach">
<meta property="og:description" content="A voice caddie for Alexa+ that learns how you actually play.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:#0a110c; --bg-2:#0c140f; --surface:#111d16; --surface-2:#16271e;
    --line:rgba(127,211,160,.14); --line-strong:rgba(127,211,160,.26);
    --fg:#eef4ee; --fg-soft:#cdd9cf; --muted:#9bb0a3;
    --mint:#7fd3a0; --mint-deep:#3f9168; --gold:#e6c67d; --sunset:#f08a5d;
    --shadow:0 24px 60px -24px rgba(0,0,0,.72);
    --shadow-sm:0 10px 30px -16px rgba(0,0,0,.7);
    --sans:"Hanken Grotesk",system-ui,-apple-system,sans-serif;
    --serif:"Newsreader",Georgia,serif;
    --mono:ui-monospace,"SF Mono",Menlo,monospace;
  }
  * { box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  @media (prefers-reduced-motion:reduce){ html{ scroll-behavior:auto; } }
  body {
    margin:0; background:var(--bg); color:var(--fg);
    font-family:var(--sans); font-size:17px; line-height:1.6;
    -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    overflow-x:hidden;
  }
  ::selection { background:rgba(127,211,160,.26); color:#fff; }
  a { color:inherit; text-decoration:none; }
  :focus-visible { outline:2px solid var(--mint); outline-offset:3px; border-radius:4px; }
  svg { display:block; }
  ::-webkit-scrollbar { width:11px; height:11px; }
  ::-webkit-scrollbar-track { background:var(--bg-2); }
  ::-webkit-scrollbar-thumb { background:#223027; border-radius:8px; border:3px solid var(--bg-2); }
  ::-webkit-scrollbar-thumb:hover { background:#2c3f33; }

  .wrap { width:100%; max-width:1140px; margin-inline:auto; padding-inline:24px; }
  .hero-grid>*,.split>*,.flow>*,.tools>*,.bento>* { min-width:0; }

  /* ---------- nav ---------- */
  nav {
    position:sticky; top:0; z-index:50;
    backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
    background:linear-gradient(180deg,rgba(10,17,12,.86),rgba(10,17,12,.5));
    border-bottom:1px solid var(--line);
  }
  .nav-in { display:flex; align-items:center; justify-content:space-between; padding:16px 0; }
  .brand { display:flex; align-items:center; gap:11px; font-weight:600; letter-spacing:-.01em; }
  .brand .mark { width:30px; height:30px; display:grid; place-items:center;
    background:radial-gradient(120% 120% at 30% 20%,#17271e,#0c140f);
    border:1px solid var(--line-strong); border-radius:9px; color:var(--mint); }
  .nav-links { display:flex; align-items:center; gap:30px; font-size:14.5px; color:var(--muted); }
  .nav-links a.lk { transition:color .2s; }
  .nav-links a.lk:hover { color:var(--fg); }
  .btn {
    display:inline-flex; align-items:center; gap:8px; font-weight:600; font-size:14.5px;
    padding:10px 16px; border-radius:10px; transition:transform .18s cubic-bezier(.2,.7,.2,1),background .2s,border-color .2s,box-shadow .2s;
    border:1px solid transparent; white-space:nowrap;
  }
  .btn-primary { background:var(--mint); color:#07160d; box-shadow:0 8px 24px -10px rgba(127,211,160,.5); }
  .btn-primary:hover { transform:translateY(-2px); box-shadow:0 14px 32px -12px rgba(127,211,160,.65); }
  .btn-ghost { background:rgba(255,255,255,.015); border-color:var(--line-strong); color:var(--fg); }
  .btn-ghost:hover { border-color:var(--mint); color:var(--mint); transform:translateY(-2px); }
  @media (max-width:760px){ .nav-links .lk, .nav-links .btn-ghost { display:none; } .nav-links { gap:16px; } }

  /* ---------- hero ---------- */
  .hero { position:relative; padding:88px 0 72px; }
  .hero-grid { display:grid; grid-template-columns:1.08fr .92fr; gap:56px; align-items:center; }
  h1 { font-family:var(--serif); font-weight:500; color:var(--fg);
    font-size:clamp(2.3rem,6.4vw,4.6rem); line-height:1.04; letter-spacing:-.02em; margin:0 0 22px;
    text-wrap:balance; overflow-wrap:break-word; }
  h1 em { font-style:italic; color:var(--mint); }
  .lede { font-size:clamp(1.05rem,1.4vw,1.2rem); color:var(--fg-soft); max-width:30ch; margin:0 0 30px; }
  .cta-row { display:flex; flex-wrap:wrap; gap:14px; align-items:center; }
  .meta { display:flex; align-items:center; gap:10px; margin-top:30px; color:var(--muted); font-size:13.5px; }
  .meta .dot { width:6px; height:6px; border-radius:50%; background:var(--gold); box-shadow:0 0 10px rgba(230,198,125,.8); flex:none; }

  /* voice panel */
  .console { position:relative; }
  .console-card {
    background:linear-gradient(180deg,var(--surface),var(--bg-2));
    border:1px solid var(--line); border-radius:20px; box-shadow:var(--shadow);
    padding:20px; overflow:hidden;
  }
  .console-head { display:flex; align-items:center; gap:11px; padding:4px 4px 16px; border-bottom:1px solid var(--line); margin-bottom:16px; }
  .ring { width:36px; height:36px; flex:none; }
  .console-head b { font-weight:600; font-size:14.5px; }
  .console-head span { color:var(--muted); font-size:12.5px; display:block; margin-top:1px; }
  .turn { display:flex; margin-bottom:12px; }
  .console-card { animation:fadeUp .9s cubic-bezier(.16,.8,.2,1) both; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
  .bubble { max-width:84%; padding:11px 15px; border-radius:15px; font-size:14.5px; line-height:1.5; }
  .turn.you { justify-content:flex-end; }
  .turn.you .bubble { background:#1c2c23; color:var(--fg); border-bottom-right-radius:5px; border:1px solid var(--line); }
  .turn.ai .bubble { background:linear-gradient(180deg,rgba(127,211,160,.14),rgba(127,211,160,.06));
    border:1px solid var(--line-strong); border-bottom-left-radius:5px; color:var(--fg); }
  .turn .who { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:5px; font-weight:600; }
  .turn.ai .who { color:var(--mint); }
  .hl { color:var(--mint); font-weight:600; }
  .hl-warm { color:var(--gold); font-weight:600; }

  .glow { position:absolute; inset:0; z-index:-1; pointer-events:none; overflow:hidden; }
  .glow::before { content:""; position:absolute; top:-10%; right:-14%; width:620px; height:620px;
    background:radial-gradient(circle,rgba(127,211,160,.16),transparent 62%); filter:blur(8px); }
  .glow::after { content:""; position:absolute; bottom:-30%; left:-10%; width:520px; height:520px;
    background:radial-gradient(circle,rgba(230,198,125,.07),transparent 65%); }

  /* ---------- section frame ---------- */
  section { position:relative; }
  .band { padding:88px 0; border-top:1px solid var(--line); }
  .eyebrow-free h2 { font-family:var(--serif); font-weight:500; letter-spacing:-.02em;
    font-size:clamp(2rem,3.6vw,2.9rem); line-height:1.08; margin:0 0 16px; text-wrap:balance; }
  .section-lede { color:var(--muted); font-size:1.08rem; max-width:62ch; margin:0 0 44px; }

  /* dispersion feature */
  .split { display:grid; grid-template-columns:.95fr 1.05fr; gap:60px; align-items:center; }
  .disp-wrap { background:
      radial-gradient(130% 100% at 50% 8%,rgba(127,211,160,.08),transparent 60%),
      linear-gradient(180deg,var(--surface),var(--bg-2));
    border:1px solid var(--line); border-radius:22px; padding:26px; box-shadow:var(--shadow); }
  .disp-wrap figcaption { color:var(--muted); font-size:13px; margin-top:16px; display:flex; gap:20px; flex-wrap:wrap; }
  .key { display:inline-flex; align-items:center; gap:7px; }
  .swatch { width:11px; height:11px; border-radius:50%; flex:none; }
  .lead-line { font-family:var(--serif); font-style:italic; font-size:1.5rem; color:var(--fg);
    line-height:1.25; margin:0 0 20px; letter-spacing:-.01em; }
  .split p { color:var(--fg-soft); margin:0 0 16px; }
  .split p:last-child { margin-bottom:0; }

  /* bento */
  .bento { display:grid; grid-template-columns:repeat(6,1fr); gap:18px; }
  .cell { background:linear-gradient(180deg,var(--surface),var(--bg-2)); border:1px solid var(--line);
    border-radius:18px; padding:26px; box-shadow:var(--shadow-sm); position:relative; overflow:hidden;
    transition:transform .25s cubic-bezier(.2,.7,.2,1),border-color .25s; }
  .cell:hover { transform:translateY(-4px); border-color:var(--line-strong); }
  .cell.wide { grid-column:span 4; } .cell.sm { grid-column:span 2; } .cell.half { grid-column:span 3; }
  .cell .ico { width:42px; height:42px; display:grid; place-items:center; color:var(--mint);
    background:rgba(127,211,160,.09); border:1px solid var(--line); border-radius:11px; margin-bottom:18px; }
  .cell h3 { font-size:1.18rem; font-weight:600; letter-spacing:-.01em; margin:0 0 9px; }
  .cell p { color:var(--muted); font-size:.98rem; margin:0; }
  .cell .big-quote { font-family:var(--serif); font-style:italic; font-size:1.35rem; color:var(--mint);
    line-height:1.3; margin:18px 0 0; letter-spacing:-.01em; }

  /* flow */
  .flow { display:grid; grid-template-columns:1fr auto 1fr; gap:22px; align-items:stretch; }
  .node { background:linear-gradient(180deg,var(--surface),var(--bg-2)); border:1px solid var(--line);
    border-radius:16px; padding:22px; display:flex; flex-direction:column; gap:12px; box-shadow:var(--shadow-sm); }
  .node h4 { margin:0; font-size:1.02rem; font-weight:600; display:flex; align-items:center; gap:9px; }
  .node h4 .ico { color:var(--mint); }
  .node ul { margin:0; padding-left:18px; color:var(--muted); font-size:.92rem; line-height:1.7; }
  .node.core { border-color:var(--line-strong);
    background:linear-gradient(180deg,rgba(127,211,160,.07),var(--bg-2)); }
  .node.core .tag { font-family:var(--mono); font-size:11.5px; color:var(--mint); letter-spacing:.02em; }
  .flow-arrow { display:grid; place-items:center; color:var(--mint-deep); }
  .flow-foot { display:flex; gap:22px; justify-content:center; margin-top:22px; flex-wrap:wrap; color:var(--muted); font-size:13.5px; }
  .flow-foot .pill { display:inline-flex; align-items:center; gap:8px; padding:7px 13px;
    border:1px solid var(--line); border-radius:999px; background:var(--surface); }

  /* tools */
  .tools { display:grid; grid-template-columns:1fr 1fr; gap:0 48px; }
  .tool { display:flex; gap:18px; padding:20px 0; border-top:1px solid var(--line); align-items:baseline; }
  .tool code { font-family:var(--mono); font-size:13.5px; color:var(--mint); background:rgba(127,211,160,.08);
    padding:4px 9px; border-radius:7px; white-space:nowrap; flex:none; align-self:flex-start; }
  .tool p { margin:0; color:var(--fg-soft); font-size:.98rem; }

  /* stack */
  .stack-row { display:flex; flex-wrap:wrap; gap:12px; }
  .chip { display:inline-flex; align-items:center; gap:9px; padding:11px 16px; border-radius:11px;
    background:var(--surface); border:1px solid var(--line); font-size:14.5px; color:var(--fg-soft);
    transition:border-color .2s,color .2s; }
  .chip:hover { border-color:var(--line-strong); color:var(--fg); }
  .chip .ico { color:var(--mint); }

  /* footer */
  footer { border-top:1px solid var(--line); padding:64px 0 48px; background:var(--bg-2); }
  .foot-grid { display:flex; justify-content:space-between; align-items:flex-start; gap:40px; flex-wrap:wrap; }
  .foot-quote { font-family:var(--serif); font-style:italic; font-size:1.3rem; color:var(--fg-soft);
    max-width:34ch; line-height:1.4; }
  .foot-meta { color:var(--muted); font-size:14px; line-height:1.9; text-align:right; }
  .foot-meta a { color:var(--mint); } .foot-meta a:hover { text-decoration:underline; text-underline-offset:3px; }

  /* reveal */
  .reveal { opacity:0; transform:translateY(22px); }
  .reveal.in { opacity:1; transform:none; transition:opacity .8s ease,transform .8s cubic-bezier(.16,.8,.2,1); }
  @media (prefers-reduced-motion:reduce){
    .reveal,.turn,.console-card { opacity:1 !important; transform:none !important; transition:none !important; animation:none !important; }
  }

  @media (max-width:900px){
    .hero-grid,.split,.tools { grid-template-columns:1fr; gap:40px; }
    .flow { grid-template-columns:1fr; } .flow-arrow { transform:rotate(90deg); padding:4px 0; }
    .bento .cell.wide,.bento .cell.half,.bento .cell.sm { grid-column:span 6; }
    .hero { padding:60px 0 48px; } .band { padding:64px 0; }
  }
</style>
</head>
<body>

<nav>
  <div class="wrap nav-in">
    <a class="brand" href="#top">
      <span class="mark" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V4"/><path d="M7 4l10 3-10 3"/><circle cx="7" cy="21" r="0"/></svg>
      </span>
      Caddie Coach
    </a>
    <div class="nav-links">
      <a class="lk" href="#model">The model</a>
      <a class="lk" href="#features">What it does</a>
      <a class="lk" href="#how">How it works</a>
      <a class="lk" href="#tools">Tools</a>
      <a class="btn btn-ghost" href="/capture">Swing capture</a>
      <a class="btn btn-primary" href="https://github.com/hammy229/caddie-coach" target="_blank" rel="noopener">
        GitHub
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
      </a>
    </div>
  </div>
</nav>

<main id="top">
<section class="hero">
  <div class="glow" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1>A caddie that learns how <em>you</em> actually play.</h1>
      <p class="lede">A voice-first golf caddie and swing coach for Alexa+ — it models your real distances, your misses and your swing faults, then clubs you up and coaches you as you go.</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="https://github.com/hammy229/caddie-coach" target="_blank" rel="noopener">
          View on GitHub
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
        </a>
        <a class="btn btn-ghost" href="/capture">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L8 6H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-4z"/><circle cx="12" cy="13" r="3.5"/></svg>
          Open the swing coach
        </a>
      </div>
      <div class="meta"><span class="dot" aria-hidden="true"></span>Built for the Amazon Alexa+ · Build, Ship, Shape Hackathon 2026</div>
    </div>

    <div class="console">
      <div class="console-card">
        <div class="console-head">
          <svg class="ring" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <circle cx="18" cy="18" r="16" stroke="rgba(127,211,160,.25)" stroke-width="1.5"/>
            <circle cx="18" cy="18" r="10" stroke="rgba(127,211,160,.45)" stroke-width="1.5"/>
            <circle cx="18" cy="18" r="4" fill="#7fd3a0"/>
          </svg>
          <div><b>On the course</b><span>Hands-free, mid-round</span></div>
        </div>
        <div class="turn you" data-turn><div class="bubble"><div class="who">You</div>"150 to the pin, into a 10&nbsp;mph wind, water long. What do I hit?"</div></div>
        <div class="turn ai" data-turn><div class="bubble"><div class="who">Caddie Coach</div>"Plays like <span class="hl">162</span>. That's your 6-iron. Aim a hair left — your 6 drifts right and so does this wind. Water's safe if you catch it."</div></div>
        <div class="turn you" data-turn><div class="bubble"><div class="who">You</div>"7-iron came up 10 short."</div></div>
        <div class="turn ai" data-turn><div class="bubble"><div class="who">Caddie Coach</div>"Noted. That's <span class="hl-warm">three approaches in a row</span> short by about 10. Want to take one more club next time?"</div></div>
      </div>
    </div>
  </div>
</section>

<section id="model" class="band">
  <div class="wrap split">
    <figure class="disp-wrap reveal" style="margin:0">
      <svg viewBox="0 0 420 360" width="100%" role="img" aria-label="A green seen from above: a scatter of a player's shots forms a dispersion ellipse, offset left of the pin, with the aim point shifted to center the pattern on the hole.">
        <defs>
          <radialGradient id="green" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stop-color="#1c3326"/><stop offset="100%" stop-color="#0d1912"/>
          </radialGradient>
          <radialGradient id="ell" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="rgba(127,211,160,.26)"/><stop offset="100%" stop-color="rgba(127,211,160,0)"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="420" height="360" rx="16" fill="url(#green)"/>
        <g stroke="rgba(127,211,160,.10)" stroke-width="1" fill="none">
          <ellipse cx="210" cy="180" rx="150" ry="120"/><ellipse cx="210" cy="180" rx="100" ry="80"/><ellipse cx="210" cy="180" rx="52" ry="42"/>
        </g>
        <ellipse cx="170" cy="168" rx="92" ry="60" fill="url(#ell)" transform="rotate(-18 170 168)"/>
        <ellipse cx="170" cy="168" rx="92" ry="60" fill="none" stroke="rgba(127,211,160,.6)" stroke-width="1.5" stroke-dasharray="4 5" transform="rotate(-18 170 168)"/>
        <!-- pin -->
        <g stroke="#e6c67d" stroke-width="2" fill="none" stroke-linecap="round">
          <line x1="246" y1="196" x2="246" y2="150"/>
        </g>
        <path d="M246 150 l20 6 -20 7 z" fill="#e6c67d"/>
        <circle cx="246" cy="196" r="4" fill="#0a110c" stroke="#e6c67d" stroke-width="2"/>
        <!-- aim point -->
        <g transform="translate(170,168)">
          <circle r="7" fill="none" stroke="#7fd3a0" stroke-width="2"/>
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#7fd3a0" stroke-width="1.5"/>
          <line x1="0" y1="-12" x2="0" y2="12" stroke="#7fd3a0" stroke-width="1.5"/>
        </g>
        <!-- shots -->
        <g fill="#cdd9cf">
          <circle cx="150" cy="150" r="3.2"/><circle cx="196" cy="162" r="3.2"/><circle cx="138" cy="186" r="3.2"/>
          <circle cx="178" cy="142" r="3.2"/><circle cx="210" cy="188" r="3.2"/><circle cx="124" cy="160" r="3.2"/>
          <circle cx="166" cy="196" r="3.2"/><circle cx="188" cy="178" r="3.2"/>
        </g>
        <circle cx="152" cy="172" r="4" fill="#f08a5d"/>
      </svg>
      <figcaption>
        <span class="key"><span class="swatch" style="background:#cdd9cf"></span>Your last 20 shots</span>
        <span class="key"><span class="swatch" style="background:#7fd3a0"></span>Aim point</span>
        <span class="key"><span class="swatch" style="background:#e6c67d"></span>Pin</span>
      </figcaption>
    </figure>
    <div class="reveal eyebrow-free">
      <h2>150 to the pin isn't a <span style="white-space:nowrap">7-iron</span>. It's <em>your</em> <span style="white-space:nowrap">7-iron</span>.</h2>
      <p class="lead-line">Every club carries a shape, not a number.</p>
      <p>Caddie Coach keeps a running model of your last 20 full swings with each club — the mean and the spread of both carry and lateral miss. That's a dispersion ellipse, not a single yardage.</p>
      <p>Give it the shot and it computes the plays-like distance for wind and elevation, then scores every club by the chance of landing in the target zone, minus a risk-weighted chance of finding trouble. The aim point shifts to center your real pattern on the hole — so your usual miss becomes a good shot.</p>
    </div>
  </div>
</section>

<section id="features" class="band">
  <div class="wrap">
    <div class="eyebrow-free reveal">
      <h2>It coaches without being asked.</h2>
      <p class="section-lede">The model isn't a chart you look up. It watches every shot, notices what's going wrong, and says something — the way a good caddie would.</p>
    </div>
    <div class="bento">
      <div class="cell wide reveal">
        <div class="ico" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3l2 6 4-14 2.5 8H21"/></svg>
        </div>
        <h3>Patterns, caught in real time</h3>
        <p>Every logged shot is checked for streaks — approaches coming up short, tee shots leaking one way, a club quietly losing distance. The insight rides back in the same reply, so Alexa+ raises it before you've asked.</p>
        <p class="big-quote">"That's three approaches in a row short by about 10. Take one more club."</p>
      </div>
      <div class="cell sm reveal">
        <div class="ico" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L8 6H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-4z"/><circle cx="12" cy="13" r="3.5"/></svg>
        </div>
        <h3>A swing coach in your pocket</h3>
        <p>Prop your phone and swing. MediaPipe Pose measures tempo, early extension and over-the-top from your body — and only six keypoints per frame leave the device, never the video.</p>
      </div>
      <div class="cell half reveal">
        <div class="ico" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        </div>
        <h3>A report after every round</h3>
        <p>Fairways hit, approach accuracy, your dominant miss, distances against your usual, and the trend since last time — spoken aloud by Bedrock.</p>
      </div>
      <div class="cell half reveal">
        <div class="ico" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
        </div>
        <h3>Risk you can set out loud</h3>
        <p>"I'm feeling aggressive today." Safe, normal or aggressive — it changes how hard the engine weighs the trouble.</p>
      </div>
    </div>
  </div>
</section>

<section id="how" class="band">
  <div class="wrap">
    <div class="eyebrow-free reveal">
      <h2>How it's built</h2>
      <p class="section-lede">An MCP server over Streamable HTTP, speaking to Alexa+ as an add-on. Seven tools and two app cards on one side; your phone's camera on the other.</p>
    </div>
    <div class="flow reveal">
      <div class="node">
        <h4><span class="ico" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span>Alexa+</h4>
        <ul><li>Natural voice on the course</li><li>Connects as an MCP add-on</li><li>Renders the app cards</li></ul>
      </div>
      <div class="flow-arrow" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
      <div class="node core">
        <span class="tag">Streamable HTTP · MCP 2025-11-25</span>
        <h4><span class="ico" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/></svg></span>Caddie Coach server</h4>
        <ul><li>Personal dispersion model</li><li>Caddie engine + pattern detector</li><li>Swing analyzer · round report</li></ul>
      </div>
      <div class="flow-arrow" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
      <div class="node">
        <h4><span class="ico" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg></span>AWS</h4>
        <ul><li>DynamoDB — shots, swings, rounds</li><li>Bedrock — the spoken recap</li><li>Lambda Function URL (HTTPS)</li></ul>
      </div>
    </div>
    <div class="flow-foot reveal">
      <span class="pill"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7fd3a0" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L8 6H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-4z"/><circle cx="12" cy="13" r="3.5"/></svg>Phone camera</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3f9168" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      <span class="pill"><code style="font-family:var(--mono);font-size:12px;color:#7fd3a0">/capture</code> → <code style="font-family:var(--mono);font-size:12px;color:#7fd3a0">/api/swings</code></span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3f9168" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      <span class="pill">pose keypoints only, in-browser</span>
    </div>
  </div>
</section>

<section id="tools" class="band">
  <div class="wrap">
    <div class="eyebrow-free reveal">
      <h2>Seven tools, one conversation</h2>
      <p class="section-lede">Everything Alexa+ can call, each one grounded in your own game profile.</p>
    </div>
    <div class="tools reveal">
      <div class="tool"><code>start_round</code><p>Starts a round at a course, optionally setting your risk tolerance for the day.</p></div>
      <div class="tool"><code>recommend_club</code><p>Picks a club and aim point from your own dispersion and the conditions.</p></div>
      <div class="tool"><code>log_shot</code><p>Records club, target, carry and miss — and returns any pattern it spots.</p></div>
      <div class="tool"><code>analyze_swing</code><p>Coaches your latest captured swing and compares it with earlier ones.</p></div>
      <div class="tool"><code>set_risk_tolerance</code><p>Safe, normal or aggressive — changes how advice weighs the trouble.</p></div>
      <div class="tool"><code>end_round</code><p>Ends the round and returns the report card and spoken recap.</p></div>
      <div class="tool"><code>get_game_profile</code><p>Your real distances, miss tendencies and most common swing fault.</p></div>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="eyebrow-free reveal"><h2>Built with</h2></div>
    <div class="stack-row reveal">
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span>Alexa+</span>
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg></span>Model Context Protocol</span>
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span>Streamable HTTP</span>
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg></span>DynamoDB</span>
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M12 22V12M3 7l9 5 9-5"/></svg></span>Amazon Bedrock</span>
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg></span>MediaPipe Pose</span>
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/></svg></span>TypeScript</span>
      <span class="chip"><span class="ico" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15a4 4 0 0 1 4-4 5 5 0 0 1 9.5-1.5A3.5 3.5 0 0 1 20 15z"/><path d="M8 19l2-2M12 19l2-2M16 19l2-2"/></svg></span>AWS Lambda</span>
    </div>
  </div>
</section>
</main>

<footer>
  <div class="wrap foot-grid">
    <div>
      <a class="brand" href="#top" style="margin-bottom:18px">
        <span class="mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V4"/><path d="M7 4l10 3-10 3"/></svg></span>
        Caddie Coach
      </a>
      <p class="foot-quote">"Alexa, I'm done. I shot 88."</p>
    </div>
    <div class="foot-meta">
      Built by Arham Doshi<br>
      <a href="https://github.com/hammy229/caddie-coach" target="_blank" rel="noopener">github.com/hammy229/caddie-coach</a><br>
      <a href="/capture">Open the swing coach →</a><br>
      <span style="color:#6f8578">MIT · Amazon Alexa+ Hackathon 2026</span>
    </div>
  </div>
</footer>

<script>
  (function(){
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function(el){ el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold:.14, rootMargin:"0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });
  })();
</script>
</body>
</html>`;
