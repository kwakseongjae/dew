export const POINT_COUNT = 16;

export type DewdropFace = "dots" | "sleepy" | "wink";
export type DewdropPlayfulness = "off" | "calm" | "playful";
export type DewdropMint = "pale" | "mid";

export type DewdropLook = {
  lookAtCursor: boolean;
  playfulness: DewdropPlayfulness;
  face: DewdropFace;
  mint: DewdropMint;
};

export const defaultDewdropLook = (): DewdropLook => ({
  lookAtCursor: true,
  playfulness: "playful",
  face: "dots",
  mint: "pale",
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
  return {
    lookAtCursor: partial.lookAtCursor !== false,
    playfulness,
    face,
    mint,
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

/** Soft squircle — one continuous drop, not a hard box. */
export const idleSdf = (x: number, y: number): number => {
  const circle = sdCircle(x, y, 0.72);
  const superellipse = Math.pow(Math.abs(x) / 0.74, 3.2) + Math.pow(Math.abs(y) / 0.74, 3.2) - 1;
  return smin(circle, superellipse, 0.12);
};

/** Bang = tall capsule + fused dot, smin so the neck is clay, not a boolean cut. */
export const bangSdf = (x: number, y: number): number => {
  const stem = sdCapsule(x, y, 0, -0.7, 0, 0.12, 0.2);
  const dot = sdCircle(x, y - 0.58, 0.2);
  return smin(stem, dot, 0.11);
};

export const sampleRadii = (sdf: (x: number, y: number) => number, points = POINT_COUNT): number[] => {
  const radii: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let lo = 0;
    let hi = 1.85;
    for (let step = 0; step < 16; step += 1) {
      const mid = (lo + hi) * 0.5;
      if (sdf(dx * mid, dy * mid) > 0) hi = mid;
      else lo = mid;
    }
    radii.push((lo + hi) * 0.5);
  }
  return radii;
};

export const IDLE_RADII = sampleRadii(idleSdf);
export const BANG_RADII = sampleRadii(bangSdf);

export const mixRadii = (from: number[], to: number[], t: number, clay: boolean): number[] => {
  const ease = smoothstep(t);
  const stretch = clay ? Math.sin(clamp(t, 0, 1) * Math.PI) : 0;
  const sx = 1 - 0.24 * stretch;
  const sy = 1 + 0.32 * stretch;
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
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
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
        top: "#eefcf4",
        mid: "#9ee6c0",
        deep: "#7ecfa8",
        eye: "#163044",
        mouth: "#6bb892",
        glint: "#d9f8e8",
      }
    : {
        top: "#f7fffb",
        mid: "#c9f5dc",
        deep: "#b6f0d0",
        eye: "#163044",
        mouth: "#8edeb8",
        glint: "#e7fff2",
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
  const scale = paint.bounce;
  ctx.save();
  ctx.translate(paint.cx, paint.cy);
  ctx.rotate(paint.rotate);
  ctx.scale(paint.squashX * scale, paint.squashY * scale);

  ctx.save();
  ctx.shadowColor = "rgba(12, 28, 48, 0.2)";
  ctx.shadowBlur = paint.pxPerUnit * 0.55;
  ctx.shadowOffsetY = paint.pxPerUnit * 0.18;
  const body = ctx.createLinearGradient(0, -paint.pxPerUnit, 0, paint.pxPerUnit);
  body.addColorStop(0, colors.top);
  body.addColorStop(0.48, colors.mid);
  body.addColorStop(1, colors.deep);
  ctx.fillStyle = body;
  ctx.fill(path);
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = Math.max(1, paint.pxPerUnit * 0.045);
  ctx.stroke(path);

  ctx.save();
  ctx.clip(path);
  const spec = ctx.createRadialGradient(
    -paint.pxPerUnit * 0.32,
    -paint.pxPerUnit * 0.4,
    paint.pxPerUnit * 0.04,
    -paint.pxPerUnit * 0.18,
    -paint.pxPerUnit * 0.28,
    paint.pxPerUnit * 0.72,
  );
  spec.addColorStop(0, "rgba(255, 255, 255, 0.62)");
  spec.addColorStop(0.35, "rgba(255, 255, 255, 0.16)");
  spec.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = spec;
  ctx.fillRect(-paint.pxPerUnit * 2, -paint.pxPerUnit * 2, paint.pxPerUnit * 4, paint.pxPerUnit * 4);

  ctx.beginPath();
  ctx.ellipse(-paint.pxPerUnit * 0.18, -paint.pxPerUnit * 0.42, paint.pxPerUnit * 0.42, paint.pxPerUnit * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fill();
  ctx.restore();

  const faceOpacity = clamp(1 - paint.morph * 1.35, 0, 1);
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
  const lookX = paint.lookX * u * 0.14;
  const lookY = paint.lookY * u * 0.12;
  const blink = 1 - paint.blink * 0.92;
  const eyeY = -u * 0.04 + lookY;
  const leftX = -u * 0.22 + lookX;
  const rightX = u * 0.22 + lookX;
  const rx = u * 0.09;
  const ry = paint.face === "sleepy" ? u * 0.035 : u * 0.115 * blink;
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
  ctx.moveTo(-u * 0.12 + lookX, u * 0.22 + lookY);
  ctx.quadraticCurveTo(lookX, u * 0.32 + lookY, u * 0.12 + lookX, u * 0.22 + lookY);
  ctx.strokeStyle = colors.mouth;
  ctx.lineWidth = Math.max(1.3, u * 0.045);
  ctx.lineCap = "round";
  ctx.stroke();
};
