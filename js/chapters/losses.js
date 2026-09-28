// Chapter 4: where the lost 1–2 % goes, and how the oil carries the heat away. One scene unit = 0.4 m
// for the transformer (makeDT at scale 2.5).
// Losses come from lossModel() in transformer.js: core (no-load) loss P0 from IS 1180-level designs,
// split into hysteresis and eddy parts with the lamination-thickness model; copper loss Pc × K², with
// K = load ÷ rated. Efficiency η = output ÷ (output + P0 + Pc K²) at unity power factor. It peaks where
// copper loss equals core loss, at K = √(P0 / Pc).
// Heat: IEC 60076-7 steady-state top-oil and hot-spot rises (heat() in transformer.js), approached with
// the 180-minute top-oil time constant, time-lapsed so three hours pass in about six seconds.
import { THREE, M, box, clamp, approach, lerp } from '../kit.js';
import { makeDT, lossModel, heat, coreWPerKg, LIMITS_100, DESIGNS, DT, makePath, board, panelBg, title, axes, dot, fmt0, COL, CSS, fitNarrow, reelPlace } from '../transformer.js';

const LAPSE = (180 * 60) / 6;       // seconds of real time per second shown: the oil's 3-hour time constant in ~6 s

export default {
  id: 'losses',
  short: 'Losses and heat',
  title: 'Where the lost energy goes',
  subtitle: 'Core loss is there all day. Copper loss grows with the load squared. Oil and fins carry the heat away.',
  view: { pos: [2.2, 5.6, 12.4], target: [1.3, 2.7, 0] },
  learn: `<p>A distribution transformer is about <b>98 to 99% efficient</b>. But it runs every hour of every year, and India has millions of them, so the lost 1–2% adds up to a lot of coal.</p>
    <p><b>Core loss</b> (no-load loss) happens whenever the transformer is switched on, even with nothing connected. Two things cause it. <b>Hysteresis</b>: the steel's tiny magnetic domains flip 100 times a second, and each flip wastes a little energy. <b>Eddy currents</b>: the changing flux also drives little swirls of current inside the steel itself, heating it.</p>
    <p>That's why the core is made of <b>thin laminations</b>, each about <b>0.27 mm</b> thick and coated with insulation. The swirls are trapped inside each thin sheet, and eddy loss falls with the <b>square of the thickness</b>. <b>Amorphous</b> steel, a glassy ribbon ten times thinner, cuts core loss by about three-quarters.</p>
    <p><b>Copper loss</b> is the I²R heat in the windings. It grows with the <b>square of the load</b>: double the load, four times the heat. Efficiency peaks where copper loss equals core loss.</p>
    <p>The heat warms the oil. Hot oil rises past the coils, flows into the <b>radiator fins</b>, cools and sinks back down. No pump, no fan: this is called <b>ONAN</b> (oil natural, air natural) cooling. India's <b>BEE star label</b> rates distribution transformers by their total losses at half and full load; more stars, less waste.</p>
    <p class="tip"><b>Try it:</b> slide the load and watch the two losses swap places. Make the laminations thicker, then compare 1-star with 5-star.</p>`,
  terms: [
    { t: 'Core (no-load) loss', d: 'Energy lost in the steel core whenever the transformer is energised, loaded or not.' },
    { t: 'Hysteresis', d: 'Energy lost each time the steel’s magnetic domains are flipped back and forth.' },
    { t: 'Eddy currents', d: 'Swirls of current that changing flux drives inside the core itself, wasting energy as heat.' },
    { t: 'Lamination', d: 'A thin, insulated sheet of core steel. Stacking them blocks the eddy currents.' },
    { t: 'Copper (load) loss', d: 'I²R heat in the windings, rising with the square of the current.' },
    { t: 'ONAN', d: 'Oil natural, air natural: the oil circulates by itself and the fins cool it in still air.' },
    { t: 'BEE star rating', d: 'India’s energy label. For distribution transformers, stars 1–5 match the IS 1180 loss levels.' },
  ],
  defaults: { load: 0.5, star: 3, mat: 'crgo', lam: 0.27, amb: 35 },
  controls: [
    { key: 'load', type: 'range', label: 'Load', min: 0, max: 1.4, step: 0.01, ends: ['0', '140 kVA'], fmt: (v) => Math.round(v * 100) + '% · ' + Math.round(v * 100) + ' kVA' },
    { key: 'star', type: 'seg', label: 'BEE star level', options: [1, 2, 3, 4, 5].map((n) => ({ v: n, label: '★'.repeat(n) })), fmt: (v) => `limit ${fmt0(LIMITS_100[v - 1].t50)} W at half load` },
    { key: 'mat', type: 'seg', label: 'Core steel', options: [{ v: 'crgo', label: 'CRGO' }, { v: 'amorph', label: 'Amorphous' }] },
    { key: 'lam', type: 'seg', label: 'Lamination thickness', options: [0.23, 0.27, 0.35, 0.5].map((t) => ({ v: t, label: t + ' mm' })), hint: 'CRGO only. Eddy loss grows with the square of the thickness.' },
    { key: 'amb', type: 'range', label: 'Air temperature', min: 15, max: 50, step: 1, ends: ['15 °C', '50 °C'], fmt: (v) => v + ' °C' },
  ],
  quiz: [
    { q: 'Why is a transformer core built from thin insulated sheets instead of a solid block?', options: ['To save steel', 'To trap eddy currents in thin sheets, which cuts eddy loss sharply', 'To make it lighter to lift', 'So the oil can soak in'], answer: 1, why: 'Eddy loss grows with the square of the sheet thickness. Thin laminations keep the swirls small.' },
    { q: 'The load on a transformer doubles. Its copper loss…', options: ['doubles', 'becomes four times bigger', 'stays the same', 'halves'], answer: 1, why: 'Copper loss is I²R. Double the current, four times the loss.' },
    { q: 'What makes the oil flow round an ONAN transformer?', options: ['A pump', 'A fan', 'Hot oil rises and cooled oil sinks: natural convection', 'Magnetic force'], answer: 2, why: 'Oil natural, air natural: warm oil rises past the coils, cools in the fins and sinks back.' },
  ],
  reel: [
    { ms: 5800, caption: 'Copper loss grows with the load squared. Hot oil rises, cools in the fins and sinks.', set: { star: 3, mat: 'crgo', lam: 0.27, amb: 35 }, anim: { load: [0.2, 1.2] }, spin: 0.12, view: { pos: [2.0, 5.2, 12.8], target: [1.4, 3.2, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const s0 = 2.5;
    const d = makeDT(s0); d.group.position.set(-1.6, 0, 0); root.add(d.group);
    d.setXray(1);
    const TX = -1.6;
    // Oil convection: dots with per-dot colour (hot at top, cool at bottom) on loops front and back.
    const N = 110, paths = [];
    for (const side of [1, -1]) for (const dx of [-0.28, 0.28]) {
      const z0 = side * 0.12 * s0, zf = side * (d.D / 2 + 0.1 * s0);
      const x = TX + dx * s0;
      paths.push(makePath([
        [x, d.y0 + 0.14 * s0, z0], [x, d.y0 + d.H * 0.92, z0], [x, d.y0 + d.H * 0.92, zf], [x, d.y0 + d.H * 0.16, zf], [x, d.y0 + d.H * 0.1, z0 * 0.5],
      ], true));
    }
    const oilMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
    root.add(oilMesh);
    for (let i = 0; i < N; i++) oilMesh.setColorAt(i, new THREE.Color(0x4f8dff));
    const ou = Array.from({ length: N }, (_, i) => ({ p: i % paths.length, u: Math.random() }));
    const tmp = new THREE.Object3D(), col = new THREE.Color(), hotC = new THREE.Color(COL.hot), coolC = new THREE.Color(0x4f8dff);
    // Lamination close-up: a limb section with eddy loops on its top face.
    const LX = 3.0, LY = 0.4;
    const lamG = new THREE.Group(); lamG.position.set(LX, LY, 1.4); lamG.rotation.set(0.5, -0.35, 0); root.add(lamG);
    const block = new THREE.Group(); lamG.add(block);
    const loops = new THREE.Group(); lamG.add(loops);
    const loopMat = M.glow(COL.hot, { transparent: true, opacity: 0.9 });
    const fluxArrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 20), M.glow(COL.flux)); fluxArrow.position.set(0, 1.95, 0); lamG.add(fluxArrow);
    let lamKey = '';
    const buildLam = (sheets) => {
      [block, loops].forEach((g) => { while (g.children.length) { const c = g.children.pop(); c.geometry?.dispose(); } });
      const W = 1.6, H = 1.5, Dp = 1.6, gap = sheets > 1 ? 0.035 : 0, t = (Dp - gap * (sheets - 1)) / sheets;
      const sm = [M.metal(0x8a909c, { roughness: 0.45 }), M.metal(0x6f7682, { roughness: 0.45 })];
      for (let i = 0; i < sheets; i++) {
        const z = -Dp / 2 + t / 2 + i * (t + gap);
        const p = box(W, H, t, sm[i % 2]); p.position.set(0, H / 2, z); block.add(p);
        // An eddy loop in this sheet's cross-section, drawn on the top face.
        const ix = W / 2 - 0.1, iz = Math.max(0.01, t / 2 - Math.min(0.05, t * 0.25));
        const pts = [[-ix, -iz], [ix, -iz], [ix, iz], [-ix, iz]].map(([x, zz]) => new THREE.Vector3(x, H + 0.03, z + zz));
        const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.1);
        loops.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, Math.min(0.03, t * 0.12), 6, true), loopMat));
      }
    };
    const lLam = stage.label('', [LX, LY - 0.35, 2.6], root, 'hot');
    const lOil = stage.label('Hot oil rises, cools in the fins', [TX, d.y0 + d.H + 1.6, 1.4], root);
    const lFin = stage.label('Radiator fins', [TX + 1.1, d.y0 + 0.9, d.D / 2 + 0.6], root);
    const lCoil = stage.label('', [TX - 1.9, d.y0 + d.H * 0.55, 0.4], root, 'hot');

    // Board: efficiency against load with the loss split.
    let st = { star: 3, mat: 'crgo', lam: 0.27, load: 0.5 };
    const brd = board(root, 4.4, 2.75, 720, 450, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Efficiency vs load');
      const A = axes(g, w, h, { x0: 96, x1: w - 30, y0: h - 64, y1: 66, xMax: 1.4, yMin: 96, yMax: 100, xTicks: [0, 0.5, 1, 1.4], yTicks: [96, 97, 98, 99, 100], xFmt: (v) => Math.round(v * 100) + '%', yFmt: (v) => v + '%', xLabel: 'load' });
      g.strokeStyle = CSS.lv; g.lineWidth = 4; g.beginPath();
      for (let i = 1; i <= 140; i++) { const K = i / 100, e = lossModel({ ...st, load: K }).eff * 100; const y = A.Y(Math.max(96, e)); i === 1 ? g.moveTo(A.X(K), y) : g.lineTo(A.X(K), y); }
      g.stroke();
      const r = lossModel(st);
      g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(A.X(r.Kbest), A.y1); g.lineTo(A.X(r.Kbest), A.y0); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '16px sans-serif'; g.fillText('best: copper = core', A.X(r.Kbest) + 6, A.y1 + 18);
      if (st.load > 0.01) dot(g, A.X(Math.min(1.4, st.load)), A.Y(Math.max(96, r.eff * 100)), CSS.hv);
      // Loss bars.
      const bx = w - 250, by = h - 150, sc = 150 / 2600;
      g.font = '16px sans-serif';
      [['core', r.P0, CSS.flux], ['copper', r.Pcu, CSS.hot]].forEach(([n, v, c], i) => { g.fillStyle = c; g.fillRect(bx + i * 110, by + 60 - Math.min(150, v * sc), 60, Math.min(150, v * sc)); g.fillStyle = '#fff'; g.fillText(`${n} ${fmt0(v)} W`, bx + i * 110 - 6, by + 82); });
    }, [5.2, 4.1, -1.6]);
    brd.mesh.rotation.y = -0.3;

    let top = 60, hot = 70, t = 0, key = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        t += dt;
        fitNarrow(stage, [lOil, lFin]);
        reelPlace([[brd, [1.0, 7.8, -1.2], 1.25]]);
        const r = lossModel(s), R = r.Pc / Math.max(1, r.P0);
        const target = heat(s.load, s.amb, R);
        const k = 1 - Math.exp(-(dt * LAPSE) / (180 * 60));
        top = lerp(top, target.top, k); hot = lerp(hot, target.hot, 1 - Math.exp(-(dt * LAPSE) / (7 * 60)));
        hot = Math.max(hot, top);
        const kk = `${s.star}|${s.mat}|${s.lam}|${s.load.toFixed(2)}`;
        if (kk !== key) { key = kk; st = { star: s.star, mat: s.mat, lam: s.lam, load: s.load }; brd.redraw(); }
        // Coils glow with copper loss; the core with core loss.
        const cu = clamp(r.Pcu / 2500, 0, 1);
        d.coils.hv.forEach((c) => c.glow(0.04 + cu * 0.5, 0xff5a20)); d.coils.lv.forEach((c) => c.glow(0.04 + cu * 0.6, 0xff5a20));
        d.core.mat.emissive = d.core.mat.emissive || new THREE.Color(); d.core.mat.emissive.setRGB(clamp(r.P0 / 600, 0, 0.5), clamp(r.P0 / 2000, 0, 0.15), 0);
        // Oil flow speed grows with the heat to carry (buoyancy ∝ temperature difference).
        const v = 0.25 + 1.4 * clamp((top - s.amb) / 60, 0, 1.2);
        const warm = clamp((top - 30) / 60, 0, 1);
        for (let i = 0; i < N; i++) {
          const o = ou[i], P = paths[o.p];
          o.u = (o.u + (dt * v) / P.L) % 1;
          P.at(o.u * P.L, tmp.position); tmp.updateMatrix(); oilMesh.setMatrixAt(i, tmp.matrix);
          // Hot on the way up past the coils (first leg), cooling through the fins (third leg).
          const d1 = P.cum[1] / P.L, d3 = P.cum[3] / P.L, u = o.u;
          const h = u < d1 ? u / d1 : u < P.cum[2] / P.L ? 1 : u < d3 ? 1 - (u - P.cum[2] / P.L) / (d3 - P.cum[2] / P.L) : 0;
          col.copy(coolC).lerp(hotC, clamp(h * (0.4 + 0.6 * warm), 0, 1)); oilMesh.setColorAt(i, col);
        }
        oilMesh.instanceMatrix.needsUpdate = true; if (oilMesh.instanceColor) oilMesh.instanceColor.needsUpdate = true;
        // Laminations.
        const sheets = s.mat === 'amorph' ? 16 : Math.round(clamp(2.4 / s.lam, 4, 11));
        const lk = `${sheets}`;
        if (lk !== lamKey) { lamKey = lk; buildLam(sheets); }
        const c = s.mat === 'amorph' ? coreWPerKg(0, 'amorph') : coreWPerKg(s.lam);
        const ph = Math.sin(t * Math.PI * 2 * 0.8);
        fluxArrow.rotation.x = ph < 0 ? Math.PI : 0; fluxArrow.scale.setScalar(0.4 + 0.6 * Math.abs(ph));
        loopMat.opacity = clamp(c.eddy / 0.8, 0.12, 1) * Math.abs(ph);
        lLam.element.innerHTML = `${s.mat === 'amorph' ? 'Amorphous ribbon, 0.025 mm' : 'CRGO sheets, ' + s.lam + ' mm'} · <b>${c.total.toFixed(2)} W/kg</b>`;
        lCoil.element.innerHTML = `Hot spot <b>${Math.round(hot)} °C</b> · top oil ${Math.round(top)} °C`;
      },
      readout: (s) => {
        const r = lossModel(s), lim = LIMITS_100[s.star - 1];
        const R = r.Pc / Math.max(1, r.P0), h = heat(s.load, s.amb, R);
        const t50 = lossModel({ ...s, load: 0.5 }).loss, ok = t50 <= lim.t50 + 0.5;
        return `<div class="big">${(r.eff * 100).toFixed(2)}% efficient</div>
          <div class="row"><span>Core loss: hysteresis + eddy</span><b>${fmt0(r.hyst)} + ${fmt0(r.eddy)} W</b></div>
          <div class="row"><span>Copper loss, Pc × load²</span><b>${fmt0(r.Pcu)} W</b></div>
          <div class="row"><span>Top oil · hot spot (steady)</span><b>${Math.round(h.top)} · ${Math.round(h.hot)} °C</b></div>
          <div class="row"><span>Loss at half load vs ${s.star}-star limit</span><b class="${ok ? 'ok' : 'no'}">${fmt0(t50)} / ${fmt0(lim.t50)} W</b></div>
          <small>100 kVA, 11 kV. ${s.mat === 'amorph' ? 'Amorphous core: about 70% less core loss.' : 'Limits from IS 1180, Table 3.'} ${r.eff > 0 ? `Peak efficiency near ${Math.round(r.Kbest * 100)}% load.` : ''}</small>`;
      },
    };
  },
};
