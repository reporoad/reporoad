import test from 'node:test';
import assert from 'node:assert/strict';
import { cabinDashboardModel, cabinSurroundModel } from '../lib/cabin-model.ts';
import { steeringWheelModel } from '../lib/voxel-models.ts';

test('window seals are explicitly rubber and stay inside the pillar assemblies', () => {
  for (const frameX of [1.2, 2.12, 3]) {
    const seals = cabinSurroundModel(frameX).filter(part => part.rubber);
    assert.equal(seals.length, 20);
    assert.ok(seals.every(part => !part.wood));
    assert.ok(seals.every(part => Math.abs(part.position[0]) > frameX - 0.13));
    for (const side of [-1, 1]) assert.equal(seals.filter(part => Math.sign(part.position[0]) === side).length, 10);
  }
});

test('timber corner tiers join vertically and retain their outer edge at different widths', () => {
  for (const frameX of [1.2, 2.12, 3]) for (const side of [-1, 1]) {
    const tiers = cabinSurroundModel(frameX).filter(p => p.wood && p.size[2] === 0.19 && Math.sign(p.position[0]) === side)
      .sort((a, b) => b.position[1] - a.position[1]);
    assert.equal(tiers.length, 3);
    tiers.forEach((part, i) => {
      assert.ok(Math.abs(side * part.position[0] + part.size[0] / 2 - (frameX + 0.115)) < 1e-9);
      if (i > 0) {
        const above = tiers[i - 1];
        assert.ok(part.size[0] < above.size[0]);
        assert.ok(Math.abs(above.position[1] - above.size[1] / 2 - (part.position[1] + part.size[1] / 2)) < 1e-9);
      }
    });
    assert.ok(Math.abs(tiers[0].position[1] + tiers[0].size[1] / 2 - 1.15) < 1e-9);
    assert.ok(Math.abs(tiers[2].position[1] - tiers[2].size[1] / 2 - 0.95) < 1e-9);
  }
});

test('glovebox clears the pad while preserving its lower trim joint', () => {
  const parts = cabinDashboardModel();
  const face = parts.find(p => p.position[0] === -0.745 && p.size[2] === 0.08 && p.size[0] === 0.95);
  const band = parts.find(p => p.color === '#454734');
  const well = parts.find(p => p.color === '#34362a');
  assert.ok(face && band && well);
  assert.ok(Math.abs(face.position[1] + face.size[1] / 2 + 0.435) < 1e-9);
  assert.ok(Math.abs(face.size[1] - 0.22) < 1e-9);
  const handle = parts.find(p => p.size[0] === 0.3145);
  assert.ok(handle && handle.position[1] === -0.515, 'handle stays at the reference height');
  assert.ok(Math.abs(face.position[1] - face.size[1] / 2 - (band.position[1] + band.size[1] / 2)) < 1e-9);
  assert.ok(Math.abs(well.position[1] - well.size[1] / 2 + 0.98) < 1e-9);
  const sides = parts.filter(p => p.size[0] === 0.016 && p.size[2] === 0.025);
  assert.equal(sides.length, 2);
  for (const side of sides) {
    assert.equal(side.position[1], face.position[1]);
    assert.equal(side.size[1], face.size[1]);
    assert.ok(Math.abs(Math.abs(side.position[0] - face.position[0]) - face.size[0] / 2) < 1e-9);
  }
});

