// Chapter 5: three-phase, delta–star, and why the neutral exists. Not to scale (core ≈ 1 unit = 12 cm).
// The pole transformer is Dyn11: HV in delta (no neutral needed on the 11 kV side), LV in star with the
// star point brought out as the neutral and earthed. Phase voltages are 120° apart; line voltage between
// two phases = √3 × phase voltage: 230 × √3 ≈ 400 V (India's declared 230/400 V, IS 12360), or the older
// 240/415 V that many people still quote. The LV winding gives 250/433 V at no load to allow for drop.
// Neutral current = the phasor sum of the three phase currents. Loads here all have power factor 0.9,
// so I_N = |I_R + I_Y ∠−120° + I_B ∠+120°|; balanced loads give zero.
import { THREE, M, box, clamp, approach } from '../kit.js';
import { core3, winding, makePath, wire, flowDots, house, board, panelBg, title, fmt0, COL, CSS, TAU, fitNarrow, reelPlace } from '../transformer.js';

const VPH = 230, PF = 0.9;
export function phaseCurrents(s) {
  const I = [s.r, s.y, s.b].map((kW) => (kW * 1000) / (VPH * PF));
  const ang = [0, -TAU / 3, TAU / 3];
  const re = I.reduce((a, v, i) => a + v * Math.cos(ang[i]), 0), im = I.reduce((a, v, i) => a + v * Math.sin(ang[i]), 0);
  return { I, In: Math.hypot(re, im), nAng: Math.atan2(im, re), kVA: I.reduce((a, v) => a + v, 0) * VPH / 1000 };
}

