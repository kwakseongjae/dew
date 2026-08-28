import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { hideOrb } from "@/lib/bridge";
import type { Settings } from "@/lib/types";

type SettingsPaneProps = {
  settings: Settings;
  sampleOn: boolean;
  inTauri: boolean;
  onClose: () => void;
  onSave: (next: Settings) => Promise<void>;
  onToggleSample: (on: boolean) => void;
  onOpenTools: () => void;
};

const SHORTCUTS = [
  "CommandOrControl+Shift+D",
  "CommandOrControl+Shift+A",
  "CommandOrControl+Alt+D",
  "CommandOrControl+Shift+Space",
];

export const SettingsPane = ({
  settings,
  sampleOn,
  inTauri,
  onClose,
  onSave,
  onToggleSample,
  onOpenTools,
}: SettingsPaneProps) => {
  const handleMode = (openMode: "click" | "hover") => {
    void onSave({ ...settings, openMode });
  };

  const handleShortcut = (shortcut: string) => {
    void onSave({ ...settings, shortcut });
  };

  const handleAutostart = (autostart: boolean) => {
    void onSave({ ...settings, autostart });
  };

  const handleHideOrb = () => {
    void hideOrb();
  };

  return (
    <div className="flex h-full flex-col text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">Settings</p>
          <p className="text-xs text-white/65">Hover vs click, shortcut, dewdrop, and tools.</p>
        </div>
        <Button variant="glass" onClick={onClose} aria-label="Close settings">
          Back
        </Button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-white/55">Open the glass card</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant={settings.openMode === "click" ? "mint" : "glass"}
              onClick={() => handleMode("click")}
              aria-pressed={settings.openMode === "click"}
            >
              Click
            </Button>
            <Button
              variant={settings.openMode === "hover" ? "mint" : "glass"}
              onClick={() => handleMode("hover")}
              aria-pressed={settings.openMode === "hover"}
            >
              Hover
            </Button>
          </div>
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-white/55">Global shortcut</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SHORTCUTS.map((shortcut) => (
              <Button
                key={shortcut}
                variant={settings.shortcut === shortcut ? "mint" : "glass"}
                onClick={() => handleShortcut(shortcut)}
                aria-pressed={settings.shortcut === shortcut}
              >
                {shortcut.replace("CommandOrControl", "⌘/Ctrl")}
              </Button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">Start at login</p>
              <p className="text-xs text-white/55">Keep Dew always-on.</p>
            </div>
            <Switch
              checked={settings.autostart}
              onCheckedChange={handleAutostart}
              aria-label="Start Dew at login"
            />
          </div>
          {inTauri ? (
            <Button className="mt-3" variant="glass" onClick={handleHideOrb}>
              Hide dewdrop
            </Button>
          ) : null}
        </section>
        <section className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">Sample layout</p>
              <p className="text-xs text-white/55">Clearly labeled preview data, not live jobs.</p>
            </div>
            <Switch
              checked={sampleOn}
              onCheckedChange={onToggleSample}
              aria-label="Show sample layout"
            />
          </div>
          <Button className="mt-3" variant="mint" onClick={onOpenTools} aria-label="Choose followed tools">
            Choose followed tools
          </Button>
        </section>
      </div>
    </div>
  );
};
