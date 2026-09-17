"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/client/api";
import { useSession } from "@/components/providers/session-provider";
import { ShieldCheck } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<{ setupComplete: boolean }>("/api/auth/setup").then((res) => {
      if (res.setupComplete) router.replace("/login");
      else setChecking(false);
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/auth/setup", { name, email, password });
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Setup failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-app-bg)] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-white p-8 card-elevation">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">BisB Credit Command</h1>
            <p className="text-xs text-charcoal/60">One-time administrator setup</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-charcoal/70">
          No accounts exist yet. Create the first Authorized Administrator account. This account can
          then create every other user and grant capabilities — it does not automatically receive
          access to credit documents.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Full name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </Field>
          <Field label="Password (min. 10 characters)">
            <input
              required
              type="password"
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm password">
            <input
              required
              type="password"
              minLength={10}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              autoComplete="new-password"
            />
          </Field>

          {error && <p className="text-sm text-[color:var(--color-danger)]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-hover)] disabled:opacity-60"
          >
            {submitting ? "Creating administrator…" : "Create administrator account"}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e3ddee;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-charcoal/70">{label}</span>
      {children}
    </label>
  );
}
