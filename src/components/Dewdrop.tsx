import { useEffect, useRef } from "react";
import {
  dewdropPose,
  fitPose,
  paintDewdrop,
  stepSpring,
  type DewdropLook,
  type DewdropPose,
  type Spring,
} from "@/lib/dewdrop";
import { cn } from "@/lib/utils";

type DewdropProps = {
  look: DewdropLook;
  mood?: "idle" | "live";
  className?: string;
  size?: number;
  morphTarget?: number;
  freezeMorph?: number | null;
  freezeLean?: { x: number; y: number } | null;
  freeze?: boolean;
  followPointer?: boolean;
  lookAtDocument?: boolean;
  spinNonce?: number;
};

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const paintPose = (
  ctx: CanvasRenderingContext2D,
  pose: DewdropPose,
  origin: { x: number; y: number },
  unit: number,
  extras: {
    twist: number;
    sx: number;
    sy: number;
    bounce: number;
    lookX: number;
    lookY: number;
    blink: number;
    morph: number;
    face: DewdropLook["face"];
    mint: DewdropLook["mint"];
    live: boolean;
  },
): void => {
  const split = pose.bodies.length > 1;
  pose.bodies.forEach((body, index) => {
    paintDewdrop(ctx, {
      radii: body.radii,
      cx: origin.x + body.x * unit,
      cy: origin.y + body.y * unit,
      pxPerUnit: unit,
      rotate: extras.twist,
      squashX: extras.sx,
      squashY: extras.sy,
      bounce: extras.bounce,
      lookX: extras.lookX,
      lookY: extras.lookY,
      blink: extras.blink,
      morph: extras.morph,
      face: extras.face,
      mint: extras.mint,
      live: extras.live,
      showFace: pose.showFace && !split && index === 0,
      castShadow: !split || index === 1,
    });
  });
};

