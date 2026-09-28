// Chapter 3: step up, step down. The chain of transformers from a power station to a phone, with India's
// standard voltages (CEA; the grid's 765/400/220/132/66/33/11 kV levels and 415/230 V at home).
// Ratings are typical examples, not any one site: a 500 MW unit's generator makes 21 kV and a 600 MVA
// generator transformer (GSU) lifts it to 400 kV (NTPC-style 500 MW units); 315 MVA 400/220 kV
// interconnecting transformers are a POWERGRID standard size; 100 MVA 220/132 kV, 50 MVA 132/33 kV and
// 10 MVA 33/11 kV are common state-utility sizes; then the 100 kVA pole transformer.
// Line current for a three-phase transformer: I = S / (√3 V).
// Charger: a 50 Hz iron-core adapter works at about 1.3 T. A phone's switch-mode charger (SMPS) chops the
// rectified mains at about 65 kHz and its ferrite core works at about 0.2 T. From E = 4.44 f N A B, the
// product N × A needed for the same volts scales as 1 / (f B): (65,000 × 0.2) / (50 × 1.3) = 200 times less.
// That is why a 50 Hz adapter's transformer weighs a few hundred grams and an SMPS transformer a few grams.
import { THREE, M, box, clamp, approach } from '../kit.js';
import { makeDT, makePath, wire, flowDots, board, panelBg, title, house, fmt0, fmtV, si, COL, CSS, fitNarrow, reelPlace, inReel } from '../transformer.js';

export const STAGES = [
  { id: 'gen', name: 'Generator', short: 'Power station', vin: 0, vout: 21000, S: 588e6, x: -14.5, sz: 0 },
  { id: 'gsu', name: 'Generator transformer (GSU)', short: 'Step up', vin: 21000, vout: 400000, S: 600e6, x: -10.5, sz: 2.6 },
  { id: 'ict', name: 'Grid substation', short: '400 → 220 kV', vin: 400000, vout: 220000, S: 315e6, x: -6.2, sz: 2.2 },
  { id: 'sub132', name: 'Transmission substation', short: '220 → 132 kV', vin: 220000, vout: 132000, S: 100e6, x: -2.4, sz: 1.9 },
  { id: 'sub33', name: 'Sub-transmission', short: '132 → 33 kV', vin: 132000, vout: 33000, S: 50e6, x: 1.0, sz: 1.65 },
  { id: 'sub11', name: 'Distribution substation', short: '33 → 11 kV', vin: 33000, vout: 11000, S: 10e6, x: 4.1, sz: 1.4 },
  { id: 'dt', name: 'Pole transformer', short: '11 kV → 433 V', vin: 11000, vout: 433, S: 100e3, x: 7.0, sz: 1.1 },
  { id: 'phone', name: 'Phone charger', short: '230 V → 5 V', vin: 230, vout: 5, S: 20, x: 10.6, sz: 0, single: true },
];
const byId = Object.fromEntries(STAGES.map((st) => [st.id, st]));
const Iline = (S, V, single) => (single ? S / V : S / (Math.sqrt(3) * V));
const CHG = { lin: { f: 50, B: 1.3, g: 300 }, smps: { f: 65000, B: 0.2, g: 5 } };
const NA_RATIO = (CHG.smps.f * CHG.smps.B) / (CHG.lin.f * CHG.lin.B);

