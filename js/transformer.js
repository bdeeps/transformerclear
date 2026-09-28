// TransformerClear's shared physics and parts: the Indian grid's voltages, a 100 kVA 11 kV / 433 V
// distribution transformer (turns, flux, currents), IS 1180 loss limits, core-loss and heat-rise models,
// chart boards, flowing dots, and 3D builders for a pole-mounted transformer, its core and windings.
// +x right, +y up. Unless a chapter says otherwise, one scene unit = 0.5 m (S = 2 units per metre).
import { THREE, M, box, rod, sphere, beam, canvasTexture, clamp, lerp } from './kit.js';

export const TAU = Math.PI * 2;
export const S = 2;                          // scene units per metre for the full-size models

// ---------------------------------------------------------------- the grid
// India: 230 V single-phase and 400 V three-phase at 50 Hz (IS 12360; CEA supply regulations).
// A distribution transformer's LV side is wound for 433 V line (250 V phase) at no load, so that
// after the voltage drop along the street a house still gets about 230 V.
export const MAINS = { V: 230, f: 50 };

// ---------------------------------------------------------------- the 100 kVA distribution transformer
// A common Indian pole transformer: 100 kVA, 11,000 V delta / 433 V star (vector group Dyn11), ONAN.
// Turns: volts per turn for a three-phase core-type transformer ≈ k √(kVA per... ) with k ≈ 0.45 for
// distribution designs (Sawhney, "A Course in Electrical Machine Design"), so Et ≈ 0.45 √100 ≈ 4.5 V.
// LV phase = 433/√3 = 250 V → N₂ = 56 turns, so Et = 4.465 V. HV phase (delta) = 11,000 V →
// N₁ = 11,000 / 4.465 ≈ 2,464 turns. E = 4.44 f N Φmax gives Φmax = 4.465 / 222 ≈ 0.020 Wb, which at
// about 1.5 T (a usual CRGO working flux density) needs a net core section of about 134 cm².
// Full-load line currents: 100,000 / (√3 × 11,000) = 5.25 A and 100,000 / (√3 × 433) = 133 A.
// Mass and oil are typical of makers' 100 kVA data sheets: about 600–700 kg in all, about 200 L of oil.
export const DT = (() => {
  const kVA = 100, HV = 11000, LV = 433, N2 = 56;
  const Vph2 = LV / Math.sqrt(3), Et = Vph2 / N2, N1 = Math.round(HV / Et), f = 50;
  const phi = Et / (4.44 * f), B = 1.5, A = phi / B;
  return {
    kVA, HV, LV, N1, N2, Et, f, phi, B, A, Vph2,
    I1: (kVA * 1000) / (Math.sqrt(3) * HV), I2: (kVA * 1000) / (Math.sqrt(3) * LV),
    massKg: 650, oilL: 200, coreKg: 190,
  };
})();

// E = 4.44 f N Φmax (rms volts, sine flux). Returns Φmax in webers.
export const phiMax = (V, f, N) => (f > 0 && N > 0 ? V / (4.44 * f * N) : 0);

