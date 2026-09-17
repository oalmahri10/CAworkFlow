"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { useSession } from "@/components/providers/session-provider";
import { useApi } from "@/lib/client/use-api";
import { formatCurrencyMinor } from "@/lib/client/format";
import { DepartmentBadge, RequestTypeBadge, SubstageBadge } from "@/components/ui/badge";
import { DEPARTMENTS, DEPARTMENT_LABELS, ROLE_LABELS, type Department, type Role } from "@/lib/domain/enums";

type Row = {
  id: string;
  croReference: string;
  customerName: string;
  requestType: string;
  currentDepartment: string;
  substage: string;
  actionOwner: { id: string; name: string } | null;
  approvalRoutingExposureMinor: string;
  currency: string;
  updatedAt: string;
};

const ROLE_TO_DEPARTMENT: Partial<Record<Role, Department>> = {
  CORPORATE_FINANCE: "CORPORATE_FINANCE",
  CREDIT_REVIEW: "CREDIT_REVIEW",
  APPROVAL_AUTHORITY: "APPROVAL_AUTHORITY",
  CAD: "CAD",
  OPERATIONS: "OPERATIONS",
};

function MyWorkContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useSession();

  const defaultDept = useMemo(() => {
    if (!user) return "";
    for (const role of user.roles) {
      if (ROLE_TO_DEPARTMENT[role]) return ROLE_TO_DEPARTMENT[role];
    }
    return "";
  }, [user]);

  const department = params.get("department") ?? defaultDept ?? "";
  const qs = new URLSearchParams();
  if (department) qs.set("department", department);
  qs.set("pageSize", "50");
  qs.set("sortBy", "updatedAt");

  const { data, loading, error } = useApi<{ items: Row[]; total: number }>(`/api/applications?${qs.toString()}`, [department]);

  const mine = data?.items.filter((r) => r.actionOwner?.id === user?.id) ?? [];
  const departmentQueue = data?.items ?? [];

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-charcoal/60">Department:</span>
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => router.push(`/my-work?department=${d}`)}
            className={`focus-ring rounded-full px-3 py-1.5 text-xs font-semibold ${
              department === d ? "bg-primary text-white" : "bg-white text-charcoal/60 hover:bg-primary/10"
            }`}
          >
            {DEPARTMENT_LABELS[d]}
          </button>
        ))}
      </div>

      {user && user.roles.length > 0 && (
        <p className="mb-4 text-xs text-charcoal/45">
          Signed in as {ROLE_LABELS[user.roles[0]]}. Showing applications visible to your role
          {department ? ` in ${DEPARTMENT_LABELS[department as Department]}` : ""}.
        </p>
      )}

      {mine.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-charcoal/50">Assigned directly to you</h2>
          <QueueTable rows={mine} onOpen={(id) => router.push(`/applications/${id}`)} />
        </div>
      )}

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-charcoal/50">
        {department ? `${DEPARTMENT_LABELS[department as Department]} queue` : "All visible applications"}
      </h2>
      {loading && <p className="text-sm text-charcoal/40">Loading…</p>}
      {error && <p className="text-sm text-[color:var(--color-danger)]">{error}</p>}
      {!loading && !error && <QueueTable rows={departmentQueue} onOpen={(id) => router.push(`/applications/${id}`)} />}
    </div>
  );
}

function QueueTable({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  if (rows.length === 0) {
    return <p className="rounded-lg bg-white p-4 text-sm text-charcoal/40 card-elevation">Nothing in this queue.</p>;
  }
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-white card-elevation">
      <table className="w-full text-left text-sm">
        <thead className="bg-[color:var(--color-light-grey)] text-xs text-charcoal/60">
          <tr>
            <th className="px-4 py-2.5">CRO80 Reference</th>
            <th className="px-4 py-2.5">Customer</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Department</th>
            <th className="px-4 py-2.5">Substage</th>
            <th className="px-4 py-2.5">Exposure</th>
            <th className="px-4 py-2.5">Owner</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r.id)} className="cursor-pointer border-t border-black/5 hover:bg-[color:var(--color-light-grey)]">
              <td className="px-4 py-2.5 font-semibold text-primary">{r.croReference}</td>
              <td className="px-4 py-2.5">{r.customerName}</td>
              <td className="px-4 py-2.5"><RequestTypeBadge type={r.requestType} /></td>
              <td className="px-4 py-2.5"><DepartmentBadge department={r.currentDepartment} /></td>
              <td className="px-4 py-2.5"><SubstageBadge substage={r.substage} /></td>
              <td className="px-4 py-2.5">{formatCurrencyMinor(r.approvalRoutingExposureMinor, r.currency)}</td>
              <td className="px-4 py-2.5 text-charcoal/60">{r.actionOwner?.name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MyWorkPage() {
  return (
    <AppShell title="My Work">
      <Suspense>
        <MyWorkContent />
      </Suspense>
    </AppShell>
  );
}
