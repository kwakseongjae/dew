export const POINT_COUNT = 32;
export const ORB_PX = 64;

export type DewdropFace = "dots" | "sleepy" | "wink";
export type DewdropPlayfulness = "off" | "calm" | "playful";
export type DewdropMint = "pale" | "mid";
export type DewdropCharacter = "drop" | "plump" | "tall";

export const DEWDROP_CHARACTERS: { id: DewdropCharacter; label: string }[] = [
  { id: "drop", label: "Drop" },
  { id: "plump", label: "Plump" },
  { id: "tall", label: "Tall" },
];

export type DewdropLook = {
  lookAtCursor: boolean;
  playfulness: DewdropPlayfulness;
  face: DewdropFace;
  mint: DewdropMint;
  character: DewdropCharacter;
};

export const defaultDewdropLook = (): DewdropLook => ({
  lookAtCursor: true,
  playfulness: "playful",
  face: "dots",
  mint: "pale",
  character: "drop",
});

export const lookFromSettings = (settings?: Partial<DewdropLook>): DewdropLook =>
  normalizeDewdropLook(settings);

export const normalizeDewdropLook = (partial: Partial<DewdropLook> | undefined): DewdropLook => {
  const base = defaultDewdropLook();
  if (!partial) return base;
  const playfulness: DewdropPlayfulness =
    partial.playfulness === "off" || partial.playfulness === "calm" || partial.playfulness === "playful"
      ? partial.playfulness
      : base.playfulness;
  const face: DewdropFace =
    partial.face === "dots" || partial.face === "sleepy" || partial.face === "wink" ? partial.face : base.face;
  const mint: DewdropMint = partial.mint === "mid" ? "mid" : "pale";
  const character: DewdropCharacter =
    partial.character === "plump" || partial.character === "tall" ? partial.character : "drop";
  return {
    lookAtCursor: partial.lookAtCursor !== false,
    playfulness,
    face,
    mint,
    character,
  };
};

export type Vec2 = { x: number; y: number };

export type Spring = { pos: number; vel: number };

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Polynomial smooth-min (Inigo Quilez). */
export const smin = (a: number, b: number, k: number): number => {
  if (k <= 0) return Math.min(a, b);
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
};

export const sdCircle = (x: number, y: number, radius: number): number => Math.hypot(x, y) - radius;

export const sdCapsule = (
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius: number,
): number => {
  const pax = x - ax;
  const pay = y - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay || 1;
  const h = clamp((pax * bax + pay * bay) / denom, 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h) - radius;
};

/** Clay pebble: slightly irregular, settled wider at the bottom. */
export const idleSdf = (x: number, y: number, character: DewdropCharacter = "drop"): number => {
  const angle = Math.atan2(y, x);
  if (character === "plump") {
    const radius = 0.7 + 0.016 * Math.sin(angle * 3 + 0.2) + 0.01 * Math.cos(angle * 5);
    return Math.hypot(x * 0.94, y * 1.14) - radius;
  }
  if (character === "tall") {
    const radius = 0.58 + 0.028 * Math.sin(angle * 3) + 0.09 * Math.sin(angle);
    return Math.hypot(x * 1.14, y * 0.86 + 0.08) - radius;
  }
  const radius =
    0.62 + 0.04 * Math.sin(angle * 3 + 0.5) + 0.02 * Math.cos(angle * 5) + 0.055 * Math.sin(angle);
  return Math.hypot(x * 0.97, y * 1.08) - radius;
};

/**
 * Bang origin sits in the fused neck so polar rays stay star-convex:
 * long up a thin stem, short through the pinch, rounder fused dot below.
 * Tuned to read as ! at 64px — not a peanut or hourglass.
 */
export const bangSdf = (x: number, y: number): number => {
  const stem = sdCapsule(x, y, 0, -0.14, 0, -0.86, 0.13);
  const dot = sdCircle(x, y - 0.32, 0.24);
  return smin(stem, dot, 0.22);
};

