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

const LOGO_SPANS_B64 = "DgEJADoACgERADsABwEXADwABQEbAD0ABAEdAD4AAgEhAD8AAQEjAEAAAAElAEEA/wAnAEIA/gApAEMA/QArAEQA/AAtAEUA+wAuAEYA+wAvAEcA+gAwAEgA+gAxAEkA3wAXAEoA+QAyAEoA1gBWAEsA0ABcAEwAywBhAE0AxgBnAE4AwgBrAE8AvwBuAFAAuwByAFEAuAAmAFIA9wA2AFIAtQAiAFMA9wA2AFMAsgAfAFQA9wA2AFQArwAeAFUA9wA2AFUArQAcAFYA9wA2AFYAqgAbAFcA9wA2AFcApwAaAFgA9wA2AFgApQAZAFkA9wA2AFkAowAYAFoA9wA2AFoAoQAXAFsA9wA1AFsAngAXAFwA+AA0AFwAnAAWAF0A+AA0AF0AmgAWAF4A+AAzAF4AmAAVAF8A+QAyAF8AlgAVAGAA+QAxAGAAlAAVAGEA+gAwAGEAkwATAGIA+gAvAGIAkQATAGMA+wAuAGMAjwATAGQA+wAvAGQAjQATAGUA/AAvAGUAiwATAGYA/QAvAGYAigASAGcA/gAvAGcAiAASAGgA/wAvAGgAhgATAGkAAAEjAGkAJAELAGkAhQASAGoAAQEhAGoAJQEKAGoAgwASAGsAAgEfAGsAJgEKAGsAggARAGwABAEbAGwAJwEKAGwAgAASAG0ABgEXAG0AKAEJAG0AfwARAG4ACAETAG4AKAEKAG4AfQARAG8ADAEMAG8AKQEKAG8AfAARAHAAKgEJAHAAegARAHEAKgEKAHEAeQAQAHIAKwEJAHIAeAAQAHMAKwEKAHMAdgARAHQALAEJAHQAdQAQAHUALAEKAHUAdAAQAHYALQEJAHYAcgAQAHcALQEJAHcAcQAQAHgAEQEJAHgALgEJAHgAcAAQAHkABgEeAHkALgEJAHkAbwAPAHoA/wArAHoALwEJAHoAbgAPAHsA+gA0AHsALwEJAHsAbAAQAHwA9gBCAHwAawAPAH0A8gBGAH0AagAPAH4A7gBLAH4AaQAPAH8A6wBOAH8AaAAPAIAA6ABTAIAAZwAPAIEA5QBYAIEAZgAPAIIA4gBcAIIAZQAOAIMA3wBhAIMAZAAOAIQA3ABmAIQAYwAOAIUA2gBpAIUAYgAOAIYA2ABsAIYAYQAOAIcA1QBxAIcAYAAOAIgA0wB0AIgAXwAOAIkA0QB3AIkAXgAOAIoAzwB6AIoAXQAOAIsAzQB9AIsAXAAOAIwAywCAAIwAWwAOAI0AyACEAI0AWwANAI4AxwCGAI4AWgANAI8AxQCJAI8AWQAOAJAAwwCLAJAAWAAOAJEAwQA8AJEAAAFPAJEAVwAOAJIAvwAuAJIACwFFAJIAVgAOAJMAvQAqAJMAEAFBAJMAVgANAJQAuwAnAJQAFAE9AJQAVQANAJUAugAkAJUAFwE7AJUAVAANAJYAuAAiAJYAGgE4AJYAUwAOAJcAtgAgAJcAHAE3AJcAUwANAJgAtQAeAJgAHgE2AJgAUgANAJkAswAdAJkAIAE0AJkAUQANAJoAsgAcAJoAIgEyAJoAUQAMAJsAsAAbAJsAIwEyAJsAUAANAJwArgAaAJwAJAExAJwATwANAJ0ArQAZAJ0AJgEwAJ0ATwAMAJ4AqwAZAJ4AJwEvAJ4ATgANAJ8AqgAYAJ8AKAEuAJ8ATQANAKAAqQAXAKAAKQEuAKAATQAMAKEApwAWAKEAKgEtAKEATAAMAKIApgAVAKIAKwEsAKIASwANAKMApAAVAKMAKwEtAKMASwAeAKQAowAVAKQALAEsAKQASgAlAKUAoQAVAKUALQErAKUASgApAKYAoAAUAKYALQErAKYASQAtAKcAnwATAKcALgEqAKcARwAyAKgAnQATAKgALgEqAKgARQA3AKkAnAATAKkALwEpAKkAQgA8AKoAmwASAKoALwEqAKoAQABAAKsAmQASAKsAMAEpAKsAPwBDAKwAmAASAKwAMAEpAKwAPQBHAK0AlwARAK0AMAEpAK0AOwBLAK4AlgARAK4AMQEoAK4AOgBOAK8AlAARAK8AMQEoAK8AOABRALAAkwARALAAMQEoALAANwBUALEAkgAQALEAMQEoALEANgBXALIAkQAQALIAMQEnALIANQBZALMAjwAQALMAMgEmALMANAAiALQAYwA7ALQAMgEmALQAMwAfALUAaAA0ALUAMgEmALUAMgAeALYAbAAvALYAMgEmALYAMQAdALcAbwArALcAMgEmALcAMAAdALgAcgAmALgAMgElALgALwAdALkAdAAjALkAMgElALkALwAcALoAdgAiALoAMQEmALoALgAcALsAeAAhALsAMQEmALsALQAcALwAegAhALwAMQElALwALQAcAL0AfAAgAL0AMQElAL0ALAAcAL4AfgAfAL4AMQElAL4ALAAbAL8AfwAgAL8AMAElAL8AKwAcAMAAfgAiAMAAMAElAMAAKwAbAMEAfQAkAMEAMAElAMEAKgAcAMIAfAAnAMIALwElAMIAKgAbAMMAewApAMMALwElAMMAKgAbAMQAegArAMQALwEkAMQAKQAcAMUAeAAPAMUAiQAeAMUALgElAMUAKQAbAMYAdwAPAMYAigAeAMYALgEkAMYAKQAbAMcAdgAOAMcAjAAeAMcALQElAMcAKQAbAMgAdQAOAMgAjQAeAMgALQEkAMgAKQAbAMkAdAAOAMkAjgAfAMkALAElAMkAKQAbAMoAcgAPAMoAkAAeAMoAKwElAMoAKQAaAMsAcQAPAMsAkQAfAMsAKwElAMsAKQAaAMwAcAAOAMwAkgAfAMwAKgElAMwAKQAaAM0AbwAOAM0AlAAfAM0AKQEmAM0AKQAaAM4AbQAPAM4AlQAfAM4AKAEmAM4AKQAaAM8AbAAPAM8AlwAfAM8AKAElAM8AKQAaANAAawAPANAAmAAfANAAJwEmANAAKQAbANEAaQAPANEAmQAgANEAJgEmANEAKgAaANIAaAAPANIAmwAgANIAJAEnANIAKgAaANMAZgAQANMAnAAhANMAIwEnANMAKgAbANQAZAARANQAnQAiANQAIgEnANQAKwAaANUAYwAQANUAnwAhANUAIQEoANUAKwAbANYAYQARANYAoAAiANYAIAEoANYALAAaANcAXwASANcAoQAjANcAHgEpANcALAAbANgAXQASANgAowAjANgAHQEpANgALQAbANkAWgAUANkApAAkANkAGwEqANkALgAcANoAVwAWANoApQAmANoAGQErANoALgAgANsAUQAaANsApwAmANsAFwEsANsALwA7ANwAqAAoANwAFQEtANwAMAA4AN0AqgApAN0AEwEuAN0AMQA2AN4AqwArAN4AEAEwAN4AMgAzAN8ArQAsAN8ADQEyAN8AMwAwAOAArgAvAOAACgEzAOAANQAsAOEAsAAyAOEABgE2AOEANgApAOIAsQA3AOIAAAE7AOIANgAnAOMAswCHAOMANgAlAOQAtQCDAOQANQAjAOUAtgCBAOUANQAJAOYAQAAVAOYAuAB9AOYANQAJAOcARAAMAOcAugB6AOcANQAJAOgAvAB2AOgANQAJAOkAvgBzAOkANQAJAOoAvwBwAOoANQAJAOsAwgBsAOsANQAJAOwAwwBqAOwANgAIAO0AxgBmAO0ANgAIAO4AyABjAO4ANgAIAO8AygBgAO8ANgAJAPAAzQBdAPAANgAJAPEAzwBaAPEANgAJAPIA0gBWAPIANgAJAPMA1QBSAPMANgAJAPQA2ABOAPQANwAIAPUA3ABJAPUANwAIAPYA4ABEAPYANwAJAPcA5QAmAPcADgEVAPcANwAJAPgA7QAXAPgADQEVAPgANwAJAPkADAEVAPkAOAAIAPoACwEVAPoAOAAJAPsACQEWAPsAOAAJAPwACAEWAPwAOQAIAP0ABwEWAP0AOQAJAP4ABgEWAP4AOQAJAP8ABAEXAP8AOgAJAAABAwEWAAABOgAJAAEBAgEWAAEBOgAKAAIBAAEXAAIBOwAJAAMB/wAXAAMBOwAXAAQB/gAXAAQBPAAZAAUB/AAXAAUBPAAbAAYB+wAXAAYBPQAcAAcB+QAYAAcBPAAfAAgB+AAXAAgBOwAhAAkB9gAYAAkBOgAjAAoB9QAYAAoBOAAmAAsB8wAYAAsBNwApAAwB8QAZAAwBNgAqAA0B7wAZAA0BNgArAA4B7gAZAA4BNQAtAA8B7AAZAA8BNAAuABAB6gAaABABNAAvABEB6AAaABEBMwAxABIB5gAaABIBMwAxABMB5AAbABMBMgAyABQB4wAaABQBMgAzABUB4AAbABUBMQA0ABYB3gAbABYBMQA0ABcB3AAcABcBMQA1ABgB2gAcABgBMQA1ABkB2AAcABkBMAA2ABoB1gAcABoBMAA2ABsB0wAdABsBMAA2ABwB0QAdABwBMAA2AB0BzgAeAB0BMAA2AB4BzAAeAB4BMAA2AB8ByQAeAB8BMAA2ACABxgAfACABMAA2ACEBwwAgACEBMAA2ACIBwAAhACIBMAA2ACMBvQAhACMBMQA1ACQBuQAjACQBMQA0ACUBtgAjACUBMQA2ACYBsgAkACYBMgA3ACcBrgAmACcBMgA6ACgBqgAnACgBMgA/ACkBpAApACkBMwBDACoBngAsACoBMwBKACsBlgAxACsBNACPACwBNQAsAC0BZABcAC0BNgArAC4BZwBUAC4BNgAqAC8BagBNAC8BNwAoADABbQBFADABOAAmADEBcgA6ADEBOQAkADIBdwAuADIBOwAgADMBgAAbADMBPAAeADQBPgAaADUBPwAYADYBQgASADcBRgAKADgB";

