"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, LogOut, Fingerprint } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { startAuthentication } from "@simplewebauthn/browser";

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);

  useEffect(() => {
    if (user?.email) {
      api.passkeys
        .check(user.email)
        .then((res) => setHasPasskey(Boolean(res.hasPasskey)))
        .catch(() => setHasPasskey(false));
    }
  }, [user?.email]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your master password to unlock.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!user?.email) throw new Error("No active user session");

      // Verify the master password directly without creating a new session or altering cookies
      await api.auth.verifyPassword(password);

      showToast("Vault unlocked successfully", "success", "Welcome Back");
      setPassword("");
      onUnlock();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Incorrect master password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyUnlock() {
    if (!user?.email) return;
    setPasskeyLoading(true);
    setError("");
    try {
      const options = await api.passkeys.beginAuthentication(user.email);
      const authResult = await startAuthentication({ optionsJSON: options });
      await api.passkeys.finishAuthentication(authResult);
      showToast("Vault unlocked via Passkey", "success", "Welcome Back");
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey verification failed");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 modal-backdrop-animate">
      <div className="modal-panel-animate relative w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--line-strong)] bg-[var(--surface-solid)] p-8 shadow-[var(--shadow)]">
        {/* Ambient glow effects */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[var(--accent)]/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 grid h-16 w-16 place-items-center rounded-[22px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)] shadow-xl shadow-[var(--accent)]/15">
            <Lock size={28} strokeWidth={2.2} />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">Vault Locked</h2>
          <p className="mt-1.5 text-xs text-[var(--muted)] max-w-xs leading-relaxed">
            Your secure session is paused due to inactivity. Enter your master password to resume.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{user?.email}</span>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="mt-6 space-y-3">
          <Input
            label="Master Password"
            type="password"
            placeholder="Enter your master password to unlock"
            required
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            error={error}
          />

          <Button loading={loading} disabled={loading} className="w-full h-11 text-sm font-semibold">
            <Unlock size={16} className="mr-1.5" /> Unlock Vault
          </Button>

          {hasPasskey && (
            <Button
              type="button"
              variant="secondary"
              loading={passkeyLoading}
              disabled={passkeyLoading}
              onClick={handlePasskeyUnlock}
              className="w-full h-11 text-sm"
            >
              <Fingerprint size={16} className="mr-1.5 text-[var(--accent)]" /> Unlock with Passkey
            </Button>
          )}
        </form>

        <div className="mt-6 border-t border-[var(--line)] pt-4 text-center">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--subtle)] hover:text-rose-400 transition-colors"
          >
            <LogOut size={13} />
            <span>Sign in as a different user</span>
          </button>
        </div>
      </div>
    </div>
  );
}
