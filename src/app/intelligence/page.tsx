"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, TriangleAlert, ListChecks } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { AppShell } from "@/components/shell/app-shell";
import { CommandInput } from "@/components/ui/command-input";
import { SceneFrame } from "@/components/three/scene-frame";
import { CreditJourneyScene, type StationData } from "@/components/three/credit-journey-scene";
import { CreditJourneyFallback } from "@/components/three/credit-journey-fallback";
import { ProcessReplay } from "@/components/intelligence/process-replay";
import { QueryPatternMap } from "@/components/intelligence/query-pattern-map";
import { useApi } from "@/lib/client/use-api";
import { DEPARTMENTS, DEPARTMENT_LABELS, REQUEST_TYPES, type Department } from "@/lib/domain/enums";
import { RADAR_SERIES_COLORS_DARK } from "@/lib/client/chart-colors";

type IntelligenceData = {
  distribution: { department: Department; inQueue: number; avgAgeHours: number | null; trend: string }[];
  radar: { department: Department; queueGrowth: number; repeatQueryCycles: number; longInactivePeriods: number }[];
  repeatQuery: { id: string; croReference: string; customerName: string; requestType: string; _count: { reviewCycles: number; queries: number } }[];
  brief: { text: string }[];
  nextActions: { department: Department; title: string; detail: string; applicationIds: string[] }[];
  stationMarkers: Record<Department, { markers: StationData["markers"]; overflowCount: number }>;
  forecast: { available: false; reason: string };
};

function IntelligenceContent() {
  const router = useRouter();
  const [requestType, setRequestType] = useState("");
  const [department, setDepartment] = useState("");
  const [resetSignal, setResetSignal] = useState(0);

  const qs = new URLSearchParams();
  if (requestType) qs.set("requestType", requestType);
  if (department) qs.set("department", department);

  const { data, loading, error } = useApi<IntelligenceData>(`/api/analytics/intelligence?${qs.toString()}`, [requestType, department]);

  if (loading) return <div className="p-6 text-sm text-white/60">Loading Credit Intelligence…</div>;
  if (error) return <div className="p-6 text-sm text-[color:var(--color-danger)]">{error}</div>;
  if (!data) return null;

  const stations: StationData[] = DEPARTMENTS.map((d) => ({
    department: d,
    inQueue: data.distribution.find((x) => x.department === d)?.inQueue ?? 0,
    markers: data.stationMarkers[d]?.markers ?? [],
    overflowCount: data.stationMarkers[d]?.overflowCount ?? 0,
  }));

  const radarData = DEPARTMENTS.map((d) => {
    const r = data.radar.find((x) => x.department === d);
    return {
      department: DEPARTMENT_LABELS[d],
      "Queue growth": Math.round((r?.queueGrowth ?? 0) * 100),
      "Repeat query cycles": r?.repeatQueryCycles ?? 0,
      "Long inactive periods": r?.longInactivePeriods ?? 0,
    };
  });

  return (
    <div className="min-h-full bg-[color:var(--color-dark-surface)] p-6 text-white">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="dark-select">
          <option value="">CA + AT</option>
          {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t} only</option>)}
        </select>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="dark-select">
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <CommandInput placeholder="Show applications approaching configured TAT" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_300px]">
        <div className="rounded-[var(--radius-card)] bg-[color:var(--color-dark-surface-2)] p-4">
          <h2 className="mb-1 text-sm font-bold">Bottleneck Radar</h2>
          <p className="mb-2 text-[11px] text-white/50">Key operational drivers</p>
          <div className="h-56">
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="58%">
                <PolarGrid stroke="#4a3568" />
                <PolarAngleAxis dataKey="department" tick={{ fontSize: 8, fill: "#cabde0" }} />
                {Object.entries(RADAR_SERIES_COLORS_DARK).map(([key, color]) => (
                  <Radar key={key} dataKey={key} stroke={color} fill={color} fillOpacity={0.32} />
                ))}
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: "#2f1a49", border: "1px solid #4a3568", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#cabde0" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-white/35">Operational signal — not a performance conclusion.</p>
        </div>

        <div className="rounded-[var(--radius-card)] bg-[color:var(--color-dark-surface-2)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Application Flow &amp; Bottlenecks</h2>
          </div>
          <SceneFrame height={420} label="the Application Flow" fallback={<CreditJourneyFallback stations={stations} />}>
            <CreditJourneyScene
              stations={stations}
              onSelectStation={(d) => router.push(`/my-work?department=${d}`)}
              onSelectMarker={(id) => router.push(`/applications/${id}`)}
              resetSignal={resetSignal}
              tone="dark"
            />
          </SceneFrame>
          <button onClick={() => setResetSignal((v) => v + 1)} className="focus-ring mt-2 text-[11px] font-semibold text-white/60 hover:text-white">
            Reset view
          </button>
        </div>

        <div className="rounded-[var(--radius-card)] bg-[color:var(--color-dark-surface-2)] p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold"><TriangleAlert className="h-4 w-4 text-amber" /> Forecast</h2>
          <div className="rounded-lg bg-amber/10 p-3 text-xs text-amber">
            {data.forecast.reason}
          </div>
          <p className="mt-2 text-[10px] text-white/35">
            No confidence percentages are shown without a validated rule set or model, per this deployment&apos;s policy.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-[var(--radius-card)] bg-[color:var(--color-dark-surface-2)] p-4 lg:col-span-1">
          <h2 className="mb-2 text-sm font-bold">Process Replay</h2>
          <ProcessReplay applications={data.repeatQuery.map((r) => ({ id: r.id, croReference: r.croReference }))} />
        </div>
        <div className="rounded-[var(--radius-card)] bg-[color:var(--color-dark-surface-2)] p-4 lg:col-span-1">
          <h2 className="mb-2 text-sm font-bold">Query Pattern Map</h2>
          <QueryPatternMap
            nodes={data.repeatQuery.map((r) => ({ id: r.id, croReference: r.croReference, queries: r._count.queries }))}
            onSelect={(id) => router.push(`/applications/${id}`)}
          />
        </div>
        <div className="rounded-[var(--radius-card)] bg-[color:var(--color-dark-surface-2)] p-4 lg:col-span-1">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Sparkles className="h-4 w-4 text-teal" /> Executive Brief</h2>
          <ul className="space-y-1.5 text-xs text-white/70">
            {data.brief.map((l, i) => <li key={i}>• {l.text}</li>)}
          </ul>
        </div>
        <div className="rounded-[var(--radius-card)] bg-[color:var(--color-dark-surface-2)] p-4 lg:col-span-1">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold"><ListChecks className="h-4 w-4 text-primary" /> Next Best Actions</h2>
          <ul className="space-y-2 text-xs">
            {data.nextActions.map((a, i) => (
              <li key={i} className="rounded-lg bg-white/5 p-2">
                <div className="font-semibold text-white">{a.title}</div>
                <div className="text-white/60">{a.detail}</div>
              </li>
            ))}
            {data.nextActions.length === 0 && <li className="text-white/40">No outstanding rule-based actions.</li>}
          </ul>
        </div>
      </div>

      <style jsx global>{`
        .dark-select {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          color: white;
          padding: 0.4rem 0.9rem;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <AppShell title="Credit Intelligence">
      <IntelligenceContent />
    </AppShell>
  );
}