test('headliner panels retain the upper boundary and a deeper joined cover', () => {
  for (const frameX of [1.2, 2.1]) {
    const panels = cabinSurroundModel(frameX).filter(p => p.position[1] === 1.2225 && p.size[1] === 0.33);
    assert.equal(panels.length, 3);
    const ordered = [...panels].sort((a, b) => a.position[0] - b.position[0]);
    const straps = cabinSurroundModel(frameX).filter(p => p.color === '#493627');
    for (let i = 0; i < 2; i++) {
      const edge = ordered[i].position[0] + ordered[i].size[0] / 2;
      const nextEdge = ordered[i + 1].position[0] - ordered[i + 1].size[0] / 2;
      assert.ok(Math.abs(nextEdge - edge - 0.008) < 1e-8);
      assert.ok(straps.some(s => Math.abs(s.position[0] - (edge + nextEdge) / 2) < 1e-8));
    }
    for (const p of panels) {
      assert.ok(p.wood);
      assert.ok(Math.abs(p.position[1] + p.size[1] / 2 - 1.3875) < 1e-8);
      assert.ok(Math.abs(p.position[1] - p.size[1] / 2 - 1.0575) < 1e-8);
    }
  }
});
test('roof straps reach the cover edge and overlap their retaining tabs', () => {
  const parts = cabinSurroundModel(2.1);
  const straps = parts.filter(p => p.color === '#493627');
  assert.equal(straps.length, 2);
  for (const strap of straps) {
    const tab = parts.find(p => p.color === '#57412b' && p.position[0] === strap.position[0]);
    assert.ok(tab);
    assert.ok(strap.position[1] - strap.size[1] / 2 < 1.0575);
    assert.ok(tab.position[1] + tab.size[1] / 2 > 1.0575);
    assert.ok(tab.position[1] - tab.size[1] / 2 < 1.0575);
    assert.ok(Math.abs(strap.position[1] - tab.position[1]) < (strap.size[1] + tab.size[1]) / 2);
    assert.ok(Math.abs(strap.position[2] - tab.position[2]) < (strap.size[2] + tab.size[2]) / 2);
  }
});

