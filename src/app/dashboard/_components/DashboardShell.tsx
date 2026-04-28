"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Box,
  Camera,
  Link2,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";

type Profile = {
  display_name: string | null;
  plan: string | null;
  brand_name: string | null;
} | null;

const NAV = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/models", label: "Mes Modèles", icon: Box },
  { href: "/dashboard/scan", label: "Nouveau Scan", icon: Camera },
  { href: "/dashboard/links", label: "Mes Liens", icon: Link2 },
  { href: "/dashboard/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export default function DashboardShell({
  user,
  profile,
  children,
}: {
  user: { id: string; email: string };
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname?.startsWith(href);

  const sidebar = (
    <aside className="w-64 shrink-0 bg-bg-2 border-r border-[rgba(15,16,36,0.08)] flex flex-col h-screen sticky top-0">
      <div className="p-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="inline-block h-7 w-7 rounded-lg bg-linear-to-br from-[#6C63FF] to-[#00D4FF]" />
          <span>ScanAR</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[rgba(108,99,255,0.10)] text-primary font-medium"
                  : "text-muted hover:bg-[rgba(15,16,36,0.04)] hover:text-fg"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 space-y-1 border-t border-[rgba(15,16,36,0.08)]">
        <div className="px-3 py-2 text-xs">
          <p className="text-muted">Plan actuel</p>
          <p className="font-semibold capitalize gradient-text">
            {profile?.plan ?? "free"}
          </p>
        </div>
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-linear-to-br from-[#6C63FF] to-[#00D4FF] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {(profile?.display_name || user.email)[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.display_name || user.email.split("@")[0]}
            </p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-[rgba(15,16,36,0.04)] hover:text-fg transition"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar desktop */}
      <div className="hidden md:block">{sidebar}</div>

      {/* Sidebar mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile) */}
        <header className="md:hidden sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-[rgba(15,16,36,0.08)] px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 -ml-2 rounded-lg hover:bg-[rgba(15,16,36,0.05)] transition"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-bold absolute left-1/2 -translate-x-1/2">
            <span className="inline-block h-6 w-6 rounded-md bg-linear-to-br from-[#6C63FF] to-[#00D4FF]" />
            <span>ScanAR</span>
          </Link>
          {/* Spacer for centering */}
          <div className="w-9" />
        </header>

        <main className="flex-1 px-4 md:px-8 py-5 md:py-10 max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