// ---------------------------------------------------------------- losses (IS 1180 levels, BEE stars)
// IS 1180 (Part 1):2014, Amendment 4 (March 2021), Table 3: maximum total losses for a 100 kVA,
// 11 kV, 4.5 % impedance transformer, at 50 % and 100 % load. BEE's star label for distribution
// transformers follows these energy-efficiency levels (1 star = level 1 … 5 stars = level 5).
export const LIMITS_100 = [
  { star: 1, t50: 475, t100: 1650 }, { star: 2, t50: 435, t100: 1500 }, { star: 3, t50: 392, t100: 1365 },
  { star: 4, t50: 352, t100: 1242 }, { star: 5, t50: 317, t100: 1130 },
];
// The standard caps the totals, not the split. These are illustrative designs that just meet each level:
// no-load (core) loss P0 and full-load copper loss Pc, so P0 + Pc/4 ≤ t50 and P0 + Pc ≤ t100.
export const DESIGNS = {
  1: { P0: 150, Pc: 1300 }, 2: { P0: 140, Pc: 1180 }, 3: { P0: 125, Pc: 1065 }, 4: { P0: 110, Pc: 965 }, 5: { P0: 80, Pc: 945 },
};
// Core loss per kg at 1.5 T, 50 Hz. Hysteresis ≈ 0.35 W/kg for CRGO (Steinmetz-type fit to typical
// M4/M5 data). Classical eddy loss for a sheet of thickness t: Pe = π² f² B² t² / (6 ρ d), with
// resistivity ρ = 48 × 10⁻⁸ Ω·m (3 % silicon steel) and density d = 7,650 kg/m³, times about 1.6 for
// "excess" loss from domain walls. At 0.27 mm this gives ≈ 0.64 W/kg in all, in line with data sheets.
// Amorphous ribbon (Metglas 2605SA1, 0.025 mm thick, ρ ≈ 130 × 10⁻⁸ Ω·m) at 1.35 T loses about
// 0.1–0.2 W/kg (Metglas data): roughly a quarter of CRGO's, so amorphous transformers cut no-load loss
// by about 70–80 %.
export function coreWPerKg(tMm, mat = 'crgo', f = 50, B = 1.5) {
  if (mat === 'amorph') { const total = 0.16 * (f / 50) ** 1.5; return { eddy: total * 0.2, hyst: total * 0.8, total }; }
  const t = tMm / 1000, rho = 48e-8, d = 7650;
  const eddy = (Math.PI ** 2 * f * f * B * B * t * t) / (6 * rho * d) * 1.6;
  const hyst = 0.35 * (f / 50) * (B / 1.5) ** 1.9;
  return { eddy, hyst, total: eddy + hyst };
}
export function lossModel({ load, star = 3, mat = 'crgo', lam = 0.27, pf = 1 }) {
  const d = DESIGNS[star] || DESIGNS[3];
  const base = coreWPerKg(0.27).total;
  let P0 = d.P0;
  let split = { hyst: 0, eddy: 0 };
  if (mat === 'amorph') { P0 = d.P0 * 0.28; split = { hyst: P0 * 0.8, eddy: P0 * 0.2 }; }
  else { const c = coreWPerKg(lam); P0 = (d.P0 * c.total) / base; split = { hyst: (P0 * c.hyst) / c.total, eddy: (P0 * c.eddy) / c.total }; }
  const K = Math.max(0, load), Pcu = d.Pc * K * K, out = K * DT.kVA * 1000 * pf;
  const eff = out > 0 ? out / (out + P0 + Pcu) : 0;
  const Kbest = Math.sqrt(P0 / d.Pc);
  return { P0, Pcu, Pc: d.Pc, out, eff, Kbest, loss: P0 + Pcu, ...split };
}

// ---------------------------------------------------------------- heat (IEC 60076-7)
// Steady-state top-oil rise Δθo = Δθor [(1 + R K²)/(1 + R)]^x and hot-spot gradient Δθh = H gr K^y, with the
// IEC 60076-7 values for ONAN distribution transformers: x = 0.8, y = 1.6, H = 1.1, top-oil time constant
// 180 min. Here the rated top-oil rise is 40 K and the winding-to-oil gradient gr = 15 K, typical of Indian
// utility specifications, which ask for lower rises than IEC 60076-2's 60 K because summers are hotter.
// Paper ageing (IEC 60076-7, normal kraft paper): relative rate V = 2^((θh − 98)/6). V = 1 at 98 °C.
export const HEAT = { dOr: 40, gr: 15, H: 1.1, x: 0.8, y: 1.6, tauO: 180 };
export function heat(K, ambient, R) {
  const dO = HEAT.dOr * Math.pow((1 + R * K * K) / (1 + R), HEAT.x);
  const dH = HEAT.H * HEAT.gr * Math.pow(Math.max(0, K), HEAT.y);
  const top = ambient + dO, hot = top + dH;
  return { top, hot, dO, dH, V: Math.pow(2, (hot - 98) / 6) };
}

