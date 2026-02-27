let spacing = 35;
let numShapes = 32;
let baseAngleDeg = -15;
let baseExpoK = 3.6;
let blendName = "DARKEST";

let layers = [];
let ui = {};
let vecUI = {};

let organicSeed = 1337;

let animateOn = false;
let animType = "Drift";
let animFPS = 60;
let renderSeconds = 10;

let xStep = 4;

let rec = { recorder: null, chunks: [], recording: false, url: null };

function hash01(n) {
  const x = Math.sin(n * 999 + organicSeed) * 10000;
  return x - Math.floor(x);
}

function organicForLine(i) {
  return 0.92 + hash01(i * 0.2) * 0.12;
}

function setup() {
  createCanvas(1920, 1080);

  const dpr = window.devicePixelRatio || 1;
  pixelDensity(Math.min(2, Math.max(1, dpr)));

  frameRate(animFPS);

  layers = [
    new Layer("Terra", color("#D2691E")),
    new Layer("Vinho", color("#8B0000")),
    new Layer("Oliva", color("#556B2F")),
  ];

  injectGreyUIStyles();
  buildPanelUI();
  setupVectorCanvases();
}

function draw() {
  background("#F5F5DC");

  spacing = ui.spacing.value();
  xStep = ui.step.value();

  const dyn = computeAnim();

  const spacingFinal = spacing + dyn.spacingDelta;
  const angleFinal = baseAngleDeg + dyn.angleDelta;
  const expoKFinal = baseExpoK + dyn.expoKDelta;

  if (ui.blend.checked()) blendMode(window[blendName] ?? DARKEST);
  else blendMode(BLEND);

  if (ui.terraShow.checked()) layers[0].draw(angleFinal, expoKFinal, spacingFinal, dyn.layerOffsets[0], xStep);
  if (ui.vinhoShow.checked()) layers[1].draw(angleFinal, expoKFinal, spacingFinal, dyn.layerOffsets[1], xStep);
  if (ui.olivaShow.checked()) layers[2].draw(angleFinal, expoKFinal, spacingFinal, dyn.layerOffsets[2], xStep);

  blendMode(BLEND);

  renderVectorEditors();
}

class Layer {
  constructor(name, col) {
    this.name = name;
    this.col = col;
    this.baseVx = 0.0;
    this.baseVy = 0.7;
  }

  draw(angleDeg, expoKValue, spacingValue, offset, step) {
    const vx = this.baseVx + offset.vx;
    const vy = this.baseVy + offset.vy;

    push();
    translate(width / 2, height / 2);
    rotate(radians(angleDeg));

    const heightAmp = abs(vy) * 300;

    noStroke();
    fill(this.col);

    for (let i = -numShapes; i < numShapes; i++) {
      const baseY = i * spacingValue;

      const linePos = map(i, -numShapes, numShapes, -1, 1);
      const dynamicShift = vx + linePos;

      beginShape();

      for (let x = -width; x <= width; x += step) vertex(x, baseY);

      for (let x = width; x >= -width; x -= step) {
        const nx = map(x, -width, width, -1, 1);
        const dist = abs(nx - dynamicShift);

        const influence = exp(-dist * dist * expoKValue);
        const curve = pow(influence, 1.15);

        const organic = organicForLine(i);
        const yOffset = curve * heightAmp * organic;

        vertex(x, baseY + yOffset);
      }

      endShape(CLOSE);
    }

    pop();
  }
}

function computeAnim() {
  const result = {
    spacingDelta: 0,
    angleDelta: 0,
    expoKDelta: 0,
    layerOffsets: [{ vx: 0, vy: 0 }, { vx: 0, vy: 0 }, { vx: 0, vy: 0 }],
  };

  if (!animateOn) return result;

  if (animType === "Drift") {
    const t = frameCount * 0.01;
    result.layerOffsets = [
      { vx: Math.sin(t * 1.0) * 0.35, vy: Math.cos(t * 0.9) * 0.35 },
      { vx: Math.sin(t * 1.35 + 1.2) * 0.28, vy: Math.cos(t * 1.15 + 0.7) * 0.28 },
      { vx: Math.sin(t * 1.7 + 2.1) * 0.22, vy: Math.cos(t * 1.55 + 1.9) * 0.22 },
    ];
  }

  if (animType === "Loop") {
    const loopFrames = Math.max(1, Math.floor(renderSeconds * animFPS));
    const f = frameCount % loopFrames;
    const a = (f / loopFrames) * Math.PI * 2;

    result.layerOffsets = [
      { vx: Math.sin(a) * 0.38, vy: Math.cos(a) * 0.38 },
      { vx: Math.sin(a + (Math.PI * 2) / 3) * 0.30, vy: Math.cos(a + (Math.PI * 2) / 3) * 0.30 },
      { vx: Math.sin(a + (Math.PI * 4) / 3) * 0.24, vy: Math.cos(a + (Math.PI * 4) / 3) * 0.24 },
    ];
  }

  return result;
}

