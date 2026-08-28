import { useCallback, useEffect, useMemo, useState } from "react";
import {
  connectDetected,
  getSettings,
  getSnapshot,
  isTauri,
  listenSnapshot,
  saveSettings as persistSettings,
} from "./bridge";
import { applyFollowed } from "./follow";
import { sampleSnapshot } from "./sample";
import { defaultSettings, emptySnapshot, type Settings, type Snapshot } from "./types";

export type QueryFlags = {
  sample: boolean;
  done: boolean;
  doneExplicit: boolean;
  first: boolean;
  picker: boolean;
  orbshot: boolean;
  play: boolean;
  morph: boolean;
  lean: boolean;
  settings: boolean;
  shot: boolean;
  demo: boolean;
};

export const readQueryFlags = (): QueryFlags => {
  const params = new URLSearchParams(window.location.search);
  return {
    sample: params.get("sample") === "1",
    done: params.get("done") !== "0",
    doneExplicit: params.get("done") === "1",
    first: params.get("first") === "1",
    picker: params.get("picker") === "1",
    orbshot: params.get("orbshot") === "1",
    play: params.get("play") === "1",
    morph: params.get("morph") === "1",
    lean: params.get("lean") === "1",
    settings: params.get("settings") === "1",
    shot: params.get("shot") === "1",
    demo: params.get("demo") === "1",
  };
};

export const useDew = () => {
  const flags = useMemo(readQueryFlags, []);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot());
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [browserSample, setBrowserSample] = useState(flags.sample);
  const [connecting, setConnecting] = useState(false);

  const sampleOn = settings.sampleLayout || browserSample;
  const showConnect = flags.first || (!settings.onboarded && !sampleOn && !flags.settings);
  const startInPicker = flags.picker;
  const startInSettings = flags.settings;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [nextSettings, nextSnapshot] = await Promise.all([getSettings(), getSnapshot()]);
        if (cancelled) return;
        setSettings({ ...defaultSettings(), ...nextSettings });
        setSnapshot(nextSnapshot);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not talk to Dew.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    let unlisten: (() => void) | undefined;
    void listenSnapshot((next) => setSnapshot(next)).then((fn) => {
      unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const saveSettings = useCallback(async (next: Settings) => {
    const saved = await persistSettings({ ...defaultSettings(), ...next });
    setSettings(saved);
    const nextSnapshot = await getSnapshot();
    setSnapshot(nextSnapshot);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    const started = Date.now();
    try {
      const result = await connectDetected();
      const wait = 700 - (Date.now() - started);
      if (wait > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, wait));
      }
      setSettings({ ...defaultSettings(), ...result.settings });
      setSnapshot(result.snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const toggleFollowed = useCallback(
    async (toolId: string, followed: boolean) => {
      const base =
        settings.followedTools.length > 0
          ? settings.followedTools
          : snapshot.detectedTools.filter((tool) => tool.followed).map((tool) => tool.id);
      const nextIds = followed
        ? Array.from(new Set([...base, toolId]))
        : base.filter((id) => id !== toolId);
      await saveSettings({ ...settings, onboarded: true, followedTools: nextIds });
    },
    [saveSettings, settings, snapshot.detectedTools],
  );

  const displaySnapshot = sampleOn
    ? settings.followedTools.length > 0
      ? applyFollowed(sampleSnapshot(flags.done), { ...settings, onboarded: true })
      : sampleSnapshot(flags.done)
    : snapshot;

  return {
    snapshot: displaySnapshot,
    liveSnapshot: snapshot,
    settings,
    saveSettings,
    connect,
    toggleFollowed,
    loading,
    error,
    connecting,
    sampleOn,
    showConnect,
    startInPicker,
    startInSettings,
    orbshot: flags.orbshot,
    play: flags.play,
    flags,
    setBrowserSample,
    inTauri: isTauri(),
  };
};
