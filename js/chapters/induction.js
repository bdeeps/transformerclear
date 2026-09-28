// Chapter 2: how a transformer works: mutual induction, the turns ratio and the EMF equation.
// A single-phase teaching transformer, not to scale (one scene unit ≈ 5 cm on the bench).
// Ideal-transformer relations with a small loss: V₂ = V₁ N₂ / N₁, I₁ ≈ I₂ N₂ / N₁ ÷ η (η = 0.98).
// EMF equation: E = 4.44 f N Φmax, so the core's peak flux is Φmax = V₁ / (4.44 f N₁) and its peak flux
// density B = Φmax / A. Grain-oriented steel saturates near 2.0 T; designs work at 1.2–1.7 T.
// Presets (see transformer.js for the pole transformer's numbers):
//  • one phase of the 100 kVA pole transformer: 11,000 V, 2,464 : 56 turns, 134 cm² core, 33 kW per phase;
//  • a 12 V mains adapter: 230 V, 1,150 : 60 turns (5 turns per volt), 7 cm² of hot-rolled steel (≈ 1.3 T);
//  • a microwave oven transformer: 230 V to about 2,000 V, about 1 volt per turn, run close to saturation.
// On DC only the winding's resistance limits the current. Here the primary's resistance is set so that its
// copper loss is 1 % of the rated power at full load, R₁ = 0.01 V₁² / P_rated, which makes the DC current
// about 100 times the full-load AC current.
import { THREE, M, box, spring, arrow, clamp, approach } from '../kit.js';
import { TAU, phiMax, si, fmt0, fmtV, board, panelBg, strip, title, makePath, wire, flowDots, COL, CSS, fitNarrow, reelPlace, inReel } from '../transformer.js';

const ETA = 0.98, BSAT = 1.9;
const PRESETS = {
  pole: { V1: 11000, N1: 2464, N2: 56, f: 50, area: 134, load: 33000, rated: 33333 },
  adapter: { V1: 230, N1: 1150, N2: 60, f: 50, area: 7, load: 12, rated: 12 },
  mot: { V1: 230, N1: 230, N2: 2000, f: 50, area: 26, load: 1200, rated: 1200 },
};
export function tfModel(s) {
  const ac = s.src === 'ac';
  const phi = ac ? phiMax(s.V1, s.f, s.N1) : 0;
  const B = phi / (s.area * 1e-4);
  const V2 = ac ? (s.V1 * s.N2) / s.N1 : 0;
  const I2 = ac && V2 > 0 ? s.load / V2 : 0, I1 = ac ? s.load / ETA / s.V1 : 0;
  const R1 = (0.01 * s.V1 * s.V1) / Math.max(1, s.rated || s.load);
  const Idc = s.V1 / R1;
  return { ac, phi, B, V2, I1, I2, R1, Idc, sat: B > BSAT, tpv: s.N1 / s.V1 };
}

