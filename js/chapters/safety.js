// Chapter 6: failures and safety. A ground-mounted substation transformer with a Buchholz relay, behind a
// fence. One scene unit = 0.4 m (makeDT at scale 2.5).
// Overload and heat: IEC 60076-7 steady-state top-oil and hot-spot temperatures (heat() in transformer.js)
// and the relative ageing rate of the paper insulation, V = 2^((θh − 98)/6): at 98 °C one day uses one day of
// life; every 6 °C more doubles it. IEC 60076-7 suggests hot spots stay below 120 °C in normal cyclic loading
// and 140 °C in a long emergency.
// Buchholz relay (Max Buchholz, 1921): sits in the pipe from tank to conservator. Gas from slowly failing
// insulation collects at its top and lowers the upper float: alarm. A violent arc drives a surge of oil
// through it that swings the lower flap: trip. If the oil leaks away the floats drop too.
import { THREE, M, box, clamp, lerp, canvasTexture } from '../kit.js';
import { makeDT, heat, DESIGNS, board, panelBg, title, axes, dot, fmt0, COL, CSS, fitNarrow, reelPlace } from '../transformer.js';

const R = DESIGNS[3].Pc / DESIGNS[3].P0;
const LAPSE = (180 * 60) / 6;
const lifeDays = (V) => V;          // days of life used per day at this hot spot

