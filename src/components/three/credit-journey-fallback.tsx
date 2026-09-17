"use client";

import { useRouter } from "next/navigation";
import { DEPARTMENT_LABELS, SUBSTAGE_LABELS, type Substage } from "@/lib/domain/enums";
import type { StationData } from "@/components/three/credit-journey-scene";
import { RequestTypeBadge } from "@/components/ui/badge";

/** Functional 2D/table equivalent of the Credit Journey scene — same data, same actions. */
export function CreditJourneyFallback({ stations }: { stations: StationData[] }) {
  const router = useRouter();

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-black/5 bg-white p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {stations.map((s) => (
          <div key={s.department} className="rounded-lg border border-black/5 p-2.5">
            <button
              onClick={() => router.push(`/my-work?department=${s.department}`)}
              className="focus-ring w-full rounded-md bg-primary/5 px-2 py-1.5 text-left text-xs font-bold text-primary hover:bg-primary/10"
            >
              {DEPARTMENT_LABELS[s.department]}
              <div className="text-[10px] font-normal text-charcoal/60">
                {s.inQueue} in queue{s.overflowCount > 0 ? ` (+${s.overflowCount})` : ""}
              </div>
            </button>
            <ul className="mt-2 space-y-1">
              {s.markers.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => router.push(`/applications/${m.id}`)}
                    className="focus-ring flex w-full items-center justify-between gap-1 rounded px-1.5 py-1 text-left text-[11px] hover:bg-[color:var(--color-light-grey)]"
                  >
                    <span className="flex items-center gap-1 truncate">
                      <RequestTypeBadge type={m.requestType} />
                      <span className="truncate">{m.croReference}</span>
                    </span>
                    {m.hasOpenQuery && <span className="shrink-0 text-[color:var(--color-danger)]">●</span>}
                  </button>
                  <div className="pl-1.5 text-[10px] text-charcoal/45">
                    {SUBSTAGE_LABELS[m.substage as Substage] ?? m.substage}
                  </div>
                </li>
              ))}
              {s.markers.length === 0 && <li className="px-1.5 py-1 text-[11px] text-charcoal/40">Empty</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
