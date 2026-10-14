/**
 * MCP App UI resources rendered inside the Alexa+ conversation view.
 * The host posts the linked tool's result into the iframe; each card draws its structuredContent.
 */
export const APP_MIME = "text/html;profile=mcp-app";

const BASE_STYLE = `
  :root { color-scheme: light dark; --bg:#f6f8f4; --fg:#16241b; --muted:#5d6b61; --card:#ffffff; --line:#dfe6dc; --good:#1f7a3f; --bad:#b4471f; --accent:#2c6e49; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f1712; --fg:#e7efe9; --muted:#9db0a3; --card:#17221b; --line:#26352b; --good:#5fd08a; --bad:#f08a5d; --accent:#7fd3a0; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:14px; font:15px/1.45 system-ui, sans-serif; background:var(--bg); color:var(--fg); }
  h1 { font-size:18px; margin:0 0 2px; }
  .sub { color:var(--muted); font-size:13px; margin-bottom:12px; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:8px; margin-bottom:12px; }
  .stat { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:10px; }
  .stat b { display:block; font-size:22px; font-variant-numeric:tabular-nums; }
  .stat span { color:var(--muted); font-size:12px; }
  ul { margin:0 0 10px; padding-left:18px; }
  li { margin:2px 0; }
  .good { color:var(--good); } .bad { color:var(--bad); }
  .label { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin:10px 0 4px; }
  .empty { color:var(--muted); }
`;

const BRIDGE = `
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function stat(value, label) { var s = el("div", "stat"); s.appendChild(el("b", "", value)); s.appendChild(el("span", "", label)); return s; }
  function list(items, cls) { var u = el("ul", cls); items.forEach(function (t) { u.appendChild(el("li", "", t)); }); return u; }
  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0") return;
    if (msg.method === "ui/notifications/tool-result" && msg.params && msg.params.structuredContent) {
      render(msg.params.structuredContent);
    }
  });
  window.parent.postMessage({ jsonrpc: "2.0", id: 1, method: "ui/initialize", params: { appInfo: { name: APP_NAME, version: "0.1.0" } } }, "*");
`;

function page(title: string, appName: string, renderFn: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${BASE_STYLE}</style></head>
<body><div id="root" class="empty">Loading…</div>
<script>
(function () {
  var root = document.getElementById("root");
  var APP_NAME = ${JSON.stringify(appName)};
  ${renderFn}
  ${BRIDGE}
})();
</script></body></html>`;
}

export const ROUND_REPORT_HTML = page(
  "Round report",
  "caddie-coach-round-report",
  `function render(data) {
    var r = data.report; if (!r) return;
    root.className = ""; root.replaceChildren();
    root.appendChild(el("h1", "", r.course));
    root.appendChild(el("div", "sub", r.date + (r.strokes ? " · " + r.strokes + " strokes" : "") + " · " + r.shotsLogged + " shots logged"));
    var stats = el("div", "stats");
    if (r.teeShots) stats.appendChild(stat(r.fairwaysHit + "/" + r.teeShots, "fairways"));
    if (r.approaches) stats.appendChild(stat(r.greensHit + "/" + r.approaches, "approaches close"));
    if (r.dominantMiss) stats.appendChild(stat(r.dominantMiss, "typical miss"));
    if (r.vsPrior.priorFairwayPct !== null && r.vsPrior.fairwayPct !== null) stats.appendChild(stat((r.vsPrior.fairwayPct - r.vsPrior.priorFairwayPct >= 0 ? "+" : "") + (r.vsPrior.fairwayPct - r.vsPrior.priorFairwayPct) + "%", "fairways vs before"));
    root.appendChild(stats);
    if (r.strengths.length) { root.appendChild(el("div", "label", "Strengths")); root.appendChild(list(r.strengths, "good")); }
    if (r.weaknesses.length) { root.appendChild(el("div", "label", "Work on")); root.appendChild(list(r.weaknesses, "bad")); }
    if (data.recap) { root.appendChild(el("div", "label", "Caddie's take")); root.appendChild(el("p", "", data.recap)); }
  }`,
);

export const SWING_HTML = page(
  "Swing check",
  "caddie-coach-swing",
  `var LABEL = { over_the_top: "Over the top", early_extension: "Early extension", fast_tempo: "Quick backswing", slow_tempo: "Stalled transition" };
  function render(data) {
    var s = data.swing; if (!s) return;
    root.className = ""; root.replaceChildren();
    root.appendChild(el("h1", "", "Swing check"));
    root.appendChild(el("div", "sub", "Swing " + data.swingsRecorded + (s.club ? " · " + s.club : "")));
    var stats = el("div", "stats");
    stats.appendChild(stat(s.tempoRatio + ":1", "tempo (ideal ~3:1)"));
    stats.appendChild(stat(s.backswingMs + " ms", "backswing"));
    stats.appendChild(stat(s.downswingMs + " ms", "downswing"));
    stats.appendChild(stat((s.spineAngleChangeDeg > 0 ? "-" : "") + Math.abs(s.spineAngleChangeDeg) + "°", "posture change"));
    root.appendChild(stats);
    if (s.faults.length === 0) { root.appendChild(el("p", "good", "No faults detected.")); return; }
    root.appendChild(el("div", "label", "Faults"));
    root.appendChild(list(s.faults.map(function (f) {
      var run = (data.streaks || {})[f] || 1;
      return LABEL[f] + (run > 1 ? " (" + run + " in a row)" : "");
    }), "bad"));
  }`,
);
