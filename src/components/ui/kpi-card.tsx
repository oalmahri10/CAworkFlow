import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

const GRADIENTS: Record<string, string> = {
  primary: "linear-gradient(135deg, #6a3fa8 0%, #4a2170 100%)",
  teal: "linear-gradient(135deg, #5fd4c0 0%, #2f9c8a 100%)",
  amber: "linear-gradient(135deg, #f4b866 0%, #d98a2c 100%)",
  success: "linear-gradient(135deg, #4fc79a 0%, #2a9270 100%)",
  neutral: "linear-gradient(135deg, #8a7ba8 0%, #5f527d 100%)",
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "primary" | "teal" | "amber" | "success" | "neutral";
  hint?: string;
}) {
  return (
    <div className="card-elevation group relative overflow-hidden rounded-[var(--radius-card)] bg-white px-4 py-4 transition hover:-translate-y-0.5">
      <div
        className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-[0.07] transition group-hover:scale-125"
        style={{ background: GRADIENTS[tone] }}
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: GRADIENTS[tone] }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </div>
        <div className="min-w-0">
          <div className={clsx("truncate text-[11px] font-semibold uppercase tracking-wide text-charcoal/45")}>{label}</div>
          <div className="text-2xl font-extrabold leading-tight tracking-tight text-charcoal">{value}</div>
        </div>
      </div>
      {hint && <div className="relative mt-1.5 truncate text-[10px] text-charcoal/40">{hint}</div>}
    </div>
  );
}
