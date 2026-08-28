import { DesktopPreview } from "@/components/DesktopPreview";
import { DewdropPlayground } from "@/components/DewdropPlayground";
import { Orb } from "@/components/Orb";
import { Panel } from "@/components/Panel";
import { isTauri } from "@/lib/bridge";
import { useDew } from "@/lib/useDew";

const TauriOrb = () => {
  const dew = useDew();
  return <Orb snapshot={dew.snapshot} settings={dew.settings} />;
};

const TauriPanel = () => {
  const dew = useDew();
  const handleToggleSample = (on: boolean) => {
    void dew.saveSettings({ ...dew.settings, sampleLayout: on });
  };
  return (
    <div className="grid h-screen w-screen place-items-center bg-transparent">
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
      />
    </div>
  );
};

const App = () => {
  const params = new URLSearchParams(window.location.search);
  const windowName = params.get("window");
  const shot = params.get("shot") === "1";

  if (windowName === "orb") return <TauriOrb />;
  if (windowName === "panel") return <TauriPanel />;

  if (!isTauri()) {
    document.body.classList.add("browser-preview");
  }

  if (params.get("play") === "1") return <DewdropPlayground />;

  return <DesktopPreview shot={shot} />;
};

export default App;
