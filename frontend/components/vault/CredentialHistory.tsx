"use client";

import { useEffect, useState } from "react";
import {
  History,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Clock,
  Check,
  Calendar,
  Layers,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Credential, CredentialHistoryVersion } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface CredentialHistoryProps {
  credential: Credential;
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function CredentialHistory({
  credential,
  open,
  onClose,
  onRestored,
}: CredentialHistoryProps) {
  const [history, setHistory] = useState<CredentialHistoryVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});
  const [revealingVersion, setRevealingVersion] = useState<number | null>(null);
  const [copiedVersion, setCopiedVersion] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.credentials
        .history(credential.id)
        .then((data) => setHistory(data || []))
        .catch((e) => showToast(e.message, "error"))
        .finally(() => setLoading(false));
    }
  }, [open, credential.id]);

  async function handleRevealPassword(version: number) {
    if (revealedPasswords[version]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[version];
        return next;
      });
      return;
    }

    setRevealingVersion(version);
    try {
      const res = await api.credentials.revealHistoryPassword(credential.id, version);
      setRevealedPasswords((prev) => ({ ...prev, [version]: res.password }));
      showToast(`Password revealed for version ${version}`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to reveal historical password", "error");
    } finally {
      setRevealingVersion(null);
    }
  }

  async function handleCopyPassword(version: number) {
    let pwd = revealedPasswords[version];
    if (!pwd) {
      try {
        const res = await api.credentials.revealHistoryPassword(credential.id, version);
        pwd = res.password;
        setRevealedPasswords((prev) => ({ ...prev, [version]: res.password }));
      } catch {
        showToast("Failed to retrieve password for copying", "error");
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(pwd);
      setCopiedVersion(version);
      showToast("Historical password copied to clipboard", "success");
      setTimeout(() => setCopiedVersion(null), 2000);
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
  }

  async function handleRestore(version: number) {
    setRestoringVersion(version);
    try {
      await api.credentials.restoreVersion(credential.id, version);
      showToast(`Credential restored to Version ${version}`, "success", "Version Restored");
      onRestored();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to restore version", "error");
    } finally {
      setRestoringVersion(null);
    }
  }

  return (
    <Modal
      open={open}
      title={`Version History — ${credential.name}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--muted)]">
          Audit trail and encrypted snapshots of every modification made to this credential.
        </p>

        {loading ? (
          <p className="text-sm text-[var(--muted)] py-4">Loading version history…</p>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-xs text-[var(--muted)]">
            No past versions found for this credential.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {history.map((h, index) => {
              const isCurrent = index === 0;
              const isRevealed = Boolean(revealedPasswords[h.version]);
              const pwd = revealedPasswords[h.version] || "••••••••••••••••";

              return (
                <div
                  key={h.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isCurrent
                      ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]/10"
                      : "border-[var(--line)] bg-[var(--surface-solid)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[var(--text)]">
                        v{h.version}
                      </span>
                      {isCurrent && <Badge tone="success">Current Active</Badge>}
                      <Badge tone={h.changeType === "RESTORE" ? "warning" : "neutral"}>
                        {h.changeType}
                      </Badge>
                    </div>

                    <span className="text-[11px] text-[var(--subtle)] flex items-center gap-1">
                      <Calendar size={12} /> {new Date(h.changedAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                        Username / Login
                      </span>
                      <div className="font-medium text-[var(--text)] truncate">{h.username}</div>
                    </div>
                    {h.url && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                          URL
                        </span>
                        <div className="font-medium text-[var(--text)] truncate">{h.url}</div>
                      </div>
                    )}
                  </div>

                  {/* Password reveal & actions for this version */}
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-2.5 text-xs">
                    <code className="font-mono text-xs text-[var(--text)] truncate flex-1 select-all">
                      {pwd}
                    </code>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRevealPassword(h.version)}
                        disabled={revealingVersion === h.version}
                        className="p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors rounded-lg"
                        title={isRevealed ? "Hide password" : "Show password"}
                      >
                        {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyPassword(h.version)}
                        className="p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors rounded-lg"
                        title="Copy password"
                      >
                        {copiedVersion === h.version ? (
                          <Check size={15} className="text-emerald-400" />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Restore Button (only if not already the latest current active version) */}
                  {!isCurrent && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={restoringVersion === h.version}
                        disabled={restoringVersion !== null}
                        onClick={() => handleRestore(h.version)}
                        className="text-xs"
                      >
                        <RotateCcw size={13} className="mr-1.5" /> Restore to v{h.version}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close History
          </Button>
        </div>
      </div>
    </Modal>
  );
}