export const sampleRadii = (sdf: (x: number, y: number) => number, points = POINT_COUNT): number[] => {
  const radii: number[] = [];
  const step = 0.018;
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let lastInside = 0;
    let sawInside = sdf(0, 0) <= 0;
    for (let t = 0; t <= 1.9; t += step) {
      if (sdf(dx * t, dy * t) <= 0) {
        lastInside = t;
        sawInside = true;
      }
    }
    if (!sawInside) {
      radii.push(0.04);
      continue;
    }
    let lo = lastInside;
    let hi = Math.min(1.9, lastInside + step);
    for (let iter = 0; iter < 12; iter += 1) {
      const mid = (lo + hi) * 0.5;
      if (sdf(dx * mid, dy * mid) <= 0) lo = mid;
      else hi = mid;
    }
    radii.push((lo + hi) * 0.5);
  }
  return radii;
};

export const IDLE_RADII: Record<DewdropCharacter, number[]> = {
  drop: sampleRadii((x, y) => idleSdf(x, y, "drop")),
  plump: sampleRadii((x, y) => idleSdf(x, y, "plump")),
  tall: sampleRadii((x, y) => idleSdf(x, y, "tall")),
};
export const BANG_RADII = sampleRadii(bangSdf);

export const mixRadii = (from: number[], to: number[], t: number, clay: boolean): number[] => {
  const ease = smoothstep(t);
  const stretch = clay ? Math.sin(clamp(t, 0, 1) * Math.PI) : 0;
  const sx = 1 - 0.16 * stretch;
  const sy = 1 + 0.22 * stretch;
  return from.map((radius, i) => {
    const mixed = lerp(radius, to[i] ?? radius, ease);
    const angle = (i / from.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * mixed * sx;
    const y = Math.sin(angle) * mixed * sy;
    return Math.hypot(x, y);
  });
};

export const stepSpring = (
  spring: Spring,
  target: number,
  dtMs: number,
  response = 0.2,
  damping = 0.6,
): Spring => {
  const frames = clamp(dtMs / (1000 / 60), 0.2, 2.5);
  const vel = (spring.vel + (target - spring.pos) * response * frames) * damping ** frames;
  return { pos: spring.pos + vel, vel };
};

export const radiiToPath = (radii: number[], cx: number, cy: number, pxPerUnit: number): Path2D => {
  const n = radii.length;
  const points: Vec2[] = radii.map((radius, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius * pxPerUnit,
      y: cy + Math.sin(angle) * radius * pxPerUnit,
    };
  });
  const path = new Path2D();
  if (points.length === 0) return path;
  const at = (index: number): Vec2 => points[(index + n) % n]!;
  path.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 0; i < n; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 12;
    const c1y = p1.y + (p2.y - p0.y) / 12;
    const c2x = p2.x - (p3.x - p1.x) / 12;
    const c2y = p2.y - (p3.y - p1.y) / 12;
    path.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }
  path.closePath();
  return path;
};

type MintStops = {
  top: string;
  mid: string;
  deep: string;
  eye: string;
  mouth: string;
  glint: string;
};

export const mintStops = (mint: DewdropMint): MintStops =>
  mint === "mid"
    ? {
        top: "rgba(236, 252, 244, 0.78)",
        mid: "rgba(158, 230, 192, 0.52)",
        deep: "rgba(126, 207, 168, 0.48)",
        eye: "#163044",
        mouth: "#2c4a56",
        glint: "#d9f8e8",
      }
    : {
        top: "rgba(255, 255, 255, 0.72)",
        mid: "rgba(201, 245, 220, 0.46)",
        deep: "rgba(182, 240, 208, 0.4)",
        eye: "#163044",
        mouth: "#2c4a56",
        glint: "#f4fffb",
      };

export type DewdropPaint = {
  radii: number[];
  cx: number;
  cy: number;
  pxPerUnit: number;
  rotate: number;
  squashX: number;
  squashY: number;
  bounce: number;
  lookX: number;
  lookY: number;
  blink: number;
  morph: number;
  face: DewdropFace;
  mint: DewdropMint;
  live: boolean;
};

