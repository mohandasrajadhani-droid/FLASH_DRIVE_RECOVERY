import { CircleDashed } from "lucide-react";
import type { AppModule } from "../lib/modules";
import { Badge, PageHeader, Panel } from "./ui";

/**
 * Shown for modules that are not yet implemented. Deliberately contains
 * no controls, no sample data and no fake progress — just what is planned.
 */
export function PlannedModule({ module: m }: { module: AppModule }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={m.label}
        subtitle={m.summary}
        actions={<Badge tone="neutral">Planned · Stage {m.stage}</Badge>}
      />
      <Panel title="Not available in this build" icon={<CircleDashed size={16} />}>
        <p className="text-[13px] leading-relaxed text-muted">
          This module has not been implemented yet. It is scheduled for <span className="text-text">Stage {m.stage}</span> of
          the development roadmap and will only be enabled after it has been built and tested.
        </p>
        {m.planned.length > 0 && (
          <>
            <div className="label mt-5">Planned scope</div>
            <ul className="space-y-2">
              {m.planned.map((p) => (
                <li key={p} className="flex gap-2.5 text-[13px] text-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent/60" />
                  {p}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