function buildPanelUI() {
  ui.panel = createDiv("");
  ui.panel.id("panel");

  ui.panel.html(`
    <details open class="sec">
      <summary>Display</summary>

      <div class="row">
        <label>Spacing</label>
        <div id="spacingSlot"></div>
      </div>

      <div class="row">
        <label>Smooth</label>
        <div id="stepSlot"></div>
      </div>

      <div class="row">
        <label>Blend</label>
        <div id="blendSlot"></div>
      </div>

      <div class="row">
        <label>Export</label>
        <div class="export">
          <select id="exportFmt" class="select">
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </select>
          <select id="exportScale" class="select">
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4" selected>4x</option>
            <option value="8">8x</option>
          </select>
          <button id="exportBtn" class="btn">Export</button>
        </div>
      </div>
    </details>

    <details class="sec">
      <summary>Terra</summary>
      <div class="row tight">
        <label>Ativo</label>
        <div id="terraSlot"></div>
      </div>
      <div class="vecwrap">
        <canvas id="vec_terra" width="150" height="150"></canvas>
      </div>
    </details>

    <details class="sec">
      <summary>Vinho</summary>
      <div class="row tight">
        <label>Ativo</label>
        <div id="vinhoSlot"></div>
      </div>
      <div class="vecwrap">
        <canvas id="vec_vinho" width="150" height="150"></canvas>
      </div>
    </details>

    <details class="sec">
      <summary>Oliva</summary>
      <div class="row tight">
        <label>Ativo</label>
        <div id="olivaSlot"></div>
      </div>
      <div class="vecwrap">
        <canvas id="vec_oliva" width="150" height="150"></canvas>
      </div>
    </details>

    <div class="divider"></div>

    <details class="sec">
      <summary>Animate</summary>
      <div class="row tight">
        <label>On</label>
        <div id="animOnSlot"></div>
      </div>
      <div class="row">
        <label>Type</label>
        <div class="export">
          <select id="animType" class="select">
            <option value="Drift">Drift</option>
            <option value="Loop">Loop</option>
          </select>
        </div>
      </div>
      <div class="row">
        <label>Video</label>
        <div class="export">
          <button id="renderBtn" class="btn">Render ${renderSeconds}s</button>
        </div>
      </div>
      <div class="row">
        <label>Status</label>
        <div id="recStatus" class="status">Enable Animate to render</div>
      </div>
      <div class="row">
        <label>Preview</label>
      </div>
      <div class="row">
        <div id="videoSlot" class="videoSlot"></div>
      </div>
    </details>
  `);

  ui.spacing = createSlider(20, 100, spacing, 1);
  ui.spacing.parent(select("#spacingSlot"));

  ui.step = createSlider(2, 16, xStep, 1);
  ui.step.parent(select("#stepSlot"));

  ui.blend = createCheckbox(blendName, true);
  ui.blend.parent(select("#blendSlot"));

  ui.terraShow = createCheckbox("", true);
  ui.terraShow.parent(select("#terraSlot"));

  ui.vinhoShow = createCheckbox("", false);
  ui.vinhoShow.parent(select("#vinhoSlot"));

  ui.olivaShow = createCheckbox("", false);
  ui.olivaShow.parent(select("#olivaSlot"));

  ui.animOn = createCheckbox("", false);
  ui.animOn.parent(select("#animOnSlot"));

  const animTypeEl = document.getElementById("animType");
  const renderBtn = document.getElementById("renderBtn");
  animTypeEl.value = animType;

  const syncAnimUI = () => {
    animateOn = ui.animOn.checked();
    animTypeEl.disabled = !animateOn;
    renderBtn.disabled = !animateOn || rec.recording;
    if (!animateOn) setStatus("Enable Animate to render");
    else if (!rec.recording) setStatus("Ready");
  };

  ui.animOn.changed(syncAnimUI);

  animTypeEl.addEventListener("change", () => {
    animType = animTypeEl.value;
  });

  syncAnimUI();

  select("#exportBtn").mousePressed(() => {
    const fmt = document.getElementById("exportFmt").value;
    const scale = parseInt(document.getElementById("exportScale").value, 10) || 1;
    if (fmt === "png") exportPNGScaled(scale);
    if (fmt === "svg") exportSVG();
  });

  renderBtn.addEventListener("click", () => renderVideoFixed());
}