// ---------------------------------------------------------------- number formats
export function si(v, unit, sig = 2) {
  const a = Math.abs(v);
  if (!isFinite(v)) return '∞ ' + unit;
  if (a < 1e-12) return '0 ' + unit;
  const pre = a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'k'] : a >= 1 ? [1, ''] : a >= 1e-3 ? [1e-3, 'm'] : a >= 1e-6 ? [1e-6, 'µ'] : [1e-9, 'n'];
  const x = v / pre[0], ax = Math.abs(x);
  const d = ax >= 100 ? 0 : ax >= 10 ? Math.max(0, sig - 2) : Math.max(0, sig - 1);
  return `${x.toFixed(d)} ${pre[1]}${unit}`;
}
export const fmt0 = (v) => Math.round(v).toLocaleString('en-IN');
export const fmtV = (v) => (v >= 1000 ? (v / 1000).toLocaleString('en-IN', { maximumFractionDigits: v >= 100000 ? 0 : 1 }) + ' kV' : v >= 10 ? fmt0(v) + ' V' : v.toFixed(1) + ' V');

// ---------------------------------------------------------------- colours
export const COL = { hv: 0xffb547, lv: 0x5ce1a9, flux: 0x8ef0ff, R: 0xff5a4f, Y: 0xffd35a, B: 0x4f8dff, hot: 0xff7a59, oil: 0xd9a441 };
export const CSS = { hv: '#ffb547', lv: '#5ce1a9', flux: '#8ef0ff', R: '#ff5a4f', Y: '#ffd35a', B: '#4f8dff', hot: '#ff7a59', muted: 'rgba(255,255,255,.6)' };

// ---------------------------------------------------------------- boards and charts
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const tex = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return Object.assign(tex, { mesh: m });
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '' }) {
  const X = (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 52);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 12);
  return { X, Y, x0, x1, y0, y1 };
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function title(g, text, x = 20, y = 36) { g.fillStyle = '#e8eef8'; g.font = 'bold 25px sans-serif'; g.fillText(text, x, y); }
// A strip with a zero line in the middle, for a signed trace. Returns Y(v) for values in ±fs.
export function strip(g, x0, x1, top, bot, fs, fmt, label, col) {
  const mid = (top + bot) / 2, Y = (v) => mid - clamp(v / fs, -1.08, 1.08) * (bot - top) / 2;
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1;
  for (const k of [-1, -0.5, 0.5, 1]) { g.beginPath(); g.moveTo(x0, Y(k * fs)); g.lineTo(x1, Y(k * fs)); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.moveTo(x0, top); g.lineTo(x0, bot); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '17px sans-serif';
  for (const k of [-1, 1]) { const s = fmt(k * fs); g.fillText(s, x0 - 8 - g.measureText(s).width, Y(k * fs) + 6); }
  g.fillText('0', x0 - 20, mid + 6);
  g.fillStyle = col; g.font = 'bold 20px sans-serif'; g.fillText(label, x0 + 10, top + 4);
  return Y;
}

// ---------------------------------------------------------------- paths and flowing dots
export function makePath(points, closed = false) {
  const pts = points.map((p) => new THREE.Vector3(...p));
  if (closed) pts.push(pts[0].clone());
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const L = cum[cum.length - 1];
  const at = (d, out = new THREE.Vector3()) => {
    d = closed ? ((d % L) + L) % L : ((d % L) + L) % L;
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const k = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return out.copy(pts[i - 1]).lerp(pts[i], k);
  };
  return { pts, cum, L, at, closed };
}
export function wire(path, r, mat) {
  const g = new THREE.Group();
  for (let i = 1; i < path.pts.length; i++) {
    const a = path.pts[i - 1], b = path.pts[i];
    if (a.distanceTo(b) < 1e-4) continue;
    g.add(beam(a.toArray(), b.toArray(), r, mat, 10));
    if (i < path.pts.length - 1) { const j = sphere(r, mat, 10); j.position.copy(b); g.add(j); }
  }
  return g;
}
// Dots that run along a path; step(dt, speed) in scene units per second (negative runs backwards).
export function flowDots(path, n, color, r = 0.05) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 10, 8), M.glow(color), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const o = new THREE.Object3D(), d = Array.from({ length: n }, (_, i) => (i / n) * path.L);
  mesh.step = (dt, speed) => {
    for (let i = 0; i < n; i++) { d[i] = (((d[i] + speed * dt) % path.L) + path.L) % path.L; path.at(d[i], o.position); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); }
    mesh.instanceMatrix.needsUpdate = true;
  };
  mesh.step(0, 0);
  return mesh;
}

