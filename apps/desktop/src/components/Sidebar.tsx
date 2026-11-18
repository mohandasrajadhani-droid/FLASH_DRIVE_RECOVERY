import { NavLink } from "react-router-dom";
import { GROUP_LABELS, visibleModules, type AppModule } from "../lib/modules";
import { useSettings } from "./SettingsContext";
import { cx } from "./ui";

export function Sidebar() {
  const { mode } = useSettings();
  const modules = visibleModules(mode);
  const groups = Object.keys(GROUP_LABELS) as AppModule["group"][];

  return (
    <aside className="flex w-[244px] shrink-0 flex-col border-r border-line bg-ink-950/70">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <img src="/icon.svg" alt="" className="size-8" />
        <div className="leading-tight">
          <div className="font-display text-[14px] font-bold tracking-[0.08em] text-text">FLASHRECOVERY</div>
          <div className="text-[10px] font-semibold tracking-[0.3em] text-accent">AI</div>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => {
          const items = modules.filter((m) => m.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="mb-4">
              <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">{GROUP_LABELS[g]}</div>
              {items.map((m) => (
                <NavLink
                  key={m.id}
                  to={m.path}
                  end={m.path === "/"}
                  className={({ isActive }) =>
                    cx(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                      isActive ? "bg-accent/10 text-text" : "text-muted hover:bg-ink-800 hover:text-text",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-accent" />}
                      <m.icon size={16} className={isActive ? "text-accent" : "text-faint group-hover:text-muted"} />
                      <span className="flex-1 truncate">{m.label}</span>
                      {m.status === "planned" && (
                        <span title={`Planned for Stage ${m.stage}`} className="text-[10px] text-faint">
                          S{m.stage}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-faint">
        No device access in this build. From Stage 2: read-only source access, and recovered files are never written to the source device.
      </div>
    </aside>
  );
}
