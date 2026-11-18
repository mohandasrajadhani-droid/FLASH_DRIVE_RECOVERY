import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, PlugZap, XCircle } from "lucide-react";
import type { BackendError } from "../lib/types";

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

export function Panel({
  title,
  icon,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("panel animate-in", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-text">
            {icon && <span className="text-accent">{icon}</span>}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger";
const TONES: Record<Tone, string> = {
  neutral: "bg-ink-700/60 text-muted border-line-strong",
  accent: "bg-accent/10 text-accent border-accent/30",
  ok: "bg-ok/10 text-ok border-ok/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  danger: "bg-danger/10 text-danger border-danger/30",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", TONES[tone])}>
      {children}
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-ink-950 hover:bg-sky-300 font-semibold",
  secondary: "bg-ink-750 text-text border border-line-strong hover:bg-ink-700",
  ghost: "text-muted hover:text-text hover:bg-ink-750",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "ok" | "warn" | "danger";
  title: ReactNode;
  children?: ReactNode;
}) {
  const map = {
    info: { cls: "border-accent/30 bg-accent/5", icon: <Info size={18} className="text-accent" /> },
    ok: { cls: "border-ok/30 bg-ok/5", icon: <CheckCircle2 size={18} className="text-ok" /> },
    warn: { cls: "border-warn/30 bg-warn/5", icon: <AlertTriangle size={18} className="text-warn" /> },
    danger: { cls: "border-danger/30 bg-danger/5", icon: <XCircle size={18} className="text-danger" /> },
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border p-4", map.cls)}>
      <div className="mt-0.5 shrink-0">{map.icon}</div>
      <div className="min-w-0">
        <div className="font-medium text-text">{title}</div>
        {children && <div className="mt-1 text-[13px] leading-relaxed text-muted">{children}</div>}
      </div>
    </div>
  );
}

/** Rendered when a backend call fails. Never substitutes sample data. */
export function BackendErrorNotice({ error }: { error: BackendError }) {
  if (error.kind === "unavailable") {
    return (
      <div role="status" className="flex gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4">
        <PlugZap size={18} className="mt-0.5 shrink-0 text-warn" />
        <div>
          <div className="font-medium text-text">Desktop backend not connected</div>
          <div className="mt-1 text-[13px] text-muted">
            This screen shows live data only. Run the app with <code className="font-mono text-text">npm run tauri dev</code>{" "}
            — no sample data is displayed in its place.
          </div>
        </div>
      </div>
    );
  }
  return <Notice tone="danger" title="Something went wrong">{error.message}</Notice>;
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode }) {
  return (
    <div className="panel animate-in flex items-start gap-4 p-5">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold text-text">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