export const Dewdrop = ({
  look,
  mood = "idle",
  className,
  size = 52,
  morphTarget = 0,
  freezeMorph = null,
  freezeLean = null,
  freeze = false,
  followPointer = false,
  lookAtDocument = false,
  spinNonce = 0,
}: DewdropProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef(look);
  const moodRef = useRef(mood);
  const morphTargetRef = useRef(morphTarget);
  const followRef = useRef(followPointer);
  const documentLookRef = useRef(lookAtDocument);
  const freezeRef = useRef(freeze);
  const sizeRef = useRef(size);
  lookRef.current = look;
  moodRef.current = mood;
  morphTargetRef.current = morphTarget;
  followRef.current = followPointer;
  documentLookRef.current = lookAtDocument;
  freezeRef.current = freeze;
  sizeRef.current = size;

  const pointer = useRef({ x: 0, y: 0, inside: false });
  const spinKick = useRef(0);

  useEffect(() => {
    spinKick.current += 1;
  }, [spinNonce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduced = prefersReducedMotion();
    const leanX: Spring = { pos: freezeLean?.x ?? 0, vel: 0 };
    const leanY: Spring = { pos: freezeLean?.y ?? 0, vel: 0 };
    const lookX: Spring = { pos: freezeLean?.x ?? 0, vel: 0 };
    const lookY: Spring = { pos: freezeLean?.y ?? 0, vel: 0 };
    const morph: Spring = { pos: freezeMorph ?? (freeze ? morphTargetRef.current : 0), vel: 0 };
    const bounce: Spring = { pos: 1, vel: 0 };
    const spin: Spring = {
      pos: freezeMorph != null ? 0.12 * Math.sin((freezeMorph ?? 0) * Math.PI) : 0,
      vel: 0,
    };
    const squash: Spring = { pos: 0, vel: 0 };
    const followX: Spring = { pos: 0, vel: 0 };
    const followY: Spring = { pos: 0, vel: 0 };
    const trailX: Spring = { pos: 0, vel: 0 };
    const trailY: Spring = { pos: 0, vel: 0 };
    let blink = 0;
    let nextBlink = 1800 + Math.random() * 2400;
    let nextRoll = 4200 + Math.random() * 3800;
    let elapsed = 0;
    let last = performance.now();
    let lastMorph = morph.pos;
    let raf = 0;

    const readPointer = (clientX: number, clientY: number, inside: boolean): void => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const span = Math.max(24, Math.min(rect.width, rect.height) * 0.5);
      pointer.current = {
        x: (clientX - cx) / span,
        y: (clientY - cy) / span,
        inside,
      };
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const target = wrap;
      const inside = event.target instanceof Node && target.contains(event.target);
      if (followRef.current || documentLookRef.current || inside) {
        readPointer(event.clientX, event.clientY, inside || followRef.current || documentLookRef.current);
      }
    };

    const handlePointerEnter = (event: PointerEvent): void => {
      readPointer(event.clientX, event.clientY, true);
      if (!reduced && lookRef.current.playfulness === "playful") spin.vel += 0.08;
    };

    const handlePointerLeave = (): void => {
      pointer.current.inside = false;
      if (!followRef.current && !documentLookRef.current) {
        pointer.current.x = 0;
        pointer.current.y = 0;
      }
      if (!reduced && lookRef.current.playfulness === "playful") spin.vel += 0.16;
    };

    wrap.addEventListener("pointerenter", handlePointerEnter);
    wrap.addEventListener("pointerleave", handlePointerLeave);
    wrap.addEventListener("pointermove", handlePointerMove);
    if (lookAtDocument || followPointer) {
      window.addEventListener("pointermove", handlePointerMove);
    }

    const tick = (now: number): void => {
      const dt = Math.min(48, now - last);
      last = now;
      elapsed += dt;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = w / dpr;
      const cssH = h / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lookNow = lookRef.current;
      const playful = lookNow.playfulness === "playful" && !reduced;
      const calm = lookNow.playfulness === "calm" && !reduced;
      const wobbleOn = playful || calm;
      const frozen = freezeRef.current;
      const px = pointer.current.x;
      const py = pointer.current.y;
      const hasPointer = pointer.current.inside || followRef.current || documentLookRef.current;

      if (spinKick.current > 0) {
        spin.vel += playful ? 0.28 : 0.12;
        spinKick.current = 0;
      }

      let leanTx = freezeLean?.x ?? 0;
      let leanTy = freezeLean?.y ?? 0;
      if (freezeLean == null && !frozen) {
        if (lookNow.lookAtCursor && hasPointer) {
          leanTx = Math.max(-1, Math.min(1, px)) * 0.55;
          leanTy = Math.max(-1, Math.min(1, py)) * 0.45;
        } else if (wobbleOn) {
          leanTx = Math.sin(elapsed / 1400) * (playful ? 0.18 : 0.08);
          leanTy = Math.cos(elapsed / 1800) * (playful ? 0.12 : 0.05);
        }
      }

      let lookTx = leanTx;
      let lookTy = leanTy;
      if (lookNow.lookAtCursor && hasPointer && freezeLean == null) {
        lookTx = Math.max(-1, Math.min(1, px));
        lookTy = Math.max(-1, Math.min(1, py));
      }

      const morphGoal = freezeMorph != null ? freezeMorph : morphTargetRef.current;
      if (!frozen) {
        Object.assign(leanX, stepSpring(leanX, leanTx, dt, 0.2, 0.62));
        Object.assign(leanY, stepSpring(leanY, leanTy, dt, 0.2, 0.62));
        Object.assign(lookX, stepSpring(lookX, lookTx, dt, 0.28, 0.58));
        Object.assign(lookY, stepSpring(lookY, lookTy, dt, 0.28, 0.58));
        Object.assign(morph, stepSpring(morph, morphGoal, dt, reduced ? 0.45 : 0.14, reduced ? 0.5 : 0.68));
        const speed = Math.hypot(leanX.vel, leanY.vel);
        Object.assign(squash, stepSpring(squash, Math.min(0.22, speed * 3.2), dt, 0.24, 0.55));
        if (playful) {
          Object.assign(spin, stepSpring(spin, 0, dt, 0.045, 0.86));
        } else {
          Object.assign(spin, stepSpring(spin, 0, dt, 0.12, 0.72));
        }
        if (morph.pos > 0.92 && lastMorph <= 0.92) bounce.vel = 0.085;
        Object.assign(bounce, stepSpring(bounce, 1, dt, 0.22, 0.58));
        lastMorph = morph.pos;
      } else {
        leanX.pos = leanTx;
        leanY.pos = leanTy;
        lookX.pos = lookTx;
        lookY.pos = lookTy;
        morph.pos = morphGoal;
        bounce.pos = 1;
        spin.pos = 0;
      }

      if (!frozen && !reduced && lookNow.playfulness !== "off") {
        nextBlink -= dt;
        if (nextBlink <= 0) {
          blink = 1;
          nextBlink = 2600 + Math.random() * 3200;
        }
        if (blink > 0) blink = Math.max(0, blink - dt / 90);
        if (playful) {
          nextRoll -= dt;
          if (nextRoll <= 0 && morph.pos < 0.2) {
            spin.vel += 0.11;
            nextRoll = 6400 + Math.random() * 5200;
          }
        }
      } else if (frozen) {
        blink = 0;
      }

      const clay = !reduced;
      const pose = dewdropPose(morph.pos, lookNow.character, clay);
      if (pose.bodies.length === 1 && morph.pos < 0.2 && wobbleOn && !frozen) {
        pose.bodies[0]!.radii = pose.bodies[0]!.radii.map((radius, i) => {
          const a = (i / pose.bodies[0]!.radii.length) * Math.PI * 2;
          return radius * (1 + 0.042 * Math.sin(elapsed / 520 + a * 3) + 0.022 * Math.cos(elapsed / 740 + a * 5));
        });
      }

      const fitted = fitPose(pose, cssW, cssH);
      const unit = fitted.pxPerUnit;
      const split = pose.bodies.length > 1;
      const leanTwist = split || morph.pos > 0.25 ? 0 : leanX.pos * 0.38;
      const morphTwist = reduced || split ? 0 : Math.sin(morph.pos * Math.PI) * 0.18;
      const twist = split ? 0 : morphTwist + spin.pos + leanTwist;
      const speedAngle = Math.atan2(leanY.vel + leanY.pos, leanX.vel + leanX.pos || 0.0001);
      const squashAmt = split ? 0 : frozen && freezeLean ? 0.055 : squash.pos;
      const sx =
        1 +
        Math.cos(speedAngle) * squashAmt -
        Math.sin(elapsed / 900) * (wobbleOn && morph.pos < 0.15 ? 0.018 : 0);
      const sy =
        1 -
        Math.cos(speedAngle) * squashAmt +
        Math.sin(elapsed / 900) * (wobbleOn && morph.pos < 0.15 ? 0.018 : 0);

      if (followRef.current && !frozen) {
        const tx = pointer.current.x * (cssW * 0.28);
        const ty = pointer.current.y * (cssH * 0.28);
        Object.assign(followX, stepSpring(followX, tx, dt, 0.2, 0.6));
        Object.assign(followY, stepSpring(followY, ty, dt, 0.2, 0.6));
        Object.assign(trailX, stepSpring(trailX, followX.pos, dt, 0.08, 0.72));
        Object.assign(trailY, stepSpring(trailY, followY.pos, dt, 0.08, 0.72));
      }

      const origin = {
        x:
          cssW / 2 -
          fitted.midX * unit +
          (followRef.current ? followX.pos : leanX.pos * Math.min(cssW, cssH) * 0.16),
        y:
          cssH / 2 -
          fitted.midY * unit +
          (followRef.current ? followY.pos : leanY.pos * Math.min(cssW, cssH) * 0.14),
      };

      const extras = {
        twist,
        sx,
        sy,
        bounce: bounce.pos,
        lookX: lookX.pos,
        lookY: lookY.pos,
        blink,
        morph: morph.pos,
        face: lookNow.face,
        mint: lookNow.mint,
        live: moodRef.current === "live",
      };

      if (followRef.current && lookNow.playfulness === "playful" && !reduced) {
        ctx.globalAlpha = 0.28;
        paintPose(
          ctx,
          pose,
          { x: cssW / 2 - fitted.midX * unit + trailX.pos, y: cssH / 2 - fitted.midY * unit + trailY.pos },
          unit * 0.78,
          extras,
        );
        ctx.globalAlpha = 1;
      }

      paintPose(ctx, pose, origin, unit, extras);

      if (frozen) return;
      raf = window.requestAnimationFrame(tick);
    };

    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = wrap.clientWidth || sizeRef.current;
      const height = wrap.clientHeight || sizeRef.current;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (freezeRef.current) {
        window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(tick);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointerenter", handlePointerEnter);
      wrap.removeEventListener("pointerleave", handlePointerLeave);
      wrap.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [followPointer, lookAtDocument, freeze, freezeMorph, freezeLean?.x, freezeLean?.y]);

  return (
    <div
      ref={wrapRef}
      className={cn("pointer-events-none relative", className)}
      style={followPointer ? undefined : { width: size, height: size }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};
