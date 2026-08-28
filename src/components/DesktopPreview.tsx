import { useEffect, useRef, useState } from "react";
import { Orb } from "@/components/Orb";
import { Panel } from "@/components/Panel";
import { focusAgent, getSnapshot, isTauri } from "@/lib/bridge";
import { ORB_PX } from "@/lib/dewdrop";
import { useDew } from "@/lib/useDew";

type DesktopPreviewProps = {
  shot?: boolean;
  demo?: boolean;
};

const DEFAULT_INSET = 28;

export const OrbShot = () => {
  const dew = useDew();
  return (
    <div className="orb-shot-stage grid min-h-screen w-screen place-items-center">
      <Orb snapshot={dew.snapshot} settings={dew.settings} dragMode="none" />
    </div>
  );
};

export const DesktopPreview = ({ shot = false, demo = false }: DesktopPreviewProps) => {
  const dew = useDew();
  const stageRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(!dew.orbshot);
  const [orbPos, setOrbPos] = useState({ left: 0, top: 0 });
  const placed = useRef(false);

  const placeDefault = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    setOrbPos({
      left: Math.max(8, width - ORB_PX - DEFAULT_INSET),
      top: Math.max(8, height - ORB_PX - DEFAULT_INSET),
    });
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!placed.current) {
      placeDefault();
      placed.current = true;
    }
    const ro = new ResizeObserver(() => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      setOrbPos((pos) => ({
        left: Math.min(Math.max(8, pos.left), Math.max(8, width - ORB_PX - 8)),
        top: Math.min(Math.max(8, pos.top), Math.max(8, height - ORB_PX - 8)),
      }));
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const handleToggleSample = (on: boolean) => {
    dew.setBrowserSample(on);
    void dew.saveSettings({ ...dew.settings, sampleLayout: on });
  };

  const handleRescan = () => {
    void getSnapshot().then(() => undefined);
  };

  const handleStageDrag = (dx: number, dy: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    setOrbPos((pos) => ({
      left: Math.min(Math.max(8, pos.left + dx), Math.max(8, width - ORB_PX - 8)),
      top: Math.min(Math.max(8, pos.top + dy), Math.max(8, height - ORB_PX - 8)),
    }));
  };

  const showHint = demo && !shot && !open;

  return (
    <div ref={stageRef} className="sky-backdrop relative min-h-screen overflow-hidden">
      {showHint ? (
        <header className="pointer-events-none absolute left-6 top-6 text-white/80">
          <p className="text-sm font-medium">Dew</p>
          <p className="text-xs text-white/60">Small orb, bottom-right. Hover or click opens the glass card.</p>
        </header>
      ) : null}
      <div className="flex min-h-screen items-center justify-center p-8">
        {open ? (
          <Panel
            snapshot={dew.snapshot}
            settings={dew.settings}
            sampleOn={dew.sampleOn}
            inTauri={dew.inTauri}
            loading={dew.loading}
            error={dew.error}
            connecting={dew.connecting}
            showConnect={dew.showConnect}
            startInPicker={dew.startInPicker}
            startInSettings={dew.startInSettings}
            onSaveSettings={dew.saveSettings}
            onToggleSample={handleToggleSample}
            onConnect={dew.connect}
            onToggleFollowed={dew.toggleFollowed}
            onRescan={handleRescan}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>
      <div className="absolute z-20" style={{ left: orbPos.left, top: orbPos.top }}>
        <Orb
          snapshot={dew.snapshot}
          settings={dew.settings}
          dragMode={isTauri() ? "tauri" : "stage"}
          onStageDrag={handleStageDrag}
          onOpen={() => setOpen((value) => !value)}
          onFocusDone={(id) => {
            void focusAgent(id);
            setOpen(true);
          }}
        />
      </div>
    </div>
  );
};