// ---------------------------------------------------------------- materials that can go see-through
// A material whose opacity eases between solid and ghost for the X-ray view.
export function xmat(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35, transparent: true, opacity: 1, ...o });
  m.userData.solid = o.opacity ?? 1;
  return m;
}
export function setXray(mats, k, ghost = 0.12) {
  mats.forEach((m) => { m.opacity = lerp(m.userData.solid ?? 1, ghost, k); m.depthWrite = k < 0.5; });
}

// ---------------------------------------------------------------- windings and cores
// Stripes for a coil's surface: each line is a turn (or a layer of turns).
function turnsTexture(color, lines = 40) {
  const c = new THREE.Color(color);
  const t = canvasTexture(64, 512, (g, w, h) => {
    g.fillStyle = '#' + c.getHexString(); g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.28)';
    for (let i = 0; i < lines; i++) g.fillRect(0, (i * h) / lines, w, Math.max(1, h / lines / 3));
  });
  t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping;
  return t.tex;
}
// A vertical winding: a thick cylinder (rIn to rOut, height h) centred at the origin. discs > 1 splits it
// into disc sections with gaps, the way HV coils are wound.
export function winding({ rIn, rOut, h, color, discs = 1, lines = 40, emissive = 0x000000 }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: turnsTexture(color, Math.round(lines / discs)), roughness: 0.45, metalness: 0.4, emissive: new THREE.Color(emissive) });
  const capMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3, emissive: new THREE.Color(emissive) });
  const gap = discs > 1 ? h * 0.025 : 0, dh = (h - gap * (discs - 1)) / discs;
  for (let i = 0; i < discs; i++) {
    const y = -h / 2 + dh / 2 + i * (dh + gap);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, dh, 40, 1, true), mat);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(rIn, rIn, dh, 40, 1, true), capMat);
    const top = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 40), capMat); top.rotation.x = -Math.PI / 2; top.position.y = dh / 2;
    const bot = top.clone(); bot.rotation.x = Math.PI / 2; bot.position.y = -dh / 2;
    [outer, inner, top, bot].forEach((m) => { m.position.y += y; m.castShadow = true; g.add(m); });
  }
  g.mats = [mat, capMat];
  g.glow = (k, col = 0xff7a20) => { const c = new THREE.Color(col).multiplyScalar(k); mat.emissive.copy(c); capMat.emissive.copy(c); };
  return g;
}
// Laminations: fine stripes along the sheet direction.
function lamTexture() {
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#8a909c'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(30,34,42,.35)';
    for (let i = 0; i < 32; i++) g.fillRect((i * w) / 32, 0, 2, h);
  });
  t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping;
  return t.tex;
}
// A three-limb stacked core: limbs at x = −p, 0, +p with window height win, limb width lw, depth ld,
// yokes top and bottom. Each limb is stepped (two boxes) to fill the round coils better, as real
// CRGO cores are. Origin at the centre of the middle limb.
export function core3({ p, win, lw, ld, yh = lw, color = 0x9aa0ab }) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, map: lamTexture(), roughness: 0.5, metalness: 0.55 });
  g.mat = mat;
  const limbs = [];
  for (const x of [-p, 0, p]) {
    const a = box(lw, win, ld * 0.62, mat); a.position.set(x, 0, 0); g.add(a);
    const b = box(lw * 0.66, win, ld, mat); b.position.set(x, 0, 0); g.add(b);
    limbs.push(x);
  }
  for (const y of [win / 2 + yh / 2, -win / 2 - yh / 2]) {
    const a = box(2 * p + lw, yh, ld * 0.62, mat); a.position.y = y; g.add(a);
    const b = box(2 * p + lw, yh * 0.8, ld, mat); b.position.y = y; g.add(b);
  }
  g.limbs = limbs; g.H = win + 2 * yh;
  return g;
}

