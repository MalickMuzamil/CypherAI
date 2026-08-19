"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import type { BreachStatusResponse } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

export function BreachMonitor() {
  const [status, setStatus] = useState<BreachStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const { showToast } = useToast();

  async function loadStatus() {
    setLoading(true);
    try {
      const data = await api.breach.getStatus();
      setStatus(data);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to load breach monitoring status",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    try {
      const data = await api.breach.check();
      setStatus(data);
      if (data.pwnedPasswordCount > 0) {
        showToast(
          `Scan finished: Discovered ${data.pwnedPasswordCount} compromised passwords.`,
          "warning",
          "Compromised Passwords"
        );
      } else {
        showToast(
          "Great news! No compromised passwords found.",
          "success",
          "Vault Clean"
        );
      }
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Breach scan failed",
        "error",
        "Scan Error"
      );
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const pwnedCount = status?.pwnedPasswordCount || 0;
  const isBreached = pwnedCount > 0;
  const neverChecked = !status?.checkedAt || new Date(status.checkedAt).getFullYear() <= 1970;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-10 w-10 place-items-center rounded-[14px] ${
              isBreached
                ? "bg-rose-500/10 text-rose-400"
                : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {isBreached ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--text)]">Breach Monitoring</h2>
              {neverChecked ? (
                <Badge tone="neutral">Not Scanned</Badge>
              ) : isBreached ? (
                <Badge tone="danger">Compromised Passwords</Badge>
              ) : (
                <Badge tone="success">No Known Compromises</Badge>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">
              Free Pwned Passwords k-anonymity checks for compromised credentials.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          loading={scanning}
          onClick={handleScan}
          className="shrink-0 text-xs"
        >
          <Search size={13} className="mr-1.5" /> Check for Breaches
        </Button>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-[var(--muted)]">Loading breach monitoring status…</p>
      ) : (
        <>
          {/* Summary Status Box */}
          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-solid)] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--muted)]">Account Email:</span>
                <span className="font-mono font-semibold text-[var(--text)]">{status?.email}</span>
              </div>
              <div className="text-[11px] text-[var(--subtle)]">
                {neverChecked
                  ? "Last checked: Never"
                  : `Last scanned: ${new Date(status!.checkedAt).toLocaleString()}`}
              </div>
            </div>

            <div className="mt-3.5">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--subtle)]">
                  Compromised Passwords Found
                </span>
                <div className="mt-1 text-xl font-bold font-mono text-[var(--text)]">
                  {pwnedCount}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
