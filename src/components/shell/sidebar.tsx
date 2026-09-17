"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileStack,
  ListChecks,
  Radar,
  History,
  Settings,
  HelpCircle,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Executive View", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: FileStack },
  { href: "/my-work", label: "My Work", icon: ListChecks },
  { href: "/intelligence", label: "Credit Intelligence", icon: Radar },
  { href: "/audit", label: "Audit Trail", icon: History },
  { href: "/configuration", label: "Configuration", icon: Settings },
  { href: "/help", label: "Help & TBC Register", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-full w-60 shrink-0 flex-col overflow-hidden bg-primary text-white">
      <div className="relative z-10 px-5 pt-6 pb-4">
        <div className="text-lg font-extrabold leading-tight">BisB</div>
        <div className="text-lg font-extrabold leading-tight -mt-1">Credit Command</div>
      </div>

      <nav className="relative z-10 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 px-5 pb-6 pt-4 text-[11px] leading-snug text-white/55">
        Financing
        <br />a more prosperous
        <br />
        Bahrain
      </div>

      {/* Subtle geometric screen motif toward the bottom, evoking the
          reference's restrained Islamic geometric pattern without an
          external image asset. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-64 w-full opacity-[0.10]"
        viewBox="0 0 240 260"
        fill="none"
      >
        <defs>
          <pattern id="geo" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M20 0 L40 20 L20 40 L0 20 Z"
              stroke="white"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="20" cy="20" r="6" stroke="white" strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <rect width="240" height="260" fill="url(#geo)" />
      </svg>
    </aside>
  );
}
