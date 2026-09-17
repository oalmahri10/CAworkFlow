"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { apiGet, apiPost } from "@/lib/client/api";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  application: { croReference: string } | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function Header({ title }: { title: string }) {
  const router = useRouter();
  const { user, logout } = useSession();
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await apiGet<{ items: NotificationItem[]; unreadCount: number }>("/api/notifications");
        if (!cancelled) {
          setNotifications(data.items);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // signed-out or transient error; ignore for polling
      }
    }
    poll();
    const interval = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(id: string) {
    await apiPost(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/applications?search=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-black/5 bg-white px-6">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-bold text-primary">BisB Credit Command</span>
        <span className="text-charcoal/30">/</span>
        <h1 className="text-sm font-semibold text-charcoal">{title}</h1>
      </div>

      <form onSubmit={onSearchSubmit} className="ml-auto flex max-w-md flex-1 items-center gap-2 rounded-full bg-[color:var(--color-light-grey)] px-3.5 py-2">
        <Search className="h-4 w-4 text-charcoal/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search applications, customers, documents…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-charcoal/40"
        />
      </form>

      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal/60 hover:bg-[color:var(--color-light-grey)]"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--color-danger)] px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-black/5 bg-white p-2 card-elevation">
            <div className="px-2 py-1.5 text-xs font-semibold text-charcoal/50">Notifications</div>
            {notifications.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-charcoal/50">You&apos;re all caught up.</div>
            )}
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`focus-ring block w-full rounded-lg px-2.5 py-2 text-left text-sm ${
                    n.isRead ? "text-charcoal/60" : "bg-lavender text-charcoal"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{n.title}</span>
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-charcoal/60">{n.body}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={accountRef}>
        <button
          type="button"
          onClick={() => setAccountOpen((v) => !v)}
          className="focus-ring flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-[color:var(--color-light-grey)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {user ? initials(user.name) : "?"}
          </span>
          <span className="text-left text-xs leading-tight">
            <span className="block font-semibold text-charcoal">{user?.name ?? "Unknown"}</span>
            <span className="block text-charcoal/50">{user?.roles?.[0] ?? "No role"}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-charcoal/40" />
        </button>
        {accountOpen && (
          <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-black/5 bg-white p-1.5 card-elevation">
            <div className="px-2.5 py-2 text-xs text-charcoal/60">{user?.email}</div>
            <button
              onClick={() => logout().then(() => router.replace("/login"))}
              className="focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-charcoal hover:bg-[color:var(--color-light-grey)]"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
