"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Send,
  Trash2,
  Mail,
  Share2,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Credential, CredentialShare as ShareType } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface CredentialShareProps {
  credential: Credential;
  open: boolean;
  onClose: () => void;
}

export const CredentialShareModal = React.memo(function CredentialShareModal({
  credential,
  open,
  onClose,
}: CredentialShareProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [permission, setPermission] = useState<"READ" | "READ_WRITE">("READ");
  const [expiresInDays, setExpiresInDays] = useState<string>("30");
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState<ShareType[]>([]);
  const [loadingShares, setLoadingShares] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const { showToast } = useToast();

  async function loadExistingShares() {
    setLoadingShares(true);
    try {
      const data = await api.shares.list();
      const relevant = (data.sharedByMe || []).filter(
        (s) => s.credentialId === credential.id
      );
      setShares(relevant);
    } catch {
      // ignore
    } finally {
      setLoadingShares(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadExistingShares();
      setRecipientEmail("");
    }
  }, [open, credential.id]);

  async function handleSendShare(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      showToast("Please enter a valid recipient email", "warning");
      return;
    }

    setSharing(true);
    try {
      let expiresAt: string | undefined = undefined;
      const days = parseInt(expiresInDays, 10);
      if (days > 0) {
        expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }

      await api.shares.create({
        credentialId: credential.id,
        recipientEmail: recipientEmail.trim(),
        permission,
        expiresAt,
      });

      showToast(
        `Share invitation sent to ${recipientEmail.trim()}`,
        "success",
        "Credential Shared"
      );
      setRecipientEmail("");
      await loadExistingShares();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to share credential",
        "error",
        "Sharing Failed"
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleRevoke(shareId: string) {
    setRevokingId(shareId);
    try {
      await api.shares.revoke(shareId);
      showToast("Share access revoked successfully", "success");
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to revoke share", "error");
    } finally {
      setRevokingId(null);
    }
  }

  function getStatusTone(status: string): "success" | "warning" | "danger" | "neutral" {
    switch (status) {
      case "ACCEPTED":
        return "success";
      case "PENDING":
        return "warning";
      case "DECLINED":
      case "REVOKED":
        return "danger";
      default:
        return "neutral";
    }
  }

  return (
    <Modal
      open={open}
      title={`Share Credential — ${credential.name}`}
      description="Securely grant authorization to another Vaultly user. The recipient can decrypt this credential only while authorized."
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Share Form */}
        <form onSubmit={handleSendShare} className="space-y-4">
          <Input
            label="Recipient Email"
            type="email"
            placeholder="user@example.com"
            required
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Access Level"
              value={permission}
              onChange={(e) => setPermission(e.target.value as "READ" | "READ_WRITE")}
            >
              <option value="READ">Read / View Only</option>
              <option value="READ_WRITE">Read & Edit</option>
            </Select>

            <Select
              label="Expires In"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            >
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="0">Never Expires</option>
            </Select>
          </div>

          <div className="pt-2 flex justify-end">
            <Button loading={sharing} disabled={sharing || !recipientEmail}>
              <Send size={15} className="mr-1.5" /> Send Share Invite
            </Button>
          </div>
        </form>

        {/* Existing Shares List */}
        <div className="border-t border-[var(--line)] pt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text)]">
              Active Shares
            </span>
            <Badge tone="neutral">{shares.length} active</Badge>
          </div>

          {loadingShares ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-10 w-full rounded-xl bg-white/5" />
              <div className="h-10 w-full rounded-xl bg-white/5" />
            </div>
          ) : shares.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line-strong)] p-4 text-center text-xs text-[var(--muted)]">
              This credential is not shared with anyone yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 text-xs transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-[var(--subtle)] shrink-0" />
                      <span className="font-semibold text-[var(--text)] truncate">{s.recipientEmail}</span>
                      <Badge tone={getStatusTone(s.status)}>{s.status}</Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      Permission: <span className="font-medium text-[var(--text)]">{s.permission === "READ" ? "Read Only" : "Read & Edit"}</span>
                      {s.expiresAt && ` · Expires: ${new Date(s.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevoke(s.id)}
                    disabled={revokingId === s.id}
                    className="flex items-center justify-center h-8 w-8 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all shrink-0"
                    title="Revoke access"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--line)] pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
});