export default {
  id: 'threephase',
  short: 'Three phases',
  title: 'Three phases, delta and star',
  subtitle: 'Three voltages, a third of a cycle apart. 400 V between phases, 230 V from any phase to neutral.',
  view: { pos: [1.2, 6.9, 15.2], target: [0.9, 4.3, 0] },
  learn: `<p>The grid doesn't carry one AC voltage but <b>three</b>, called phases (in India, <b>R, Y and B</b>: red, yellow, blue). Each one peaks a third of a cycle after the last, <b>120°</b> apart, like three people pedalling a bicycle in turn. That gives smooth, steady power and lets motors start by themselves.</p>
    <p>The pole transformer has three legs, one per phase. On the 11 kV side the three HV coils are joined in a triangle, called <b>delta (Δ)</b>. On the LV side the three coils meet at one point, a <b>star (Y)</b>. That star point is brought out as the <b>neutral</b> and connected to earth.</p>
    <p>Between any phase and the neutral you get about <b>230 V</b>: that's what most homes get. Between two phases you get <b>√3 × 230 ≈ 400 V</b>. You may hear "415 V": that's the older 240 V standard times √3. Shops, pumps and big air conditioners often take all three phases.</p>
    <p>Why the neutral? Houses along the street are shared out among R, Y and B. If each phase carried exactly the same load, the three return currents would cancel and the neutral would carry <b>nothing</b>. Real streets are never balanced, so the neutral carries the <b>difference</b> back to the transformer.</p>
    <p class="tip"><b>Try it:</b> set all three loads equal and watch the neutral current vanish. Then switch off one phase's houses.</p>`,
  terms: [
    { t: 'Phase', d: 'One of the three AC voltages on the grid, each a third of a cycle (120°) behind the one before.' },
    { t: 'Delta (Δ)', d: 'Three coils joined end to end in a triangle. No neutral point.' },
    { t: 'Star (Y)', d: 'Three coils joined at one common point, the neutral.' },
    { t: 'Neutral', d: 'The return wire from the star point. It carries the imbalance between the phases.' },
    { t: 'Line and phase voltage', d: 'Line voltage is between two phases (400 V); phase voltage is from a phase to neutral (230 V).' },
    { t: 'Phasor', d: 'An arrow that spins once per cycle; its shadow traces the AC wave. Handy for adding AC quantities.' },
  ],
  defaults: { r: 12, y: 12, b: 12, show: 'phase' },
  controls: [
    { key: 'r', type: 'range', label: 'Load on R phase', min: 0, max: 30, step: 0.5, ends: ['0', '30 kW'], fmt: (v) => v.toFixed(1) + ' kW' },
    { key: 'y', type: 'range', label: 'Load on Y phase', min: 0, max: 30, step: 0.5, ends: ['0', '30 kW'], fmt: (v) => v.toFixed(1) + ' kW' },
    { key: 'b', type: 'range', label: 'Load on B phase', min: 0, max: 30, step: 0.5, ends: ['0', '30 kW'], fmt: (v) => v.toFixed(1) + ' kW' },
    { key: 'show', type: 'seg', label: 'Measure between', options: [{ v: 'phase', label: 'Phase and neutral' }, { v: 'line', label: 'Two phases' }] },
    { key: 'pre', type: 'buttons', label: 'Try', items: [
      { label: 'Balanced', act: (s) => Object.assign(s, { r: 12, y: 12, b: 12 }) },
      { label: 'Evening rush on R', act: (s) => Object.assign(s, { r: 26, y: 10, b: 8 }) },
      { label: 'B phase off', act: (s) => Object.assign(s, { r: 12, y: 12, b: 0 }) },
    ] },
  ],
  quiz: [
    { q: 'The phase-to-neutral voltage is 230 V. What is the voltage between two phases?', options: ['230 V', '460 V', 'About 400 V (230 × √3)', '690 V'], answer: 2, why: 'The phases are 120° apart, so the difference between two is √3 times the phase voltage: 230 × 1.73 ≈ 400 V.' },
    { q: 'All three phases carry the same current. How much flows in the neutral?', options: ['Three times the phase current', 'The same as one phase', 'About zero', 'Half of one phase'], answer: 2, why: 'Three equal currents 120° apart add up to zero. The neutral only carries the imbalance.' },
    { q: 'On a Dyn11 pole transformer, how is the 11 kV side connected?', options: ['Star, with a neutral', 'Delta, with no neutral', 'In series', 'It isn’t connected'], answer: 1, why: 'D means the HV side is delta; yn means the LV side is star with the neutral brought out.' },
  ],
  reel: [
    { ms: 5600, caption: 'Three phases, a third of a cycle apart. Balanced loads leave the neutral with nothing to carry.', set: { show: 'phase', r: 12, y: 12 }, anim: { b: [0, 12] }, spin: 0.1, view: { pos: [2.0, 5.0, 13.0], target: [1.4, 3.2, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const CX = -1.8, CY = 2.6, P = 1.35, WIN = 2.4, LW = 0.62;
    const core = core3({ p: P, win: WIN, lw: LW, ld: 0.62 }); core.position.set(CX, CY, 0); root.add(core);
    const pc = [COL.R, COL.Y, COL.B], names = ['R', 'Y', 'B'];
    const hvs = [], lvs = [];
    core.limbs.forEach((x, i) => {
      const lv = winding({ rIn: 0.36, rOut: 0.44, h: WIN * 0.9, color: 0xc8773a, lines: 24 }); lv.position.set(CX + x, CY, 0); root.add(lv); lvs.push(lv);
      const hv = winding({ rIn: 0.5, rOut: 0.64, h: WIN * 0.9, color: new THREE.Color(0x8a5a2e).lerp(new THREE.Color(pc[i]), 0.35).getHex(), discs: 6, lines: 48 }); hv.position.set(CX + x, CY, 0); root.add(hv); hvs.push(hv);
    });
    const topY = CY + WIN / 2 + LW + 0.3, hvTop = CY + WIN * 0.45;
    // Delta on top: each HV coil's top joins the next coil's bottom (drawn as a triangle of leads above).
    const dm = M.metal(0xffb547, { roughness: 0.4 });
    const hx = core.limbs.map((x) => CX + x);
    for (let i = 0; i < 3; i++) {
      const a = hx[i], b = hx[(i + 1) % 3];
      root.add(wire(makePath([[a + 0.5, hvTop, 0.45], [a + 0.5, topY + 0.4 + i * 0.22, 0.45], [b - 0.5, topY + 0.4 + i * 0.22, 0.45], [b - 0.5, hvTop, 0.45]]), 0.03, dm));
    }
    // 11 kV lines coming in from the left to the delta corners.
    for (let i = 0; i < 3; i++) root.add(wire(makePath([[CX - 3.6, topY + 1.4 + i * 0.25, -0.3], [hx[i] + 0.5, topY + 1.4 + i * 0.25, -0.3], [hx[i] + 0.5, topY + 0.4 + i * 0.22, 0.45]]), 0.025, M.metal(0x9aa0aa)));
    // Star: LV coil bottoms joined into the neutral bar, earthed.
    const botY = CY - WIN * 0.45 - 0.05;
    const nm = M.plastic(0x2a2e37);
    root.add(wire(makePath([[hx[0] - 0.4, botY, 0.5], [hx[2] - 0.4, botY, 0.5]]), 0.04, M.metal(0xc0c4cc)));
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M.glow(0xffffff)); star.position.set(hx[2] - 0.4, botY, 0.5); root.add(star);
    const earthPath = makePath([[hx[0] - 0.4, botY, 0.5], [hx[0] - 0.9, botY, 0.9], [hx[0] - 0.9, 0.05, 0.9]]);
    root.add(wire(earthPath, 0.03, M.metal(0x4a9a4a)));
    for (let k = 0; k < 3; k++) { const e = box(0.5 - k * 0.14, 0.03, 0.03, M.metal(0x4a9a4a)); e.position.set(hx[0] - 0.9, 0.05 - k * 0.1 + 0.2, 0.9); root.add(e); }
    // Houses: two per phase, and the street wires.
    const HX = [4.0, 5.4, 6.8], HZ = [-1.4, 0.3, 2.0];
    const houses = [];
    const lvTop = CY + WIN * 0.45 + 0.05;
    const busY = [5.0, 4.75, 4.5], nY = 4.25;
    const lvPaths = [], nPath = makePath([[HX[2] + 0.2, nY, HZ[2]], [HX[2] + 0.2, nY, -1.6], [hx[2] + 1.2, nY, -0.2], [hx[2] - 0.4 + 0.02, botY, 0.5]]);
    for (let i = 0; i < 3; i++) {
      const p = makePath([[hx[i] - 0.4, lvTop, 0.5], [hx[i] - 0.4, busY[i], 0.5], [HX[i], busY[i], 0.5], [HX[i], busY[i], HZ[i]], [HX[i], 1.45, HZ[i]]]);
      root.add(wire(p, 0.035, M.plastic(pc[i], { roughness: 0.5 }))); lvPaths.push(p);
      const hs = house(1.1, 0.95); hs.position.set(HX[i] + 0.2, 0, HZ[i]); root.add(hs); houses.push(hs);
    }
    root.add(wire(nPath, 0.035, nm));
    const dPh = lvPaths.map((p, i) => { const d = flowDots(p, 12, pc[i], 0.06); root.add(d); return d; });
    const dN = flowDots(nPath, 12, 0xffffff, 0.06); root.add(dN);
    const minor = [];
    const L = (t, p, cls = '', main = false) => { const l = stage.label(t, p, root, cls); if (!main) minor.push(l); return l; };
    L('11 kV · delta (Δ)', [hx[2] + 1.9, topY + 1.2, -0.3], 'hot', true);
    L('433 V · star (Y)', [hx[1], CY - WIN / 2 - LW - 0.4, 1.0], 'hot', true);
    const lN = L('', [HX[2] + 1.5, nY - 0.1, -1.6], '', true);
    L('Earth', [hx[0] - 1.5, 0.35, 0.9]);
    names.forEach((n, i) => L(`${n}`, [HX[i] - 0.4, busY[i] + 0.3, HZ[i]], '', false));

    // Board: phasors and waves.
    let ph = 0, cur = { I: [0, 0, 0], In: 0, nAng: 0 }, show = 'phase';
    const brd = board(root, 5.4, 3.07, 800, 455, (g, w, h) => {
      panelBg(g, w, h); title(g, show === 'line' ? 'Line voltage: R minus Y' : 'Three phases, 120° apart');
      const cx = 170, cy = 250, R = 140, cols = [CSS.R, CSS.Y, CSS.B];
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
      const ang = (i) => ph - (i * TAU) / 3;
      const vec = (a, len, col, lw = 5) => { const x = cx + Math.cos(a) * len, y = cy - Math.sin(a) * len; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); return [x, y]; };
      const tips = [0, 1, 2].map((i) => vec(ang(i), R, cols[i]));
      if (show === 'line') { g.strokeStyle = '#fff'; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(...tips[1]); g.lineTo(...tips[0]); g.stroke(); g.setLineDash([]); }
      // Neutral current phasor (scaled to the biggest phase current).
      const Imax = Math.max(1, ...cur.I);
      if (cur.In > 0.5) vec(ph + cur.nAng, (R * 0.9 * cur.In) / Imax, '#ffffff', 3);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '17px sans-serif'; g.fillText('white arrow: neutral current', 30, h - 16);
      // Waves.
      const x0 = 340, x1 = w - 24, top = 80, bot = h - 60, mid = (top + bot) / 2, A = (bot - top) / 2 * 0.85;
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.stroke();
      const wave = (fn, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let k = 0; k <= 200; k++) { const tt = (k / 200) * 2 * TAU, x = x0 + (k / 200) * (x1 - x0), y = mid - fn(ph - 2 * TAU + tt) * A; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
      if (show === 'line') { wave((a) => Math.sin(a) / Math.sqrt(3), 'rgba(255,90,79,.5)', 2); wave((a) => Math.sin(a - TAU / 3) / Math.sqrt(3), 'rgba(255,211,90,.5)', 2); wave((a) => (Math.sin(a) - Math.sin(a - TAU / 3)) / Math.sqrt(3), '#fff', 4); }
      else [0, 1, 2].forEach((i) => wave((a) => Math.sin(a - (i * TAU) / 3), cols[i], 3));
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '16px sans-serif'; g.fillText(show === 'line' ? 'peak ±566 V (400 V rms)' : 'each peak ±325 V (230 V rms)', x0 + 6, top - 8);
    }, [5.9, 8.3, -2.8]);
    brd.mesh.rotation.y = -0.2;

    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, minor);
        reelPlace([[brd, [1.2, 8.6, -2.0], 1.3]]);
        const c = phaseCurrents(s);
        cur = c; show = s.show;
        ph += dt * TAU * 0.4;               // shown 125 times slower than 50 Hz
        brd.redraw();
        const Imax = 30000 / (VPH * PF);
        c.I.forEach((I, i) => {
          dPh[i].visible = I > 0.1; dPh[i].step(dt, 0.4 + (2.4 * I) / Imax);
          houses[i].setOn(clamp(I / 60, 0, 1));
          const k = Math.sin(ph - (i * TAU) / 3);
          hvs[i].glow(0.08 + 0.15 * Math.abs(k), pc[i]); lvs[i].glow((0.05 + 0.25 * Math.abs(k)) * clamp(I / 60, 0.1, 1), pc[i]);
        });
        dN.visible = c.In > 0.5; dN.step(dt, 0.4 + (2.4 * c.In) / Imax);
        lN.element.innerHTML = `Neutral · <b>${Math.round(c.In)} A</b>`;
      },
      readout: (s) => {
        const c = phaseCurrents(s);
        return `<div class="big">${s.show === 'line' ? 'R to Y: 400 V' : 'Any phase to neutral: 230 V'}</div>
          <div class="row"><span>Currents R · Y · B</span><b>${c.I.map((v) => Math.round(v)).join(' · ')} A</b></div>
          <div class="row"><span>Neutral current, their phasor sum</span><b class="${c.In < 2 ? 'ok' : ''}">${Math.round(c.In)} A</b></div>
          <div class="row"><span>Transformer load</span><b>${Math.round(c.kVA)} of 100 kVA</b></div>
          <div class="row"><span>Line voltage = √3 × phase</span><b>${Math.round(230 * Math.sqrt(3))} V</b></div>
          <small>Balanced phases cancel in the neutral. Utilities try to spread houses evenly across R, Y and B.</small>`;
      },
    };
  },
};
