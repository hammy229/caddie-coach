/**
 * Simulated Alexa+ host served at GET /alexa (the alternate Alexa+ path the hackathon rules allow).
 * A stand-in for the device: speech in (Web Speech API, or typing), a rule-based intent mapper
 * (POST /api/intent) in place of the Alexa+ model, then real MCP JSON-RPC to POST /mcp from the
 * browser, real MCP Apps cards rendered in a sandboxed iframe over the ui/* postMessage bridge, and
 * the reply spoken aloud. Every MCP message is shown in the traffic log.
 */
export const ALEXA_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Caddie Coach · Alexa+ simulator</title>
<meta name="color-scheme" content="dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:#0a110c; --surface:#111d16; --surface-2:#16271e; --line:rgba(127,211,160,.14); --line-strong:rgba(127,211,160,.28);
    --fg:#eef4ee; --soft:#cdd9cf; --muted:#9bb0a3; --mint:#7fd3a0; --ring:#4fd8ff; --bad:#f08a5d;
    --sans:"Hanken Grotesk",system-ui,-apple-system,sans-serif; --serif:"Newsreader",Georgia,serif; --mono:ui-monospace,"SF Mono",Menlo,monospace;
  }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; background:radial-gradient(1200px 600px at 50% -10%, #13241a 0%, var(--bg) 60%); color:var(--fg); font:16px/1.5 var(--sans); }
  main { width:min(100% - 32px, 860px); margin:0 auto; padding:28px 0 48px; }
  header { display:flex; align-items:baseline; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
  h1 { font:500 26px/1.2 var(--serif); margin:0; letter-spacing:-.01em; }
  .tag { font-size:13px; color:var(--muted); }
  .tag b { color:var(--mint); font-weight:600; }

  .device { position:relative; border-radius:28px; padding:14px; background:linear-gradient(180deg,#1a1f1c,#0d100e); box-shadow:0 30px 80px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.06); }
  .screen { position:relative; aspect-ratio:16/9.5; max-height:62vh; margin:0 auto; border-radius:16px; overflow:hidden; background:#060a08; border:1px solid rgba(255,255,255,.05); }
  .ambient { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:7% 8%; transition:opacity .25s; }
  .ambient .eyebrow { font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
  .ambient .say { font:400 clamp(20px,3.4vw,34px)/1.25 var(--serif); color:var(--fg); max-width:30ch; }
  .card { position:absolute; inset:0; display:none; grid-template-columns:minmax(0,1.35fr) minmax(0,1fr); }
  .screen.has-card .card { display:grid; }
  .screen.has-card .ambient { opacity:0; pointer-events:none; }
  .card iframe { width:100%; height:100%; border:0; background:#0f1712; }
  .card .caption { padding:22px; border-left:1px solid var(--line); overflow:auto; font:400 clamp(15px,1.7vw,19px)/1.4 var(--serif); color:var(--soft); }
  .lightbar { position:absolute; left:50%; bottom:5px; transform:translateX(-50%); width:38%; height:4px; border-radius:4px; background:rgba(79,216,255,.08); overflow:hidden; }
  .lightbar::after { content:""; position:absolute; inset:0; border-radius:4px; background:linear-gradient(90deg,transparent,var(--ring),transparent); opacity:0; }
  [data-state="listening"] .lightbar::after { opacity:1; animation:pulse 1.1s ease-in-out infinite; }
  [data-state="thinking"] .lightbar::after { opacity:1; animation:sweep 1s linear infinite; }
  [data-state="speaking"] .lightbar::after { opacity:1; background:var(--ring); animation:pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:.45 } 50% { opacity:1 } }
  @keyframes sweep { from { transform:translateX(-100%) } to { transform:translateX(100%) } }

  .controls { margin-top:18px; display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center; }
  .mic { width:54px; height:54px; border-radius:50%; border:1px solid var(--line-strong); background:var(--surface-2); color:var(--fg); display:grid; place-items:center; cursor:pointer; }
  .mic svg { width:22px; height:22px; }
  [data-state="listening"] .mic { background:var(--ring); color:#05222c; border-color:transparent; }
  input[type=text] { width:100%; padding:15px 16px; border-radius:14px; border:1px solid var(--line-strong); background:var(--surface); color:var(--fg); font:inherit; }
  input[type=text]:focus-visible, button:focus-visible, a:focus-visible { outline:2px solid var(--mint); outline-offset:2px; }
  .send { padding:15px 20px; border-radius:14px; border:0; background:var(--mint); color:#0a110c; font:600 15px var(--sans); cursor:pointer; }
  .chips { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
  .chip { padding:8px 12px; border-radius:999px; border:1px solid var(--line); background:transparent; color:var(--soft); font:14px var(--sans); cursor:pointer; text-align:left; }
  .chip:hover { border-color:var(--line-strong); color:var(--fg); }
  .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:14px; font-size:14px; color:var(--muted); }
  .ghost { padding:8px 12px; border-radius:10px; border:1px solid var(--line-strong); background:transparent; color:var(--fg); font:14px var(--sans); cursor:pointer; }
  a { color:var(--mint); }
  .panels { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:20px; }
  .panel { border:1px solid var(--line); border-radius:16px; background:var(--surface); padding:14px 16px; min-height:180px; max-height:340px; overflow:auto; }
  .panel h2 { font:600 12px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin:0 0 10px; }
  .turn { margin:0 0 10px; }
  .turn .who { font-size:12px; color:var(--muted); }
  .turn.you .text { color:var(--fg); }
  .turn.alexa .text { color:var(--soft); font-family:var(--serif); font-size:17px; }
  .log { font:12px/1.45 var(--mono); color:var(--soft); }
  .log div { white-space:pre-wrap; word-break:break-word; padding:4px 0; border-bottom:1px dashed var(--line); }
  .log .out { color:#a9d8ff; } .log .in { color:#b8e6c8; } .log .ui { color:#e6c67d; } .log .err { color:var(--bad); }
  .note { font-size:13px; color:var(--muted); margin-top:16px; }
  @media (max-width:720px) {
    .card { grid-template-columns:1fr; grid-template-rows:1.4fr 1fr; }
    .card .caption { border-left:0; border-top:1px solid var(--line); padding:14px; }
    .panels { grid-template-columns:1fr; }
    .screen { aspect-ratio:3/4; }
  }
  @media (prefers-reduced-motion:reduce) { .lightbar::after { animation:none !important; } }
</style>
</head>
<body>
<main data-state="idle" id="app">
  <header>
    <h1>Caddie Coach on Alexa+</h1>
    <span class="tag">Simulated Alexa+ host · <b id="status">connecting…</b></span>
  </header>

  <section class="device" aria-label="Simulated Echo Show">
    <div class="screen" id="screen">
      <div class="ambient">
        <div class="eyebrow" id="eyebrow">Say or type a request</div>
        <div class="say" id="say" aria-live="polite">“Start a round at Butler Park. I’m feeling aggressive today.”</div>
      </div>
      <div class="card"><iframe id="frame" title="MCP App card" sandbox="allow-scripts"></iframe><div class="caption" id="caption" aria-live="polite"></div></div>
      <div class="lightbar" aria-hidden="true"></div>
    </div>
  </section>

  <form class="controls" id="form" autocomplete="off">
    <button class="mic" id="mic" type="button" aria-label="Talk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
    <input type="text" id="text" placeholder="Talk to Caddie Coach…" aria-label="Request">
    <button class="send" type="submit">Send</button>
  </form>

  <div class="chips" id="chips" aria-label="Demo requests"></div>

  <div class="row">
    <button class="ghost" id="seed" type="button">Load an earlier round</button>
    <button class="ghost" id="fresh" type="button">New golfer</button>
    <button class="ghost" id="mute" type="button" aria-pressed="false">Mute voice</button>
    <span>Golfer <code id="who"></code> · <a id="capture" href="/capture" target="_blank" rel="noopener">swing capture page</a></span>
  </div>

  <div class="panels">
    <section class="panel" aria-label="Conversation"><h2>Conversation</h2><div id="turns"></div></section>
    <section class="panel" aria-label="MCP traffic"><h2>MCP traffic (real server)</h2><div class="log" id="log"></div></section>
  </div>

  <p class="note">This page stands in for an Alexa+ device. A small rule-based mapper turns each sentence into a tool call in place of the Alexa+ model; the tool call, the MCP App card and the reply all come from the real Caddie Coach MCP server (spec 2025-11-25, Streamable HTTP). Voice input needs a browser with the Web Speech API, such as Chrome.</p>
</main>

<script>
(function () {
  var app = document.getElementById("app");
  var params = new URLSearchParams(location.search);
  var user = params.get("user");
  try { user = user || localStorage.getItem("caddie-user"); } catch (e) {}
  user = user || "demo-user";
  var rpcId = 0, tools = {}, ctx = {}, cards = {}, pending = null, muted = false;
  var frame = document.getElementById("frame"), screen = document.getElementById("screen");

  function setUser(u) {
    user = u;
    try { localStorage.setItem("caddie-user", u); } catch (e) {}
    document.getElementById("who").textContent = u;
    document.getElementById("capture").href = "/capture?user=" + encodeURIComponent(u);
  }
  setUser(user);

  function setState(s) { app.dataset.state = s; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function log(cls, label, obj) {
    var box = document.getElementById("log");
    box.appendChild(el("div", cls, label + " " + JSON.stringify(obj)));
    box.scrollTop = box.scrollHeight;
  }
  function turn(who, text) {
    var box = document.getElementById("turns"), t = el("div", "turn " + who);
    t.appendChild(el("div", "who", who === "you" ? "You" : "Alexa"));
    t.appendChild(el("div", "text", text));
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
  }

  function parseSse(body, id) {
    var found = null;
    body.split(String.fromCharCode(10)).forEach(function (line) {
      if (line.indexOf("data:") !== 0) return;
      try { var m = JSON.parse(line.slice(5)); if (m.id === id) found = m; } catch (e) {}
    });
    return found;
  }

  function rpc(method, params, notify) {
    var body = { jsonrpc: "2.0", method: method, params: params || {} };
    if (!notify) body.id = ++rpcId;
    log("out", "→", body);
    return fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream", "x-user-id": user },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (notify) return null;
      var type = res.headers.get("content-type") || "";
      return (type.indexOf("text/event-stream") >= 0 ? res.text().then(function (t) { return parseSse(t, body.id); }) : res.json()).then(function (msg) {
        if (!msg) throw new Error("No response from the MCP server (HTTP " + res.status + ")");
        log(msg.error ? "err" : "in", "←", msg);
        if (msg.error) throw new Error(msg.error.message);
        return msg.result;
      });
    });
  }

  function speak(text) {
    document.getElementById("say").textContent = text;
    document.getElementById("caption").textContent = text;
    document.getElementById("eyebrow").textContent = "Alexa";
    if (muted || !("speechSynthesis" in window)) { setState("idle"); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var voice = speechSynthesis.getVoices().filter(function (v) { return /en-US/.test(v.lang); })[0];
    if (voice) u.voice = voice;
    u.rate = 1.03;
    u.onstart = function () { setState("speaking"); };
    u.onend = u.onerror = function () { setState("idle"); };
    speechSynthesis.speak(u);
  }

  function respond(text) { turn("alexa", text); speak(text); }

  function showCard(uri, result) {
    var html = cards[uri] ? Promise.resolve(cards[uri]) : rpc("resources/read", { uri: uri }).then(function (r) { return (cards[uri] = r.contents[0].text); });
    return html.then(function (h) { pending = result; frame.srcdoc = h; screen.classList.add("has-card"); });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== frame.contentWindow) return;
    var msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0") return;
    log("ui", "card →", msg);
    if (msg.method === "ui/initialize") {
      var reply = { jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-11-25", hostInfo: { name: "caddie-coach-alexa-sim", version: "0.1.0" }, hostContext: { theme: "dark" } } };
      frame.contentWindow.postMessage(reply, "*");
      if (pending) {
        var note = { jsonrpc: "2.0", method: "ui/notifications/tool-result", params: pending };
        frame.contentWindow.postMessage(note, "*");
        log("ui", "→ card", { method: note.method });
      }
    }
  });

  function textOf(result) {
    return (result.content || []).filter(function (c) { return c.type === "text"; }).map(function (c) { return c.text; }).join(" ");
  }

  function handle(utterance) {
    utterance = utterance.trim();
    if (!utterance) return;
    turn("you", utterance);
    setState("thinking");
    fetch("/api/intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ utterance: utterance, context: ctx }) })
      .then(function (r) { return r.json(); })
      .then(function (intent) {
        if (intent.kind !== "tool") { respond(intent.text); return; }
        return rpc("tools/call", { name: intent.tool, arguments: intent.args }).then(function (result) {
          if (intent.tool === "recommend_club") ctx.lastDistance = intent.args.distance_yards;
          var uri = tools[intent.tool] && tools[intent.tool]._meta && tools[intent.tool]._meta.ui && tools[intent.tool]._meta.ui.resourceUri;
          var text = textOf(result) || "Done.";
          if (uri && result.structuredContent) return showCard(uri, result).then(function () { respond(text); });
          screen.classList.remove("has-card");
          respond(text);
        });
      })
      .catch(function (e) { log("err", "error", String(e.message || e)); respond("Sorry, something went wrong: " + (e.message || e)); });
  }

  document.getElementById("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("text");
    handle(input.value);
    input.value = "";
  });

  [
    "Start a round at Butler Park. I'm feeling aggressive today.",
    "How should I play this hole? It's a 520 par 5, water short of the green.",
    "150 to the pin into a 10 mile an hour wind, water long. What should I hit?",
    "7 iron came up 10 short.",
    "8 iron from 140, 12 short.",
    "9 iron from 130, 9 short.",
    "Missed a 20 foot putt, left it 3 feet.",
    "How was that swing?",
    "I'm done. I shot 88.",
    "I've got 30 minutes at the range. What should I work on?",
    "What's my handicap?",
  ].forEach(function (phrase) {
    var b = el("button", "chip", phrase);
    b.type = "button";
    b.addEventListener("click", function () { handle(phrase); });
    document.getElementById("chips").appendChild(b);
  });

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var mic = document.getElementById("mic");
  if (SR) {
    var rec = new SR(), listening = false;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = function (e) {
      var r = e.results[e.results.length - 1];
      document.getElementById("text").value = r[0].transcript;
      if (r.isFinal) { document.getElementById("text").value = ""; handle(r[0].transcript); }
    };
    rec.onend = function () { listening = false; if (app.dataset.state === "listening") setState("idle"); };
    rec.onerror = function () { listening = false; setState("idle"); };
    mic.addEventListener("click", function () {
      if (listening) { rec.stop(); return; }
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      listening = true;
      setState("listening");
      rec.start();
    });
  } else {
    mic.disabled = true;
    mic.title = "Voice input needs a browser with the Web Speech API";
  }

  document.getElementById("mute").addEventListener("click", function () {
    muted = !muted;
    this.textContent = muted ? "Unmute voice" : "Mute voice";
    this.setAttribute("aria-pressed", String(muted));
    if (muted && "speechSynthesis" in window) speechSynthesis.cancel();
  });

  document.getElementById("fresh").addEventListener("click", function () {
    setUser("golfer-" + Math.random().toString(36).slice(2, 8));
    ctx = {};
    screen.classList.remove("has-card");
    respond("New golfer. I'll start learning your game from scratch.");
  });

  document.getElementById("seed").addEventListener("click", function () {
    var calls = [
      ["start_round", { course: "Practice Links", par: 72, course_rating: 71.0, slope: 125 }],
      ["log_shot", { club: "driver", target_yards: 240, distance_miss_yards: -5, lateral_miss_yards: 18 }],
      ["log_shot", { club: "driver", target_yards: 240, distance_miss_yards: 0, lateral_miss_yards: 22 }],
      ["log_shot", { club: "7i", target_yards: 150, distance_miss_yards: -8 }],
      ["log_shot", { club: "8i", target_yards: 140, distance_miss_yards: -6, lateral_miss_yards: 4 }],
      ["log_shot", { club: "9i", target_yards: 130, distance_miss_yards: -4 }],
      ["log_shot", { club: "pw", target_yards: 115, distance_miss_yards: 3 }],
      ["log_putt", { distance_feet: 18, holed: false, remaining_feet: 3 }],
      ["log_putt", { distance_feet: 6, holed: true }],
      ["log_putt", { distance_feet: 25, holed: false, remaining_feet: 4 }],
      ["end_round", { strokes: 92 }],
    ];
    setState("thinking");
    calls.reduce(function (p, c) { return p.then(function () { return rpc("tools/call", { name: c[0], arguments: c[1] }); }); }, Promise.resolve())
      .then(function () { screen.classList.remove("has-card"); respond("Loaded an earlier round at Practice Links: a 92, with a driver that leaks right and approaches that come up short."); })
      .catch(function (e) { respond("Couldn't load the earlier round: " + e.message); });
  });

  rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "caddie-coach-alexa-sim", version: "0.1.0" } })
    .then(function (r) {
      rpc("notifications/initialized", {}, true);
      return rpc("tools/list", {}).then(function (t) {
        t.tools.forEach(function (tool) { tools[tool.name] = tool; });
        document.getElementById("status").textContent = r.serverInfo.name + " · MCP " + r.protocolVersion + " · " + t.tools.length + " tools";
      });
    })
    .catch(function (e) { document.getElementById("status").textContent = "MCP server unreachable"; log("err", "error", String(e.message || e)); });
})();
</script>
</body>
</html>`;
