"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Copy,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Lock,
  UserCheck,
  FileText,
  Clock,
  Check,
  History,
  Share2,
  Users,
  KeyRound,
  Mail,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import type { Credential, CredentialShare as ShareType } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { CredentialHistory } from "./CredentialHistory";
import { CredentialShareModal } from "./CredentialShare";

export function VaultPage() {
  const [activeTab, setActiveTab] = useState<"my-vault" | "shared-with-me">("my-vault");
  const [items, setItems] = useState<Credential[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<ShareType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingShared, setLoadingShared] = useState(false);
  const [error, setError] = useState("");
  const [credentialToDelete, setCredentialToDelete] = useState<Credential | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const { showToast } = useToast();

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const data = await api.credentials.list(q);
      setItems(data || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSharedWithMe = useCallback(async () => {
    setLoadingShared(true);
    try {
      const data = await api.shares.list();
      setSharedWithMe(data.sharedWithMe || []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingShared(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search, load]);

  useEffect(() => {
    if (activeTab === "shared-with-me") {
      loadSharedWithMe();
    }
  }, [activeTab, loadSharedWithMe]);

  async function confirmDelete() {
    if (!credentialToDelete) return;
    setDeleting(true);
    try {
      await api.credentials.remove(credentialToDelete.id);
      setItems((v) => v.filter((x) => x.id !== credentialToDelete.id));
      showToast("Credential deleted successfully.", "success", "Vault Updated");
      setCredentialToDelete(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete credential";
      showToast(msg, "error", "Delete Failed");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">Credentials</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Encrypted credentials protected with zero-knowledge vault security.
          </p>
        </div>
        <Link
          href="/vault/new"
          className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(239,106,79,.18)] hover:bg-[var(--accent-strong)] transition-colors"
        >
          <Plus size={17} /> Add credential
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-[var(--line)] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("my-vault")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "my-vault"
              ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/15"
              : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
          }`}
        >
          <KeyRound size={15} /> My Vault ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shared-with-me")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "shared-with-me"
              ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/15"
              : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
          }`}
        >
          <Users size={15} /> Shared with Me {sharedWithMe.length > 0 && `(${sharedWithMe.length})`}
        </button>
      </div>

      {activeTab === "my-vault" ? (
        <>
          <div className="relative mb-5">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={17}
            />
            <input
              suppressHydrationWarning
              className="field pl-10"
              placeholder="Search by name, username, URL, or category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="flex flex-col justify-between p-5 space-y-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 rounded-lg bg-black/10 dark:bg-white/10" />
                    <div className="h-5 w-16 rounded-full bg-black/10 dark:bg-white/10" />
                  </div>
                  <div className="h-11 w-full rounded-xl bg-black/5 dark:bg-white/5" />
                  <div className="h-11 w-full rounded-xl bg-black/5 dark:bg-white/5" />
                  <div className="flex justify-between pt-2 border-t border-[var(--line)]">
                    <div className="h-7 w-20 rounded-lg bg-black/5 dark:bg-white/5" />
                    <div className="h-7 w-14 rounded-lg bg-black/5 dark:bg-white/5" />
                  </div>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">
                {search ? "No matching credentials found." : "No credentials found in vault."}
              </p>
            </Card>
          ) : (
            <>
              <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
                <div className="grid gap-4 min-w-[280px] sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {paginatedItems.map((item) => (
                    <CredentialCard
                      key={item.id}
                      item={item}
                      onDelete={() => setCredentialToDelete(item)}
                      onReload={() => load(search)}
                    />
                  ))}
                </div>
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={items.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
                itemName="credentials"
              />
            </>
          )}
        </>
      ) : (
        <SharedWithMeView
          shares={sharedWithMe}
          loading={loadingShared}
          onReload={loadSharedWithMe}
        />
      )}

      {/* Delete Credential Confirmation Dialog */}
      <Modal
        open={Boolean(credentialToDelete)}
        title="Delete credential?"
        onClose={() => !deleting && setCredentialToDelete(null)}
      >
        <p className="text-sm text-[var(--muted)]">
          Are you sure you want to delete{" "}
          <strong className="text-[var(--text)]">
            {credentialToDelete?.name}
          </strong>
          ?
        </p>
        <p className="mt-2 text-xs text-rose-300/90">
          This encrypted credential will be permanently removed from your vault.
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={deleting}
            onClick={() => setCredentialToDelete(null)}
          >
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            Delete credential
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}

