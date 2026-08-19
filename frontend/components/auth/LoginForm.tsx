"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";

export function LoginForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);

  // Check if the entered email actually has a passkey registered
  useEffect(() => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setHasPasskey(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.passkeys.check(trimmedEmail);
        setHasPasskey(Boolean(res?.hasPasskey));
      } catch {
        setHasPasskey(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const result = await api.auth.login({ email, password });
      if (result.mfaRequired) {
        showToast("Two-factor authentication required.", "info", "Security Check");
        router.push("/mfa");
      } else {
        await refreshUser();
        showToast("Signed in successfully.", "success", "Welcome");
        router.push("/dashboard");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to sign in";
      setError(msg);
      showToast(msg, "error", "Sign In Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    setPasskeyLoading(true);
    try {
      const options = await api.passkeys.beginAuthentication(email.trim() || undefined);
      const authResult = await startAuthentication({ optionsJSON: options });
      await api.passkeys.finishAuthentication(authResult);
      await refreshUser();
      showToast("Signed in successfully with Passkey.", "success", "Welcome");
      router.push("/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Passkey sign-in failed or was cancelled";
      setError(msg);
      showToast(msg, "error", "Passkey Failed");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Sign in to unlock your vault.
        </p>
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="name@example.com"
        autoComplete="email"
        required
        disabled={loading || passkeyLoading}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Master password"
        type="password"
        placeholder="Enter your master password"
        autoComplete="current-password"
        required
        disabled={loading || passkeyLoading}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      <Button loading={loading} disabled={loading || passkeyLoading} className="w-full">
        Sign in
      </Button>

      {/* Only show Passkey login button if user has a registered passkey */}
      {hasPasskey && (
        <>
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--line)]" />
            </div>
            <span className="relative bg-[var(--surface-strong)] px-3 text-[11px] font-medium text-[var(--subtle)] uppercase tracking-wider">
              Or passkey
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            loading={passkeyLoading}
            disabled={loading || passkeyLoading}
            onClick={handlePasskeyLogin}
            className="w-full h-11 text-xs font-semibold"
          >
            <Fingerprint size={17} className="mr-2 text-[var(--accent)]" /> Sign in with Passkey
          </Button>
        </>
      )}

      <p className="text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link className="text-[var(--accent)] hover:underline" href="/register">
          Create one
        </Link>
      </p>
    </form>
  );
}