// ---------------------------------------------------------------- porcelain bushing
// A bushing: a porcelain body with weather sheds and a brass stud on top. Height h (scene units).
export function bushing(h, r, color = 0x7a4a2e, sheds = 4) {
  const g = new THREE.Group();
  const mat = M.plastic(color, { roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.75, h, 20), mat); body.position.y = h / 2; body.castShadow = true; g.add(body);
  for (let i = 0; i < sheds; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.35, h * 0.05, 24), mat);
    s.position.y = h * (0.28 + (0.6 * i) / Math.max(1, sheds - 1)); s.castShadow = true; g.add(s);
  }
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, h * 0.22, 12), M.metal(0xd8b25a)); stud.position.y = h + h * 0.1; g.add(stud);
  g.top = new THREE.Vector3(0, h + h * 0.2, 0);
  return g;
}

// ---------------------------------------------------------------- the distribution transformer
// A 100 kVA pole transformer in metres × s. Origin at the centre of the tank's base (on its skids).
// Tank 1.0 × 0.6 × 1.0 m with pressed-steel radiator fins on the front and back, top cover with three
// tall HV bushings and four short LV bushings, a conservator tank on brackets with an oil gauge,
// and a silica-gel breather hanging from it. Inside: the core and coils in oil.
export function makeDT(s = S, { buchholz = false, finsN = 12 } = {}) {
  const g = new THREE.Group();
  const W = 1.0 * s, D = 0.6 * s, H = 1.0 * s, y0 = 0.08 * s;
  const tankCol = 0x6f8a7a;                         // the grey-green paint many Indian utilities use
  const shellMats = [];
  const tm = xmat(tankCol, { metalness: 0.3, roughness: 0.55, side: THREE.DoubleSide }); shellMats.push(tm);
  const tank = new THREE.Group(); g.add(tank);
  const walls = [
    [W, H, 0.012 * s, 0, y0 + H / 2, D / 2], [W, H, 0.012 * s, 0, y0 + H / 2, -D / 2],
    [0.012 * s, H, D, W / 2, y0 + H / 2, 0], [0.012 * s, H, D, -W / 2, y0 + H / 2, 0],
    [W, 0.012 * s, D, 0, y0, 0],
  ];
  walls.forEach(([w, h, d, x, y, z]) => { const b = box(w, h, d, tm); b.position.set(x, y, z); tank.add(b); });
  // Skids under the tank.
  for (const x of [-0.3 * s, 0.3 * s]) { const k = box(0.08 * s, y0, D * 1.1, M.metal(0x3a3f4b)); k.position.set(x, y0 / 2, 0); tank.add(k); }
  // Radiator fins front and back.
  const fins = new THREE.Group(); g.add(fins);
  const fm = xmat(tankCol, { metalness: 0.3, roughness: 0.5 }); shellMats.push(fm);
  for (const side of [1, -1]) for (let i = 0; i < finsN; i++) {
    const x = -W * 0.42 + (i * W * 0.84) / (finsN - 1);
    const f = box(0.014 * s, H * 0.78, 0.2 * s, fm); f.position.set(x, y0 + H * 0.5, side * (D / 2 + 0.1 * s)); fins.add(f);
  }
  for (const side of [1, -1]) for (const yy of [y0 + H * 0.12, y0 + H * 0.88]) {
    const hdr = box(W * 0.88, 0.04 * s, 0.05 * s, fm); hdr.position.set(0, yy, side * (D / 2 + 0.03 * s)); fins.add(hdr);
  }
  // Top cover.
  const cover = new THREE.Group(); g.add(cover);
  const cm = xmat(tankCol, { metalness: 0.3, roughness: 0.5 }); shellMats.push(cm);
  const lid = box(W * 1.06, 0.03 * s, D * 1.08, cm); lid.position.y = y0 + H + 0.015 * s; cover.add(lid);
  const coverY = y0 + H + 0.03 * s;
  // HV bushings (tall, three in the middle row) and LV bushings (short, four in the front row).
  const hv = [-0.3, 0, 0.3].map((x) => { const b = bushing(0.42 * s, 0.07 * s, 0x6b3b24, 4); b.position.set(x * s, coverY, -0.02 * s); cover.add(b); return b; });
  const lv = [-0.33, -0.11, 0.11, 0.33].map((x) => { const b = bushing(0.17 * s, 0.05 * s, 0x6b3b24, 2); b.position.set(x * s, coverY, 0.2 * s); cover.add(b); return b; });
  // Conservator: a drum on two brackets at the back, with an oil gauge on one end.
  const cons = new THREE.Group(); g.add(cons);
  const conY = coverY + 0.36 * s, conZ = -0.24 * s, conR = 0.12 * s, conL = 0.72 * s;
  const consMat = xmat(tankCol, { metalness: 0.3, roughness: 0.5 }); shellMats.push(consMat);
  const drum = rod(-conL / 2, conL / 2, conR, conR, consMat); drum.position.set(0, conY, conZ); cons.add(drum);
  for (const x of [-conL * 0.3, conL * 0.3]) { const br = box(0.04 * s, conY - coverY, 0.04 * s, M.metal(0x4a505c)); br.position.set(x, coverY + (conY - coverY) / 2, conZ); cons.add(br); }
  const gauge = new THREE.Mesh(new THREE.CircleGeometry(conR * 0.55, 24), M.plastic(0xf2f2f2)); gauge.rotation.y = -Math.PI / 2; gauge.position.set(-conL / 2 - 0.004 * s, conY, conZ); cons.add(gauge);
  const needle = box(0.004 * s, conR * 0.45, 0.01 * s, M.plastic(0xd02020)); needle.position.set(-conL / 2 - 0.01 * s, conY + conR * 0.2, conZ); cons.add(needle);
  // Oil inside the conservator (visible in X-ray): level 0..1.
  const consOil = rod(-conL / 2 + 0.01, conL / 2 - 0.01, conR * 0.93, conR * 0.93, M.clear(COL.oil, 0.5)); consOil.position.set(0, conY, conZ); cons.add(consOil);
  // Pipe from conservator down to the cover (with a Buchholz relay on bigger transformers).
  const pipeX = conL * 0.12;
  const pipe = beam([pipeX, conY - conR, conZ], [pipeX, coverY, conZ + 0.05 * s], 0.025 * s, M.metal(0x4a505c)); cons.add(pipe);
  let relay = null;
  if (buchholz) {
    relay = new THREE.Group();
    const bodyR = box(0.16 * s, 0.12 * s, 0.12 * s, xmat(0x3d4450, { metalness: 0.5 })); relay.add(bodyR);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.035 * s, 20), M.clear(0xcfe8ff, 0.6)); win.position.z = 0.061 * s; relay.add(win);
    relay.position.set(pipeX, (conY - conR + coverY) / 2, conZ + 0.025 * s); cons.add(relay);
    relay.mat = bodyR.material;
  }
  // Breather: a pipe from the conservator down the right end to a glass cylinder of silica gel.
  const br = new THREE.Group(); g.add(br);
  const bx = W / 2 + 0.1 * s, by = y0 + H * 0.55;
  br.add(beam([conL / 2 - 0.05 * s, conY - conR * 0.6, conZ], [bx, conY - conR * 0.6, conZ], 0.015 * s, M.metal(0x4a505c)));
  br.add(beam([bx, conY - conR * 0.6, conZ], [bx, by + 0.14 * s, conZ], 0.015 * s, M.metal(0x4a505c)));
  const cap = box(0.12 * s, 0.03 * s, 0.12 * s, M.metal(0x4a505c)); cap.position.set(bx, by + 0.13 * s, conZ); br.add(cap);
  const gelMat = M.plastic(0x2f6fd6, { roughness: 0.6 });
  const gel = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.2 * s, 20), gelMat); gel.position.set(bx, by, conZ); br.add(gel);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * s, 0.052 * s, 0.22 * s, 20), M.clear(0xe6f6ff, 0.25)); glass.position.copy(gel.position); br.add(glass);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.04 * s, 0.05 * s, 20), M.clear(0xd9a441, 0.6)); cup.position.set(bx, by - 0.13 * s, conZ); br.add(cup);
  // Rating plate on the front wall.
  const plate = canvasTexture(256, 160, (c, w, h) => {
    c.fillStyle = '#d9dde3'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 22px sans-serif';
    c.fillText('100 kVA · 3 PHASE', 14, 32); c.font = '18px sans-serif';
    c.fillText('11000 / 433 V', 14, 62); c.fillText('Dyn11 · ONAN · 50 Hz', 14, 90); c.fillText('IS 1180', 14, 118);
    c.fillStyle = '#b3261e'; c.fillText('★★★', 14, 146);
  });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.26 * s, 0.16 * s), new THREE.MeshBasicMaterial({ map: plate.tex, toneMapped: false }));
  pl.position.set(-0.3 * s, y0 + H * 0.93, D / 2 + 0.2 * s + 0.01); fins.add(pl);

  // Active part: core and windings, and the oil.
  const active = new THREE.Group(); g.add(active);
  const p = 0.28 * s, win = 0.5 * s, lw = 0.13 * s;
  const core = core3({ p, win, lw, ld: 0.13 * s }); active.add(core);
  const coils = { hv: [], lv: [] };
  core.limbs.forEach((x) => {
    const l = winding({ rIn: 0.075 * s, rOut: 0.093 * s, h: win * 0.92, color: 0xc8773a, lines: 30 }); l.position.x = x; active.add(l); coils.lv.push(l);
    const h = winding({ rIn: 0.105 * s, rOut: 0.135 * s, h: win * 0.92, color: 0x8a5a2e, discs: 8, lines: 64 }); h.position.x = x; active.add(h); coils.hv.push(h);
  });
  const activeY = y0 + 0.12 * s + core.H / 2;
  active.position.y = activeY;
  const oil = box(W * 0.96, H * 0.94, D * 0.96, M.clear(COL.oil, 0.16)); oil.position.y = y0 + H * 0.49; oil.castShadow = false; oil.visible = false; g.add(oil);

  const api = {
    group: g, tank, fins, cover, cons, br, active, core, coils, oil, hv, lv, gelMat, consOil, relay, needle,
    W, D, H, y0, coverY, conY, conZ, conR, conL, pipeX, bx, by, s, activeY,
    shellMats,
    setXray(k) { setXray(shellMats, k, 0.1); oil.visible = k > 0.05; oil.material.opacity = 0.16 * k; },
    setGel(k) { gelMat.color.setRGB(lerp(0.18, 0.93, k), lerp(0.43, 0.6, k), lerp(0.84, 0.72, k)); },  // blue → pink as it soaks up water
    setOilLevel(k) { consOil.scale.set(1, clamp(k, 0.02, 1), clamp(k, 0.02, 1)); consOil.position.y = conY - conR * 0.93 * (1 - clamp(k, 0.02, 1)); needle.rotation.x = lerp(1.2, -1.2, clamp(k, 0, 1)); },
  };
  api.setOilLevel(0.6);
  return api;
}