const CredentialCard = React.memo(function CredentialCard({
  item,
  onDelete,
  onReload,
}: {
  item: Credential;
  onDelete: () => void;
  onReload: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [pendingAction, setPendingAction] = useState<"reveal" | "copy" | null>(null);

  // Modals for History and Share
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { showToast } = useToast();

  function categoryBadgeTone(cat: string) {
    switch (cat) {
      case "BANK":
        return "warning";
      case "EMAIL":
      case "SOCIAL":
      case "DATABASE":
      case "SERVER":
      case "CLOUD":
      default:
        return "neutral";
    }
  }

  function handlePromptUnlock(action: "reveal" | "copy") {
    if (revealed && password) {
      if (action === "reveal") {
        setRevealed(false);
      } else {
        doCopyPassword(password);
      }
      return;
    }
    setPendingAction(action);
    setMasterPasswordInput("");
    setSecurityError("");
    setShowSecurityModal(true);
  }

  async function handleVerifyUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!masterPasswordInput.trim()) {
      setSecurityError("Please enter your Master Password / PIN");
      return;
    }

    setLoading(true);
    setSecurityError("");
    try {
      await api.auth.verifyPassword(masterPasswordInput);
      const r = await api.credentials.reveal(item.id);
      setPassword(r.password);
      setRevealed(true);
      setShowSecurityModal(false);
      showToast("Password unlocked securely", "success");

      if (pendingAction === "copy") {
        await doCopyPassword(r.password);
      }

      setTimeout(() => {
        setRevealed(false);
      }, 30000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Incorrect master password";
      setSecurityError(msg);
      showToast(msg, "error", "Verification Failed");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }

  async function doCopyPassword(pwd: string) {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopiedPass(true);
      showToast("Password copied to clipboard", "success");
      setTimeout(() => setCopiedPass(false), 2000);
    } catch {
      showToast("Unable to copy password", "error");
    }
  }

  async function copyUsername() {
    if (!item.username) return;
    try {
      await navigator.clipboard.writeText(item.username);
      setCopiedUser(true);
      showToast("Username copied to clipboard", "success");
      setTimeout(() => setCopiedUser(false), 2000);
    } catch {
      showToast("Unable to copy username", "error");
    }
  }

  const formattedUrl = item.url
    ? item.url.startsWith("http://") || item.url.startsWith("https://")
      ? item.url
      : `https://${item.url}`
    : "";

  return (
    <>
      <Card className="flex flex-col justify-between transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/20 hover:shadow-lg hover:shadow-[var(--accent)]/10">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-[var(--text)]" title={item.name}>
                {item.name}
              </h2>
              {formattedUrl ? (
                <a
                  href={formattedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline truncate max-w-full"
                >
                  <span className="truncate">{item.url}</span>
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              ) : (
                <span className="mt-0.5 inline-block text-xs font-medium text-[var(--subtle)]">
                  URL: <span className="italic">Not provided</span>
                </span>
              )}
            </div>
            <Badge tone={categoryBadgeTone(item.category)}>{item.category}</Badge>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">Username</span>
              <div className="truncate font-medium text-[var(--text)]">{item.username || "—"}</div>
            </div>
            {item.username && (
              <button
                type="button"
                onClick={copyUsername}
                className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                title="Copy username"
              >
                {copiedUser ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)] mb-1">
              <span>Password</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck size={12} /> AES-256
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-sm font-mono text-[var(--text)] select-all">
                {revealed ? password : "••••••••••••••••"}
              </code>
              <button
                type="button"
                onClick={() => handlePromptUnlock("reveal")}
                className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors rounded-lg hover:bg-white/5"
                title={revealed ? "Hide password" : "Show password (Requires master authorization)"}
              >
                {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                type="button"
                onClick={() => handlePromptUnlock("copy")}
                className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors rounded-lg hover:bg-white/5"
                title="Copy password (Requires master authorization)"
              >
                <Copy size={16} className={copiedPass ? "text-emerald-400" : ""} />
              </button>
            </div>
          </div>

          {item.notes && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.02] p-2.5 text-xs text-[var(--muted)]">
              <FileText size={14} className="mt-0.5 shrink-0 text-[var(--subtle)]" />
              <p className="line-clamp-2 italic text-[11px]">{item.notes}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-[11px] text-[var(--subtle)]">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </span>
            {item.lastUsedAt && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Used: {new Date(item.lastUsedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 pt-1">
          <Link href={`/vault/${item.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full text-xs">
              Edit
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowHistoryModal(true)}
            title="Version history"
            className="shrink-0 px-2.5"
          >
            <History size={14} />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowShareModal(true)}
            title="Share credential"
            className="shrink-0 px-2.5"
          >
            <Share2 size={14} />
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            title="Delete credential"
            className="shrink-0 px-2.5"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </Card>

      {showHistoryModal && (
        <CredentialHistory
          credential={item}
          open={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onRestored={onReload}
        />
      )}

      {showShareModal && (
        <CredentialShareModal
          credential={item}
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <Modal
        open={showSecurityModal}
        title="Security Authorization Required"
        onClose={() => !loading && setShowSecurityModal(false)}
      >
        <form onSubmit={handleVerifyUnlock} className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
            <Lock size={20} className="shrink-0" />
            <p className="text-xs text-[var(--text)]">
              To protect your sensitive credentials, please enter your password to authorize decryption of <strong>{item.name}</strong>.
            </p>
          </div>

          <Input
            label="Master Password / PIN"
            type="password"
            placeholder="Enter password to authorize"
            required
            autoFocus
            value={masterPasswordInput}
            onChange={(e) => setMasterPasswordInput(e.target.value)}
            error={securityError}
          />

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => setShowSecurityModal(false)}
            >
              Cancel
            </Button>
            <Button loading={loading}>Authorize & Unlock</Button>
          </div>
        </form>
      </Modal>
    </>
  );
});

const SharedWithMeView = React.memo(function SharedWithMeView({
  shares,
  loading,
  onReload,
}: {
  shares: ShareType[];
  loading: boolean;
  onReload: () => void;
}) {
  const [revealedShareId, setRevealedShareId] = useState<string | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string>("");
  const [revealing, setRevealing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleAccept(id: string) {
    setActionLoading(id);
    try {
      await api.shares.accept(id);
      showToast("Shared credential accepted into your workspace", "success");
      onReload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to accept share", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(id: string) {
    setActionLoading(id);
    try {
      await api.shares.decline(id);
      showToast("Shared credential declined", "info");
      onReload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to decline share", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReveal(id: string) {
    if (revealedShareId === id) {
      setRevealedShareId(null);
      setRevealedPassword("");
      return;
    }

    setRevealing(true);
    try {
      const res = await api.shares.reveal(id);
      setRevealedShareId(id);
      setRevealedPassword(res.password);
      showToast("Decrypted shared password successfully", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to reveal shared password", "error");
    } finally {
      setRevealing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">Loading shared credentials…</p>
      </Card>
    );
  }

  if (shares.length === 0) {
    return (
      <Card className="text-center py-10">
        <Users size={32} className="mx-auto text-[var(--subtle)] mb-2" />
        <p className="text-sm font-semibold text-[var(--text)]">No shared credentials</p>
        <p className="text-xs text-[var(--muted)] mt-1">
          When colleagues or team members share credentials with you, they will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {shares.map((share) => {
        const cred = share.credential;
        const isRevealed = revealedShareId === share.id;

        return (
          <Card key={share.id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)] truncate">
                    {cred?.name || "Shared Credential"}
                  </h3>
                  <div className="mt-0.5 text-xs text-[var(--muted)] flex items-center gap-1">
                    <Mail size={12} /> From: <span className="text-[var(--text)]">{share.ownerName}</span>
                  </div>
                </div>
                <Badge tone={share.status === "ACCEPTED" ? "success" : "warning"}>
                  {share.status}
                </Badge>
              </div>

              {cred?.username && (
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-2.5 text-xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                    Username
                  </span>
                  <div className="font-medium text-[var(--text)] truncate">{cred.username}</div>
                </div>
              )}

              {share.status === "ACCEPTED" && (
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)] mb-1">
                    <span>Password</span>
                    <span className="text-emerald-400 font-mono">Shared Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-sm font-mono text-[var(--text)]">
                      {isRevealed ? revealedPassword : "••••••••••••••••"}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleReveal(share.id)}
                      disabled={revealing}
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors rounded-lg"
                      title={isRevealed ? "Hide password" : "Show password"}
                    >
                      {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-[var(--line)] pt-3 flex justify-between items-center">
              <span className="text-[10px] text-[var(--subtle)]">
                Permission: <strong>{share.permission}</strong>
              </span>

              {share.status === "PENDING" ? (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    loading={actionLoading === share.id}
                    onClick={() => handleAccept(share.id)}
                    className="text-xs"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actionLoading === share.id}
                    onClick={() => handleDecline(share.id)}
                    className="text-xs text-rose-400"
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                <Badge tone="success">Active Access</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
});