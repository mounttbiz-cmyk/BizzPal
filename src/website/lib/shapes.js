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
  img.onload = () => { LOGO_IMG = img; };
}

export const drawLogo = (x, W, H) => {
  if (LOGO_IMG && LOGO_IMG.naturalWidth) {
    const iw = LOGO_IMG.naturalWidth, ih = LOGO_IMG.naturalHeight;
    const sc = Math.min(W / iw, H / ih) * 0.96;
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

  const cx = W / 2, cy = H / 2;

  // 1. Tilted orbital ellipse ring
  x.save();
  x.translate(cx, cy);
  x.rotate(-0.55); // tilt matching official logo
  x.lineWidth = W * 0.034;
  x.beginPath();
  x.ellipse(0, 0, W * 0.38, H * 0.22, 0, 0, TAU);
  x.stroke();

  // 2. Dual planetary spheres on the orbit ring
  const rSphere = W * 0.065;
  x.beginPath();
  x.arc(W * 0.38, 0, rSphere, 0, TAU);
  x.fill();
  x.beginPath();
  x.arc(-W * 0.38, 0, rSphere, 0, TAU);
  x.fill();
  x.restore();

  // 3. Central 3D Infinity Ribbon Loop
  x.save();
  x.translate(cx, cy);
  x.lineWidth = W * 0.058;
  x.beginPath();
  const steps = 180;
  const a = W * 0.32;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU;
    const d = 1 + Math.sin(t) * Math.sin(t);
    const px = (a * Math.cos(t)) / d;
    const py = (a * Math.sin(t) * Math.cos(t)) / d;
    if (i === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  }
  x.closePath();
  x.stroke();

  // 4. Central radiant core
  x.beginPath();
  x.arc(0, 0, W * 0.05, 0, TAU);
  x.fill();
  x.restore();
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