// ---------------------------------------------------------------- the pole structure
// A double-pole (H-pole) structure, as on Indian streets: two concrete poles, a channel-iron platform
// about 3 m up, a cross-arm with three lightning arresters and three drop-out fuses, 11 kV wires on top,
// and an LV distribution box on one pole. Heights in metres × s.
export function makePole(s = S, { span = 1.9, platform = 3.0, top = 8.2 } = {}) {
  const g = new THREE.Group();
  const pm = M.matte(0xb9b4aa, { roughness: 0.9 });
  const poles = [-span, span].map((x) => { const p = box(0.16 * s, top * s, 0.2 * s, pm); p.position.set(x, (top * s) / 2, 0); g.add(p); return p; });
  const ch = M.metal(0x4a505c, { roughness: 0.6 });
  for (const z of [-0.3 * s, 0.3 * s]) { const b = box(2 * span + 0.4 * s, 0.1 * s, 0.08 * s, ch); b.position.set(0, platform * s, z); g.add(b); }
  const armY = (platform + 2.3) * s, topY = top * s;
  const arm = box(2 * span + 0.8 * s, 0.1 * s, 0.1 * s, ch); arm.position.set(0, armY, 0.25 * s); g.add(arm);
  const arm2 = box(2 * span + 1.2 * s, 0.1 * s, 0.1 * s, ch); arm2.position.set(0, topY - 0.3 * s, 0); g.add(arm2);
  // Pin insulators and three 11 kV wires along z on top.
  const wireMat = M.metal(0x9aa0aa, { roughness: 0.4 });
  const phases = [-span - 0.3 * s, 0, span + 0.3 * s];
  phases.forEach((x) => {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.22 * s, 12), M.plastic(0xe9e2d0, { roughness: 0.3 })); ins.position.set(x, topY - 0.14 * s, 0); g.add(ins);
    const w = rod(-8 * s, 8 * s, 0.012 * s, 0.012 * s, wireMat); w.rotation.y = Math.PI / 2; w.position.set(x, topY - 0.02 * s, 0); g.add(w);
  });
  // Drop-out fuses and lightning arresters on the lower cross-arm.
  const fuses = [], las = [];
  [-0.6, 0, 0.6].forEach((xx, i) => {
    const x = xx * s;
    const la = bushing(0.35 * s, 0.05 * s, 0x6b6f78, 4); la.position.set(x - 0.22 * s, armY + 0.05 * s, 0.25 * s); g.add(la); las.push(la);
    const fu = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.4 * s, 12), M.plastic(0x2c2c2c)); barrel.rotation.z = 0.25; fu.add(barrel);
    const ins = bushing(0.2 * s, 0.045 * s, 0xe9e2d0, 3); ins.rotation.x = Math.PI / 2; ins.position.set(0, 0, -0.12 * s); fu.add(ins);
    fu.position.set(x + 0.15 * s, armY + 0.25 * s, 0.35 * s); g.add(fu); fuses.push(fu);
    // Jumper from the top wire down to the fuse.
    g.add(wire(makePath([[phases[i], topY - 0.05 * s, 0], [x + 0.15 * s, armY + 0.8 * s, 0.3 * s], [x + 0.15 * s, armY + 0.47 * s, 0.35 * s]]), 0.012 * s, wireMat));
  });
  // LV distribution box on the right pole.
  const db = box(0.5 * s, 0.7 * s, 0.25 * s, M.matte(0x9aa3ad)); db.position.set(span, 1.6 * s, 0.25 * s); g.add(db);
  g.fuses = fuses; g.las = las; g.armY = armY; g.topY = topY; g.platformY = platform * s + 0.05 * s; g.db = db; g.phases = phases; g.span = span;
  return g;
}

