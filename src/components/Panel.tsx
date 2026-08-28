import { Settings as SettingsIcon, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { AgentRow } from "@/components/AgentRow";
import { ConnectPane } from "@/components/ConnectPane";
import { SettingsPane } from "@/components/SettingsPane";
import { ToolPicker } from "@/components/ToolPicker";
import { UsageStrip } from "@/components/UsageStrip";
import { Button } from "@/components/ui/button";
import { focusAgent, hidePanel, notePointer } from "@/lib/bridge";
import type { Settings, Snapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type PanelProps = {
  snapshot: Snapshot;
  settings: Settings;
  sampleOn: boolean;
  inTauri: boolean;
  loading: boolean;
  error: string | null;
  connecting: boolean;
  showConnect: boolean;
  startInPicker?: boolean;
  onSaveSettings: (next: Settings) => Promise<void>;
  onToggleSample: (on: boolean) => void;
  onConnect: () => Promise<void>;
  onToggleFollowed: (id: string, followed: boolean) => Promise<void>;
  onRescan?: () => void;
  onClose?: () => void;
};

export const Panel = ({
  snapshot,
  settings,
  sampleOn,
  inTauri,
  loading,
  error,
  connecting,
  showConnect,
  startInPicker = false,
  onSaveSettings,
  onToggleSample,
  onConnect,
  onToggleFollowed,
  onRescan,
  onClose,
}: PanelProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(startInPicker);

  const handleFocus = (id: string) => {
    void focusAgent(id);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else void hidePanel();
  };

  const handlePeriodChange = (usagePeriod: "weekly" | "monthly") => {
    void onSaveSettings({ ...settings, usagePeriod });
  };

  const handlePointerEnter = () => {
    void notePointer("panel", true);
  };

  const handlePointerLeave = () => {
    void notePointer("panel", false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      if (settingsOpen) setSettingsOpen(false);
      else if (pickerOpen) setPickerOpen(false);
      else handleClose();
    }
  };

  const handleConnect = async () => {
    await onConnect();
    setPickerOpen(true);
  };

  const handleToggleFollowed = (id: string, followed: boolean) => {
    void onToggleFollowed(id, followed);
  };

  const handleOpenPicker = () => {
    setSettingsOpen(false);
    setPickerOpen(true);
  };

  const liveLabel =
    snapshot.liveAgentTools > 0
      ? `+${snapshot.liveAgentTools} agent${snapshot.liveAgentTools === 1 ? "" : "s"} live`
      : "no agents live";

  const overlay = settingsOpen ? "settings" : pickerOpen && !showConnect ? "picker" : "main";

  return (
    <section
      className="glass-card relative flex h-[308px] w-[848px] flex-col rounded-[28px] p-5 text-white"
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      aria-label="Dew agent panel"
    >
      {sampleOn ? (
        <p className="pointer-events-none absolute left-6 top-3 z-10 text-[10px] font-medium uppercase tracking-[0.16em] text-mint/90">
          Sample layout
        </p>
      ) : null}
      <div className="absolute right-3 top-3 z-10 flex gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open settings"
          className="size-8"
          onClick={() => {
            setPickerOpen(false);
            setSettingsOpen((open) => !open);
          }}
        >
          <SettingsIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Hide Dew" onClick={handleClose}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {showConnect && overlay === "main" ? (
        <div className="min-h-0 flex-1 pt-2">
          <ConnectPane
            scanning={connecting}
            error={error}
            inTauri={inTauri}
            onConnect={handleConnect}
          />
        </div>
      ) : overlay === "settings" ? (
        <div className="min-h-0 flex-1 pt-6">
          <SettingsPane
            settings={settings}
            sampleOn={sampleOn}
            inTauri={inTauri}
            onClose={() => setSettingsOpen(false)}
            onSave={onSaveSettings}
            onToggleSample={onToggleSample}
            onOpenTools={handleOpenPicker}
          />
        </div>
      ) : overlay === "picker" ? (
        <div className="min-h-0 flex-1 pt-6">
          <ToolPicker
            tools={snapshot.detectedTools}
            sampleOn={sampleOn}
            onToggle={handleToggleFollowed}
            onClose={() => setPickerOpen(false)}
            onRescan={onRescan}
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[168px_1fr_220px] gap-6">
          <div className="flex flex-col pt-1">
            <h1 className="text-[28px] font-semibold leading-none tracking-tight">Dew</h1>
            <p className="mt-1.5 text-[13px] font-medium text-mint">{liveLabel}</p>
            <div className="flex flex-1 flex-col justify-center">
              <p className="text-[76px] font-bold leading-none tracking-tight">
                {snapshot.activeJobs}
              </p>
              <p className="mt-1 text-[15px] font-light text-white/85">active sessions</p>
            </div>
            <Button
              variant="glass"
              size="md"
              className="mt-2 self-start"
              aria-label="Choose which tools Dew follows"
              onClick={handleOpenPicker}
            >
              Tools
            </Button>
          </div>
          <div className="min-h-0 overflow-y-auto pr-1">
            {loading && snapshot.groups.length === 0 ? (
              <p className="py-8 text-sm text-white/70">Scanning local processes…</p>
            ) : error ? (
              <p className="py-8 text-sm text-white/70">{error}</p>
            ) : snapshot.groups.length === 0 ? (
              <div className="py-6">
                <p className="text-sm text-white/80">No tracked sessions right now.</p>
                <p className="mt-1 text-xs text-white/55">
                  Dew lists each running job as its own row. Empty is honest — start an agent, or
                  adjust which tools to follow.
                </p>
                <Button
                  className="mt-3"
                  variant="glass"
                  onClick={handleOpenPicker}
                  aria-label="Open followed tools"
                >
                  Choose tools
                </Button>
              </div>
            ) : (
              snapshot.groups.map((group) => (
                <AgentRow key={group.id} group={group} onFocus={handleFocus} />
              ))
            )}
          </div>
          <div className="pt-7">
            <UsageStrip
              period={settings.usagePeriod}
              sources={snapshot.usage}
              sample={snapshot.sample}
              onPeriodChange={handlePeriodChange}
            />
          </div>
        </div>
      )}
      <p className={cn("sr-only")}>{snapshot.notes.join(" ")}</p>
    </section>
  );
};
