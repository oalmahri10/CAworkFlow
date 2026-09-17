"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { apiGet, apiPost, ApiError } from "@/lib/client/api";
import {
  CUSTOMER_TYPES,
  REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
  SUBTYPES,
  SUBTYPE_LABELS,
} from "@/lib/domain/enums";

type FacilityRow = { name: string; facilityType: string; amount: string; description: string };

function NewApplicationForm() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<"CA" | "AT">("CA");
  const [subtype, setSubtype] = useState(SUBTYPES[0]);
  const [croReference, setCroReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerType, setCustomerType] = useState(CUSTOMER_TYPES[0]);
  const [sector, setSector] = useState("");
  const [currency, setCurrency] = useState("BHD");
  const [totalGroupExposure, setTotalGroupExposure] = useState("");
  const [relatedPartyExposure, setRelatedPartyExposure] = useState("0");
  const [facilityAmount, setFacilityAmount] = useState("");
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<{ reference: string }>(`/api/reference/suggest?type=${requestType}`)
      .then((r) => setCroReference(r.reference))
      .catch(() => {});
  }, [requestType]);

  const previewTotal = (parseFloat(totalGroupExposure || "0") + parseFloat(relatedPartyExposure || "0")).toLocaleString(
    undefined,
    { minimumFractionDigits: 3, maximumFractionDigits: 3 }
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIssues([]);
    setSubmitting(true);
    try {
      const created = await apiPost<{ id: string }>("/api/applications", {
        croReference,
        requestType,
        subtype,
        customerName,
        customerType,
        sector: sector || undefined,
        currency,
        totalGroupExposure: totalGroupExposure || "0",
        relatedPartyExposure: relatedPartyExposure || "0",
        facilityAmount: facilityAmount || undefined,
        facilities: facilities
          .filter((f) => f.name && f.amount)
          .map((f) => ({ name: f.name, facilityType: f.facilityType || undefined, amount: f.amount, description: f.description || undefined })),
      });
      router.push(`/applications/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setIssues(err.issues ?? []);
      } else {
        setError("Failed to create application.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <h1 className="text-lg font-extrabold text-charcoal">New Credit Application / Availment Ticket</h1>
        <p className="text-sm text-charcoal/50">
          Creating this record immediately submits it to Credit Review (steps 1–2 of the shared workflow).
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-[var(--radius-card)] bg-white p-6 card-elevation">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Request type">
            <div className="flex gap-2">
              {REQUEST_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setRequestType(t)}
                  className={`focus-ring flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    requestType === t ? "border-primary bg-primary/10 text-primary" : "border-[#e3ddee] text-charcoal/60"
                  }`}
                >
                  {t} — {REQUEST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Subtype">
            <select value={subtype} onChange={(e) => setSubtype(e.target.value as typeof subtype)} className="input">
              {SUBTYPES.map((s) => (
                <option key={s} value={s}>{SUBTYPE_LABELS[s]}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="CRO80 reference">
          <div className="flex gap-2">
            <input required value={croReference} onChange={(e) => setCroReference(e.target.value)} className="input" />
            <button
              type="button"
              onClick={() =>
                apiGet<{ reference: string }>(`/api/reference/suggest?type=${requestType}`).then((r) => setCroReference(r.reference))
              }
              className="focus-ring flex items-center gap-1 rounded-lg border border-[#e3ddee] px-3 text-xs font-semibold text-charcoal/60 hover:bg-[color:var(--color-light-grey)]"
              title="Suggest next reference for this deployment (no core-banking integration exists — always overridable)"
            >
              <Wand2 className="h-3.5 w-3.5" /> Suggest
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer name"><input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" /></Field>
          <Field label="Customer type">
            <select value={customerType} onChange={(e) => setCustomerType(e.target.value as typeof customerType)} className="input">
              {CUSTOMER_TYPES.map((c) => (<option key={c} value={c}>{c.replace(/_/g, " ")}</option>))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sector (optional)"><input value={sector} onChange={(e) => setSector(e.target.value)} className="input" /></Field>
          <Field label="Currency"><input required maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="input" /></Field>
        </div>

        <div className="rounded-xl bg-lavender p-4">
          <div className="mb-2 text-xs font-bold text-primary">Approval-Routing Exposure = Total Group Exposure + Related-Party Exposure</div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total Group Exposure"><input required inputMode="decimal" value={totalGroupExposure} onChange={(e) => setTotalGroupExposure(e.target.value)} className="input" /></Field>
            <Field label="Related-Party Exposure"><input required inputMode="decimal" value={relatedPartyExposure} onChange={(e) => setRelatedPartyExposure(e.target.value)} className="input" /></Field>
          </div>
          <div className="mt-2 text-sm font-bold text-charcoal">
            = {currency} {previewTotal} <span className="font-normal text-charcoal/50">(preview — server computes the authoritative figure)</span>
          </div>
        </div>

        <Field label="Individual facility amount (optional, kept separate from exposure)">
          <input inputMode="decimal" value={facilityAmount} onChange={(e) => setFacilityAmount(e.target.value)} className="input" />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal/70">Facility details (optional)</span>
            <button
              type="button"
              onClick={() => setFacilities((f) => [...f, { name: "", facilityType: "", amount: "", description: "" }])}
              className="focus-ring flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add facility
            </button>
          </div>
          {facilities.map((f, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2">
              <input placeholder="Name" value={f.name} onChange={(e) => updateFacility(setFacilities, i, "name", e.target.value)} className="input" />
              <input placeholder="Type" value={f.facilityType} onChange={(e) => updateFacility(setFacilities, i, "facilityType", e.target.value)} className="input" />
              <input placeholder="Amount" inputMode="decimal" value={f.amount} onChange={(e) => updateFacility(setFacilities, i, "amount", e.target.value)} className="input" />
              <input placeholder="Description" value={f.description} onChange={(e) => updateFacility(setFacilities, i, "description", e.target.value)} className="input" />
              <button type="button" onClick={() => setFacilities((rows) => rows.filter((_, idx) => idx !== i))} className="focus-ring rounded-lg px-2 text-charcoal/40 hover:text-[color:var(--color-danger)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg bg-[color:var(--color-danger)]/8 p-3 text-sm text-[color:var(--color-danger)]">
            {error}
            {issues.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs">
                {issues.map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="focus-ring rounded-lg border border-[#e3ddee] px-4 py-2 text-sm font-semibold text-charcoal/60">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="focus-ring rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[color:var(--color-primary-hover)] disabled:opacity-60">
            {submitting ? "Submitting…" : "Create & Submit to Credit Review"}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e3ddee;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          outline: none;
        }
        .input:focus { border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}

function updateFacility(
  setFacilities: React.Dispatch<React.SetStateAction<FacilityRow[]>>,
  index: number,
  field: keyof FacilityRow,
  value: string
) {
  setFacilities((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-charcoal/70">{label}</span>
      {children}
    </label>
  );
}

export default function NewApplicationPage() {
  return (
    <AppShell title="New Application">
      <NewApplicationForm />
    </AppShell>
  );
}
