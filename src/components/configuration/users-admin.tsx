"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { apiPost, apiDelete, ApiError } from "@/lib/client/api";
import { useApi } from "@/lib/client/use-api";
import { CAPABILITIES, ROLES, ROLE_LABELS } from "@/lib/domain/enums";

type UserRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: string[];
  capabilities: string[];
};

export function UsersAdmin({ canManage }: { canManage: boolean }) {
  const { data, loading, reload } = useApi<UserRow[]>(canManage ? "/api/admin/users" : null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <p className="text-sm text-charcoal/50">You do not hold the MANAGE_USERS capability required to view or manage accounts.</p>;
  }

  async function createUser() {
    setError(null);
    try {
      await apiPost("/api/admin/users", { name, email, password, roles, capabilities });
      setShowCreate(false);
      setName(""); setEmail(""); setPassword(""); setRoles([]); setCapabilities([]);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user.");
    }
  }

  async function toggleRole(userId: string, role: string, has: boolean) {
    if (has) await apiDelete(`/api/admin/users/${userId}/roles`, { role });
    else await apiPost(`/api/admin/users/${userId}/roles`, { role });
    reload();
  }
  async function toggleCapability(userId: string, capability: string, has: boolean) {
    if (has) await apiDelete(`/api/admin/users/${userId}/capabilities`, { capability });
    else await apiPost(`/api/admin/users/${userId}/capabilities`, { capability });
    reload();
  }

  return (
    <div>
      <button onClick={() => setShowCreate((v) => !v)} className="focus-ring mb-3 flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
        <Plus className="h-3.5 w-3.5" /> {showCreate ? "Cancel" : "Create user"}
      </button>

      {showCreate && (
        <div className="mb-4 rounded-lg border border-black/5 p-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-[#e3ddee] px-2.5 py-1.5 text-xs" />
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-[#e3ddee] px-2.5 py-1.5 text-xs" />
            <input placeholder="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-[#e3ddee] px-2.5 py-1.5 text-xs" />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-charcoal/60">Roles</div>
            <div className="flex flex-wrap gap-1">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roles.includes(r) ? "bg-primary text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/50"}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-charcoal/60">Capabilities</div>
            <div className="flex flex-wrap gap-1">
              {CAPABILITIES.map((c) => (
                <button key={c} type="button" onClick={() => setCapabilities((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${capabilities.includes(c) ? "bg-teal text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/50"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-[color:var(--color-danger)]">{error}</p>}
          <button onClick={createUser} className="focus-ring rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white">Create account</button>
        </div>
      )}

      {loading && <p className="text-sm text-charcoal/40">Loading…</p>}
      <div className="space-y-3">
        {data?.map((u) => (
          <div key={u.id} className="rounded-lg border border-black/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-charcoal">{u.name}</div>
                <div className="text-xs text-charcoal/50">{u.email}</div>
              </div>
              {!u.isActive && <span className="rounded-full bg-charcoal/10 px-2 py-0.5 text-[10px] font-semibold text-charcoal/50">Inactive</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {ROLES.map((r) => {
                const has = u.roles.includes(r);
                return (
                  <button key={r} onClick={() => toggleRole(u.id, r, has)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${has ? "bg-primary text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/40"}`}>
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {CAPABILITIES.map((c) => {
                const has = u.capabilities.includes(c);
                return (
                  <button key={c} onClick={() => toggleCapability(u.id, c, has)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${has ? "bg-teal text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/30"}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
