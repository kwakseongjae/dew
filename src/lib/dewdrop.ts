/**
 * Dewdrop math — IQ smin + polar silhouette + Catmull-Rom + CursorBuddy springs.
 * No WebGPU. The orb is 56–72px; bang must read as ! at that size.
 */

export const POINT_COUNT = 32;
export const ORB_PX = 64;

export type DewdropCharacter = "drop" | "plump" | "tall";

export const DEWDROP_CHARACTERS: {
  id: DewdropCharacter;
  label: string;
  hint: string;
}[] = [
  { id: "drop", label: "Drop", hint: "Clay pebble" },
  { id: "plump", label: "Plump", hint: "Rounder, shorter" },
  { id: "tall", label: "Tall", hint: "Teardrop" },
];

export type DewdropLook = {
  character: DewdropCharacter;
  face: "dots" | "sleepy" | "wink";
  playfulness: "calm" | "lively";
};

export type DewdropRadii = {
  /** Normalized half-width / half-height of the fitted silhouette. */
  rx: number;
  ry: number;
};

export type DewdropSprings = {
  leanX: { pos: number; vel: number };
  leanY: { pos: number; vel: number };
  squash: { pos: number; vel: number };
  morph: { pos: number; vel: number };
};

export const SPRING = {
  follow: { tension: 180, friction: 12 },
  squash: { tension: 220, friction: 14 },
  morph: { tension: 140, friction: 18 },
} as const;

export const createSprings = (): DewdropSprings => ({
  leanX: { pos: 0, vel: 0 },
  leanY: { pos: 0, vel: 0 },
  squash: { pos: 1, vel: 0 },
  morph: { pos: 0, vel: 0 },
});

/** CursorBuddy `stepSpring` — critically-damped-ish Euler. */
export const stepSpring = (
  current: { pos: number; vel: number },
  target: number,
  tension: number,
  friction: number,
  dt: number,
): { pos: number; vel: number } => {
  const force = -tension * (current.pos - target);
  const damping = -friction * current.vel;
  const accel = force + damping;
  const vel = current.vel + accel * dt;
  const pos = current.pos + vel * dt;
  return { pos, vel };
};

/** IQ polynomial smooth-min. k is blend radius in SDF units. */
export const smin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

const sdCircle = (px: number, py: number, r: number): number =>
  Math.hypot(px, py) - r;

const sdCapsule = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
): number => {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(
    0,
    Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)),
  );
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};

/** Idle clay pebble — slightly crude, wider at the bottom. */
const idleSdf = (x: number, y: number, character: DewdropCharacter): number => {
  const theta = Math.atan2(y, x);
  if (character === "plump") {
    const r =
      0.64 + 0.022 * Math.sin(3 * theta + 0.4) + 0.012 * Math.cos(5 * theta);
    return Math.hypot(x * 0.94, y * 1.14) - r;
  }
  if (character === "tall") {
    const r =
      0.58 +
      0.028 * Math.sin(3 * theta + 0.35) +
      0.012 * Math.cos(4 * theta) +
      0.09 * Math.sin(theta);
    return Math.hypot(x * 1.14, y * 0.86 + 0.08) - r;
  }
  const r =
    0.62 +
    0.04 * Math.sin(3 * theta + 0.5) +
    0.02 * Math.cos(5 * theta) +
    0.055 * Math.sin(theta);
  return Math.hypot(x * 0.97, y * 1.08) - r;
};

/**
 * Settled bang at 64px: tall thin stem + pinch + rounder fused dot.
 * Polar origin sits in the waist so the silhouette is star-convex.
 */
const bangSdf = (x: number, y: number): number => {
  const stem = sdCapsule(x, y, 0, -0.14, 0, -0.86, 0.13);
  const dot = sdCircle(x, y - 0.32, 0.24);
  return smin(stem, dot, 0.22);
};

export const dewdropSdf = (
  x: number,
  y: number,
  morph: number,
  character: DewdropCharacter = "drop",
): number => {
  const t = Math.max(0, Math.min(1, morph));
  if (t <= 0) return idleSdf(x, y, character);
  if (t >= 1) return bangSdf(x, y);
  return smin(idleSdf(x, y, character), bangSdf(x, y), 0.42) * (1 - t) +
    bangSdf(x, y) * t +
    idleSdf(x, y, character) * 0;
};

// Fix dewdropSdf mix — the last version accidentally added * 0. Use a proper lerp.
export const dewdropSdfLerp = (
  x: number,
  y: number,
  morph: number,
  character: DewdropCharacter = "drop",
): number => {
  const t = Math.max(0, Math.min(1, morph));
  if (t <= 0) return idleSdf(x, y, character);
  if (t >= 1) return bangSdf(x, y);
  const a = idleSdf(x, y, character);
  const b = bangSdf(x, y);
  return a * (1 - t) + b * t;
};
