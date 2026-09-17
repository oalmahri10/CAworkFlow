"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { apiPost, ApiError } from "@/lib/client/api";
import { EXAMPLE_COMMANDS } from "@/lib/command-bar";
import { formatCurrencyMinor } from "@/lib/client/format";
import { RequestTypeBadge } from "@/components/ui/badge";

type CommandResponse =
  | { matched: false; message: string }
  | {
      matched: true;
      description: string;
      items: {
        id: string;
        croReference: string;
        customerName: string;
        requestType: string;
        currentDepartment: string;
        substage: string;
        approvalRoutingExposureMinor: string;
        currency: string;
      }[];
    };

/** Rule-based local command parsing — labelled explicitly, never presented as AI-generated. */
export function CommandInput({ placeholder = "Ask Credit Intelligence…" }: { placeholder?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<CommandResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await apiPost<CommandResponse>("/api/analytics/command", { query: value });
      setResult(res);
    } catch (err) {
      setResult({ matched: false, message: err instanceof ApiError ? err.message : "Command failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 card-elevation">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-charcoal/40"
          list="command-examples"
        />
        <datalist id="command-examples">
          {EXAMPLE_COMMANDS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={loading}
          className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
          aria-label="Run command"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
      <p className="mt-1.5 px-1 text-[11px] text-charcoal/40">
        Rule-based local search — not AI-generated. Try: {EXAMPLE_COMMANDS[0]}, {EXAMPLE_COMMANDS[2]}.
      </p>

      {result && (
        <div className="mt-2 rounded-xl border border-black/5 bg-white p-3 text-sm">
          {!result.matched ? (
            <p className="text-charcoal/60">{result.message}</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-charcoal/50">{result.description} — {result.items.length} result(s)</p>
              <ul className="space-y-1.5">
                {result.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => router.push(`/applications/${item.id}`)}
                      className="focus-ring flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[color:var(--color-light-grey)]"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <RequestTypeBadge type={item.requestType} />
                        <span className="truncate font-medium">{item.croReference}</span>
                        <span className="truncate text-charcoal/50">{item.customerName}</span>
                      </span>
                      <span className="shrink-0 text-xs text-charcoal/50">
                        {formatCurrencyMinor(item.approvalRoutingExposureMinor, item.currency)}
                      </span>
                    </button>
                  </li>
                ))}
                {result.items.length === 0 && <li className="text-charcoal/50">No matching records.</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
