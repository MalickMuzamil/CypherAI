"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Fingerprint,
  KeyRound,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Credential, AuditEvent, DeviceSession } from "@/lib/types";

export function DashboardPage() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [activities, setActivities] = useState<AuditEvent[]>([]);
  const [passkeysCount, setPasskeysCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [credsRes, devsRes, auditRes, passkeysRes] = await Promise.allSettled([
          api.credentials.list(),
          api.devices.list(),
          api.audit.list(),
          api.passkeys.list(),
        ]);

        if (credsRes.status === "fulfilled") {
          setCredentials(credsRes.value || []);
        }
        if (devsRes.status === "fulfilled") {
          setDevices(devsRes.value || []);
        }
        if (auditRes.status === "fulfilled") {
          setActivities(auditRes.value || []);
        }
        if (passkeysRes.status === "fulfilled") {
          setPasskeysCount((passkeysRes.value || []).length);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const credCount = loading ? "…" : credentials.length.toString();
  const devCount = loading ? "…" : devices.length.toString();
  const actCount = loading ? "…" : activities.length.toString();

  const hasMfa = Boolean(user?.mfaEnabled);
  const hasPasskey = passkeysCount > 0;
  
  let securityScore = "65%";
  let securitySubtitle = "2FA & Passkey Recommended";
  if (hasMfa && hasPasskey) {
    securityScore = "100%";
    securitySubtitle = "2FA & Passkey Active";
  } else if (hasMfa) {
    securityScore = "90%";
    securitySubtitle = "2FA Active · Passkey Opt.";
  } else if (hasPasskey) {
    securityScore = "85%";
    securitySubtitle = "Passkey Active · 2FA Opt.";
  }

  return (
    <AppShell>
      <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">
            <Sparkles size={13} className="text-[var(--accent)]" /> Private
            workspace
          </div>
          <h1 className="text-[34px] font-bold tracking-[-.045em] sm:text-[40px]">
            Your secure vault.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Keep every credential organized, encrypted and available when you
            need it.
          </p>
        </div>
        <Link
          href="/vault/new"
          className="inline-flex w-fit items-center gap-2 rounded-[15px] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(239,106,79,.22)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
        >
          <Plus size={17} /> Add credential
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Credentials"
          value={credCount}
          subtitle={`${credentials.length} stored secrets`}
          icon={KeyRound}
          endpoint="/vault"
          tone="accent"
        />
        <Stat
          title="Security Score"
          value={loading ? "…" : securityScore}
          subtitle={securitySubtitle}
          icon={ShieldCheck}
          endpoint="/security"
        />
        <Stat
          title="Activity Events"
          value={actCount}
          subtitle={`${activities.length} logged events`}
          icon={Activity}
          endpoint="/activity"
        />
        <Stat
          title="Active Devices"
          value={devCount}
          subtitle={`${devices.length} authenticated session${devices.length === 1 ? '' : 's'}`}
          icon={Fingerprint}
          endpoint="/security"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="font-semibold">Vault overview</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Your protected workspace at a glance.
              </p>
            </div>
            <Link href="/vault" className="icon-button h-9 w-9" aria-label="View vault">
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <MiniMetric label="Stored secrets" value={credCount} />
            <MiniMetric label="Total activity" value={actCount} />
            <MiniMetric label="Active devices" value={devCount} />
          </div>
          <div className="mx-5 mb-5 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)]">
                Secure API connection
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{" "}
                Connected
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[.05] dark:bg-white/[.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-amber-300 transition-all duration-500"
                style={{ width: hasMfa || hasPasskey ? "100%" : "70%" }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
              HttpOnly sessions, encrypted credentials and backend authorization
              are active in this vault.
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-emerald-500/10 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-semibold">Security posture</h2>
              <p className="text-xs text-[var(--muted)]">
                Protection at every layer.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-xs text-[var(--muted)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                ✓
              </span>
              <span>HttpOnly authenticated sessions</span>
            </div>
            <div className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-xs text-[var(--muted)]">
              <span
                className={`grid h-5 w-5 place-items-center rounded-full ${
                  user?.mfaEnabled
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {user?.mfaEnabled ? "✓" : "!"}
              </span>
              <span>
                {user?.mfaEnabled
                  ? "MFA 2FA protection active"
                  : "MFA 2FA setup recommended"}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-xs text-[var(--muted)]">
              <span
                className={`grid h-5 w-5 place-items-center rounded-full ${
                  hasPasskey
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {hasPasskey ? "✓" : "!"}
              </span>
              <span>
                {hasPasskey
                  ? `Passkeys WebAuthn active (${passkeysCount})`
                  : "Passkey biometric setup available"}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-xs text-[var(--muted)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                ✓
              </span>
              <span>AES-256-GCM vault encryption</span>
            </div>
            <div className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-xs text-[var(--muted)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                ✓
              </span>
              <span>Immutable audit log & device tracking</span>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({
  title,
  value,
  subtitle,
  icon: Icon,
  endpoint,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  endpoint: string;
  tone?: "accent";
}) {
  return (
    <Link href={endpoint}>
      <Card
        className={`group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 ${
          tone === "accent"
            ? "!bg-gradient-to-br !from-[var(--accent)] !to-amber-500 !border-orange-500/30 text-white hover:!from-[var(--accent-strong)] hover:!to-amber-600 shadow-lg shadow-orange-500/20"
            : "hover:border-[var(--accent)]/40 hover:shadow-md"
        }`}
      >
        {tone === "accent" && (
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        )}
        <div className="relative flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${
              tone === "accent" ? "text-white/90" : "text-[var(--muted)]"
            }`}
          >
            {title}
          </span>
          <span
            className={`grid h-9 w-9 place-items-center rounded-[12px] ${
              tone === "accent"
                ? "bg-white/20 text-white"
                : "bg-[var(--surface)] border border-[var(--line)]"
            }`}
          >
            <Icon size={17} />
          </span>
        </div>
        <div className="relative mt-5 text-3xl font-bold tracking-[-.04em]">
          {value}
        </div>
        <div
          className={`relative mt-1 text-[11px] ${
            tone === "accent" ? "text-white/80" : "text-[var(--subtle)]"
          }`}
        >
          {subtitle}
        </div>
      </Card>
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="text-[11px] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-[-.04em]">{value}</div>
    </div>
  );
}
