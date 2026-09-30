/* ============================================================================
   SHAPES + LAYOUTS
   Seven morph targets sampled from real drawn geometry, plus the connection
   graph that turns the point cloud into a neural network.
   ========================================================================== */
const TAU = Math.PI * 2;

/** Sample `count` points from anything drawn onto a 2D canvas. Returns xy in -1..1. */
export function sampleShape (draw, count, W = 380, H = 380) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineJoin = 'round';
  draw(x, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  const hits = [];
  for (let y = 0; y < H; y++) for (let px = 0; px < W; px++)
    if (d[(y * W + px) * 4] > 120) hits.push(px, y);
  const n = hits.length / 2 || 1;
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const k = (Math.random() * n) | 0;
    out[i * 2]     = (hits[k * 2] / W - 0.5) * 2;
    out[i * 2 + 1] = -(hits[k * 2 + 1] / H - 0.5) * 2;
  }
  return out;
}

const LOGO_DATA = "data:image/png;base64,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";

let LOGO_IMG = null;
if (typeof window !== 'undefined') {
  const img = new Image();
  img.src = LOGO_DATA;
  if (img.complete && img.naturalWidth) {
    LOGO_IMG = img;
  } else {
    img.onload = () => { LOGO_IMG = img; };
  }
}

export const drawMarkFallback = (x, W, H) => {
  const cx = W * 0.5, cy = H * 0.5;

  // 1. Outer tilted orbital ellipse
  x.lineWidth = W * 0.018;
  x.beginPath();
  x.ellipse(cx, cy, W * 0.42, H * 0.26, -0.48, 0, TAU);
  x.stroke();

  // 2. TWO planetary spheres on the orbital ring (top-right and bottom-left)
  const node = (nx, ny, r) => {
    x.beginPath();
    x.arc(nx, ny, r, 0, TAU);
    x.fill();
  };
  node(cx + W * 0.26, cy - H * 0.27, W * 0.064);
  node(cx - W * 0.28, cy + H * 0.26, W * 0.060);

  // 3. Central sweeping infinity ribbon loop matching real BizzPal logo
  x.save();
  x.translate(cx, cy);
  x.rotate(-0.48);
  x.beginPath();
  for (let i = 0; i <= 240; i++) {
    const t = (i / 240) * TAU;
    const d = 1 + Math.sin(t) * Math.sin(t);
    // Asymmetric loop: right loop is larger and sweeping
    const rScale = Math.cos(t) > 0 ? 1.32 : 0.82;
    const px = (W * 0.28 * Math.cos(t) * rScale) / d;
    const py = (W * 0.28 * Math.sin(t) * Math.cos(t) * (Math.cos(t) > 0 ? 1.35 : 0.88)) / d;
    if (i === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  }
  x.closePath();
  x.lineWidth = W * 0.052;
  x.stroke();
  x.restore();
};

export const drawLogo = (x, W, H) => {
  if (LOGO_IMG && LOGO_IMG.naturalWidth) {
    const iw = LOGO_IMG.naturalWidth, ih = LOGO_IMG.naturalHeight;
    const sc = Math.min(W / iw, H / ih) * 0.94;
    const dw = iw * sc, dh = ih * sc;
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.drawImage(LOGO_IMG, (W - dw) / 2, (H - dh) / 2, dw, dh);
    o.globalCompositeOperation = 'source-in';
    o.fillStyle = '#fff';
    o.fillRect(0, 0, W, H);
    x.drawImage(off, 0, 0);
    return;
  }
  drawMarkFallback(x, W, H);
};

export const drawN = drawLogo;

/* A contour figure rather than a filled one — an outline gives every limb the
   same particle density, so the form still reads at low point counts. */
export const drawHuman = (x, W, H) => {
  const cx = W * 0.5;
  x.lineWidth = W * 0.028;
  x.beginPath(); x.arc(cx, H * 0.135, H * 0.078, 0, TAU); x.stroke();
  x.beginPath();
  x.moveTo(cx - W * 0.125, H * 0.265);
  x.quadraticCurveTo(cx, H * 0.232, cx + W * 0.125, H * 0.265);
  x.lineTo(cx + W * 0.076, H * 0.560);
  x.quadraticCurveTo(cx, H * 0.585, cx - W * 0.076, H * 0.560);
  x.closePath(); x.stroke();
  x.beginPath(); x.moveTo(cx, H * 0.215); x.lineTo(cx, H * 0.545); x.stroke();
  x.beginPath(); x.moveTo(cx - W * 0.118, H * 0.290); x.lineTo(cx - W * 0.255, H * 0.450); x.lineTo(cx - W * 0.205, H * 0.630); x.stroke();
  x.beginPath(); x.moveTo(cx + W * 0.118, H * 0.290); x.lineTo(cx + W * 0.255, H * 0.450); x.lineTo(cx + W * 0.205, H * 0.630); x.stroke();
  x.beginPath(); x.moveTo(cx - W * 0.050, H * 0.565); x.lineTo(cx - W * 0.082, H * 0.760); x.lineTo(cx - W * 0.066, H * 0.950); x.stroke();
  x.beginPath(); x.moveTo(cx + W * 0.050, H * 0.565); x.lineTo(cx + W * 0.082, H * 0.760); x.lineTo(cx + W * 0.066, H * 0.950); x.stroke();
};

export function buildLayouts (N) {
  const letter = sampleShape(drawLogo, N);
  const human  = sampleShape(drawHuman, N);

  const T = [];
  for (let i = 0; i < 7; i++) T.push(new Float32Array(N * 3));
  const size = new Float32Array(N), rand = new Float32Array(N), phase = new Float32Array(N);
  const cluster = new Uint8Array(N);

  const CL = [];
  for (let c = 0; c < 5; c++) {
    const a = (c / 5) * TAU + 0.35;
    CL.push([Math.cos(a) * 52, Math.sin(a) * 23, -14 + Math.sin(a * 2) * 30]);
  }

  for (let i = 0; i < N; i++) {
    const u = Math.random(), u2 = Math.random(), u3 = Math.random();
    rand[i] = Math.random();
    phase[i] = Math.random();
    size[i] = 0.42 + Math.pow(Math.random(), 3.4) * 2.9;
    cluster[i] = i % 5;

    const th = Math.random() * TAU, ph = Math.acos(2 * Math.random() - 1);
    const dx = Math.sin(ph) * Math.cos(th), dy = Math.sin(ph) * Math.sin(th), dz = Math.cos(ph);
    const lx = letter[i * 2] * 17, ly = letter[i * 2 + 1] * 17, lz = (Math.random() - 0.5) * 2.0;

    /* T2 — the N */
    T[2][i * 3] = lx; T[2][i * 3 + 1] = ly; T[2][i * 3 + 2] = lz;

    /* T1 — the network */
    const r1 = 4 + 11 * u;
    T[1][i * 3]     = lx * 1.55 + dx * r1;
    T[1][i * 3 + 1] = ly * 1.55 + dy * r1;
    T[1][i * 3 + 2] = lz * 2.6 + dz * r1;

    /* T0 — sparse awakening */
    const r0 = 30 + 95 * Math.pow(u, 1.4);
    T[0][i * 3]     = lx * 2.6 + dx * r0;
    T[0][i * 3 + 1] = ly * 2.6 + dy * r0;
    T[0][i * 3 + 2] = lz * 3.0 + dz * r0 - 20;

    /* T3 — expansion: five structures, one per capability */
    const c = CL[cluster[i]], r3 = 2.5 + 7 * u2;
    T[3][i * 3]     = c[0] + lx * 0.30 + dx * r3;
    T[3][i * 3 + 1] = c[1] + ly * 0.30 + dy * r3;
    T[3][i * 3 + 2] = c[2] + lz * 0.60 + dz * r3;

    /* T4 — human + AI: a dense contour inside an ambient cloud */
    const isBody = u3 < 0.88;
    const spread = isBody ? Math.pow(u3 / 0.88, 2.0) * 0.8 : 9 + 30 * Math.pow((u3 - 0.88) / 0.12, 1.5);
    T[4][i * 3]     = human[i * 2] * 18 + dx * spread;
    T[4][i * 3 + 1] = human[i * 2 + 1] * 19 + 1.0 + dy * spread;
    T[4][i * 3 + 2] = (Math.random() - 0.5) * 1.6 + dz * spread;

    /* T5 — the neural tunnel */
    const tr = 15 + 11 * Math.pow(u, 0.6);
    const ta = phase[i] * TAU;
    const tz = 34 - 330 * u2;
    const wob = 1 + 0.22 * Math.sin(tz * 0.045 + ta);
    T[5][i * 3]     = Math.cos(ta) * tr * wob;
    T[5][i * 3 + 1] = Math.sin(ta) * tr * wob;
    T[5][i * 3 + 2] = tz;

    /* T6 — the universe */
    const arm = i % 3;
    const gr = 12 + 128 * Math.pow(u3, 0.72);
    const ga = arm * (TAU / 3) + gr * 0.052 + (Math.random() - 0.5) * 0.55;
    T[6][i * 3]     = Math.cos(ga) * gr;
    T[6][i * 3 + 1] = (Math.random() - 0.5) * (5 + 26 * Math.exp(-gr / 55));
    T[6][i * 3 + 2] = Math.sin(ga) * gr * 0.82 - 40;
  }
  return { T, size, rand, phase, cluster };
}

/** k-nearest-neighbour graph over the NET layout, restricted to same cluster. */
export function buildConnections (pos, N, cluster, maxDist, maxPer, maxTotal) {
  const cell = maxDist, grid = new Map();
  const key = (a, b, c) => a + ':' + b + ':' + c;
  const gi = i => [Math.floor(pos[i * 3] / cell), Math.floor(pos[i * 3 + 1] / cell), Math.floor(pos[i * 3 + 2] / cell)];

  for (let i = 0; i < N; i++) {
    const [a, b, c] = gi(i), kk = key(a, b, c);
    let arr = grid.get(kk); if (!arr) { arr = []; grid.set(kk, arr); }
    arr.push(i);
  }
  const deg = new Uint8Array(N), pairs = [], d2max = maxDist * maxDist, cand = [];
  for (let i = 0; i < N; i++) {
    if (pairs.length >= maxTotal) break;
    if (deg[i] >= maxPer) continue;
    const [gx, gy, gz] = gi(i);
    cand.length = 0;
    for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) for (let az = -1; az <= 1; az++) {
      const arr = grid.get(key(gx + ax, gy + ay, gz + az)); if (!arr) continue;
      for (const j of arr) {
        if (j <= i || deg[j] >= maxPer || cluster[i] !== cluster[j]) continue;
        const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < d2max) cand.push(d2, j);
      }
    }
    const idx = [];
    for (let q = 0; q < cand.length; q += 2) idx.push(q);
    idx.sort((a, b) => cand[a] - cand[b]);
    for (const q of idx) {
      if (deg[i] >= maxPer || pairs.length >= maxTotal) break;
      const j = cand[q + 1];
      if (deg[j] >= maxPer) continue;
      pairs.push(i, j); deg[i]++; deg[j]++;
    }
  }
  return pairs;
}
