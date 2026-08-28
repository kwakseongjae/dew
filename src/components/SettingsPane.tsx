import { Dewdrop } from "@/components/Dewdrop";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { hideOrb } from "@/lib/bridge";
import {
  DEWDROP_CHARACTERS,
  lookFromSettings,
  type DewdropCharacter,
  type DewdropFace,
  type DewdropMint,
  type DewdropPlayfulness,
} from "@/lib/dewdrop";
import type { Settings } from "@/lib/types";
import { readQueryFlags } from "@/lib/useDew";

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

const PLAYFULNESS: { id: DewdropPlayfulness; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "calm", label: "Calm" },
  { id: "playful", label: "Playful" },
];

const FACES: { id: DewdropFace; label: string }[] = [
  { id: "dots", label: "Dots" },
  { id: "sleepy", label: "Sleepy" },
  { id: "wink", label: "Wink" },
];

const MINTS: { id: DewdropMint; label: string }[] = [
  { id: "pale", label: "Pale" },
  { id: "mid", label: "Mid" },
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

  const handleLookAtCursor = (lookAtCursor: boolean) => {
    void onSave({ ...settings, lookAtCursor });
  };

  const handlePlayfulness = (playfulness: DewdropPlayfulness) => {
    void onSave({ ...settings, playfulness });
  };

  const handleFace = (face: DewdropFace) => {
    void onSave({ ...settings, face });
  };

  const handleMint = (mint: DewdropMint) => {
    void onSave({ ...settings, mint });
  };

  const handleCharacter = (character: DewdropCharacter) => {
    void onSave({ ...settings, character });
  };

  const handleHideOrb = () => {
    void hideOrb();
  };

  const freezePreviews = readQueryFlags().shot;

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">Settings</p>
          <p className="text-xs text-white/65">Hover vs click, shortcut, dewdrop, and tools.</p>
        </div>
        <Button variant="glass" onClick={onClose} aria-label="Close settings">
          Back
        </Button>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-white/55">Dewdrop</p>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-white/45">Character</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {DEWDROP_CHARACTERS.map((option) => {
              const selected = settings.character === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={`${option.label} character`}
                  aria-pressed={selected}
                  tabIndex={0}
                  onClick={() => handleCharacter(option.id)}
                  className={
                    selected
                      ? "flex flex-col items-center gap-1 rounded-2xl border border-white/55 bg-white/15 px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-mint"
                      : "flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/5 px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-mint"
                  }
                >
                  <Dewdrop
                    look={{ ...lookFromSettings(settings), character: option.id, playfulness: "calm" }}
                    size={48}
                    lookAtDocument={false}
                    freeze={freezePreviews}
                  />
                  <span className="text-[11px] text-white/80">{option.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">Look at cursor</p>
              <p className="text-xs text-white/55">Eyes and lean follow the pointer.</p>
            </div>
            <Switch
              checked={settings.lookAtCursor}
              onCheckedChange={handleLookAtCursor}
              aria-label="Look at cursor"
            />
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-white/45">Playfulness</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PLAYFULNESS.map((option) => (
              <Button
                key={option.id}
                variant={settings.playfulness === option.id ? "mint" : "glass"}
                onClick={() => handlePlayfulness(option.id)}
                aria-pressed={settings.playfulness === option.id}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/45">Face</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {FACES.map((option) => (
                  <Button
                    key={option.id}
                    variant={settings.face === option.id ? "mint" : "glass"}
                    onClick={() => handleFace(option.id)}
                    aria-pressed={settings.face === option.id}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/45">Mint</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {MINTS.map((option) => (
                  <Button
                    key={option.id}
                    variant={settings.mint === option.id ? "mint" : "glass"}
                    onClick={() => handleMint(option.id)}
                    aria-pressed={settings.mint === option.id}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
    </div>
  );
};
