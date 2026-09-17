"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { DEPARTMENT_LABELS, DEPARTMENTS, SUBSTAGE_LABELS, type Department, type Substage } from "@/lib/domain/enums";
import { formatDateTime } from "@/lib/client/format";

type WorkflowEventLite = { id: string; toDept: string; toSubstage: string; createdAt: string; action: string };

/**
 * Read-only historical replay. Positions and labels are derived entirely
 * from persisted WorkflowEvent records for the selected application; replay
 * never mutates application state or generates new workflow events — it
 * only steps an index through history that already happened.
 */
export function ProcessReplay({ applications }: { applications: { id: string; croReference: string }[] }) {
  const [selectedId, setSelectedId] = useState(applications[0]?.id ?? "");
  const [events, setEvents] = useState<WorkflowEventLite[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    apiGet<{ application: { workflowEvents: WorkflowEventLite[] } }>(`/api/applications/${selectedId}`).then((d) => {
      setEvents(d.application.workflowEvents);
      setIndex(0);
    });
  }, [selectedId]);

  useEffect(() => {
    if (playing && events.length > 0) {
      timerRef.current = setInterval(() => {
        setIndex((i) => {
          if (i >= events.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 1200 / speed);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, events.length]);

  const current = events[index];

  return (
    <div>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="mb-2 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white"
      >
        {applications.map((a) => (
          <option key={a.id} value={a.id} className="text-charcoal">{a.croReference}</option>
        ))}
        {applications.length === 0 && <option value="">No applications available</option>}
      </select>

      {events.length === 0 ? (
        <p className="text-xs text-white/40">No workflow history to replay.</p>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <button onClick={() => setPlaying((p) => !p)} className="focus-ring flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => { setIndex(0); setPlaying(false); }} className="focus-ring flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded border border-white/15 bg-white/5 px-1.5 py-1 text-[11px] text-white">
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          <input
            type="range"
            min={0}
            max={events.length - 1}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 text-[10px] text-white/40">Event {index + 1} / {events.length}</div>

          <div className="mt-3 flex justify-between">
            {DEPARTMENTS.map((d) => (
              <div
                key={d}
                className={`h-2 flex-1 mx-0.5 rounded-full ${current?.toDept === d ? "bg-teal" : "bg-white/10"}`}
                title={DEPARTMENT_LABELS[d]}
              />
            ))}
          </div>

          {current && (
            <div className="mt-2 rounded-lg bg-white/5 p-2 text-[11px] text-white/80">
              <div className="font-semibold">{DEPARTMENT_LABELS[current.toDept as Department] ?? current.toDept}</div>
              <div className="text-white/50">{SUBSTAGE_LABELS[current.toSubstage as Substage] ?? current.toSubstage}</div>
              <div className="text-white/35">{formatDateTime(current.createdAt)}</div>
            </div>
          )}
          <p className="mt-2 text-[10px] font-semibold text-amber">Historical replay — read-only, does not affect live records.</p>
        </>
      )}
    </div>
  );
}