test('cabin geometry is deterministic, finite and bounded', () => {
  const model = cabinDashboardModel();
  assert.deepEqual(model, cabinDashboardModel());
  assert.ok(
    model.length > 0 && model.length <= 128,
    'dashboard stays within its instance budget',
  );
  for (const part of [
    ...model,
    ...steeringWheelModel(),
    ...cabinSurroundModel(2.1),
    ...cabinSurroundModel(1.2),
  ]) {
    assert.ok(part.position.every(Number.isFinite));
    assert.ok(part.size.every((v) => Number.isFinite(v) && v > 0));
    assert.match(part.color, /^#[0-9a-f]{6}$/i);
  }
});

test('painted pillar returns meet narrow seals within the original envelope', () => {
  const parts = cabinSurroundModel(2.1);
  const returns = parts.filter(p => p.color === '#746b4f');
  assert.equal(returns.length, 2);
  for (const p of returns) {
    const seal = parts.find(s => s.color === '#303932' && Math.sign(s.position[0]) === Math.sign(p.position[0]) && s.size[1] === 2.4);
    assert.ok(seal);
    assert.ok(Math.abs(p.position[2] + p.size[2] / 2 + 1.93) < 1e-8);
    assert.ok(Math.abs(seal.position[2] - seal.size[2] / 2 + 2.01) < 1e-8);
    assert.ok(Math.abs(p.position[2] - p.size[2] / 2 - seal.position[2] - seal.size[2] / 2) < 1e-8);
    assert.ok(p.size[0] < seal.size[0]);
    assert.equal(p.position[1], seal.position[1]);
    assert.ok(seal.size[2] < p.size[2] / 3);
  }
});

test('fitted inner-return sections stay on solid backing inside the seal envelope', () => {
  const parts = cabinSurroundModel(2.1);
  for (const side of [-1, 1]) {
    const faces = parts.filter(p => p.size[0] === 0.005 && Math.sign(p.position[0]) === side);
    const backing = parts.find(p => p.color === '#746b4f' && Math.sign(p.position[0]) === side);
    assert.equal(faces.length, 24);
    assert.ok(backing);
    for (const p of faces) {
      assert.ok(Math.abs(Math.abs(p.position[0]) - p.size[0] / 2 - (2.1 - 0.0925)) < 1e-8);
      assert.ok(Math.abs(Math.abs(p.position[0]) + p.size[0] / 2 - (Math.abs(backing.position[0]) - backing.size[0] / 2)) < 1e-8);
      assert.ok(p.position[1] - p.size[1] / 2 >= -1.12);
      assert.ok(p.position[1] + p.size[1] / 2 <= 1.28);
    }
  }
});

test('inner pillar covers stay flush over a continuous seal backing', () => {
  const parts = cabinSurroundModel(2.1);
  for (const side of [-1, 1]) {
    const covers = parts.filter(p => Math.abs(p.position[0] - side * 2) < 1e-8 && Math.abs(p.position[2] + 1.853) < 1e-8);
    const backing = parts.find(p => Math.abs(p.position[0] - side * 2) < 1e-8 && Math.abs(p.position[2] + 1.8905) < 1e-8);
    assert.equal(covers.length, 8);
    assert.ok(backing);
    covers.sort((a,b) => a.position[1] - b.position[1]);
    covers.forEach((p, i) => {
      assert.ok(Math.abs(p.position[2] + p.size[2] / 2 + 1.8405) < 1e-8);
      assert.ok(Math.abs(p.position[2] - p.size[2] / 2 - (backing.position[2] + backing.size[2] / 2)) < 1e-8);
      assert.ok(p.position[1] - p.size[1] / 2 >= -0.39);
      assert.ok(p.position[1] + p.size[1] / 2 <= 1.07);
      if(i) assert.ok(Math.abs(p.position[1] - covers[i-1].position[1] - p.size[1] - 0.002) < 1e-8);
    });
  }
});
test('radio screen sits in front of its inset backing, with physical knobs at its sides', () => {
  const model = cabinDashboardModel();
  const backing = model.find(
    (p) =>
      Math.abs(p.size[0] - 0.51 * 0.94) < 1e-8 &&
      Math.abs(p.size[1] - 0.2 * 0.82) < 1e-8,
  );
  assert.ok(backing);
  assert.ok(backing.position[2] + backing.size[2] / 2 < -1.359);
  assert.ok(Math.abs(backing.position[1] - -0.535) < 1e-8);
  const knobs = model.filter(
    p => Math.abs(p.size[0] - 0.054 * 0.94) < 1e-8 && p.size[2] === 0.024,
  );
  assert.equal(knobs.length, 2);
  for (const knob of knobs) {
    assert.ok(Math.abs(knob.position[2] - knob.size[2] / 2 + 1.3755) < 1e-8);
    assert.ok(knob.position[2] + knob.size[2] / 2 > -1.359);
  }
});

test('switch housings join the timber backing and retain visible faces', () => {
  const parts = cabinDashboardModel();
  const housings = parts.filter(p => Math.abs(p.size[0] - 0.064 * 0.94) < 1e-8 && p.size[2] === 0.045);
  assert.equal(housings.length, 5);
  const timber = parts.find(p => p.wood && Math.abs(p.size[1] - 0.115 * 0.82) < 1e-8);
  assert.ok(timber);
  housings.forEach(h => {
    const face = parts.find(p => p.position[0] === h.position[0] && p.size[2] === 0.014);
    assert.ok(face);
    assert.ok(h.position[2] - h.size[2] / 2 < timber.position[2] + timber.size[2] / 2);
    assert.ok(face.position[2] - face.size[2] / 2 < h.position[2] + h.size[2] / 2);
    assert.ok(face.position[2] + face.size[2] / 2 > h.position[2] + h.size[2] / 2);
  });
});

test('continuous fascia stays behind the gauges and recessed vent openings', () => {
  const model = cabinDashboardModel();
  const fascia = model.find((p) => p.size[0] === 5.2 && p.size[1] === 0.38);
  assert.ok(fascia);
  assert.ok(fascia.position[2] + fascia.size[2] / 2 < -1.488);
  const ventBases = model.filter(
    (p) => p.size[0] === 0.28 && p.size[1] === 0.24,
  );
  assert.equal(ventBases.length, 2);
  for (const base of ventBases) {
    assert.ok(base.position[2] + base.size[2] / 2 < -1.4825);
  }
});

test('door handles sit near the landscape camera edges and ahead of the fascia', () => {
  const aspect = 16 / 9;
  const parts = cabinSurroundModel(aspect * 1.19);
  const handles = parts.filter(
    (p) => p.size[0] === 0.075 && p.size[1] === 0.035,
  );
  assert.equal(handles.length, 2);
  for (const handle of handles) {
    const nearZ = Math.abs(handle.position[2]) - handle.size[2] / 2;
    const farX = Math.abs(handle.position[0]) + handle.size[0] / 2;
    const edgePosition = farX / (nearZ * Math.tan((34 * Math.PI) / 180) * aspect);
    assert.ok(edgePosition < 1, 'the recessed handle remains inside the frame');
    assert.ok(edgePosition > 0.95, 'handles belong at the door edges, not beside the vents');
    assert.ok(handle.position[2] - handle.size[2] / 2 > -1.57);
  }
});

test('compact vents clear the pad and keep louvers inside the shallow frame', () => {
  const model = cabinDashboardModel();
  const openings = model.filter(
    (p) => p.size[0] === 0.13 && p.size[1] === 0.13,
  );
  assert.equal(openings.length, 2);
  const body = model.find((p) => p.size[0] === 5.2 && p.size[2] === 0.66);
  assert.ok(body);
  const bodyFront = body.position[2] + body.size[2] / 2;
  for (const opening of openings) {
    const front = opening.position[2] + opening.size[2] / 2;
    assert.ok(front > -1.5, 'opening clears the dashboard pad front');
    const backing = model.find(
      (p) =>
        p.size[0] === 0.28 &&
        p.size[1] === 0.24 &&
        p.position[0] === opening.position[0],
    );
    assert.ok(backing);
    const backingFront = backing.position[2] + backing.size[2] / 2;
    assert.ok(
      backingFront > bodyFront && backingFront < front,
      'timber stays ahead of the dashboard body and behind the vent opening',
    );
    const louvers = model.filter(
      (p) =>
        p.color === '#525543' &&
        Math.abs(p.position[0] - opening.position[0]) < 0.01,
    );
    assert.equal(louvers.length, 3);
    for (const louver of louvers) {
      const louverFront = louver.position[2] + louver.size[2] / 2;
      assert.ok(louverFront > front && louverFront < -1.4775);
    }
  }
});

test('compact gauge housing leaves its display in front of the backing', () => {
  const parts = cabinDashboardModel();
  const backing = parts.find((p) => p.color === '#353b2e');
  const hood = parts.find((p) => p.color === '#76745a');
  assert.ok(backing && hood);
  assert.ok(backing.position[2] + backing.size[2] / 2 < -1.488);
  assert.ok(backing.size[0] > 0.52, 'display fits within the housing');
  assert.ok(hood.size[0] > backing.size[0]);
  assert.equal(hood.size[2], 0.18);
  assert.equal(backing.size[2], 0.14);
  assert.ok(Math.abs(hood.position[2] + hood.size[2] / 2 + 1.375) < 1e-8);
  assert.ok(Math.abs(backing.position[2] + backing.size[2] / 2 + 1.5) < 1e-8);
});

test('door handle openings sit behind their raised surrounds', () => {
  const parts = cabinSurroundModel(2.1);
  const inserts = parts.filter(
    (p) => p.size[0] === 0.075 && p.size[1] === 0.035,
  );
  assert.equal(inserts.length, 2);
  for (const insert of inserts) {
    const rails = parts.filter(
      (p) =>
        p.color === '#9a8865' &&
        Math.abs(p.position[0] - insert.position[0]) < 0.06,
    );
    assert.equal(rails.length, 4);
    for (const rail of rails) {
      assert.ok(
        rail.position[2] + rail.size[2] / 2 >
          insert.position[2] + insert.size[2] / 2 + 0.03,
      );
    }
  }
});

test('varied pillar panels retain their envelope and consistent seams', () => {
  for (const frameX of [1.2, 2.1]) {
    const panels = cabinSurroundModel(frameX)
      .filter(
        (p) =>
          Math.abs(p.position[0] - frameX) < 0.08 && p.size[2] >= 0.196 && p.size[2] <= 0.22,
      )
      .sort((a, b) => a.position[1] - b.position[1]);
    assert.equal(panels.length, 15);
    assert.ok(new Set(panels.map(p => p.size[2])).size > 1);
    for (const panel of panels) {
      assert.ok(Math.abs(panel.position[2] - panel.size[2] / 2 + 2.06) < 1e-9);
      assert.ok(panel.position[2] + panel.size[2] / 2 <= -1.84 + 1e-9);
    }
    const rows = [...new Set(panels.map((p) => p.position[1]))].map((y) =>
      panels
        .filter((p) => p.position[1] === y)
        .sort((a, b) => a.position[0] - b.position[0]),
    );
    assert.equal(rows.length, 10);
    for (const row of rows) {
      const leftEdge = row[0].position[0] - row[0].size[0] / 2;
      assert.ok(Math.abs(leftEdge - (frameX - 0.0725)) < 1e-9);
      const right = row.at(-1);
      const rightEdge = right.position[0] + right.size[0] / 2;
      assert.ok(Math.abs(rightEdge - (frameX + 0.0725)) < 1e-9);
      if (row.length === 2) {
        const gap = row[1].position[0] - row[1].size[0] / 2
          - (row[0].position[0] + row[0].size[0] / 2);
        assert.ok(Math.abs(gap - 0.002) < 1e-9);
      }
    }
    assert.equal(new Set(panels.map((p) => p.size[1].toFixed(3))).size, 3);
    assert.ok(
      Math.abs(panels[0].position[1] - panels[0].size[1] / 2 + 0.395) < 1e-9,
    );
    const last = panels.at(-1);
    assert.ok(Math.abs(last.position[1] + last.size[1] / 2 - 1.12) < 1e-9);
    const rowPanels = rows.map((row) => row[0]);
    for (let i = 1; i < rowPanels.length; i++) {
      const gap =
        rowPanels[i].position[1] -
        rowPanels[i].size[1] / 2 -
        (rowPanels[i - 1].position[1] + rowPanels[i - 1].size[1] / 2);
      assert.ok(Math.abs(gap - 0.005) < 1e-9);
    }
  }
});

test('switch labels remain joined to shallow switch faces', () => {
  const model = cabinDashboardModel();
  const caps = model.filter(
    (p) => Math.abs(p.size[0] - 0.052 * 0.94) < 1e-9 && p.size[2] === 0.014,
  );
  assert.equal(caps.length, 5);
  const markings = model.filter(p => p.color === '#64624b');
  assert.equal(markings.length, 18);
  for (const mark of markings) {
    const cap = caps.find(c => Math.abs(c.position[0] - mark.position[0]) < c.size[0] / 2);
    assert.ok(cap);
    for (const axis of [0, 1]) {
      assert.ok(Math.abs(mark.position[axis] - cap.position[axis]) + mark.size[axis] / 2 <= cap.size[axis] / 2);
    }
  }
  for (const cap of caps) {
    const label = model.find(
      (p) => p.color === '#64624b' && p.position[0] === cap.position[0],
    );
    assert.ok(label);
    const face = cap.position[2] + cap.size[2] / 2;
    assert.ok(label.position[2] - label.size[2] / 2 <= face);
    assert.ok(label.position[2] + label.size[2] / 2 > face);
  }
});

test('windshield seal layers overlap and remain within their backing', () => {
  const parts = cabinDashboardModel();
  const seal = parts.find((p) => p.size[0] === 5.2 && p.size[2] === 0.14);
  const upstand = parts.find((p) => p.color === '#292f25');
  const crown = parts.find((p) => p.color === '#555340');
  assert.ok(seal && upstand && crown);
  for (const [lower, upper] of [[seal, upstand], [upstand, crown]]) {
    assert.ok(upper.position[1] - upper.size[1] / 2 < lower.position[1] + lower.size[1] / 2);
    assert.ok(upper.size[0] <= lower.size[0]);
    assert.ok(upper.position[2] - upper.size[2] / 2 >= lower.position[2] - lower.size[2] / 2 - 1e-9);
    assert.ok(upper.position[2] + upper.size[2] / 2 <= lower.position[2] + lower.size[2] / 2 + 1e-9);
  }
  assert.ok(crown.position[1] + crown.size[1] / 2 < -0.46, 'crown stays below the wiper mounts');
});