function injectGreyUIStyles() {
  const css = `
    body { margin:0; padding:0; background:#1e1e1e; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
    canvas { display:block; margin-left:260px; }
    #panel {
      position: fixed; left: 0; top: 0; bottom: 0;
      width: 240px; padding: 14px 10px;
      background: #2a2a2a; color: #e6e6e6;
      border-right: 1px solid #3a3a3a;
      overflow:auto;
    }
    .sec { margin: 10px 0; border: 1px solid #3a3a3a; border-radius: 10px; background:#262626; box-shadow: 0 1px 0 rgba(255,255,255,.03) inset; }
    .divider { height: 1px; background: #3a3a3a; margin: 12px 6px; border-radius: 999px; }
    summary { cursor:pointer; padding: 10px 10px; font-weight: 600; color:#f0f0f0; list-style: none; user-select: none; }
    summary::-webkit-details-marker { display:none; }
    .row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding: 8px 10px; }
    .row.tight { padding-top: 6px; padding-bottom: 6px; }
    .row label { font-size: 12px; color:#cfcfcf; letter-spacing: .2px; min-width: 56px; }
    #panel input, #panel select, #panel button { font: inherit; }
    input[type="range"] { width: 120px; accent-color: #9f9f9f; filter: grayscale(1); }
    input[type="checkbox"] { accent-color: #9f9f9f; transform: scale(1.05); filter: grayscale(1); }
    .btn {
      background:#3a3a3a; color:#eaeaea;
      border:1px solid #4a4a4a;
      padding: 6px 10px; border-radius: 8px;
      cursor:pointer; white-space: nowrap;
    }
    .btn:hover { background:#444; }
    .btn[disabled] { opacity: 0.5; cursor: not-allowed; }
    .select {
      background:#2f2f2f; color:#eaeaea;
      border:1px solid #4a4a4a;
      padding: 6px 8px; border-radius: 8px;
    }
    .export { display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
    .status { font-size: 12px; color:#cfcfcf; text-align:right; flex: 1; }
    .vecwrap { padding: 10px; padding-top: 6px; }
    .vecwrap canvas {
      margin-left: 0 !important;
      width: 150px; height: 150px;
      border: 1px solid #3a3a3a;
      border-radius: 12px;
      background: #222;
      display:block;
      transition: opacity 120ms ease;
    }
    .vecwrap canvas.locked { opacity: 0.35; }
    .videoSlot { width: 100%; }
    .videoSlot video {
      width: 100%;
      height: auto;
      border: 1px solid #3a3a3a;
      border-radius: 10px;
      background: #111;
      display:block;
    }
    .videoActions { display:flex; justify-content:flex-end; margin-top: 8px; }
  `;
  createElement("style", css).parent(document.head);
}

function setupVectorCanvases() {
  const mapping = [
    { id: "vec_terra", idx: 0, enabledFn: () => ui.terraShow.checked() },
    { id: "vec_vinho", idx: 1, enabledFn: () => ui.vinhoShow.checked() },
    { id: "vec_oliva", idx: 2, enabledFn: () => ui.olivaShow.checked() },
  ];

  mapping.forEach(m => {
    const c = document.getElementById(m.id);
    const ctx = c.getContext("2d");
    vecUI[m.id] = { c, ctx, idx: m.idx, dragging: false, enabledFn: m.enabledFn };

    c.addEventListener("pointerdown", e => {
      if (!vecUI[m.id].enabledFn()) return;
      vecUI[m.id].dragging = true;
      updateLayerVectorFromEvent(m.id, e);
    });

    c.addEventListener("pointermove", e => {
      if (!vecUI[m.id].dragging) return;
      updateLayerVectorFromEvent(m.id, e);
    });

    window.addEventListener("pointerup", () => {
      vecUI[m.id].dragging = false;
    });
  });
}

function updateLayerVectorFromEvent(id, e) {
  const v = vecUI[id];
  const rect = v.c.getBoundingClientRect();

  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const w = v.c.width;
  const h = v.c.height;

  const cx = w / 2;
  const cy = h / 2;
  const maxR = (w / 2) - 18;

  let dx = mx - cx;
  let dy = cy - my;

  const d = Math.hypot(dx, dy);
  if (d > maxR) {
    dx *= maxR / d;
    dy *= maxR / d;
  }

  layers[v.idx].baseVx = dx / maxR;
  layers[v.idx].baseVy = dy / maxR;
}

