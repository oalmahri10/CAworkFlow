"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { useApi } from "@/lib/client/use-api";
import { formatCurrencyMinor, formatDateTime } from "@/lib/client/format";
import { DepartmentBadge, RequestTypeBadge, SubstageBadge } from "@/components/ui/badge";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  REQUEST_TYPES,
  SUBTYPES,
  SUBTYPE_LABELS,
} from "@/lib/domain/enums";

type ApplicationRow = {
  id: string;
  croReference: string;
  customerName: string;
  requestType: string;
  subtype: string;
  currentDepartment: string;
  substage: string;
  approvalRoutingExposureMinor: string;
  currency: string;
  updatedAt: string;
  initiatingRm: { name: string } | null;
};

type ListResponse = { items: ApplicationRow[]; total: number; page: number; totalPages: number };

function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [requestType, setRequestType] = useState("");
  const [department, setDepartment] = useState("");
  const [subtype, setSubtype] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (requestType) qs.set("requestType", requestType);
  if (department) qs.set("department", department);
  if (subtype) qs.set("subtype", subtype);
  qs.set("page", String(page));
  qs.set("sortBy", sortBy);
  qs.set("sortDir", sortDir);

  const { data, loading, error, reload } = useApi<ListResponse>(
    `/api/applications?${qs.toString()}`,
    [search, requestType, department, subtype, page, sortBy, sortDir]
  );

  function toggleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            reload();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CRO80 reference or customer…"
            className="w-72 rounded-lg border border-[#e3ddee] px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </form>
        <select value={requestType} onChange={(e) => { setRequestType(e.target.value); setPage(1); }} className="select">
          <option value="">All types</option>
          {REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="select">
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>
          ))}
          <option value="COMPLETED">Completed</option>
        </select>
        <select value={subtype} onChange={(e) => { setSubtype(e.target.value); setPage(1); }} className="select">
          <option value="">All subtypes</option>
          {SUBTYPES.map((s) => (
            <option key={s} value={s}>{SUBTYPE_LABELS[s]}</option>
          ))}
        </select>

        <button
          onClick={() => router.push("/applications/new")}
          className="focus-ring ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--color-primary-hover)]"
        >
          <Plus className="h-4 w-4" /> New Application
        </button>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] bg-white card-elevation">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/5 bg-[color:var(--color-light-grey)] text-xs text-charcoal/60">
            <tr>
              <SortHeader label="CRO80 Reference" field="croReference" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <SortHeader label="Customer" field="customerName" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Subtype</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Substage</th>
              <SortHeader label="Approval-Routing Exposure" field="approvalRoutingExposureMinor" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-3">RM</th>
              <SortHeader label="Updated" field="updatedAt" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-charcoal/40">Loading…</td></tr>
            )}
            {error && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-[color:var(--color-danger)]">{error}</td></tr>
            )}
            {data && data.items.length === 0 && !loading && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-charcoal/40">No applications match these filters.</td></tr>
            )}
            {data?.items.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/applications/${row.id}`)}
                className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-[color:var(--color-light-grey)]"
              >
                <td className="px-4 py-3 font-semibold text-primary">{row.croReference}</td>
                <td className="px-4 py-3">{row.customerName}</td>
                <td className="px-4 py-3"><RequestTypeBadge type={row.requestType} /></td>
                <td className="px-4 py-3 text-charcoal/60">{SUBTYPE_LABELS[row.subtype as keyof typeof SUBTYPE_LABELS] ?? row.subtype}</td>
                <td className="px-4 py-3"><DepartmentBadge department={row.currentDepartment} /></td>
                <td className="px-4 py-3"><SubstageBadge substage={row.substage} /></td>
                <td className="px-4 py-3">{formatCurrencyMinor(row.approvalRoutingExposureMinor, row.currency)}</td>
                <td className="px-4 py-3 text-charcoal/60">{row.initiatingRm?.name ?? "—"}</td>
                <td className="px-4 py-3 text-charcoal/50">{formatDateTime(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-black/5 px-4 py-3 text-xs text-charcoal/50">
            <span>Page {data.page} of {data.totalPages} · {data.total} total</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="focus-ring rounded p-1 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="focus-ring rounded p-1 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .select {
          border-radius: 0.5rem;
          border: 1px solid #e3ddee;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          background: white;
          outline: none;
        }
      `}</style>
    </div>
  );
}

function SortHeader({
  label,
  field,
  sortBy,
  sortDir,
  onClick,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortDir: string;
  onClick: (f: string) => void;
}) {
  return (
    <th className="cursor-pointer select-none px-4 py-3" onClick={() => onClick(field)}>
      {label} {sortBy === field ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}

export default function ApplicationsPage() {
  return (
    <AppShell title="Applications">
      <Suspense>
        <ApplicationsContent />
      </Suspense>
    </AppShell>
  );
}
