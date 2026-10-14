/**
 * Swing capture page served at GET /capture. Runs MediaPipe Pose in the browser on a phone or
 * laptop camera, records ~3 seconds of keypoints, and uploads them to POST /api/swings.
 * Video never leaves the device; only 6 body keypoints per frame are sent.
 */
export const CAPTURE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Caddie Coach · Swing capture</title>
<style>
  :root { color-scheme: dark; --bg:#0f1712; --fg:#e7efe9; --muted:#9db0a3; --accent:#7fd3a0; --bad:#f08a5d; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.45 system-ui, sans-serif; }
  main { max-width:520px; margin:0 auto; padding:16px; }
  h1 { font-size:20px; margin:0 0 4px; }
  p { color:var(--muted); margin:0 0 12px; }
  .stage { position:relative; width:100%; aspect-ratio:3/4; background:#000; border-radius:14px; overflow:hidden; }
  video, canvas { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  button { width:100%; margin-top:12px; padding:14px; font:600 17px system-ui; border:0; border-radius:12px; background:var(--accent); color:#0f1712; }
  button:disabled { opacity:.5; }
  label { display:block; margin-top:12px; color:var(--muted); font-size:14px; }
  select { width:100%; margin-top:4px; padding:10px; border-radius:10px; background:#17221b; color:var(--fg); border:1px solid #26352b; font-size:16px; }
  #status { margin-top:12px; min-height:24px; }
  .err { color:var(--bad); }
</style>
</head>
<body>
<main>
  <h1>Swing capture</h1>
  <p>Prop your phone facing you, about 3 metres away, whole body in frame. Tap record, set up, and swing. Then ask Alexa, "how was that swing?"</p>
  <div class="stage"><video id="video" playsinline muted></video><canvas id="overlay"></canvas></div>
  <label>Club <select id="club"><option value="">(optional)</option><option>driver</option><option>3w</option><option>hybrid</option><option>5i</option><option>6i</option><option>7i</option><option>8i</option><option>9i</option><option>pw</option></select></label>
  <label>Handedness <select id="handed"><option value="right">Right-handed</option><option value="left">Left-handed</option></select></label>
  <button id="record" disabled>Starting camera…</button>
  <div id="status"></div>
</main>
<script type="module">
import { FilesetResolver, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const params = new URLSearchParams(location.search);
const userId = params.get("user") || localStorage.getItem("caddie-user") || "demo-user";
try { localStorage.setItem("caddie-user", userId); } catch {}

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const button = document.getElementById("record");
const status = document.getElementById("status");
const say = (text, err) => { status.textContent = text; status.className = err ? "err" : ""; };

// MediaPipe pose landmark indices.
const IDX = { leftShoulder: 11, rightShoulder: 12, leftWrist: 15, rightWrist: 16, leftHip: 23, rightHip: 24 };
const RECORD_MS = 3500;
let landmarker, recording = false, frames = [], startT = 0;

async function init() {
  try {
    const files = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    landmarker = await PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720, height: 960 }, audio: false });
    await video.play();
    button.disabled = false;
    button.textContent = "Record swing";
    requestAnimationFrame(loop);
  } catch (e) {
    say("Couldn't start the camera or pose model: " + e.message, true);
  }
}

function loop() {
  if (video.readyState >= 2) {
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const now = performance.now();
    const res = landmarker.detectForVideo(video, now);
    const lm = res.landmarks && res.landmarks[0];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (lm) {
      ctx.fillStyle = "#7fd3a0";
      for (const i of Object.values(IDX)) {
        ctx.beginPath(); ctx.arc(lm[i].x * canvas.width, lm[i].y * canvas.height, 6, 0, Math.PI * 2); ctx.fill();
      }
      if (recording) {
        const f = { t: Math.round(now - startT) };
        for (const [name, i] of Object.entries(IDX)) f[name] = { x: lm[i].x, y: lm[i].y };
        frames.push(f);
      }
    }
    if (recording && now - startT > RECORD_MS) finish();
  }
  requestAnimationFrame(loop);
}

function start() {
  frames = []; recording = true; startT = performance.now();
  button.disabled = true; button.textContent = "Recording…";
  say("Swing now.");
}

async function finish() {
  recording = false;
  button.textContent = "Uploading…";
  try {
    const res = await fetch("/api/swings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ frames, handed: document.getElementById("handed").value, club: document.getElementById("club").value || undefined }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || res.statusText);
    say("Saved. Ask Alexa: \\"how was that swing?\\"");
  } catch (e) {
    say("Upload failed: " + e.message, true);
  }
  button.disabled = false; button.textContent = "Record another swing";
}

button.addEventListener("click", start);
init();
</script>
</body>
</html>
`;