function renderVectorEditors() {
  Object.keys(vecUI).forEach(id => {
    const v = vecUI[id];
    const layer = layers[v.idx];

    if (v.enabledFn && !v.enabledFn()) v.c.classList.add("locked");
    else v.c.classList.remove("locked");

    drawVectorCanvas(v.ctx, v.c.width, v.c.height, layer.name, layer.baseVx, layer.baseVy);
  });
}

function drawVectorCanvas(ctx, w, h, label, vx, vy) {
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#222";
  roundRect(ctx, 0, 0, w, h, 12, true, false);

  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = "#777";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, 12);
  ctx.lineTo(cx, h - 12);
  ctx.moveTo(12, cy);
  ctx.lineTo(w - 12, cy);
  ctx.stroke();

  ctx.fillStyle = "#ddd";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(label, 12, 18);

  const maxR = (w / 2) - 18;
  const x2 = cx + vx * maxR;
  const y2 = cy - vy * maxR;

  ctx.strokeStyle = "#f0f0f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.fillStyle = "#f0f0f0";
  ctx.beginPath();
  ctx.arc(x2, y2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function exportPNGScaled(scale = 1) {
  const w = width * scale;
  const h = height * scale;

  const g = createGraphics(w, h);
  g.pixelDensity(1);
  g.scale(scale);

  g.background("#F5F5DC");

  const spacingBase = ui.spacing.value();
  const step = ui.step.value();
  const dyn = computeAnim();

  const spacingFinal = spacingBase + dyn.spacingDelta;
  const angleFinal = baseAngleDeg + dyn.angleDelta;
  const expoKFinal = baseExpoK + dyn.expoKDelta;

  if (ui.blend.checked()) g.blendMode(window[blendName] ?? DARKEST);
  else g.blendMode(BLEND);

  if (ui.terraShow.checked()) drawLayerToGraphics(g, layers[0], angleFinal, expoKFinal, spacingFinal, dyn.layerOffsets[0], step);
  if (ui.vinhoShow.checked()) drawLayerToGraphics(g, layers[1], angleFinal, expoKFinal, spacingFinal, dyn.layerOffsets[1], step);
  if (ui.olivaShow.checked()) drawLayerToGraphics(g, layers[2], angleFinal, expoKFinal, spacingFinal, dyn.layerOffsets[2], step);

  g.blendMode(BLEND);

  saveCanvas(g.canvas, `pattern_${scale}x`, "png");
}

function drawLayerToGraphics(g, L, angleDeg, expoKValue, spacingValue, offset, step) {
  const vx = L.baseVx + offset.vx;
  const vy = L.baseVy + offset.vy;

  g.push();
  g.translate(width / 2, height / 2);
  g.rotate(radians(angleDeg));

  const heightAmp = Math.abs(vy) * 300;

  g.noStroke();
  g.fill(L.col);

  for (let i = -numShapes; i < numShapes; i++) {
    const baseY = i * spacingValue;

    const linePos = map(i, -numShapes, numShapes, -1, 1);
    const dynamicShift = vx + linePos;

    g.beginShape();

    for (let x = -width; x <= width; x += step) g.vertex(x, baseY);

    for (let x = width; x >= -width; x -= step) {
      const nx = map(x, -width, width, -1, 1);
      const dist = Math.abs(nx - dynamicShift);

      const influence = Math.exp(-dist * dist * expoKValue);
      const curve = Math.pow(influence, 1.15);

      const organic = organicForLine(i);
      const yOffset = curve * heightAmp * organic;

      g.vertex(x, baseY + yOffset);
    }

    g.endShape(CLOSE);
  }

  g.pop();
}

function exportSVG() {
  const useBlend = ui.blend.checked();
  const svgW = width;
  const svgH = height;
  const bg = "#F5F5DC";

  const spacingBase = ui.spacing.value();
  const step = ui.step.value();
  const dyn = computeAnim();

  const spacingFinal = spacingBase + dyn.spacingDelta;
  const angleFinal = baseAngleDeg + dyn.angleDelta;
  const expoKFinal = baseExpoK + dyn.expoKDelta;

  const toHex = (c) => {
    const hex = (n) => n.toString(16).padStart(2, "0");
    return `#${hex(int(red(c)))}${hex(int(green(c)))}${hex(int(blue(c)))}`;
  };

  const active = [];
  if (ui.terraShow.checked()) active.push({ L: layers[0], off: dyn.layerOffsets[0] });
  if (ui.vinhoShow.checked()) active.push({ L: layers[1], off: dyn.layerOffsets[1] });
  if (ui.olivaShow.checked()) active.push({ L: layers[2], off: dyn.layerOffsets[2] });

  let content = "";

  for (const item of active) {
    const L = item.L;
    const off = item.off;

    const vx = L.baseVx + off.vx;
    const vy = L.baseVy + off.vy;

    const colHex = toHex(L.col);
    let paths = "";

    for (let i = -numShapes; i < numShapes; i++) {
      const baseY = i * spacingFinal;

      const linePos = map(i, -numShapes, numShapes, -1, 1);
      const dynamicShift = vx + linePos;

      let d = "";
      let first = true;

      for (let x = -svgW; x <= svgW; x += step) {
        const px = x;
        const py = baseY;
        if (first) { d += `M ${px} ${py} `; first = false; }
        else d += `L ${px} ${py} `;
      }

      for (let x = svgW; x >= -svgW; x -= step) {
        const nx = map(x, -svgW, svgW, -1, 1);
        const dist = Math.abs(nx - dynamicShift);

        const influence = Math.exp(-dist * dist * expoKFinal);
        const curve = Math.pow(influence, 1.15);

        const organic = organicForLine(i);
        const heightAmp = Math.abs(vy) * 300;
        const yOffset = curve * heightAmp * organic;

        const px = x;
        const py = baseY + yOffset;
        d += `L ${px} ${py} `;
      }

      d += "Z";
      paths += `<path d="${d}" fill="${colHex}" />`;
    }

    const blendStyle = useBlend ? ` style="mix-blend-mode:darken"` : "";
    content += `<g transform="translate(${svgW / 2} ${svgH / 2}) rotate(${angleFinal})"${blendStyle}>${paths}</g>`;
  }

  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="100%" height="100%" fill="${bg}"/>
  ${content}
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pattern.svg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderVideoFixed() {
  if (!animateOn) {
    setStatus("Enable Animate to render");
    return;
  }
  if (rec.recording) return;

  const btn = document.getElementById("renderBtn");
  btn.disabled = true;

  setStatus("Starting…");
  clearPreview();

  if (rec.url) {
    URL.revokeObjectURL(rec.url);
    rec.url = null;
  }

  const canvas = document.querySelector("canvas");
  const stream = canvas.captureStream(animFPS);

  rec.chunks = [];
  rec.recording = true;

  const mt = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  rec.recorder = new MediaRecorder(stream, { mimeType: mt });

  const startedAt = performance.now();
  const totalMs = renderSeconds * 1000;

  rec.recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) rec.chunks.push(e.data);
  };

  rec.recorder.onstop = () => {
    rec.recording = false;

    const blob = new Blob(rec.chunks, { type: mt });
    rec.url = URL.createObjectURL(blob);
    mountPreview(rec.url);

    setStatus("Ready");
    btn.disabled = false;

    const renderBtn = document.getElementById("renderBtn");
    if (renderBtn) renderBtn.disabled = !animateOn;
  };

  rec.recorder.start(200);
  setStatus(`Recording ${renderSeconds}s…`);

  setTimeout(() => {
    try {
      rec.recorder.stop();
    } catch (e) {
      rec.recording = false;
      setStatus("Error");
      btn.disabled = false;
    }
  }, totalMs);

  function tick() {
    if (!rec.recording) return;
    const elapsed = performance.now() - startedAt;
    const left = Math.max(0, (totalMs - elapsed) / 1000);
    setStatus(`Recording ${left.toFixed(1)}s…`);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function setStatus(msg) {
  const el = document.getElementById("recStatus");
  if (el) el.textContent = msg;
}

function clearPreview() {
  const slot = document.getElementById("videoSlot");
  if (!slot) return;
  slot.innerHTML = "";
}

function mountPreview(url) {
  const slot = document.getElementById("videoSlot");
  if (!slot) return;

  const video = document.createElement("video");
  video.src = url;
  video.controls = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;

  const actions = document.createElement("div");
  actions.className = "videoActions";

  const dl = document.createElement("button");
  dl.className = "btn";
  dl.textContent = "Download (HD)";
  dl.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "pattern_HD_1080p.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  actions.appendChild(dl);
  slot.appendChild(video);
  slot.appendChild(actions);

  video.play().catch(() => {});
}
