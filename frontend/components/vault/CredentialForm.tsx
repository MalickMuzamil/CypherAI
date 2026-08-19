"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Dices, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import type { Credential, CredentialCategory } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

const categories: CredentialCategory[] = [
  "EMAIL",
  "SOCIAL",
  "BANK",
  "CLOUD",
  "DATABASE",
  "SERVER",
  "VPN",
  "API",
  "OTHER",
];

export function CredentialForm({
  mode,
  credentialId,
}: {
  mode: "create" | "edit";
  credentialId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Credential>>({
    name: "",
    username: "",
    password: "",
    category: "OTHER",
    url: "",
    notes: "",
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (mode === "edit" && credentialId) {
      api.credentials
        .get(credentialId)
        .then((data) => {
          // Load only editable fields — strip backend-generated fields
          // (id, createdAt, updatedAt, lastUsedAt) so they never reach the DTO
          setForm({
            name: data.name,
            username: data.username,
            category: data.category,
            url: data.url,
            notes: data.notes,
            password: "", // keep blank — user must explicitly type to change password
          });
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [mode, credentialId]);

  function update<K extends keyof Credential>(key: K, value: Credential[K]) {
    setForm((v) => ({ ...v, [key]: value }));
  }

  async function generate() {
    try {
      const r = await api.credentials.generate({ length: 24 });
      update("password", r.password);
    } catch {
      showToast("Unable to generate password", "error");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Only send fields the backend DTO allows — never include id, createdAt, updatedAt, lastUsedAt
    const clean: Record<string, unknown> = {
      name: form.name,
      username: form.username,
      category: form.category,
      url: form.url?.trim() ? form.url.trim() : undefined,
      notes: form.notes ?? undefined,
    };

    if (mode === "create") {
      // Password required on create
      clean.password = form.password;
    } else {
      // On edit: only send password if user typed something new
      // If left blank → backend keeps the existing encrypted password unchanged
      if (form.password && form.password.trim().length > 0) {
        clean.password = form.password;
      }
    }

    try {
      if (mode === "create") {
        await api.credentials.create(clean);
      } else {
        await api.credentials.update(credentialId!, clean);
      }
      showToast(
        mode === "create"
          ? "Credential created successfully"
          : "Credential updated successfully",
        "success",
        "Vault updated"
      );
      router.push("/vault");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        {/* Page header skeleton */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end animate-pulse">
          <div className="flex-1">
            <div className="h-4 w-24 rounded-full bg-black/10 dark:bg-white/10 mb-3" />
            <div className="h-8 w-48 rounded-xl bg-black/10 dark:bg-white/10 mb-2" />
            <div className="h-4 w-64 rounded-lg bg-black/5 dark:bg-white/5" />
          </div>
        </div>
        {/* Form skeleton */}
        <Card className="space-y-5 animate-pulse">
          <div className="h-12 w-full rounded-xl bg-black/5 dark:bg-white/5" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-12 rounded-xl bg-black/5 dark:bg-white/5" />
            <div className="h-12 rounded-xl bg-black/5 dark:bg-white/5" />
          </div>
          <div className="h-12 w-full rounded-xl bg-black/5 dark:bg-white/5" />
          <div className="h-12 w-full rounded-xl bg-black/5 dark:bg-white/5" />
          <div className="h-24 w-full rounded-xl bg-black/5 dark:bg-white/5" />
          <div className="flex justify-end gap-2 pt-2">
            <div className="h-10 w-20 rounded-xl bg-black/5 dark:bg-white/5" />
            <div className="h-10 w-32 rounded-xl bg-black/10 dark:bg-white/10" />
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* ── Page header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Link
            href="/vault"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            <ArrowLeft size={14} /> Back to vault
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
              <KeyRound size={12} />{" "}
              {mode === "create" ? "New Credential" : "Edit Credential"}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "create" ? "Add credential" : "Edit credential"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            All values are encrypted end-to-end before being stored in your
            vault.
          </p>
        </div>
      </div>

      {/* ── Form ── full width */}
      <form onSubmit={save} className="w-full">
        <Card className="space-y-5">
          {/* Credential name */}
          <Input
            label="Credential name"
            placeholder="e.g. Google Workspace, AWS Console, GitHub"
            required
            value={form.name || ""}
            onChange={(e) => update("name", e.target.value)}
          />

          {/* Username + Category */}
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Username / email"
              placeholder="e.g. user@example.com or admin"
              required
              value={form.username || ""}
              onChange={(e) => update("username", e.target.value)}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) =>
                update("category", e.target.value as CredentialCategory)
              }
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          {/* URL */}
          <Input
            label="Website / URL (Optional)"
            type="text"
            placeholder="e.g. https://github.com/login"
            value={form.url || ""}
            onChange={(e) => update("url", e.target.value)}
          />

          {/* Password */}
          <div>
            <label className="label">
              Password
              {mode === "edit" && (
                <span className="ml-2 text-[10px] font-normal text-[var(--muted)]">
                  — leave blank to keep existing password
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  suppressHydrationWarning
                  className="field pr-10"
                  type={show ? "text" : "password"}
                  placeholder={
                    mode === "edit"
                      ? "Leave blank to keep existing password"
                      : "Enter or generate a strong password"
                  }
                  required={mode === "create"}
                  value={form.password || ""}
                  onChange={(e) => update("password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  title={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={generate}
                className="shrink-0"
              >
                <Dices size={16} /> Generate
              </Button>
            </div>
          </div>

          {/* Notes */}
          <Textarea
            label="Notes"
            placeholder="Additional notes, recovery codes, server ports (Optional)..."
            value={form.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
          />

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--line)]" />

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--subtle)]">
              🔒 Encrypted with AES-256-GCM before transit
            </p>
            <div className="flex gap-2">
              <Link href="/vault">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button loading={saving} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  "Save credential"
                ) : (
                  "Update credential"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </AppShell>
  );
}