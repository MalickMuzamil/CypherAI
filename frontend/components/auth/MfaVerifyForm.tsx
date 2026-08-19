"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export function MfaVerifyForm() {
  const router = useRouter();
  const { setUserState, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(otpCode = code) {
    if (loading) return;
    if (otpCode.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await api.auth.verifyMfa({ code: otpCode });
      if (result?.user) {
        setUserState(result.user);
        showToast("Signed in successfully.", "success", "Welcome");
        router.push("/dashboard");
      } else {
        const u = await refreshUser();
        if (u) {
          showToast("Signed in successfully.", "success", "Welcome");
          router.push("/dashboard");
        } else {
          throw new Error("Unable to establish authenticated session.");
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to verify MFA";
      let displayError = "Invalid authentication code. Please try again.";
      
      if (msg.toLowerCase().includes("expired")) {
        displayError = "Your verification session expired. Please sign in again.";
        showToast(displayError, "error", "Session Expired");
        setTimeout(() => router.push("/login"), 1200);
      } else {
        showToast("Invalid authentication code. Please try again.", "error", "Verification Failed");
      }

      setError(displayError);
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    handleVerify(code);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent)] shadow-lg shadow-[var(--accent)]/15">
          <ShieldCheck size={28} className="text-[var(--accent)]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Multi-factor authentication</h2>
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Enter the 6-digit code from your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.).
        </p>
      </div>

      <div className="py-2">
        <OtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          autoFocus
          onComplete={(completedCode) => handleVerify(completedCode)}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-center text-xs text-rose-300">
          {error}
        </div>
      )}

      <Button
        loading={loading}
        disabled={loading || code.length < 6}
        className="w-full py-3 font-semibold"
      >
        Verify & Continue
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors underline"
        >
          Back to sign in
        </button>
      </div>
    </form>
  );
}