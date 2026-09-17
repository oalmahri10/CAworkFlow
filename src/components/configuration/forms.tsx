"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CAPABILITIES,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  REQUEST_TYPES,
  ROLES,
  ROLE_LABELS,
  SUBTYPES,
  SUBTYPE_LABELS,
} from "@/lib/domain/enums";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const inputCls = "w-full rounded-lg border border-[#e3ddee] px-2.5 py-1.5 text-xs outline-none focus:border-primary";
const btnCls = "focus-ring rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50";

export function RoutingMatrixForm({ onSubmit, submitting }: { onSubmit: (p: unknown, n?: string) => void; submitting: boolean }) {
  const [currency, setCurrency] = useState("BHD");
  const [tiers, setTiers] = useState([{ id: "t1", label: "", minMinor: "0", maxMinor: "", approvalAuthorityLabel: "", requiredCapability: "APPROVAL_AUTHORITY_ACTIONS" }]);
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium">Currency<input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className={inputCls} /></label>
      {tiers.map((t, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1.5fr_auto] gap-2 items-end">
          <label className="text-[10px]">Label<input value={t.label} onChange={(e) => updateTier(setTiers, i, "label", e.target.value)} className={inputCls} /></label>
          <label className="text-[10px]">Min (minor units)<input value={t.minMinor} onChange={(e) => updateTier(setTiers, i, "minMinor", e.target.value)} className={inputCls} /></label>
          <label className="text-[10px]">Max (blank = ∞)<input value={t.maxMinor} onChange={(e) => updateTier(setTiers, i, "maxMinor", e.target.value)} className={inputCls} /></label>
          <label className="text-[10px]">Authority label<input value={t.approvalAuthorityLabel} onChange={(e) => updateTier(setTiers, i, "approvalAuthorityLabel", e.target.value)} className={inputCls} /></label>
          <label className="text-[10px]">Required capability
            <select value={t.requiredCapability} onChange={(e) => updateTier(setTiers, i, "requiredCapability", e.target.value)} className={inputCls}>
              {CAPABILITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button onClick={() => setTiers((rows) => rows.filter((_, idx) => idx !== i))} className="text-charcoal/40 hover:text-[color:var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={() => setTiers((t) => [...t, { id: `t${t.length + 1}`, label: "", minMinor: "0", maxMinor: "", approvalAuthorityLabel: "", requiredCapability: "APPROVAL_AUTHORITY_ACTIONS" }])} className="flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" /> Add tier</button>
      <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
      <button
        disabled={submitting}
        onClick={() => onSubmit({ currency, tiers: tiers.map((t) => ({ ...t, maxMinor: t.maxMinor || null })) }, notes)}
        className={btnCls}
      >
        Save draft
      </button>
    </div>
  );
}

function updateTier<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, field: keyof T, value: unknown) {
  setter((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
}

export function TatProfileForm({ onSubmit, submitting }: { onSubmit: (p: unknown, n?: string) => void; submitting: boolean }) {
  const [requestType, setRequestType] = useState("ALL");
  const [stage, setStage] = useState(DEPARTMENTS[0]);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [workingHourStart, setWorkingHourStart] = useState("08:00");
  const [workingHourEnd, setWorkingHourEnd] = useState("16:00");
  const [timezone, setTimezone] = useState("Asia/Bahrain");
  const [warningThresholdHours, setWarningThresholdHours] = useState("24");
  const [escalationThresholdHours, setEscalationThresholdHours] = useState("48");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Request type
          <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className={inputCls}>
            <option value="ALL">All (CA + AT)</option>
            {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs">Stage
          <select value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} className={inputCls}>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
          </select>
        </label>
      </div>
      <div>
        <span className="text-xs font-medium">Working days</span>
        <div className="mt-1 flex gap-1.5">
          {WEEKDAYS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setWorkingDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))}
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${workingDays.includes(i) ? "bg-primary text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Working hours start<input type="time" value={workingHourStart} onChange={(e) => setWorkingHourStart(e.target.value)} className={inputCls} /></label>
        <label className="text-xs">Working hours end<input type="time" value={workingHourEnd} onChange={(e) => setWorkingHourEnd(e.target.value)} className={inputCls} /></label>
      </div>
      <label className="block text-xs">Timezone<input value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Warning threshold (hours)<input type="number" value={warningThresholdHours} onChange={(e) => setWarningThresholdHours(e.target.value)} className={inputCls} /></label>
        <label className="text-xs">Escalation threshold (hours)<input type="number" value={escalationThresholdHours} onChange={(e) => setEscalationThresholdHours(e.target.value)} className={inputCls} /></label>
      </div>
      <label className="block text-xs">Effective from<input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={inputCls} /></label>
      <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
      <button
        disabled={submitting}
        onClick={() =>
          onSubmit(
            {
              requestType,
              stage,
              workingDays,
              workingHourStart,
              workingHourEnd,
              timezone,
              warningThresholdHours: Number(warningThresholdHours),
              escalationThresholdHours: Number(escalationThresholdHours),
              effectiveFrom,
            },
            notes
          )
        }
        className={btnCls}
      >
        Save draft
      </button>
    </div>
  );
}

export function CalendarForm({ onSubmit, submitting }: { onSubmit: (p: unknown, n?: string) => void; submitting: boolean }) {
  const [name, setName] = useState("Bahrain business calendar");
  const [timezone, setTimezone] = useState("Asia/Bahrain");
  const [weekend, setWeekend] = useState<number[]>([5, 6]);
  const [holidays, setHolidays] = useState("");

  return (
    <div className="space-y-3">
      <label className="block text-xs">Name<input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
      <label className="block text-xs">Timezone<input value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls} /></label>
      <div>
        <span className="text-xs font-medium">Weekend days</span>
        <div className="mt-1 flex gap-1.5">
          {WEEKDAYS.map((label, i) => (
            <button key={i} type="button" onClick={() => setWeekend((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${weekend.includes(i) ? "bg-primary text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="block text-xs">Holidays (YYYY-MM-DD, one per line)
        <textarea value={holidays} onChange={(e) => setHolidays(e.target.value)} rows={4} className={inputCls} />
      </label>
      <button
        disabled={submitting}
        onClick={() => onSubmit({ name, timezone, weekend, holidays: holidays.split("\n").map((h) => h.trim()).filter(Boolean) })}
        className={btnCls}
      >
        Save draft
      </button>
    </div>
  );
}

export function SubtypeMappingForm({ onSubmit, submitting }: { onSubmit: (p: unknown, n?: string) => void; submitting: boolean }) {
  const [rows, setRows] = useState([{ requestType: "CA", subtype: SUBTYPES[0], allowedDepartments: [...DEPARTMENTS] as string[] }]);

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-black/5 p-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={r.requestType} onChange={(e) => updateTier(setRows, i, "requestType", e.target.value)} className={inputCls}>
              {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={r.subtype} onChange={(e) => updateTier(setRows, i, "subtype", e.target.value)} className={inputCls}>
              {SUBTYPES.map((s) => <option key={s} value={s}>{SUBTYPE_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {DEPARTMENTS.map((d) => (
              <button key={d} type="button" onClick={() => updateTier(setRows, i, "allowedDepartments", r.allowedDepartments.includes(d) ? r.allowedDepartments.filter((x) => x !== d) : [...r.allowedDepartments, d])} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.allowedDepartments.includes(d) ? "bg-primary text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/50"}`}>
                {DEPARTMENT_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => setRows((r) => [...r, { requestType: "CA", subtype: SUBTYPES[0], allowedDepartments: [...DEPARTMENTS] }])} className="flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" /> Add mapping</button>
      <button disabled={submitting} onClick={() => onSubmit({ mappings: rows })} className={btnCls}>Save draft</button>
    </div>
  );
}

export function DocumentChecklistForm({ onSubmit, submitting }: { onSubmit: (p: unknown, n?: string) => void; submitting: boolean }) {
  const [requestType, setRequestType] = useState("ALL");
  const [subtype, setSubtype] = useState("ALL");
  const [items, setItems] = useState([{ category: DOCUMENT_CATEGORIES[0] as string, description: "" }]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className={inputCls}>
          <option value="ALL">All request types</option>
          {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={subtype} onChange={(e) => setSubtype(e.target.value)} className={inputCls}>
          <option value="ALL">All subtypes</option>
          {SUBTYPES.map((s) => <option key={s} value={s}>{SUBTYPE_LABELS[s]}</option>)}
        </select>
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
          <select value={it.category} onChange={(e) => updateTier(setItems, i, "category", e.target.value)} className={inputCls}>
            {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</option>)}
          </select>
          <input value={it.description} onChange={(e) => updateTier(setItems, i, "description", e.target.value)} placeholder="Required item description" className={inputCls} />
          <button onClick={() => setItems((rows) => rows.filter((_, idx) => idx !== i))} className="text-charcoal/40 hover:text-[color:var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={() => setItems((r) => [...r, { category: DOCUMENT_CATEGORIES[0], description: "" }])} className="flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" /> Add item</button>
      <button disabled={submitting} onClick={() => onSubmit({ requestType, subtype, requiredItems: items })} className={btnCls}>Save draft</button>
    </div>
  );
}

export function NotificationPrefsForm({ onSubmit, submitting }: { onSubmit: (p: unknown, n?: string) => void; submitting: boolean }) {
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailRequested, setEmailRequested] = useState(false);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={inAppEnabled} onChange={(e) => setInAppEnabled(e.target.checked)} /> In-app notifications enabled</label>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={emailRequested} onChange={(e) => setEmailRequested(e.target.checked)} /> Request email notifications
      </label>
      <p className="text-[11px] text-charcoal/45">
        Email sending additionally requires EMAIL_PROVIDER to be configured in the server environment. Without it,
        the system will show &quot;Email not configured&quot; regardless of this setting.
      </p>
      <button disabled={submitting} onClick={() => onSubmit({ inAppEnabled, emailRequested })} className={btnCls}>Save draft</button>
    </div>
  );
}

export function AssignmentScopeForm({ onSubmit, submitting }: { onSubmit: (p: unknown, n?: string) => void; submitting: boolean }) {
  const [scopes, setScopes] = useState<Record<string, string>>(Object.fromEntries(ROLES.map((r) => [r, "OWN"])));

  return (
    <div className="space-y-2">
      {ROLES.map((r) => (
        <div key={r} className="flex items-center justify-between text-xs">
          <span>{ROLE_LABELS[r]}</span>
          <select value={scopes[r]} onChange={(e) => setScopes((s) => ({ ...s, [r]: e.target.value }))} className={inputCls + " w-28"}>
            <option value="OWN">Own</option>
            <option value="TEAM">Team</option>
            <option value="ALL">All</option>
          </select>
        </div>
      ))}
      <button disabled={submitting} onClick={() => onSubmit({ scopesByRole: scopes })} className={btnCls}>Save draft</button>
    </div>
  );
}
