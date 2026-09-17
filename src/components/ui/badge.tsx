import clsx from "clsx";
import { DEPARTMENT_LABELS, SUBSTAGE_LABELS, type Department, type Substage } from "@/lib/domain/enums";
import type { TatStatus } from "@/lib/tat";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "teal" | "amber" | "danger" | "success";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[color:var(--color-light-grey)] text-charcoal/70",
    primary: "bg-primary/10 text-primary",
    teal: "bg-teal/15 text-[#1c7d6c]",
    amber: "bg-amber/15 text-[#8a5a13]",
    danger: "bg-[color:var(--color-danger)]/12 text-[color:var(--color-danger)]",
    success: "bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DepartmentBadge({ department }: { department: string }) {
  return <Badge tone="primary">{DEPARTMENT_LABELS[department as Department] ?? department}</Badge>;
}

export function SubstageBadge({ substage }: { substage: string }) {
  const isQuery = substage.includes("QUERY");
  return (
    <Badge tone={isQuery ? "amber" : substage === "COMPLETED" ? "success" : "neutral"}>
      {SUBSTAGE_LABELS[substage as Substage] ?? substage}
    </Badge>
  );
}

export function TatBadge({ status }: { status: TatStatus }) {
  const map: Record<TatStatus, { tone: "neutral" | "success" | "amber" | "danger"; label: string }> = {
    NOT_CONFIGURED: { tone: "neutral", label: "TAT not configured" },
    OK: { tone: "success", label: "Within TAT" },
    WARNING: { tone: "amber", label: "TAT warning" },
    BREACHED: { tone: "danger", label: "TAT breached" },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function RequestTypeBadge({ type }: { type: string }) {
  return (
    <Badge tone={type === "CA" ? "primary" : "teal"} className="font-bold">
      {type}
    </Badge>
  );
}
