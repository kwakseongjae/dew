import { useState } from "react";
import { Orb } from "@/components/Orb";
import { Panel } from "@/components/Panel";
import { focusAgent, getSnapshot } from "@/lib/bridge";
import { useDew } from "@/lib/useDew";

type DesktopPreviewProps = {
  shot?: boolean;
};

export const DesktopPreview = ({ shot = false }: DesktopPreviewProps) => {
  const dew = useDew();
  const [open, setOpen] = useState(!dew.orbshot);

  const handleToggleSample = (on: boolean) => {
    dew.setBrowserSample(on);
    void dew.saveSettings({ ...dew.settings, sampleLayout: on });
  };

  const handleRescan = () => {
    void getSnapshot().then(() => undefined);
  };

  return (
    <div className="sky-backdrop relative min-h-screen overflow-hidden">
      {!shot ? (
        <header className="absolute left-6 top-6 text-white/90">
          <p className="text-sm font-medium">Dew desktop preview</p>
          <p className="text-xs text-white/70">
            Browser stand-in for the always-on glass companion. Live process scan needs `pnpm tauri
            dev`.
          </p>
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
            onSaveSettings={dew.saveSettings}
            onToggleSample={handleToggleSample}
            onConnect={dew.connect}
            onToggleFollowed={dew.toggleFollowed}
            onRescan={handleRescan}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>
      <div className="absolute bottom-8 right-8">
        <Orb
          snapshot={dew.snapshot}
          settings={dew.settings}
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
