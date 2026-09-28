// Chapter 1: a 100 kVA, 11 kV / 433 V pole transformer on a double-pole structure. One scene unit = 0.5 m.
// Numbers in the readout come from DT in transformer.js: turns 2,464 : 56 per phase, 4.47 volts per turn,
// full-load line currents 5.25 A (HV) and 133 A (LV). Silica gel: blue (cobalt-indicating) when dry,
// pink when it has soaked up water; many utilities now use orange gel that turns green instead.
import { THREE, M, box, exploder, approach } from '../kit.js';
import { DT, S, makeDT, makePole, makePath, wire, flowDots, COL, fmt0, fitNarrow, clamp } from '../transformer.js';

export default {
  id: 'anatomy',
  short: 'The box on the pole',
  title: 'Inside the transformer on your street',
  subtitle: 'A steel tank of oil with an iron core and two sets of copper coils. No moving parts.',
  view: { pos: [3.4, 10.9, 6.9], target: [-1.5, 8.9, 0] },
  learn: `<p>Look up at almost any Indian street and you'll find one: a grey-green box on a platform between two poles. It is a <b>distribution transformer</b>. It takes <b>11,000 volts</b> from the wires above and turns it into the <b>433 volts</b> (230 V per phase) that goes to about a hundred homes and shops.</p>
    <p>It has <b>no moving parts</b>. Inside the steel <b>tank</b> sits a <b>core</b> of thin, stacked sheets of special steel called <b>CRGO</b> (cold-rolled grain-oriented). Round each of its three legs are two coils: a thin <b>LV winding</b> of fat copper strip close to the core, and a tall <b>HV winding</b> of thousands of turns of fine wire outside it.</p>
    <p>Everything is soaked in <b>mineral oil</b>. The oil insulates the coils and carries their heat to the <b>radiator fins</b>, where the air cools it. Oil swells when it's hot, so a drum on top, the <b>conservator</b>, gives it room. As the oil shrinks and swells the transformer "breathes" through a jar of <b>silica gel</b> that dries the air. Blue gel is dry; pink means it's full of water and needs changing.</p>
    <p>The tall <b>HV bushings</b> on top take the 11 kV in, through fuses and <b>lightning arresters</b> on the cross-arm. The short <b>LV bushings</b> send out three phases and a neutral.</p>
    <p class="tip"><b>Try it:</b> switch on X-ray to see the core and coils, then take it apart. Push the silica gel slider and watch it change colour.</p>`,
  terms: [
    { t: 'Distribution transformer', d: 'The last transformer before your home: 11 kV in, 433 V (230 V per phase) out.' },
    { t: 'Core', d: 'Stacked sheets of silicon steel that carry the magnetic flux from one coil to the other.' },
    { t: 'CRGO steel', d: 'Cold-rolled grain-oriented steel: its crystals are lined up so flux flows easily along the sheet.' },
    { t: 'HV and LV windings', d: 'The high-voltage coil (many turns of thin wire) and low-voltage coil (few turns of thick strip).' },
    { t: 'Bushing', d: 'A porcelain insulator that lets a conductor pass through the steel tank safely.' },
    { t: 'Conservator', d: 'A drum above the tank that gives the oil room to expand when it gets hot.' },
    { t: 'Breather', d: 'A jar of silica gel that dries the air the transformer breathes in as its oil cools.' },
  ],
  defaults: { xray: false, explode: 0, load: 0.6, gel: 0 },
  controls: [
    { key: 'xray', type: 'toggle', label: 'X-ray the tank', hint: 'See the core, coils and oil inside.' },
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'load', type: 'range', label: 'Load on the transformer', min: 0, max: 1.2, step: 0.01, ends: ['0', '120 kVA'], fmt: (v) => Math.round(v * 100) + ' kVA' },
    { key: 'gel', type: 'range', label: 'Silica gel: water soaked up', min: 0, max: 1, step: 0.01, ends: ['dry (blue)', 'wet (pink)'], fmt: (v) => (v < 0.35 ? 'dry' : v < 0.7 ? 'half used' : 'change it!') },
  ],
  quiz: [
    { q: 'What does a pole transformer on an Indian street usually do?', options: ['Stores electricity for power cuts', 'Turns 11,000 V into 433 V (230 V per phase) for homes', 'Turns AC into DC', 'Makes electricity from the oil'], answer: 1, why: 'It steps the 11 kV distribution voltage down to the low voltage that homes and shops use.' },
    { q: 'Why is the transformer filled with oil?', options: ['To lubricate moving parts', 'To insulate the coils and carry their heat to the fins', 'As fuel', 'To make it heavier'], answer: 1, why: 'There are no moving parts. Oil is a good insulator and moves heat from the coils to the radiator fins.' },
    { q: 'The silica gel in the breather has turned pink. What does that mean?', options: ['The transformer is overloaded', 'The gel has soaked up water and needs replacing', 'The oil is too cold', 'Nothing: it is always pink'], answer: 1, why: 'Blue indicating gel turns pink as it absorbs moisture. Wet gel lets damp air reach the oil.' },
  ],
  reel: [
    { ms: 5600, caption: 'The grey box on your street’s pole turns 11,000 volts into 230 volts for about a hundred homes.', set: { xray: false, explode: 0, load: 0.7 }, spin: 0.35, view: { pos: [8.4, 10.6, 13.4], target: [0.2, 8.6, 0] } },
    { ms: 5600, caption: 'Inside: an iron core, copper coils and oil. No moving parts at all.', set: { xray: true, load: 0.7 }, anim: { explode: [0, 0.85] }, spin: 0.3, view: { pos: [6.2, 9.8, 10.4], target: [0.2, 8.3, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const pole = makePole(); root.add(pole);
    const dt = makeDT(S); dt.group.position.set(0, pole.platformY, 0); root.add(dt.group);
    const baseY = pole.platformY;
    // HV jumpers: fuse → HV bushing. LV cable: LV bushings → distribution box.
    const wireMat = M.metal(0x9aa0aa, { roughness: 0.4 });
    const hvPaths = pole.fuses.map((fu, i) => {
      const b = dt.hv[i], top = b.position.clone().add(b.top); top.y += baseY;
      return makePath([[fu.position.x, fu.position.y - 0.4, fu.position.z], [fu.position.x * 0.7 + top.x * 0.3, top.y + 1.0, 0.25], [top.x, top.y + 0.02, top.z]]);
    });
    hvPaths.forEach((p) => root.add(wire(p, 0.025, wireMat)));
    const lvCol = M.plastic(0x1b1d22, { roughness: 0.6 });
    const lvPaths = dt.lv.map((b, i) => {
      const top = b.position.clone().add(b.top); top.y += baseY;
      return makePath([[top.x, top.y, top.z], [top.x, top.y + 0.3, top.z + 0.25], [pole.span - 0.25, top.y + 0.2 - i * 0.06, 0.6], [pole.span - 0.12, 2.0 * S, 0.45], [pole.span, 1.6 * S + 0.35, 0.3]]);
    });
    lvPaths.forEach((p) => root.add(wire(p, 0.035, lvCol)));
    const dHV = hvPaths.map((p) => { const d = flowDots(p, 6, COL.hv, 0.05); root.add(d); return d; });
    const dLV = lvPaths.slice(0, 3).map((p) => { const d = flowDots(p, 10, COL.lv, 0.055); root.add(d); return d; });

    const setExplode = exploder([
      { obj: dt.cover, off: [0, 2.2, 0] },
      { obj: dt.cons, off: [0, 3.2, -0.6] },
      { obj: dt.br, off: [1.0, 2.6, -0.6] },
      { obj: dt.active, off: [0, 1.35, 1.6] },
      { obj: dt.fins, off: [0, 0, 0.001] },
    ]);
    // Radiator fins move out front and back separately.
    const finHome = dt.fins.children.map((f) => f.position.z);

    const minor = [];
    const L = (t, p, cls = '', main = false, parent = root) => { const l = stage.label(t, p, parent, cls); if (!main) minor.push(l); return l; };
    L('Tank, full of oil', [-1.35, baseY + 0.6, 0.7], '', true);
    L('Radiator fins', [0.55, baseY + 0.45, 1.05]);
    L('HV bushings · 11 kV in', [-0.95, dt.coverY + 0.95, -0.1], 'hot', true, dt.cover);
    L('LV bushings · 433 V out', [0.95, dt.coverY + 0.45, 0.55], '', false, dt.cover);
    L('Conservator', [-0.3, dt.conY + 0.45, dt.conZ], '', false, dt.cons);
    L('Breather · silica gel', [dt.bx + 0.25, dt.by - 0.5, dt.conZ], '', false, dt.br);
    const lCore = L('CRGO core', [-0.95, 0.35, 0.3], '', false, dt.active);
    const lHV = L('HV winding', [0.62, 0.3, 0.3], '', false, dt.active);
    const lLV = L('LV winding', [0.0, -0.62, 0.35], '', false, dt.active);
    L('Fuses and lightning arresters', [-2.9, pole.armY + 0.9, 0.4]);
    L('11 kV line', [pole.phases[0] - 0.4, pole.topY + 0.3, 2.2]);
    const inner = [lCore, lHV, lLV];

    let xr = 0, t = 0;
    return {
      update(dt_, s) {
        const dts = Math.max(0, dt_);
        t += dts;
        fitNarrow(stage, minor);
        xr = approach(xr, s.xray || s.explode > 0.05 ? 1 : 0, 6, dts);
        dt.setXray(xr);
        inner.forEach((l) => { l.visible = xr > 0.5 && stage.host.clientWidth >= 560; });
        setExplode(s.explode);
        dt.fins.children.forEach((f, i) => { f.position.z = finHome[i] + Math.sign(finHome[i]) * 0.9 * s.explode; });
        dt.setGel(s.gel);
        // Coils glow gently with load; the HV current is small, the LV current large.
        const k = clamp(s.load, 0, 1.2);
        const hum = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.0);
        dt.coils.hv.forEach((c) => c.glow(0.05 + 0.1 * k * hum, 0xffb547));
        dt.coils.lv.forEach((c) => c.glow(0.05 + 0.22 * k * hum, 0x5ce1a9));
        const show = s.explode < 0.05;
        dHV.forEach((d) => { d.visible = show && k > 0.01; d.step(dts, 0.35 + 0.25 * k); });
        dLV.forEach((d) => { d.visible = show && k > 0.01; d.step(dts, 0.4 + 1.6 * k); });
      },
      readout: (s) => {
        const k = clamp(s.load, 0, 1.2), I1 = DT.I1 * k, I2 = DT.I2 * k;
        return `<div class="big">11,000 V in, 433 V out</div>
          <div class="row"><span>Turns per phase, HV : LV</span><b>${fmt0(DT.N1)} : ${DT.N2}</b></div>
          <div class="row"><span>Volts per turn</span><b>${DT.Et.toFixed(2)} V</b></div>
          <div class="row"><span>Current in each HV wire</span><b>${I1.toFixed(1)} A</b></div>
          <div class="row"><span>Current in each LV wire</span><b>${fmt0(I2)} A</b></div>
          <small>100 kVA, three-phase. About ${DT.massKg} kg with some ${DT.oilL} litres of oil. Voltage down 25 times, current up 25 times.</small>`;
      },
    };
  },
};
