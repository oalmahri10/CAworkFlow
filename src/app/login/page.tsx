"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/client/api";
import { useSession } from "@/components/providers/session-provider";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { refresh, user, loading } = useSession();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<{ setupComplete: boolean }>("/api/auth/setup").then((res) => {
      if (!res.setupComplete) router.replace("/setup");
      else setChecking(false);
    });
  }, [router]);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/auth/login", { email, password });
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-app-bg)] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-white p-8 card-elevation">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">BisB Credit Command</h1>
            <p className="text-xs text-charcoal/60">Credit Applications &amp; Availment Tickets</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#e3ddee] px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal/70">Password</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#e3ddee] px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-[color:var(--color-danger)]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-hover)] disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