let decodedSpans = null;
function getLogoSpans () {
  if (decodedSpans) return decodedSpans;
  try {
    if (typeof atob === 'function') {
      const bin = atob(LOGO_SPANS_B64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      decodedSpans = new Uint16Array(u8.buffer);
    } else if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(LOGO_SPANS_B64, 'base64');
      decodedSpans = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
    }
  } catch (e) {
    decodedSpans = null;
  }
  return decodedSpans;
}

export const drawMarkFallback = (x, W, H) => {
  const cx = W * 0.5, cy = H * 0.5;

  // 1. Outer tilted orbital ellipse (-32deg)
  x.lineWidth = W * 0.020;
  x.beginPath();
  x.ellipse(cx, cy, W * 0.44, H * 0.28, -0.55, 0, TAU);
  x.stroke();

  // 2. TWO planetary spheres on the orbital ring (top-right and bottom-left)
  x.beginPath();
  x.arc(cx + W * 0.28, cy - H * 0.29, W * 0.070, 0, TAU);
  x.fill();

  x.beginPath();
  x.arc(cx - W * 0.30, cy + H * 0.28, W * 0.065, 0, TAU);
  x.fill();

  // 3. Central sweeping infinity ribbon loop matching real BizzPal logo
  x.save();
  x.translate(cx, cy);
  x.rotate(-0.55);

  x.beginPath();
  x.moveTo(-W * 0.05, 0);
  x.bezierCurveTo(W * 0.10, -H * 0.16, W * 0.36, -H * 0.14, W * 0.40, 0);
  x.bezierCurveTo(W * 0.42, H * 0.14, W * 0.18, H * 0.16, -W * 0.06, 0);
  x.bezierCurveTo(-W * 0.22, -H * 0.14, -W * 0.38, -H * 0.08, -W * 0.38, 0);
  x.bezierCurveTo(-W * 0.38, H * 0.08, -W * 0.22, H * 0.12, -W * 0.05, 0);
  x.closePath();
  x.lineWidth = W * 0.046;
  x.stroke();
  x.restore();
};

export const drawLogo = (x, W, H) => {
  const spans = getLogoSpans();
  if (spans && spans.length) {
    const sx = W / 380, sy = H / 380;
    x.fillStyle = '#fff';
    for (let i = 0; i < spans.length; i += 3) {
      x.fillRect(spans[i] * sx, spans[i + 2] * sy, Math.max(1, spans[i + 1] * sx), Math.max(1, sy));
    }
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