export default {
  id: 'steps',
  short: 'Step up, step down',
  title: 'From power station to phone',
  subtitle: 'Up to 400,000 volts to cross the country, then down, step by step, to 5 volts for your phone.',
  view: { pos: [-1.5, 9.5, 21.5], target: [-1.5, 1.6, 0] },
  learn: `<p>A big power station generator makes about <b>21,000 volts</b>. Right beside it, a huge <b>generator transformer</b> steps that up to <b>400,000 volts</b> (or 765,000) for the long-distance lines.</p>
    <p>Why so high? The power is volts × amps. At 400 kV the same power needs <b>19 times less current</b> than at 21 kV. The heat lost in the wires goes as the current squared, <b>I²R</b>, so it falls by about <b>360 times</b>. High voltage is how India moves power from coal fields in Chhattisgarh and solar parks in Rajasthan to cities a thousand kilometres away (see PowerLineClear).</p>
    <p>Near the cities, <b>substations</b> step it down in stages: 400 → 220 → 132 → 33 → 11 kV. Each lower voltage is safer and cheaper to run down smaller lines and streets. The <b>pole transformer</b> makes the last big step: 11 kV to <b>433 V</b>, which reaches your wall socket as about <b>230 V</b>.</p>
    <p>The chain doesn't stop there. Your phone wants 5 volts. An old-style <b>adapter</b> used a small 50 Hz iron transformer, heavy for its size. A modern charger is a <b>switch-mode power supply (SMPS)</b>: it turns mains into DC, chops it at about 65,000 times a second, and uses a transformer as small as a fingernail. Higher frequency means far less core is needed.</p>
    <p class="tip"><b>Try it:</b> step through the chain and watch the current jump each time the voltage falls. At the charger, switch between the old adapter and the SMPS.</p>`,
  terms: [
    { t: 'Step-up transformer', d: 'More turns on the secondary than the primary: voltage goes up, current goes down.' },
    { t: 'Step-down transformer', d: 'Fewer turns on the secondary: voltage goes down, current goes up.' },
    { t: 'GSU', d: 'Generator step-up transformer: lifts a power station’s output to transmission voltage.' },
    { t: 'Substation', d: 'A yard of transformers and switches where the grid changes voltage and splits into branches.' },
    { t: 'I²R loss', d: 'Heat wasted in a wire: current squared times resistance. Half the current, a quarter of the loss.' },
    { t: 'SMPS', d: 'Switch-mode power supply: chops DC at tens of kHz so a tiny transformer can do the job.' },
  ],
  defaults: { stage: 'gsu', chg: 'smps' },
  controls: [
    { key: 'stage', type: 'seg', label: 'Look at', options: STAGES.map((st) => ({ v: st.id, label: st.id === 'gen' ? 'Generator' : st.id === 'phone' ? 'Charger' : st.short })) },
    { key: 'chg', type: 'seg', label: 'Phone charger type', options: [{ v: 'lin', label: 'Old 50 Hz adapter' }, { v: 'smps', label: 'SMPS' }] },
    { key: 'nav', type: 'buttons', label: 'Walk the chain', items: [
      { label: '← Back', act: (s) => { const i = STAGES.findIndex((st) => st.id === s.stage); s.stage = STAGES[Math.max(0, i - 1)].id; } },
      { label: 'Next →', act: (s) => { const i = STAGES.findIndex((st) => st.id === s.stage); s.stage = STAGES[Math.min(STAGES.length - 1, i + 1)].id; } },
      { label: 'See it all', act: (s) => { s.stage = 'all'; } },
    ] },
  ],
  quiz: [
    { q: 'Why does the grid step voltage up to 400 kV for long lines?', options: ['High voltage travels faster', 'The same power needs far less current, so far less is lost as I²R heat', 'Homes need 400 kV', 'It makes more energy'], answer: 1, why: 'Power = V × I. Raise V and I falls; the loss I²R falls with the square of the current.' },
    { q: 'Going from 11 kV to 433 V, the current…', options: ['falls about 25 times', 'rises about 25 times', 'stays the same', 'becomes zero'], answer: 1, why: 'Voltage down by 11,000 ÷ 433 ≈ 25, so current up by the same factor for the same power.' },
    { q: 'Why is an SMPS phone charger so much smaller than an old adapter?', options: ['It uses no transformer at all', 'It runs its transformer at about 65 kHz, so it needs a far smaller core', 'Phones need less power now', 'It uses thinner plastic'], answer: 1, why: 'E = 4.44 f N Φ: at a thousand times the frequency, far less flux (and so far less core) makes the same volts.' },
  ],
  reel: [
    { ms: 5400, caption: 'A generator transformer lifts 21,000 volts to 400,000 so the long lines carry little current.', set: { stage: 'gsu' }, spin: 0.1, view: { pos: [-10.0, 5.4, 10.5], target: [-10.8, 2.2, 0] } },
    { ms: 5600, caption: 'Substations step it down: 400, 220, 132, 33, 11 kV, then 230 V at your socket.', set: { stage: 'all' }, spin: 0.05, view: { pos: [-1.0, 8.0, 21.0], target: [-1.0, 1.6, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const units = [];
    const minor = [];
    const lbl = (html, p, cls = '', main = false) => { const l = stage.label(html, p, root, cls); if (!main) minor.push(l); return l; };
    // Power station: turbine hall and a cooling tower.
    const ps = new THREE.Group(); ps.position.x = byId.gen.x; root.add(ps);
    const hall = box(2.6, 2.2, 2.0, M.matte(0x8b95a6)); hall.position.y = 1.1; ps.add(hall);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 3.4, 32, 1, true), M.matte(0xb5b0a6, { side: THREE.DoubleSide })); tower.position.set(-0.6, 1.7, -1.9); ps.add(tower);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 4.6, 16), M.matte(0x9a9a9a)); stack.position.set(0.9, 2.3, -1.5); ps.add(stack);
    const genM = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.6, 24), M.metal(0x3d6fb0)); genM.rotation.z = Math.PI / 2; genM.position.set(0.5, 0.6, 1.25); ps.add(genM);
    units.push({ st: byId.gen, obj: ps, top: [byId.gen.x + 1.3, 2.0, 0] });
    // Transformers of shrinking size on plinths.
    for (const st of STAGES.filter((q) => q.sz > 0)) {
      const d = makeDT(st.sz, { finsN: st.sz > 2 ? 14 : 12 });
      const plinth = box(st.sz * 1.3, 0.2, st.sz * 1.1, M.matte(0x6a6e76)); plinth.position.set(st.x, 0.1, 0); root.add(plinth);
      d.group.position.set(st.x, 0.2, 0); root.add(d.group);
      units.push({ st, obj: d.group, dt: d, top: [st.x, 0.2 + d.coverY + 0.45 * st.sz, 0] });
    }
    // Home and charger.
    const hm = house(1.6, 1.3); hm.position.set(byId.phone.x - 0.2, 0, -0.6); root.add(hm);
    const table = box(1.4, 0.08, 0.8, M.matte(0x6a5040)); table.position.set(byId.phone.x + 0.3, 0.75, 1.0); root.add(table);
    const lin = new THREE.Group(); lin.position.set(byId.phone.x - 0.05, 0.79, 1.0); root.add(lin);
    const linCase = box(0.5, 0.45, 0.4, M.clear(0x222428, 0.35)); linCase.position.y = 0.23; lin.add(linCase);
    const linCore = box(0.34, 0.3, 0.26, M.metal(0x7d8390)); linCore.position.y = 0.2; lin.add(linCore);
    const linCoil = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 20), M.metal(0xc8773a)); linCoil.rotation.x = Math.PI / 2; linCoil.position.y = 0.2; lin.add(linCoil);
    const smps = new THREE.Group(); smps.position.set(byId.phone.x + 0.65, 0.79, 1.0); root.add(smps);
    const smCase = box(0.3, 0.3, 0.26, M.clear(0xf2f4f7, 0.3)); smCase.position.y = 0.15; smps.add(smCase);
    const pcb = box(0.26, 0.02, 0.22, M.plastic(0x1f6b3a)); pcb.position.y = 0.04; smps.add(pcb);
    const ferrite = box(0.08, 0.08, 0.06, M.matte(0x2a2a2a)); ferrite.position.set(0.02, 0.1, 0); smps.add(ferrite);
    const phone = box(0.22, 0.02, 0.44, M.plastic(0x15171c)); phone.position.set(byId.phone.x + 0.2, 0.8, 1.25); root.add(phone);
    units.push({ st: byId.phone, obj: hm, top: [byId.phone.x - 0.2, 1.6, -0.6] });

    // Lines between stations with current dots. Dot speed follows the current for the same power.
    const segs = [];
    for (let i = 0; i < units.length - 1; i++) {
      const a = units[i].top, b = units[i + 1].top, V = STAGES[i].vout;
      const hgt = Math.max(a[1], b[1]) + 0.6;
      const p = makePath([a, [a[0] + 0.4, hgt, a[2]], [b[0] - 0.4, hgt, b[2]], b]);
      root.add(wire(p, 0.03, M.metal(0x9aa0aa, { roughness: 0.4 })));
      const col = V >= 100000 ? COL.hv : V >= 1000 ? 0xffd35a : COL.lv;
      const d = flowDots(p, 10, col, 0.07); root.add(d);
      segs.push({ d, V, lab: lbl(fmtV(V), [(a[0] + b[0]) / 2, hgt + 0.35, 0], '', false) });
    }
    // Station labels.
    units.forEach((u) => { u.lab = lbl(`<b>${u.st.short}</b>`, [u.st.x, -0.45, 1.4], '', true); });
    const lLin = lbl('50 Hz adapter', [byId.phone.x - 0.1, 1.55, 1.1]);
    const lSm = lbl('SMPS', [byId.phone.x + 0.7, 1.3, 1.1]);
    // Selection ring.
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 64), M.glow(0x8ef0ff, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; root.add(ring);

    // Board: the voltage ladder on a log scale.
    let cur = 'gsu', chg = 'smps';
    const brd = board(root, 5.2, 3.0, 800, 460, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Voltage at each step (log scale)');
      const x0 = 104, x1 = w - 20, y0 = h - 70, y1 = 60, lo = Math.log10(3), hi = Math.log10(8e5);
      const Y = (v) => y0 - ((Math.log10(v) - lo) / (hi - lo)) * (y0 - y1);
      g.font = '17px sans-serif';
      for (const v of [10, 100, 1000, 1e4, 1e5]) { g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; const s = fmtV(v); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(v) + 6); }
      const n = STAGES.length, bw = (x1 - x0) / n;
      STAGES.forEach((st, i) => {
        const v = st.vout, x = x0 + i * bw + 8, on = st.id === cur || cur === 'all';
        g.fillStyle = on ? (v >= 1e5 ? CSS.hv : v >= 1000 ? '#ffd35a' : CSS.lv) : 'rgba(255,255,255,.18)';
        g.fillRect(x, Y(v), bw - 16, y0 - Y(v));
        g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.55)'; g.font = (on ? 'bold ' : '') + '16px sans-serif';
        const s = fmtV(v); g.fillText(s, x + (bw - 16) / 2 - g.measureText(s).width / 2, Y(v) - 8);
        g.font = '14px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)';
        const lab = st.id === 'gen' ? 'gen' : st.id === 'phone' ? 'phone' : st.id === 'gsu' ? 'GSU' : st.id === 'dt' ? 'pole' : 'sub';
        g.fillText(lab, x + (bw - 16) / 2 - g.measureText(lab).width / 2, y0 + 22);
      });
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '16px sans-serif'; g.fillText('output voltage of each step →', x1 - 250, h - 14);
    }, [-1.5, 6.6, -3.2]);

    let focus = null;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, minor);
        if (inReel()) reelPlace([[brd, [s.stage === 'gsu' ? -10.8 : -1.0, s.stage === 'gsu' ? 7.0 : 9.0, -2.2], s.stage === 'gsu' ? 0.9 : 1.6]]);
        else {
          const st0 = byId[s.stage], bp = st0 ? [st0.x + 3.6, 3.6 + Math.max(1, st0.sz) * 0.9, -1.8] : [-1.5, 6.6, -3.2];
          brd.mesh.scale.setScalar(st0 ? 0.62 : 1);
          ['x', 'y', 'z'].forEach((a, i) => { brd.mesh.position[a] = approach(brd.mesh.position[a], bp[i], 5, dt); });
        }
        if (s.stage !== cur || s.chg !== chg) { cur = s.stage; chg = s.chg; brd.redraw(); }
        if (s.stage !== focus) {
          focus = s.stage;
          if (!inReel()) {
            if (s.stage === 'all') stage.setView([-1.5, 9.5, 21.5], [-1.5, 1.6, 0], 1.1);
            else { const st = byId[s.stage], r = Math.max(2.2, st.sz * 2.2); stage.setView([st.x + 1.2, 2.4 + r * 1.1, 4.5 + r * 2.4], [st.x - 0.6, 1.2 + r * 0.35, 0], 1.1); }
          }
        }
        const st = byId[s.stage];
        ring.visible = !!st;
        if (st) { const r = st.id === 'gen' ? 2.1 : st.id === 'phone' ? 1.6 : st.sz * 1.0 + 0.4; ring.scale.setScalar(approach(ring.scale.x, r, 8, dt)); ring.position.x = approach(ring.position.x, st.x, 8, dt); }
        segs.forEach((g) => g.d.step(dt, clamp(0.5 + 0.55 * Math.log10(400000 / g.V), 0.4, 3.6)));
        units.forEach((u) => { if (u.dt) u.dt.coils.hv.forEach((c) => c.glow(u.st.id === s.stage ? 0.15 : 0.03, 0xffb547)); });
        const sm = s.chg === 'smps';
        lin.visible = !sm || s.stage !== 'phone'; smps.visible = sm || s.stage !== 'phone';
        linCase.material.opacity = sm ? 0.15 : 0.35; smCase.material.opacity = sm ? 0.3 : 0.12;
        lLin.visible = lin.visible && stage.host.clientWidth >= 560; lSm.visible = smps.visible && stage.host.clientWidth >= 560;
      },
      readout: (s) => {
        if (s.stage === 'all') return `<div class="big">21 kV → 400 kV → … → 230 V → 5 V</div>
          <div class="row"><span>Transformers from power station to phone</span><b>about 7</b></div>
          <div class="row"><span>Current falls when voltage rises, for the same power</span><b>I = P ÷ V</b></div>
          <small>Every step uses the same trick: turns ratio N₂ ÷ N₁. Only the size changes.</small>`;
        const st = byId[s.stage];
        if (st.id === 'gen') return `<div class="big">Generator: 21,000 V</div>
          <div class="row"><span>A 500 MW unit's output current</span><b>${si(Iline(500e6 / 0.85, 21000), 'A', 2)}</b></div>
          <div class="row"><span>Frequency</span><b>50 Hz (3,000 rpm, 2 poles)</b></div>
          <small>Far too much current to send any distance. Next: step it up.</small>`;
        if (st.id === 'phone') {
          const c = CHG[s.chg];
          return `<div class="big">${s.chg === 'smps' ? 'SMPS: 65 kHz, fingernail-sized' : '50 Hz adapter: a heavy lump of iron'}</div>
            <div class="row"><span>230 V → 5 V, turns ratio</span><b>46 : 1</b></div>
            <div class="row"><span>Frequency · core flux density</span><b>${c.f >= 1000 ? fmt0(c.f / 1000) + ' kHz' : c.f + ' Hz'} · ${c.B} T</b></div>
            <div class="row"><span>Turns × core area needed, SMPS vs adapter</span><b>${fmt0(NA_RATIO)} times less</b></div>
            <div class="row"><span>Transformer weighs about</span><b>${c.g} g</b></div>
            <small>From E = 4.44 f N A B: a thousand times the frequency needs far less iron (ferrite, in an SMPS).</small>`;
        }
        const I1 = Iline(st.S, st.vin), I2 = Iline(st.S, st.vout), up = st.vout > st.vin;
        return `<div class="big">${st.name}: ${fmtV(st.vin)} → ${fmtV(st.vout)}</div>
          <div class="row"><span>Rating (typical)</span><b>${st.S >= 1e6 ? fmt0(st.S / 1e6) + ' MVA' : fmt0(st.S / 1e3) + ' kVA'}</b></div>
          <div class="row"><span>Line current in → out, at full load</span><b>${si(I1, 'A', 2)} → ${si(I2, 'A', 2)}</b></div>
          <div class="row"><span>Voltage ${up ? 'up' : 'down'}, current ${up ? 'down' : 'up'} by</span><b>${(up ? st.vout / st.vin : st.vin / st.vout).toFixed(1)} times</b></div>
          <div class="row"><span>I²R loss in the same wire changes by</span><b>${up ? '÷ ' + fmt0((st.vout / st.vin) ** 2) : '× ' + fmt0((st.vin / st.vout) ** 2)}</b></div>
          <small>${up ? 'Stepping up is what makes long-distance lines worthwhile.' : 'Lower voltage is safer near people, but needs thicker wires for the bigger current.'}</small>`;
      },
    };
  },
};
