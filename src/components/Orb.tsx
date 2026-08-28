import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Dewdrop } from "@/components/Dewdrop";
import {
  notePointer,
  readOrbPosition,
  setOrbPosition,
  startOrbDrag,
  togglePanel,
} from "@/lib/bridge";
import { lookFromSettings } from "@/lib/dewdrop";
import { readQueryFlags } from "@/lib/useDew";
import type { Settings, Snapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type OrbProps = {
  snapshot: Snapshot;
  settings: Settings;
  onOpen?: () => void;
  onFocusDone?: (id: string) => void;
};

export const Orb = ({ snapshot, settings, onOpen, onFocusDone }: OrbProps) => {
  const dragging = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const doneSessions = snapshot.groups
    .filter((group) => group.hasFinished)
    .sort((a, b) => (b.finishedAtMs ?? 0) - (a.finishedAtMs ?? 0));
  const doneGroup = doneSessions[0];
  const jobs = snapshot.activeJobs;
  const flags = readQueryFlags();
  const freeze = flags.shot;
  const settledBang = Boolean(doneGroup) || flags.doneExplicit;
  const freezeMorph = flags.morph ? 0.56 : freeze ? (settledBang ? 1 : 0) : null;
  const freezeLean =
    flags.lean || (freeze && flags.orbshot && !flags.morph && !settledBang) ? { x: 0.62, y: -0.28 } : null;
  const morphTarget = settledBang ? 1 : 0;

  const handleOpen = () => {
    if (onOpen) onOpen();
    else void togglePanel();
  };

  const handlePointerEnter = () => {
    void notePointer("orb", true);
    if (settings.openMode === "hover") {
      handleOpen();
    }
  };

  const handlePointerLeave = () => {
    void notePointer("orb", false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    dragging.current = false;
    start.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.buttons !== 1 || !start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (!dragging.current && Math.hypot(dx, dy) > 4) {
      dragging.current = true;
      void startOrbDrag();
    }
  };

  const handlePointerUp = () => {
    if (dragging.current) {
      void readOrbPosition().then((pos) => {
        if (pos) void setOrbPosition(pos.x, pos.y);
      });
    }
    start.current = null;
  };

  const handleClick = () => {
    if (dragging.current) return;
    if (doneGroup && onFocusDone) {
      onFocusDone(doneGroup.id);
      return;
    }
    if (settings.openMode === "click") handleOpen();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      aria-label={
        doneGroup
          ? "A Dew session finished. Activate to focus it."
          : `Dew, ${jobs} active sessions. Activate to open.`
      }
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        "relative grid size-[72px] place-items-center overflow-visible rounded-full bg-transparent outline-none",
        "focus-visible:ring-2 focus-visible:ring-mint",
      )}
    >
      <Dewdrop
        look={lookFromSettings(settings)}
        mood={jobs > 0 ? "live" : "idle"}
        size={68}
        morphTarget={morphTarget}
        freezeMorph={freezeMorph}
        freezeLean={freezeLean}
        freeze={freeze}
        lookAtDocument={!freeze}
      />
    </button>
  );
};
