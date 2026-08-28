import {
  defaultSettings,
  emptySnapshot,
  type ConnectResult,
  type Settings,
  type Snapshot,
} from "./types";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
};

export const getSnapshot = async (): Promise<Snapshot> => {
  if (!isTauri()) return emptySnapshot();
  return invoke<Snapshot>("get_snapshot");
};

export const getSettings = async (): Promise<Settings> => {
  if (!isTauri()) {
    const raw = localStorage.getItem("dew-settings");
    if (!raw) return defaultSettings();
    try {
      return { ...defaultSettings(), ...(JSON.parse(raw) as Settings) };
    } catch {
      return defaultSettings();
    }
  }
  return invoke<Settings>("get_settings");
};

export const connectDetected = async (): Promise<ConnectResult> => {
  if (!isTauri()) {
    const current = await getSettings();
    const settings: Settings = { ...current, onboarded: true, sampleLayout: false };
    await saveSettings(settings);
    return {
      snapshot: {
        ...emptySnapshot(),
        notes: [
          "Browser preview cannot see local processes. Open the Dew app to scan this machine.",
        ],
      },
      settings,
    };
  }
  return invoke<ConnectResult>("connect_detected");
};

export const saveSettings = async (next: Settings): Promise<Settings> => {
  if (!isTauri()) {
    localStorage.setItem("dew-settings", JSON.stringify(next));
    return next;
  }
  return invoke<Settings>("save_settings", { next });
};

export const showPanel = async (): Promise<void> => {
  if (!isTauri()) return;
  await invoke("show_panel");
};

export const hidePanel = async (): Promise<void> => {
  if (!isTauri()) return;
  await invoke("hide_panel");
};

export const togglePanel = async (): Promise<void> => {
  if (!isTauri()) return;
  await invoke("toggle_panel");
};

export const focusAgent = async (id: string): Promise<void> => {
  if (!isTauri()) return;
  await invoke("focus_agent", { id });
};

export const dismissDone = async (id: string): Promise<void> => {
  if (!isTauri()) return;
  await invoke("dismiss_done", { id });
};

export const setOrbPosition = async (x: number, y: number): Promise<void> => {
  if (!isTauri()) return;
  await invoke("set_orb_position", { x, y });
};

export const notePointer = async (surface: "orb" | "panel", inside: boolean): Promise<void> => {
  if (!isTauri()) return;
  await invoke("note_pointer", { surface, inside });
};

export const hideOrb = async (): Promise<void> => {
  if (!isTauri()) return;
  await invoke("hide_orb");
};

export const listenSnapshot = async (
  onUpdate: (snapshot: Snapshot) => void,
): Promise<() => void> => {
  if (!isTauri()) return () => undefined;
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<Snapshot>("dew://snapshot", (event) => {
    onUpdate(event.payload);
  });
  return unlisten;
};

export const startOrbDrag = async (): Promise<void> => {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
};

export const readOrbPosition = async (): Promise<{ x: number; y: number } | null> => {
  if (!isTauri()) return null;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const pos = await getCurrentWindow().outerPosition();
  return { x: pos.x, y: pos.y };
};
