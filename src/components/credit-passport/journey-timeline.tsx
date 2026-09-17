"use client";

import { Check, Settings2, Users2, Database, Cog } from "lucide-react";
import { DEPARTMENTS, DEPARTMENT_LABELS, type Department } from "@/lib/domain/enums";
import { formatDateTime } from "@/lib/client/format";

const ICONS = {
  CORPORATE_FINANCE: Settings2,
  CREDIT_REVIEW: Users2,
  APPROVAL_AUTHORITY: Users2,
  CAD: Database,
  OPERATIONS: Cog,
} as const;

export type StageIntervalLite = {
  department: string;
  startedAt: string;
  endedAt: string | null;
};

export function JourneyTimeline({
  intervals,
  currentDepartment,
  hasOpenQuery,
}: {
  intervals: StageIntervalLite[];
  currentDepartment: string;
  hasOpenQuery: boolean;
}) {
  const currentIndex = DEPARTMENTS.indexOf(currentDepartment as Department);
  const isCompleted = currentDepartment === "COMPLETED";

  return (
    <div className="flex items-start justify-between">
      {DEPARTMENTS.map((dept, i) => {
        const interval = intervals.find((s) => s.department === dept);
        const done = isCompleted || i < currentIndex;
        const isCurrent = !isCompleted && i === currentIndex;
        const Icon = ICONS[dept];

        return (
          <div key={dept} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              {i > 0 && <div className={`h-0.5 flex-1 ${done || isCurrent ? "bg-teal" : "bg-[color:var(--color-light-grey)]"}`} />}
              <div
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-teal bg-teal text-white"
                    : isCurrent
                      ? "border-primary bg-white text-primary"
                      : "border-[color:var(--color-light-grey)] bg-white text-charcoal/30"
                }`}
              >
                {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                {isCurrent && hasOpenQuery && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-danger)] text-[9px] font-bold text-white">
                    !
                  </span>
                )}
              </div>
              {i < DEPARTMENTS.length - 1 && <div className={`h-0.5 flex-1 ${done ? "bg-teal" : "bg-[color:var(--color-light-grey)]"}`} />}
            </div>
            <div className="mt-2 text-xs font-semibold text-charcoal">{DEPARTMENT_LABELS[dept]}</div>
            <div className="text-[10px] text-charcoal/45">
              {interval
                ? interval.endedAt
                  ? formatDateTime(interval.startedAt)
                  : isCurrent
                    ? "In Progress"
                    : formatDateTime(interval.startedAt)
                : "Not Started"}
            </div>
            {isCurrent && hasOpenQuery && (
              <div className="mt-1 rounded-full bg-[color:var(--color-danger)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-danger)]">
                Query / Clarification
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
