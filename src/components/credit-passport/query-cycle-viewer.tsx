"use client";

import { useState } from "react";
import { MessageSquare, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/client/format";

export type QueryLite = {
  id: string;
  source: string;
  category: string | null;
  reason: string;
  status: string;
  createdAt: string;
  author: { name: string };
  responses: { id: string; message: string; createdAt: string; author: { name: string } }[];
};

/**
 * A 2D interactive "ring" presentation of the query/response cycle history
 * (an intentional 2D treatment for this secondary widget rather than a full
 * 3D scene — see the README's noted scope limitations). Each ring opens its
 * query, response, timestamp and cycle history, matching the requirement
 * even without a 3D render.
 */
export function QueryCycleViewer({ queries }: { queries: QueryLite[] }) {
  const [selected, setSelected] = useState<QueryLite | null>(null);

  if (queries.length === 0) {
    return <p className="text-sm text-charcoal/45">No queries have been raised on this application.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {queries.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setSelected(q)}
            className="focus-ring flex flex-col items-center gap-1"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                q.status === "OPEN"
                  ? "border-[color:var(--color-danger)] text-[color:var(--color-danger)]"
                  : "border-teal text-teal"
              }`}
            >
              {q.responses.length > 0 ? <MessageSquare className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </span>
            <span className="text-[10px] font-semibold text-charcoal/70">
              {q.source === "RISK" ? "Risk Query" : "Approval Query"} {i + 1}
            </span>
            <span className="text-[9px] text-charcoal/40">{formatDateTime(q.createdAt)}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-4 rounded-lg border border-black/5 bg-[color:var(--color-light-grey)] p-3 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-charcoal">{selected.source === "RISK" ? "Risk Query" : "Approval Authority Query"}</span>
            <span className="text-xs text-charcoal/45">{formatDateTime(selected.createdAt)} · {selected.author.name}</span>
          </div>
          <p className="text-charcoal/75">{selected.reason}</p>
          {selected.responses.map((r) => (
            <div key={r.id} className="mt-2 rounded-md bg-white p-2">
              <div className="text-xs font-semibold text-charcoal/60">{r.author.name} responded · {formatDateTime(r.createdAt)}</div>
              <p className="mt-0.5 text-charcoal/75">{r.message}</p>
            </div>
          ))}
          {selected.responses.length === 0 && <p className="mt-2 text-xs text-charcoal/45">Awaiting response.</p>}
        </div>
      )}
    </div>
  );
}
