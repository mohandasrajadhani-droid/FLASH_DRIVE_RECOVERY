import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ShieldCheck, Usb, UserRound } from "lucide-react";
import { MODULES } from "../lib/modules";
import { errorMessage } from "../lib/api";
import type { UiMode } from "../lib/types";
import { useSettings } from "./SettingsContext";
import { cx } from "./ui";

export function Header() {
  const { pathname } = useLocation();
  const { mode, setSetting, operatorName, backend } = useSettings();
  const [err, setErr] = useState<string | null>(null);
  const current = MODULES.find((m) => m.path === pathname);

  const changeMode = async (m: UiMode) => {
    if (m === mode) return;
    setErr(null);
    try {
      await setSetting("ui.mode", m);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-line bg-ink-900/80 px-7 backdrop-blur">
      <div className="min-w-0 text-[13px] text-muted">
        <span className="text-faint">FLASHRECOVERY AI</span>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-text">{current?.label ?? "Not found"}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Device indicator: honest placeholder until Stage 2 detection exists. */}
        <div
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-[12px] text-faint"
          title="USB device detection is delivered in Stage 2"
        >
          <Usb size={14} />
          Device detection: Stage 2
        </div>

        <div
          className={cx(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px]",
            backend ? "border-ok/30 text-ok" : "border-warn/30 text-warn",
          )}
          title={backend ? "Connected to the local backend" : "Running without the desktop backend"}
        >
          <ShieldCheck size={14} />
          {backend ? "Local backend" : "No backend"}
        </div>

        <div role="radiogroup" aria-label="Interface mode" className="flex rounded-lg border border-line bg-ink-950/60 p-0.5">
          {(["easy", "professional"] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              disabled={!backend}
              onClick={() => changeMode(m)}
              className={cx(
                "rounded-md px-3 py-1 text-[12px] font-medium capitalize transition-colors disabled:cursor-not-allowed",
                mode === m ? "bg-accent text-ink-950" : "text-muted hover:text-text",
              )}
            >
              {m === "easy" ? "Easy" : "Professional"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[12px] text-muted" title="Operator recorded in the audit trail">
          <UserRound size={15} className="text-faint" />
          {operatorName}
        </div>
      </div>
      {err && (
        <div role="alert" className="absolute top-16 right-7 z-10 rounded-lg border border-danger/30 bg-ink-850 px-3 py-2 text-[12px] text-danger">
          {err}
        </div>
      )}
    </header>
  );
}
