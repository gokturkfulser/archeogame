/* Geometry of the reflection system (src/engine/reflect.ts): the mirror law, mirror backs, targets, glints, turning limits.
   Pure maths, no browser. */
import { expect, test } from '@playwright/test';
import { easeMirrors, glintLevel, makeMirror, traceBeam, turnMirror, wrap } from '../src/engine/reflect';

const dir = (s: { x0: number; y0: number; x1: number; y1: number }) => Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
const origin = { x: 0, y: 0 };
const right = { x: 100, y: 0 };

test('a beam turns by the mirror law', () => {
  // the shiny side looks up-left, so a beam going right is sent straight up
  const m = makeMirror(400, 0, 60, (-3 * Math.PI) / 4);
  const t = traceBeam(origin, right, [m]);
  expect(t.segs).toHaveLength(2);
  expect(t.hits).toHaveLength(1);
  expect(t.segs[0].x1).toBeCloseTo(400, 3);
  expect(dir(t.segs[1])).toBeCloseTo(-Math.PI / 2, 3);
  expect(t.segs[1].power).toBeLessThan(1);
});

test('the back of a mirror does not reflect, and a miss passes by', () => {
  const back = makeMirror(400, 0, 60, 0); // shiny side looks away from the beam
  expect(traceBeam(origin, right, [back]).segs).toHaveLength(1);
  const off = makeMirror(400, 200, 60, Math.PI);
  expect(traceBeam(origin, right, [off]).hits).toHaveLength(0);
});

test('light reaches a target after a bounce, and not when the mirror is turned away', () => {
  const m = makeMirror(400, 0, 60, (-3 * Math.PI) / 4);
  const targets = [{ x: 400, y: -300, r: 25 }];
  expect(traceBeam(origin, right, [m], targets).target).toBe(0);
  turnMirror(m, 6); // 6 notches
  m.angle = m.want;
  expect(traceBeam(origin, right, [m], targets).target).toBe(-1);
});

test('a beam bounces at most three times', () => {
  const mirrors = [
    makeMirror(300, 0, 80, Math.PI),
    makeMirror(0, 0, 80, 0),
  ];
  const t = traceBeam({ x: 100, y: 0 }, { x: 200, y: 0 }, mirrors);
  expect(t.hits.length).toBeLessThanOrEqual(3);
  expect(t.segs.length).toBeLessThanOrEqual(4);
});

test('a glint flashes only at the right angle and close by', () => {
  const t = traceBeam(origin, right, []);
  const flake = { x: 200, y: 10, r: 8, angle: 0, tol: 0.35 };
  expect(glintLevel(flake, t)).toBeGreaterThan(0.6);
  expect(glintLevel({ ...flake, angle: 0.5 }, t)).toBe(0); // beam is 0.5 rad off, beyond the tolerance
  expect(glintLevel({ ...flake, y: 300 }, t)).toBe(0); // too far from the beam
  expect(glintLevel({ ...flake, angle: 0.15 }, t)).toBeLessThan(glintLevel(flake, t));
});

test('a glint can be lit by the bounced beam', () => {
  const m = makeMirror(400, 0, 60, (-3 * Math.PI) / 4);
  const t = traceBeam(origin, right, [m]);
  expect(glintLevel({ x: 400, y: -200, r: 8, angle: -Math.PI / 2, tol: 0.3 }, t)).toBeGreaterThan(0.4);
});

test('turning a mirror stays inside its range and eases in', () => {
  const m = makeMirror(0, 0, 50, 1, Math.PI / 6);
  turnMirror(m, 10);
  expect(wrap(m.want - m.home)).toBeCloseTo(Math.PI / 6, 5);
  turnMirror(m, -40);
  expect(wrap(m.want - m.home)).toBeCloseTo(-Math.PI / 6, 5);
  easeMirrors([m], 0.05);
  expect(m.angle).not.toBe(m.home);
  for (let i = 0; i < 60; i++) easeMirrors([m], 0.05);
  expect(wrap(m.angle - m.want)).toBeCloseTo(0, 3);
});