export const paintDewdrop = (ctx: CanvasRenderingContext2D, paint: DewdropPaint): void => {
  const colors = mintStops(paint.mint);
  const path = radiiToPath(paint.radii, 0, 0, paint.pxPerUnit);
  const u = paint.pxPerUnit;
  const scale = paint.bounce;
  ctx.save();
  ctx.translate(paint.cx, paint.cy);
  ctx.rotate(paint.rotate);
  ctx.scale(paint.squashX * scale, paint.squashY * scale);

  ctx.save();
  ctx.shadowColor = "rgba(12, 28, 48, 0.18)";
  ctx.shadowBlur = u * 0.42;
  ctx.shadowOffsetY = u * 0.16;
  const body = ctx.createRadialGradient(-u * 0.22, -u * 0.38, u * 0.06, 0, u * 0.12, u * 1.05);
  body.addColorStop(0, colors.top);
  body.addColorStop(0.42, colors.mid);
  body.addColorStop(1, colors.deep);
  ctx.fillStyle = body;
  ctx.fill(path);
  ctx.restore();

  ctx.save();
  ctx.clip(path);
  const frost = ctx.createLinearGradient(0, -u, 0, u);
  frost.addColorStop(0, "rgba(255, 255, 255, 0.38)");
  frost.addColorStop(0.45, "rgba(255, 255, 255, 0.06)");
  frost.addColorStop(1, "rgba(140, 190, 175, 0.16)");
  ctx.fillStyle = frost;
  ctx.fillRect(-u * 2, -u * 2, u * 4, u * 4);

  const spec = ctx.createRadialGradient(-u * 0.34, -u * 0.42, u * 0.02, -u * 0.16, -u * 0.26, u * 0.7);
  spec.addColorStop(0, "rgba(255, 255, 255, 0.7)");
  spec.addColorStop(0.28, "rgba(255, 255, 255, 0.18)");
  spec.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = spec;
  ctx.fillRect(-u * 2, -u * 2, u * 4, u * 4);

  ctx.beginPath();
  ctx.ellipse(-u * 0.2, -u * 0.44, u * 0.38, u * 0.16, -0.55, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
  ctx.lineWidth = Math.max(1.05, u * (paint.morph > 0.55 ? 0.026 : 0.036));
  ctx.lineJoin = "round";
  ctx.stroke(path);

  const faceOpacity = clamp(1 - paint.morph * 1.85, 0, 1);
  if (faceOpacity > 0.04) {
    ctx.save();
    ctx.globalAlpha = faceOpacity;
    paintFace(ctx, paint, colors);
    ctx.restore();
  }

  ctx.restore();
};

const paintFace = (ctx: CanvasRenderingContext2D, paint: DewdropPaint, colors: MintStops): void => {
  const u = paint.pxPerUnit;
  const lookX = paint.lookX * u * 0.16;
  const lookY = paint.lookY * u * 0.14;
  const blink = 1 - paint.blink * 0.92;
  const eyeY = u * 0.08 + lookY;
  const leftX = -u * 0.2 + lookX;
  const rightX = u * 0.2 + lookX;
  const rx = u * 0.072;
  const ry = paint.face === "sleepy" ? u * 0.028 : u * 0.11 * blink;
  const live = paint.live;

  const drawEye = (x: number, closed: boolean): void => {
    if (closed || ry < u * 0.02) {
      ctx.beginPath();
      ctx.moveTo(x - rx, eyeY);
      ctx.quadraticCurveTo(x, eyeY + u * 0.03, x + rx, eyeY);
      ctx.strokeStyle = colors.eye;
      ctx.lineWidth = Math.max(1.2, u * 0.04);
      ctx.lineCap = "round";
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.ellipse(x, eyeY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.eye;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + rx * 0.28, eyeY - ry * 0.32, rx * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - rx * 0.22, eyeY + ry * 0.28, rx * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = live ? colors.glint : colors.mid;
    ctx.globalAlpha = live ? 0.95 : 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  if (paint.face === "wink") {
    drawEye(leftX, true);
    drawEye(rightX, false);
  } else {
    drawEye(leftX, false);
    drawEye(rightX, false);
  }

  ctx.beginPath();
  ctx.moveTo(-u * 0.1 + lookX, u * 0.28 + lookY);
  ctx.quadraticCurveTo(lookX, u * 0.38 + lookY, u * 0.1 + lookX, u * 0.28 + lookY);
  ctx.strokeStyle = colors.mouth;
  ctx.lineWidth = Math.max(1.3, u * 0.045);
  ctx.lineCap = "round";
  ctx.stroke();
};
