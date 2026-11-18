import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, backendAvailable } from "../lib/api";
import type { Setting, UiMode } from "../lib/types";

interface SettingsValue {
  mode: UiMode;
  reduceMotion: boolean;
  operatorName: string;
  loaded: boolean;
  backend: boolean;
  setSetting: (key: string, value: string) => Promise<void>;
}

const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const backend = backendAvailable();

  useEffect(() => {
    if (!backend) {
      setLoaded(true);
      return;
    }
    api
      .settingsGetAll()
      .then((all: Setting[]) => setSettings(Object.fromEntries(all.map((s) => [s.key, s.value]))))
      .finally(() => setLoaded(true));
  }, [backend]);

  const setSetting = useCallback(async (key: string, value: string) => {
    const s = await api.settingsSet(key, value);
    setSettings((prev) => ({ ...prev, [s.key]: s.value }));
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      mode: settings["ui.mode"] === "professional" ? "professional" : "easy",
      reduceMotion: settings["ui.reduce_motion"] === "true",
      operatorName: settings["operator.name"] ?? "local-user",
      loaded,
      backend,
      setSetting,
    }),
    [settings, loaded, backend, setSetting],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", value.reduceMotion);
  }, [value.reduceMotion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used inside <SettingsProvider>");
  return v;
}