export default {
  id: 'induction',
  short: 'Two coils, one core',
  title: 'Changing flux, induced voltage',
  subtitle: 'AC in one coil makes a changing flux in the core, and that flux makes a voltage in the other coil.',
  view: { pos: [0.4, 4.9, 12.6], target: [0.4, 3.6, 0] },
  learn: `<p>A transformer is two coils of wire wound on one iron <b>core</b>. They never touch. Feed the first coil, the <b>primary</b>, with AC and its current makes a <b>magnetic flux</b> in the core. Because the current keeps reversing, 50 times a second in India, the flux keeps growing, shrinking and reversing too.</p>
    <p>That changing flux runs round the core and through the second coil, the <b>secondary</b>. Faraday found that a <b>changing flux makes a voltage</b> in every turn of wire it passes through (see FaradayClear). Every turn on the core feels the same volts. So the voltages go as the turns: <b>V₂ ÷ V₁ = N₂ ÷ N₁</b>.</p>
    <p>Energy is conserved, so if the voltage goes down, the current goes up by the same factor: <b>I₂ ÷ I₁ = N₁ ÷ N₂</b>. Power in ≈ power out. A good transformer wastes only 1 to 2%.</p>
    <p>How much flux does the core carry? The <b>EMF equation</b> says <b>E = 4.44 × f × N × Φmax</b>. For the pole transformer: 250 V ÷ (4.44 × 50 × 56 turns) = 0.02 webers. Squeeze that through too small a core, or feed it too low a frequency, and the iron <b>saturates</b>: it can't carry any more flux.</p>
    <p>And on <b>DC</b>? The flux is steady, so nothing changes and the secondary gives <b>zero volts</b>. Only the wire's resistance holds back the current, which becomes huge. The coil would cook.</p>
    <p class="tip"><b>Try it:</b> try the presets, slide the secondary turns, then switch to DC. Drop the frequency and watch the flux density climb towards saturation.</p>`,
  terms: [
    { t: 'Mutual induction', d: 'A changing current in one coil makes a voltage in another coil that shares its flux.' },
    { t: 'Primary and secondary', d: 'The coil you feed, and the coil you take power from.' },
    { t: 'Turns ratio', d: 'N₂ ÷ N₁. It sets the voltage ratio; the current ratio is its upside-down.' },
    { t: 'Magnetic flux (Φ)', d: 'The amount of magnetic field running round the core, in webers (Wb).' },
    { t: 'EMF equation', d: 'E = 4.44 f N Φmax: the rms voltage of a coil of N turns with a sine-wave flux of peak Φmax at frequency f.' },
    { t: 'Saturation', d: 'When the iron is carrying all the flux it can (about 2 tesla for silicon steel) and more current adds almost no flux.' },
  ],
  defaults: { src: 'ac', ...PRESETS.pole },
  controls: [
    { key: 'src', type: 'seg', label: 'Feed the primary with', options: [{ v: 'ac', label: 'AC' }, { v: 'dc', label: 'DC' }] },
    { key: 'pre', type: 'buttons', label: 'Presets', items: [
      { label: 'Pole transformer', act: (s) => Object.assign(s, { src: 'ac' }, PRESETS.pole) },
      { label: '12 V adapter', act: (s) => Object.assign(s, { src: 'ac' }, PRESETS.adapter) },
      { label: 'Microwave oven', act: (s) => Object.assign(s, { src: 'ac' }, PRESETS.mot) },
    ] },
    { key: 'V1', type: 'log', label: 'Primary voltage (V₁)', min: 12, max: 33000, ends: ['12 V', '33 kV'], fmt: (v) => fmtV(v) },
    { key: 'N1', type: 'log', label: 'Primary turns (N₁)', min: 20, max: 5000, ends: ['20', '5,000'], fmt: (v) => fmt0(v) + ' turns' },
    { key: 'N2', type: 'log', label: 'Secondary turns (N₂)', min: 5, max: 20000, ends: ['5', '20,000'], fmt: (v) => fmt0(v) + ' turns' },
    { key: 'load', type: 'log', label: 'Power the load draws', min: 1, max: 50000, ends: ['1 W', '50 kW'], fmt: (v) => si(v, 'W', 2) },
    { key: 'f', type: 'range', label: 'Frequency', min: 10, max: 400, step: 1, ends: ['10 Hz', '400 Hz'], fmt: (v) => v + ' Hz', hint: 'India uses 50 Hz. Aircraft use 400 Hz, which lets their transformers be much smaller.' },
    { key: 'area', type: 'log', label: 'Core cross-section (A)', min: 2, max: 400, ends: ['2 cm²', '400 cm²'], fmt: (v) => (v < 20 ? v.toFixed(1) : fmt0(v)) + ' cm²' },
  ],
  quiz: [
    { q: 'A transformer has 2,464 turns on its 11,000 V primary and 56 on its secondary. What is the secondary voltage?', options: ['56 V', 'About 250 V', 'About 2,500 V', '11,000 V'], answer: 1, why: 'V₂ = V₁ × N₂ ÷ N₁ = 11,000 × 56 ÷ 2,464 ≈ 250 V, one phase of the 433 V supply.' },
    { q: 'The voltage is stepped down 44 times. What happens to the current?', options: ['It goes down 44 times', 'It goes up about 44 times', 'It stays the same', 'It becomes DC'], answer: 1, why: 'Power in ≈ power out, so a lower voltage means a proportionally higher current: I₂ ÷ I₁ = N₁ ÷ N₂.' },
    { q: 'Why does a transformer give nothing out on steady DC?', options: ['DC is too weak', 'Steady current makes steady flux, and only changing flux induces a voltage', 'The oil blocks DC', 'DC flows the wrong way'], answer: 1, why: 'Faraday’s law: EMF = N × rate of change of flux. No change, no voltage.' },
  ],
  reel: [
    { ms: 5600, caption: 'AC in the primary makes a flux that swings back and forth round the iron core.', set: { src: 'ac', ...PRESETS.pole }, spin: 0.08, view: { pos: [0.2, 4.2, 12.0], target: [-0.4, 3.0, 0] } },
    { ms: 5600, caption: 'The same flux passes the secondary. Fewer turns, fewer volts: 11,000 V becomes 250 V.', set: { src: 'ac', ...PRESETS.pole }, anim: { N2: [2464, 56, true] }, spin: 0.08, view: { pos: [0.6, 4.2, 12.0], target: [0.2, 3.1, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const CX = -0.8, CY = 2.9, CW = 4.0, CH = 3.6, CT = 0.72, CD = 1.1;
    const bench = box(9.6, 0.14, 3.0, M.matte(0x3a3f4b, { roughness: 0.7 })); bench.position.set(CX + 0.6, 0.63, 0.2); root.add(bench);
    // Laminated core: four bars.
    const cm = M.metal(0x7d8390, { roughness: 0.5 });
    const coreG = new THREE.Group(); coreG.position.set(CX, CY, 0); root.add(coreG);
    [[0, CH / 2 - CT / 2, CW, CT], [0, -CH / 2 + CT / 2, CW, CT], [-CW / 2 + CT / 2, 0, CT, CH - 2 * CT], [CW / 2 - CT / 2, 0, CT, CH - 2 * CT]].forEach(([x, y, w, h]) => { const b = box(w, h, CD, cm); b.position.set(x, y, 0); coreG.add(b); });
    const lm = new THREE.LineBasicMaterial({ color: 0x3a3f4b, transparent: true, opacity: 0.7 }), lp = [];
    for (let k = 1; k < 12; k++) { const z = -CD / 2 + (CD * k) / 12; lp.push(new THREE.Vector3(-CW / 2, CH / 2 + 0.003, z), new THREE.Vector3(CW / 2, CH / 2 + 0.003, z)); }
    coreG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), lm));
    const foot = box(CW + 0.3, 0.2, 1.4, M.matte(0x2a2e37)); foot.position.set(CX, CY - CH / 2 - 0.1, 0); root.add(foot);
    const xL = CX - CW / 2 + CT / 2, xR = CX + CW / 2 - CT / 2, yLo = CY - CH / 2 + CT + 0.1, yHi = CY + CH / 2 - CT - 0.1;
    const pMat = M.metal(0xc8773a, { roughness: 0.32, emissive: new THREE.Color(0, 0, 0) });
    const sMat = M.metal(0x5ce1a9, { roughness: 0.35, metalness: 0.5, emissive: new THREE.Color(0, 0, 0) });
    const vcoil = (x, R, turns, mat, wr) => { const c = spring(yLo, yHi, R, wr, turns, mat); c.rotation.z = Math.PI / 2; c.position.x = x; return c; };
    let prim = null, sec = null, pKey = '', sKey = '';
    // Flux path: the centre line of the core. Dots ride round it; their speed and direction follow Φ.
    const fx0 = CX - CW / 2 + CT / 2, fx1 = CX + CW / 2 - CT / 2, fy0 = CY - CH / 2 + CT / 2, fy1 = CY + CH / 2 - CT / 2;
    const fluxPath = makePath([[fx0, fy0, CD / 2 + 0.06], [fx0, fy1, CD / 2 + 0.06], [fx1, fy1, CD / 2 + 0.06], [fx1, fy0, CD / 2 + 0.06]], true);
    const fluxDots = flowDots(fluxPath, 44, COL.flux, 0.075); root.add(fluxDots);
    const fArrows = [[fx0, CY, 0, 0], [CX, fy1, 0, -Math.PI / 2], [fx1, CY, 0, Math.PI], [CX, fy0, 0, Math.PI / 2]].map(([x, y, , r]) => {
      const a = arrow(COL.flux, 0.9, 0.28, 0.05); a.position.set(x, y, CD / 2 + 0.12); a.rotation.z = r; a.userData.r = r; root.add(a); return a;
    });
    // Source on the left, lamp on the right, with current dots in the leads.
    const srcBox = box(1.1, 1.2, 0.9, M.plastic(0x2a2e37, { roughness: 0.5 })); srcBox.position.set(-4.6, 1.3, 0.4); root.add(srcBox);
    const face = canvasFace(); face.mesh.position.set(-4.6, 1.35, 0.851); root.add(face.mesh);
    const wm = M.plastic(0xd0a040, { roughness: 0.5 });
    const inPath = makePath([[-4.05, 1.55, 0.4], [xL - 0.8, 1.55, 0.6], [xL - 0.55, yLo + 0.05, 0.4], [xL - 0.55, yHi, 0.4], [xL - 1.2, yHi + 0.2, 0.6], [-4.4, yHi + 0.2, 0.5], [-4.4, 1.9, 0.4]]);
    root.add(wire(inPath, 0.035, wm));
    const lamp = new THREE.Group(); lamp.position.set(CX + CW / 2 + 1.4, 0.7, 0.9); root.add(lamp);
    const glassMat = M.clear(0xfff6e0, 0.25), coreGlow = M.glow(0x332a20);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), glassMat); glass.position.y = 0.75; lamp.add(glass);
    const fil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), coreGlow); fil.position.y = 0.75; lamp.add(fil);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16), M.metal(0xc9ced8)); cap.position.y = 0.2; lamp.add(cap);
    const light = new THREE.PointLight(0xffc27a, 0, 6, 1.6); light.position.y = 0.8; lamp.add(light);
    const outPath = makePath([[xR + 0.6, yLo + 0.05, 0.4], [xR + 0.9, 1.4, 0.8], [lamp.position.x - 0.1, 1.0, 0.9], [lamp.position.x + 0.1, 1.0, 0.9], [xR + 1.3, yHi, 0.4], [xR + 0.6, yHi, 0.4]]);
    root.add(wire(outPath, 0.03, M.plastic(0x2f8f6a, { roughness: 0.5 })));
    const dIn = flowDots(inPath, 18, COL.hv, 0.06); root.add(dIn);
    const dOut = flowDots(outPath, 18, COL.lv, 0.06); root.add(dOut);

    const lP = stage.label('', [xL - 1.0, CY - CH / 2 - 0.65, 1.3], root, 'hot');
    const lS = stage.label('', [xR + 0.9, CY - CH / 2 - 0.65, 1.3], root, 'hot');
    const lCore = stage.label('Laminated iron core', [CX + 0.4, CY + CH / 2 - 0.35, CD / 2 + 0.2], root);
    const lFlux = stage.label('Flux, Φ', [CX, CY - 0.15, CD / 2 + 0.3], root);

    // Board: V₁, Φ and V₂ over the last two cycles.
    const T = [], V = [];
    let sc = { v1: 1, v2: 1, ac: true, phi: 1, sat: false };
    const brd = board(root, 4.2, 3.6, 640, 548, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Voltage in, flux, voltage out');
      const x0 = 104, x1 = w - 24;
      const rows = [[0, sc.v1 * Math.SQRT2, (v) => fmtV(Math.abs(v)), 'Primary, V₁', CSS.hv, 70, 200], [1, Math.max(1e-6, sc.phi), (v) => si(Math.abs(v), 'Wb', 2), 'Core flux, Φ', CSS.flux, 222, 352], [2, Math.max(0.01, sc.v2 * Math.SQRT2), (v) => fmtV(Math.abs(v)), 'Secondary, V₂', CSS.lv, 374, 504]];
      for (const [k, fs, fmt, lab, col, top, bot] of rows) {
        const Y = strip(g, x0, x1, top, bot, fs, fmt, lab, col);
        if (!T.length) continue;
        const tEnd = T[T.length - 1], span = 2, X = (t) => x1 - ((tEnd - t) / span) * (x1 - x0);
        g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); let first = true;
        for (let i = 0; i < T.length; i++) { if (tEnd - T[i] > span) continue; const x = X(T[i]), y = Y(V[i][k]); first ? g.moveTo(x, y) : g.lineTo(x, y); first = false; }
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '17px sans-serif';
      const t = sc.ac ? 'two cycles, slowed down →' : 'DC: nothing changes →'; g.fillText(t, x1 - g.measureText(t).width, h - 12);
      if (sc.sat) { g.fillStyle = CSS.hot; g.font = 'bold 20px sans-serif'; g.fillText('Core saturated!', x1 - 170, 250); }
    }, [5.9, 3.3, -0.9]);
    brd.mesh.rotation.y = -0.28;

    let ph = 0, fluxPos = 0, lastKey = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lCore, lFlux]);
        reelPlace([[brd, [CX + 0.2, 7.9, -0.6], 1.2]]);
        const r = tfModel(s);
        // Coils: drawn turns follow N (log scale); the thick primary has fewer drawn turns when N₁ is small.
        const tp = Math.round(clamp(4 + Math.log10(s.N1) * 5, 6, 24)), ts = Math.round(clamp(4 + Math.log10(s.N2) * 5, 5, 26));
        const wp = clamp(0.09 - Math.log10(s.N1) * 0.015, 0.03, 0.08), ws = clamp(0.09 - Math.log10(s.N2) * 0.015, 0.03, 0.08);
        const kp = `${tp}|${wp.toFixed(3)}`, ks = `${ts}|${ws.toFixed(3)}`;
        if (kp !== pKey) { pKey = kp; if (prim) { root.remove(prim); prim.geometry.dispose(); } prim = vcoil(xL, CT * 0.78, tp, pMat, wp); root.add(prim); }
        if (ks !== sKey) { sKey = ks; if (sec) { root.remove(sec); sec.geometry.dispose(); } sec = vcoil(xR, CT * 0.78, ts, sMat, ws); root.add(sec); }
        // Shown slowed: one cycle of f takes f/50 seconds × 50 … i.e. 50 Hz plays at 1 cycle per second.
        const speed = s.f / 50;
        ph += dt * TAU * speed;
        const v1 = r.ac ? Math.sin(ph) : 1, flux = r.ac ? -Math.cos(ph) : 0, v2 = r.ac ? Math.sin(ph) : 0;
        T.push(ph / TAU / speed); V.push([v1 * s.V1 * Math.SQRT2 * (r.ac ? 1 : 1 / Math.SQRT2), flux * r.phi, v2 * r.V2 * Math.SQRT2]);
        if (T.length > 400) { T.shift(); V.shift(); }
        sc = { v1: s.V1, v2: r.V2, ac: r.ac, phi: r.phi, sat: r.sat };
        brd.redraw();
        // Flux: dots drift round the core at a speed that follows Φ, reversing each half-cycle.
        const satBoost = r.sat ? 1.3 : 1;
        fluxDots.visible = r.ac;
        fluxDots.step(dt, 2.4 * flux * satBoost * speed);
        fArrows.forEach((a) => { a.visible = r.ac && Math.abs(flux) > 0.1; a.set(0.3 + 0.8 * Math.abs(flux)); a.rotation.z = a.userData.r + (flux < 0 ? Math.PI : 0); });
        fluxDots.material.color.setHex(r.sat ? COL.hot : COL.flux);
        // Currents: primary dots swing with the supply; on DC they race one way.
        const i1 = r.ac ? v1 : 1, i2 = r.ac ? v2 : 0;
        dIn.step(dt, r.ac ? 2.2 * i1 * clamp(0.4 + Math.log10(1 + r.I1) * 0.4, 0.3, 1.4) : 6);
        dOut.visible = r.ac && s.load > 0;
        dOut.step(dt, 2.2 * i2 * clamp(0.4 + Math.log10(1 + r.I2) * 0.4, 0.3, 1.6));
        const glowP = r.ac ? Math.abs(v1) * 0.25 : 0.9;
        pMat.emissive.setRGB(glowP, glowP * (r.ac ? 0.4 : 0.15), 0);
        sMat.emissive.setRGB(0, Math.abs(i2) * 0.2, Math.abs(i2) * 0.12);
        const bright = r.ac ? clamp(Math.log10(1 + s.load) / 3, 0.15, 1.2) * (0.7 + 0.3 * Math.abs(v2)) : 0;
        coreGlow.color.setRGB(0.2 + bright * 1.2, 0.16 + bright * 0.9, 0.12 + bright * 0.4); light.intensity = bright * 4;
        const key = `${s.src}|${s.V1.toFixed(0)}`;
        if (key !== lastKey) { lastKey = key; face.redraw(r.ac ? 'AC' : 'DC', fmtV(s.V1)); }
        lP.element.innerHTML = `Primary · <b>${fmt0(s.N1)} turns</b> · ${fmtV(s.V1)}${r.ac ? '' : ' DC'}`;
        lS.element.innerHTML = `Secondary · <b>${fmt0(s.N2)} turns</b> · ${fmtV(r.V2)}`;
      },
      readout: (s) => {
        const r = tfModel(s);
        if (!r.ac) return `<div class="big no">DC in: V₂ = 0 V</div>
          <div class="row"><span>Flux in the core</span><b>steady, not changing</b></div>
          <div class="row"><span>Primary current, V ÷ R of its wire</span><b>${si(r.Idc, 'A', 2)}</b></div>
          <div class="row"><span>Heat in the primary, V²/R</span><b>${si(r.Idc * s.V1, 'W', 2)}</b></div>
          <small>About 100 times its full-load power. A fuse blows, or the coil burns. See FaradayClear.</small>`;
        return `<div class="big">V₂ = V₁ × N₂ ÷ N₁ = ${fmtV(r.V2)}</div>
          <div class="row"><span>Currents, in → out</span><b>${si(r.I1, 'A', 2)} → ${si(r.I2, 'A', 2)}</b></div>
          <div class="row"><span>Φmax = V₁ ÷ (4.44 f N₁)</span><b>${si(r.phi, 'Wb', 2)}</b></div>
          <div class="row"><span>Flux density, Φmax ÷ A</span><b class="${r.sat ? 'no' : ''}">${r.B.toFixed(2)} T${r.sat ? ' · saturated!' : ''}</b></div>
          <div class="row"><span>Volts per turn</span><b>${(s.V1 / s.N1).toFixed(2)} V</b></div>
          <small>${r.sat ? 'Iron can’t carry much more than about 2 T. Use more turns, a bigger core or a higher frequency.' : 'Voltage down, current up: power in ≈ power out (98% here). Shown about 50 times slower.'}</small>`;
      },
    };
  },
};

// The supply's front panel: "AC" or "DC" and its voltage.
function canvasFace() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const redraw = (kind, v) => {
    g.fillStyle = '#0c1018'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = CSS.hv; g.lineWidth = 8; g.beginPath();
    if (kind === 'AC') for (let x = 0; x <= 200; x += 4) { const y = 90 - 40 * Math.sin((x / 200) * TAU); x ? g.lineTo(28 + x, y) : g.moveTo(28, y); }
    else { g.moveTo(28, 90); g.lineTo(228, 90); }
    g.stroke();
    g.fillStyle = '#e8eef8'; g.font = 'bold 44px sans-serif'; g.fillText(kind, 28, 190);
    g.font = 'bold 34px sans-serif'; g.fillStyle = CSS.hv; g.fillText(v, 28, 236);
    tex.needsUpdate = true;
  };
  redraw('AC', '');
  return { mesh, redraw };
}
