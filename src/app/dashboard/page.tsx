"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  FileStack,
  Activity,
  Box,
  Triangle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { AppShell } from "@/components/shell/app-shell";
import { KpiCard } from "@/components/ui/kpi-card";
import { Panel } from "@/components/ui/panel";
import { CommandInput } from "@/components/ui/command-input";
import { SceneFrame } from "@/components/three/scene-frame";
import { CreditJourneyScene, type StationData } from "@/components/three/credit-journey-scene";
import { CreditJourneyFallback } from "@/components/three/credit-journey-fallback";
import { useApi } from "@/lib/client/use-api";
import { DEPARTMENTS, DEPARTMENT_LABELS, type Department } from "@/lib/domain/enums";
import { RADAR_SERIES_COLORS } from "@/lib/client/chart-colors";

type DashboardData = {
  lifecycle: { circulated: number; active: number; completed: number; returned: number; ca: number; at: number };
  distribution: { department: Department; inQueue: number; avgAgeHours: number | null; trend: string }[];
  radar: { department: Department; queueGrowth: number; repeatQueryCycles: number; longInactivePeriods: number }[];
  tatHealth: { available: boolean; ok: number; warning: number; breached: number; percentOk: number | null };
  brief: { text: string; sourceRefs: string[] }[];
  stationMarkers: Record<Department, { markers: StationData["markers"]; overflowCount: number }>;
};

export default function DashboardPage() {
  return (
    <AppShell title="Executive Control Tower">
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { data, loading, error } = useApi<DashboardData>("/api/analytics/dashboard");
  const [resetSignal, setResetSignal] = useState(0);

  const goToStation = useCallback((d: Department) => router.push(`/my-work?department=${d}`), [router]);
  const goToApplication = useCallback((id: string) => router.push(`/applications/${id}`), [router]);

  if (loading) return <div className="p-6 text-sm text-charcoal/50">Loading dashboard…</div>;
  if (error) return <div className="p-6 text-sm text-[color:var(--color-danger)]">{error}</div>;
  if (!data) return null;

  const stations: StationData[] = DEPARTMENTS.map((department) => ({
    department,
    inQueue: data.distribution.find((d) => d.department === department)?.inQueue ?? 0,
    markers: data.stationMarkers[department]?.markers ?? [],
    overflowCount: data.stationMarkers[department]?.overflowCount ?? 0,
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
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard icon={FileStack} label="Circulated" value={data.lifecycle.circulated} tone="primary" />
        <KpiCard icon={Activity} label="Active" value={data.lifecycle.active} tone="teal" />
        <KpiCard icon={Box} label="CA" value={data.lifecycle.ca} tone="primary" hint="All circulated CA" />
        <KpiCard icon={Triangle} label="AT" value={data.lifecycle.at} tone="teal" hint="All circulated AT" />
        <KpiCard icon={CheckCircle2} label="Completed" value={data.lifecycle.completed} tone="success" />
      </div>

      <Panel
        title={
          <div>
            <div className="text-base font-extrabold text-charcoal">Credit Journey</div>
            <div className="text-xs font-normal text-charcoal/50">From opportunity to impact</div>
          </div>
        }
        action={
          <button
            onClick={() => setResetSignal((v) => v + 1)}
            className="focus-ring flex items-center gap-1.5 rounded-full bg-[color:var(--color-light-grey)] px-3 py-1.5 text-xs font-semibold text-charcoal/70 hover:bg-primary/10 hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset view
          </button>
        }
      >
        <div
          className="rounded-xl p-1"
          style={{
            background:
              "linear-gradient(180deg, #f5e2c8 0%, #e7b98f 22%, #b6789a 46%, #6c4f8e 72%, #2a1a40 100%)",
          }}
        >
          <SceneFrame
            height={460}
            label="the Credit Journey"
            fallback={<CreditJourneyFallback stations={stations} />}
          >
            <CreditJourneyScene
              stations={stations}
              onSelectStation={goToStation}
              onSelectMarker={goToApplication}
              resetSignal={resetSignal}
              tone="dusk"
            />
          </SceneFrame>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="TAT Health">
          {data.tatHealth.available ? (
            <div className="flex items-center gap-4">
              <div className="h-32 w-32">
                <ResponsiveContainer>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ value: data.tatHealth.percentOk ?? 0, fill: "#51c1ad" }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-charcoal">{data.tatHealth.percentOk}%</div>
                <div className="text-xs text-charcoal/50">within configured TAT</div>
                <div className="mt-1 text-[11px] text-charcoal/40">
                  {data.tatHealth.warning} warning · {data.tatHealth.breached} breached
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-charcoal/50">
              TAT not configured — no active application currently has an applicable TAT profile.
            </p>
          )}
        </Panel>

        <Panel title="Bottleneck Radar">
          <div className="h-48">
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="58%">
                <PolarGrid stroke="#e7dcf5" />
                <PolarAngleAxis dataKey="department" tick={{ fontSize: 9, fill: "#333" }} />
                {Object.entries(RADAR_SERIES_COLORS).map(([key, color]) => (
                  <Radar key={key} dataKey={key} stroke={color} fill={color} fillOpacity={0.28} />
                ))}
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px] text-charcoal/40">Operational signal — not a performance conclusion.</p>
        </Panel>

        <Panel title={<span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Executive Brief</span>}>
          <ul className="space-y-2 text-xs text-charcoal/70">
            {data.brief.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-charcoal/35">Rule-based, computed from current records — not AI-generated.</p>
        </Panel>
      </div>

      <CommandInput placeholder="Ask Credit Intelligence…" />
    </div>
  );
}
