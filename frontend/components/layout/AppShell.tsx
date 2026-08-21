"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAutoLock } from "@/hooks/useAutoLock";
import { LockScreen } from "@/components/auto-lock/LockScreen";
import { api } from "@/lib/api";

function getInitials(name?: string) {
  if (!name) return "ME";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isLocked, lock, unlock } = useAutoLock();

  useEffect(() => {
    if (!user) return;
    api.notifications
      .list()
      .then((items) => {
        const count = (items || []).filter((n) => !n.read).length;
        setUnreadCount(count);
      })
      .catch(() => {});
  }, [user, path]);

  if (loading) {
    return (
      <main className="min-h-screen p-3 sm:p-5 lg:p-7">
        <div className="app-frame relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1580px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[17px] bg-[var(--accent-soft)] text-[var(--accent)] animate-pulse">
              <LockKeyhole size={22} strokeWidth={2.2} />
            </div>
            <p className="text-xs font-semibold text-[var(--muted)]">Authenticating secure session…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const baseLinks = [
    ["/dashboard", "Overview", LayoutDashboard],
    ["/vault", "Credentials", KeyRound],
    ["/activity", "Activity", Activity],
    ["/security", "Security", ShieldCheck],
  ] as const;

  const adminLinks =
    user?.role === "SUPER_ADMIN"
      ? ([["/admin/users", "Admin", Users]] as const)
      : [];

  const trailingLinks = [["/settings", "Settings", Settings]] as const;

  const allLinks = [...baseLinks, ...adminLinks, ...trailingLinks];

  async function handleConfirmLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  }

  const nav = (
    <nav className="space-y-1.5">
      {allLinks.map(([href, label, Icon]) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`nav-pill flex items-center gap-3 rounded-[16px] px-3.5 py-3 text-sm font-medium ${
              active ? "nav-pill-active" : ""
            }`}
          >
            <Icon size={17} strokeWidth={active ? 2.3 : 1.8} />
            <span>{label}</span>
            {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <main className="h-screen overflow-hidden p-3 sm:p-5 lg:p-7">
      <div className="app-frame relative mx-auto flex h-full max-w-[1580px] overflow-hidden">
        {/* Mobile backdrop */}
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />

        <aside
          className={`fixed left-3 top-3 bottom-3 z-40 flex w-[248px] shrink-0 flex-col rounded-[24px] border border-[var(--line)] bg-[var(--surface-solid)] p-5 shadow-2xl transition-transform duration-200 ease-out md:relative md:inset-auto md:flex md:rounded-none md:border-r md:border-t-0 md:border-b-0 md:border-l-0 md:shadow-none md:translate-x-0 md:bg-[var(--surface-strong)] ${
            open ? "translate-x-0" : "-translate-x-[calc(100%+2rem)] md:translate-x-0"
          }`}
          style={{ willChange: 'transform', overflow: 'hidden' }}
        >
          <div className="mb-9 flex items-center gap-3 px-2">
            <div className="grid h-11 w-11 place-items-center rounded-[17px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)] shadow-md shadow-[var(--accent)]/10">
              <LockKeyhole size={19} strokeWidth={2.2} className="text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight">Vaultly</div>
              <div className="mt-0.5 text-[11px] font-medium text-[var(--subtle)]">
                Private secure vault
              </div>
            </div>
            <button
              className="icon-button ml-auto h-9 w-9 md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--subtle)]">
            Workspace
          </div>
          {nav}

          <div className="mt-auto pt-8">
            <div className="mb-4 rounded-[22px] border border-white/40 dark:border-white/10 bg-gradient-to-br from-white/70 via-white/40 to-white/20 dark:from-white/10 dark:via-white/5 dark:to-transparent p-4 shadow-sm transition-all duration-200 hover:border-[var(--accent)]/40 hover:shadow-[0_12px_28px_rgba(239,106,79,0.10)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Vault Protected
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                  ACTIVE
                </span>
              </div>

              <div className="mt-3.5 space-y-2 border-t border-[var(--line)]/60 pt-3 text-[11px]">
                <div className="flex items-center justify-between rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 border border-black/[0.04] dark:border-white/5">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--muted)]">
                    <ShieldCheck size={13} className="text-[var(--accent)]" /> Encryption
                  </span>
                  <span className="font-semibold font-mono text-[var(--text)]">AES-256-GCM</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 border border-black/[0.04] dark:border-white/5">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--muted)]">
                    <LockKeyhole size={13} className="text-emerald-500" /> 2FA / TOTP
                  </span>
                  <span className={`font-semibold ${user?.mfaEnabled ? "text-emerald-500" : "text-[var(--accent)]"}`}>
                    {user?.mfaEnabled ? "Enabled ✓" : "Recommended"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 border border-black/[0.04] dark:border-white/5">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--muted)]">
                    <Fingerprint size={13} className="text-purple-500 dark:text-purple-400" /> Passkeys
                  </span>
                  <span className="font-semibold text-emerald-500 font-mono">WebAuthn</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 border border-black/[0.04] dark:border-white/5">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--muted)]">
                    <Activity size={13} className="text-sky-500" /> Session Guard
                  </span>
                  <span className="font-semibold text-emerald-500 font-mono">HttpOnly</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="nav-pill flex w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-sm font-medium"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </div>
        </aside>

        <section
          className="relative min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
          style={{ contain: 'content' }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/35 to-transparent" />

          <header
            className="glass-header sticky top-0 z-20 flex min-h-[78px] items-center gap-3 px-4 sm:px-6 lg:px-8"
          >
            <button
              className="icon-button h-10 w-10 md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            <div className="hidden items-center gap-1 md:flex">
              <span className="text-xs font-semibold text-[var(--muted)]">
                Workspace
              </span>
              <ChevronRight size={13} className="text-[var(--subtle)]" />
              <span className="text-xs font-semibold text-[var(--text)]">
                {allLinks.find(
                  ([href]) => path === href || path.startsWith(`${href}/`)
                )?.[1] || "Vault"}
              </span>
            </div>

            <div className="flex-1" />

            <Link
              href="/settings"
              className="icon-button relative h-10 w-10 flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] ring-2 ring-[var(--surface)] animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={lock}
              className="icon-button h-10 w-10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
              title="Lock Vault Now"
              aria-label="Lock Vault"
            >
              <LockKeyhole size={18} />
            </button>
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] py-1 pl-1 pr-3 shadow-sm">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--text)] text-[10px] font-bold text-[var(--page)]">
                {getInitials(user?.name)}
              </div>
              <div className="hidden sm:block">
                <div className="text-[11px] font-semibold leading-4">
                  {user?.name || "My vault"}
                </div>
                <div className="text-[10px] text-[var(--subtle)]">
                  Secure session
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </section>
      </div>

      {isLocked && <LockScreen onUnlock={unlock} />}

      <Modal
        open={showLogoutModal}
        title="Sign out?"
        onClose={() => !loggingOut && setShowLogoutModal(false)}
      >
        <p className="text-sm text-[var(--muted)]">
          Your current session will be ended on this device.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowLogoutModal(false)}
            disabled={loggingOut}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={loggingOut}
            onClick={handleConfirmLogout}
          >
            Sign out
          </Button>
        </div>
      </Modal>
    </main>
  );
}