// ---------------------------------------------------------------- a simple house
export function house(w = 1.4, h = 1.1, col = 0xd9c7a8) {
  const g = new THREE.Group();
  const b = box(w, h, w * 0.8, M.matte(col)); b.position.y = h / 2; g.add(b);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, h * 0.55, 4), M.matte(0x8a4b3a)); roof.rotation.y = Math.PI / 4; roof.position.y = h + h * 0.27; roof.castShadow = true; g.add(roof);
  const wm = M.glow(0x2a2a2a);
  const win = box(w * 0.28, h * 0.3, 0.02, wm); win.position.set(-w * 0.2, h * 0.55, w * 0.4 + 0.01); g.add(win);
  const door = box(w * 0.2, h * 0.5, 0.02, M.matte(0x5a3a2a)); door.position.set(w * 0.22, h * 0.25, w * 0.4 + 0.01); g.add(door);
  g.setOn = (k) => wm.color.setRGB(0.16 + k * 1.0, 0.16 + k * 0.8, 0.16 + k * 0.35);
  return g;
}

// ---------------------------------------------------------------- layout
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = []) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? -0.12 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards sit beside the model on a wide screen. In the tall reel video they move to `pos` instead.
export function reelPlace(boards) {
  const r = inReel();
  boards.forEach(([b, pos, scale = 1.2]) => {
    if (!b.home) b.home = { p: b.mesh.position.clone(), r: b.mesh.rotation.y };
    if (r) { b.mesh.position.set(...pos); b.mesh.scale.setScalar(scale); b.mesh.rotation.y = 0; }
    else { b.mesh.position.copy(b.home.p); b.mesh.scale.setScalar(1); b.mesh.rotation.y = b.home.r; }
  });
}
export { clamp, lerp };