export default {
  id: 'safety',
  short: 'Failures and safety',
  title: 'Summer overloads, fires and the Buchholz relay',
  subtitle: 'Heat ages the insulation. A small relay listens for gas. And you should never go near one.',
  view: { pos: [0.6, 5.9, 10.8], target: [-0.2, 3.3, 0] },
  learn: `<p>On a hot summer night, with every fan, cooler and AC running, a street transformer can be asked for far more than its rating. The copper loss grows with the <b>square</b> of the load, the oil heats up, and the hottest spot in the windings climbs.</p>
    <p>That hot spot matters because the windings are wrapped in <b>paper</b> soaked in oil. Paper slowly turns brittle with heat. Engineers use a rule from IEC 60076-7: at <b>98 °C</b> the paper ages at its normal rate, and every <b>6 °C</b> hotter <b>doubles</b> the rate. A week of heavy overload can use up months of a transformer's life.</p>
    <p>Old transformers can also fail from within: damp oil, cracked insulation or a lightning surge can start an <b>arc</b> inside the tank. The arc breaks the oil down into gas. Bigger transformers have a <b>Buchholz relay</b> in the pipe to the conservator. Slowly collecting gas lowers a float and sounds an <b>alarm</b>. A sudden arc pushes a surge of oil through it and <b>trips</b> the breaker in a fraction of a second. A leak that drains the oil sets it off too.</p>
    <p>Transformer fires do happen in Indian cities, often in summer, and burning oil is hard to put out. <b>Stay safe:</b> never climb a transformer structure or open its fence or box. Keep well clear of the lines: electricity can jump a gap at 11 kV. If you see sparks, smoke or leaking oil, keep away and call your electricity company's helpline. Only licensed electricians and lineworkers should touch it.</p>
    <p class="tip"><b>Try it:</b> push the load and the temperature up and watch the ageing rate climb. Then start a fault and watch the Buchholz relay act.</p>`,
  terms: [
    { t: 'Overload', d: 'Asking a transformer for more than its rated kVA. Fine for a short while, harmful if it lasts.' },
    { t: 'Hot spot', d: 'The hottest point in the windings, which sets how fast the paper insulation ages.' },
    { t: 'Ageing rate', d: 'How many days of insulation life are used per day. It doubles for every 6 °C above 98 °C.' },
    { t: 'Buchholz relay', d: 'A gas and oil-surge detector in the pipe to the conservator: alarm for slow faults, trip for fast ones.' },
    { t: 'Trip', d: 'A protective device opening the circuit breaker to cut the transformer off.' },
    { t: 'Arc', d: 'Current jumping through oil or air as a very hot spark, which breaks the oil into gas.' },
  ],
  defaults: { load: 1.0, amb: 35 },
  controls: [
    { key: 'load', type: 'range', label: 'Load', min: 0.2, max: 1.6, step: 0.01, ends: ['20%', '160%'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'amb', type: 'range', label: 'Air temperature', min: 15, max: 48, step: 1, ends: ['15 °C', '48 °C'], fmt: (v) => v + ' °C', hint: 'Summer nights in north India can stay above 35 °C.' },
    { key: 'pre', type: 'buttons', label: 'Scenarios', items: [
      { label: 'Winter morning', act: (s) => Object.assign(s, { load: 0.45, amb: 15 }) },
      { label: 'Summer night peak', act: (s) => Object.assign(s, { load: 1.35, amb: 38 }) },
    ] },
    { key: 'fault', type: 'buttons', label: 'Faults', items: [
      { label: 'Slow insulation fault', act: (s, inst) => inst.fault('slow') },
      { label: 'Sudden arc', act: (s, inst) => inst.fault('arc') },
      { label: 'Oil leak', act: (s, inst) => inst.fault('leak') },
      { label: 'Repair and reset', act: (s, inst) => inst.fault(null) },
    ] },
  ],
  quiz: [
    { q: 'Why does a heavy summer overload shorten a transformer’s life?', options: ['The oil evaporates at once', 'The hot spot rises, and paper insulation ages twice as fast for every 6 °C', 'The core wears out from spinning', 'The voltage drops'], answer: 1, why: 'Copper loss grows with load squared; the hotter paper ages exponentially faster.' },
    { q: 'What does a Buchholz relay detect?', options: ['Lightning in the sky', 'Gas and sudden oil surges from faults inside the tank', 'Voltage in your home', 'Theft of oil only'], answer: 1, why: 'Faults break oil into gas. Gas collects in the relay (alarm); a violent arc pushes a surge of oil (trip).' },
    { q: 'You see oil dripping and smoke from a pole transformer. What should you do?', options: ['Climb up and look', 'Throw water on it', 'Keep well away and call the electricity helpline', 'Touch the tank to check if it is hot'], answer: 2, why: 'It carries 11,000 V and may catch fire. Keep clear and let the utility deal with it.' },
  ],
  reel: [
    { ms: 5600, caption: 'Overload it on a hot night and the windings’ paper ages many times faster.', set: { amb: 38 }, anim: { load: [0.8, 1.45] }, spin: 0.1, view: { pos: [3.0, 5.4, 12.0], target: [1.2, 3.0, 0] } },
    { ms: 5400, caption: 'A fault inside makes gas. The Buchholz relay catches it and trips the transformer off.', set: { load: 1.0, amb: 30 }, act: (s, inst) => inst.fault('arc'), spin: 0.08, view: { pos: [-0.2, 6.2, 8.4], target: [-1.2, 4.6, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const s0 = 2.5, TX = -1.4;
    const plinth = box(3.6, 0.3, 2.6, M.matte(0x6a6e76)); plinth.position.set(TX, 0.15, 0); root.add(plinth);
    const d = makeDT(s0, { buchholz: true }); d.group.position.set(TX, 0.3, 0); root.add(d.group);
    d.setXray(0.75);
    // Fence and danger sign.
    const fm = M.metal(0x8a9099, { roughness: 0.5 });
    const fence = new THREE.Group(); root.add(fence);
    const fx0 = TX - 2.4, fx1 = TX + 2.4, fz = 2.2;
    for (let i = 0; i <= 12; i++) { const x = lerp(fx0, fx1, i / 12); const p = box(0.04, 2.2, 0.04, fm); p.position.set(x, 1.1, fz); fence.add(p); }
    for (const y of [0.3, 1.1, 2.1]) { const r = box(fx1 - fx0, 0.04, 0.04, fm); r.position.set(TX, y, fz); fence.add(r); }
    const sign = canvasTexture(256, 200, (g, w, h) => {
      g.fillStyle = '#f5f1e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c0161b'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#c0161b'; g.font = 'bold 40px sans-serif'; g.fillText('खतरा', 72, 58); g.font = 'bold 38px sans-serif'; g.fillText('DANGER', 50, 104);
      g.fillStyle = '#111'; g.font = 'bold 34px sans-serif'; g.fillText('11000 V', 58, 150); g.font = '20px sans-serif'; g.fillText('Keep away', 76, 182);
    }).tex;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.62), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })); sm.position.set(TX + 0.2, 1.35, fz + 0.03); fence.add(sm);
    // Gas bubbles inside the tank rising to the relay.
    const NB = 40;
    const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), M.clear(0xffffff, 0.8), NB); root.add(bub);
    const bu = Array.from({ length: NB }, () => ({ y: -1, x: 0, z: 0 }));
    const tmp = new THREE.Object3D();
    const relayWorld = new THREE.Vector3(); d.relay.getWorldPosition(relayWorld);
    // Oil drips from a leak.
    const drip = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), M.plastic(COL.oil, { roughness: 0.2 }), 12); root.add(drip);
    const dripU = Array.from({ length: 12 }, (_, i) => i / 12);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), M.plastic(0x5a4015, { roughness: 0.1, transparent: true, opacity: 0.85 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(TX + 1.1, 0.31, 1.0); root.add(puddle);
    // Flames and smoke for a severe arc (brief, then the trip clears it).
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 16), M.glow(0xff7a20, { transparent: true, opacity: 0.8 })); flame.position.set(TX + 0.6, d.coverY + 0.9, 0.3); root.add(flame);
    const lRelay = stage.label('', [0, 0.55, 0.3], d.relay, 'hot');
    const lHot = stage.label('', [-2.1, d.y0 + d.H * 0.75, 0.4], d.group, 'hot');
    const lFence = stage.label('Fenced: keep out', [TX + 1.9, 2.45, fz], root);

    // Board: ageing rate vs hot spot.
    let pt = { hot: 90, V: 0.3 };
    const brd = board(root, 4.2, 2.7, 720, 460, (g, w, h) => {
      panelBg(g, w, h); title(g, 'How fast the paper ages');
      const A = axes(g, w, h, { x0: 90, x1: w - 30, y0: h - 64, y1: 66, xMin: 60, xMax: 160, yMin: -2, yMax: 3, xTicks: [60, 80, 98, 120, 140, 160], yTicks: [-2, -1, 0, 1, 2, 3], xFmt: (v) => v + '°', yFmt: (v) => (10 ** v >= 1 ? '×' + fmt0(10 ** v) : '×' + 10 ** v), xLabel: 'hot spot, °C' });
      g.fillStyle = 'rgba(255,122,89,.12)'; g.fillRect(A.X(120), A.y1, A.X(160) - A.X(120), A.y0 - A.y1);
      g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '16px sans-serif'; g.fillText('above normal limit', A.X(121), A.y1 + 18);
      g.strokeStyle = CSS.hot; g.lineWidth = 4; g.beginPath();
      for (let T = 60; T <= 160; T += 2) { const y = A.Y(clamp(Math.log10(2 ** ((T - 98) / 6)), -2, 3)); T === 60 ? g.moveTo(A.X(T), y) : g.lineTo(A.X(T), y); }
      g.stroke();
      dot(g, A.X(clamp(pt.hot, 60, 160)), A.Y(clamp(Math.log10(pt.V), -2, 3)), '#fff');
    }, [3.6, 5.3, -1.8]);
    brd.mesh.rotation.y = -0.25;

    let top = 70, hot = 85, key = '';
    let fault = null, ft = 0, gas = 0, oil = 1, status = 'normal', flash = 0, t = 0;
    const api = {
      fault(kind) { fault = kind; ft = 0; if (!kind) { gas = 0; oil = 1; status = 'normal'; } bu.forEach((b) => { b.y = -1; }); },
    };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        t += dt;
        fitNarrow(stage, [lFence]);
        reelPlace([[brd, [1.0, 8.2, -1.4], 1.2]]);
        const on = status !== 'trip';
        const K = on ? s.load : 0;
        const target = on ? heat(K, s.amb, R) : { top: s.amb, hot: s.amb };
        top = lerp(top, target.top, 1 - Math.exp(-(dt * LAPSE) / (180 * 60)));
        hot = Math.max(top, lerp(hot, target.hot, 1 - Math.exp(-(dt * LAPSE) / (7 * 60))));
        const V = 2 ** ((hot - 98) / 6);
        const pk = `${Math.round(hot)}`; if (pk !== key) { key = pk; pt = { hot, V }; brd.redraw(); }
        const glow = on ? clamp((hot - 60) / 90, 0.03, 0.8) : 0;
        d.coils.hv.forEach((c) => c.glow(glow, 0xff4a10)); d.coils.lv.forEach((c) => c.glow(glow, 0xff4a10));
        // Faults.
        if (fault) ft += dt;
        if (fault === 'slow' && status !== 'trip') { gas = Math.min(1, gas + dt * 0.12); if (gas > 0.35) status = 'alarm'; if (gas > 0.9) status = 'trip'; }
        if (fault === 'arc') { gas = Math.min(1, gas + dt * 0.6); flash = ft < 0.6 ? 1 : 0; if (ft > 0.35) status = 'trip'; }
        if (fault === 'leak') { oil = Math.max(0, oil - dt * 0.12); if (oil < 0.35 && status === 'normal') status = 'alarm'; if (oil < 0.08) status = 'trip'; }
        d.setOilLevel(0.6 * oil);
        // Bubbles rise from the windings to the relay while gas is being made.
        const making = fault === 'slow' || (fault === 'arc' && ft < 1.5);
        const rp = d.relay.getWorldPosition(relayWorld);
        bu.forEach((b, i) => {
          if (b.y < 0 && making && Math.random() < dt * (fault === 'arc' ? 30 : 6)) { b.y = 0; b.x = TX + (Math.random() - 0.5) * 1.2; b.z = (Math.random() - 0.5) * 0.4; }
          if (b.y >= 0) {
            // b.y runs 0 → 1: rise through the oil to just under the cover, then drift into the relay.
            b.y += dt * (fault === 'arc' ? 0.7 : 0.3);
            const y0w = 0.3 + d.activeY, yTop = 0.3 + d.coverY - 0.12;
            if (b.y < 0.7) tmp.position.set(b.x, lerp(y0w, yTop, b.y / 0.7), b.z);
            else { const k = (b.y - 0.7) / 0.3; tmp.position.set(lerp(b.x, rp.x, k), lerp(yTop, rp.y, k), lerp(b.z, rp.z, k)); }
            tmp.scale.setScalar(0.6 + b.y * 0.6);
            if (b.y >= 1) b.y = -1;
          } else { tmp.position.set(0, -50, 0); tmp.scale.setScalar(0.001); }
          tmp.updateMatrix(); bub.setMatrixAt(i, tmp.matrix);
        });
        bub.instanceMatrix.needsUpdate = true;
        // Leak drips.
        const leaking = fault === 'leak' && oil > 0.02;
        drip.visible = leaking;
        dripU.forEach((u, i) => { dripU[i] = (u + dt * 1.2) % 1; tmp.position.set(TX + 1.1, 0.3 + d.y0 + 0.2 - dripU[i] * 0.25, 1.0 - 0.2); tmp.scale.setScalar(1); tmp.updateMatrix(); drip.setMatrixAt(i, tmp.matrix); });
        drip.instanceMatrix.needsUpdate = true;
        puddle.scale.setScalar(Math.max(0.01, (1 - oil) * 1.3)); puddle.visible = oil < 0.99;
        flame.visible = flash > 0; flame.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(t * 23)), 1);
        const col = status === 'trip' ? 0xff3030 : status === 'alarm' ? 0xffb547 : 0x3d4450;
        d.relay.mat.color.setHex(col); d.relay.mat.emissive = d.relay.mat.emissive || new THREE.Color(); d.relay.mat.emissive.setHex(status === 'normal' ? 0x000000 : col).multiplyScalar(0.4 + 0.3 * Math.sin(t * 8));
        lRelay.element.innerHTML = `Buchholz relay · <b>${status === 'trip' ? 'TRIP' : status === 'alarm' ? 'ALARM' : 'normal'}</b>`;
        lHot.element.innerHTML = on ? `Hot spot <b>${Math.round(hot)} °C</b>` : '<b>Switched off</b> by the relay';
      },
      readout: (s) => {
        const on = status !== 'trip';
        const h = on ? heat(s.load, s.amb, R) : { hot: s.amb }, V = 2 ** ((h.hot - 98) / 6);
        const msg = status === 'trip' ? '<div class="big no">Tripped: transformer cut off</div>' : status === 'alarm' ? '<div class="big no">Buchholz alarm: gas or low oil</div>' : `<div class="big">${V < 1 ? 'Ageing slower than normal' : V < 2 ? 'Normal ageing' : `Ageing ${V < 10 ? V.toFixed(1) : fmt0(V)}× faster`}</div>`;
        return `${msg}
          <div class="row"><span>Load · air</span><b>${Math.round(s.load * 100)}% · ${s.amb} °C</b></div>
          <div class="row"><span>Steady hot spot</span><b class="${h.hot > 120 ? 'no' : ''}">${Math.round(h.hot)} °C</b></div>
          <div class="row"><span>One day like this uses</span><b>${!on ? 'nothing: it is off' : lifeDays(V) < 1 ? (lifeDays(V) * 24).toFixed(1) + ' hours of life' : lifeDays(V).toFixed(1) + ' days of life'}</b></div>
          <div class="row"><span>Relay</span><b>${status === 'trip' ? 'tripped' : status === 'alarm' ? 'alarm' : 'normal'}</b></div>
          <small>Ageing rate V = 2^((θ − 98)/6), from IEC 60076-7. Hot spot kept below 120 °C in normal use.</small>`;
      },
    };
  },
};
