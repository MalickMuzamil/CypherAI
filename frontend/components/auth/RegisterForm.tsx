"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";

export function RegisterForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      await api.auth.register({ name, email, password });
      showToast("Account created successfully! Please sign in.", "success", "Welcome");
      router.push("/login");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to register";
      setError(msg);
      showToast(msg, "error", "Registration Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Create your vault</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your backend controls identity and encryption.
        </p>
      </div>

      <Input
        label="Full name"
        placeholder="e.g. John Doe"
        required
        disabled={loading}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Input
        label="Email"
        type="email"
        placeholder="name@example.com"
        required
        disabled={loading}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Master password"
        type="password"
        placeholder="Minimum 8 characters"
        minLength={8}
        autoComplete="new-password"
        required
        disabled={loading}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      <Button loading={loading} disabled={loading} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        Already registered?{" "}
        <Link className="text-[var(--accent)] hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}