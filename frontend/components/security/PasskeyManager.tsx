"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint,
  Plus,
  Trash2,
  KeyRound,
  Laptop,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { api } from "@/lib/api";
import type { Passkey } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [passkeyToRevoke, setPasskeyToRevoke] = useState<Passkey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const { showToast } = useToast();

  async function loadPasskeys() {
    setLoading(true);
    try {
      const list = await api.passkeys.list();
      setPasskeys(list || []);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to load passkeys",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function handleBeginRegister(nameInput?: string) {
    setRegistering(true);
    setShowNameModal(false);
    try {
      const options = await api.passkeys.beginRegistration();
      const attResp = await startRegistration({ optionsJSON: options });
      await api.passkeys.finishRegistration(attResp, nameInput || passkeyName || undefined);
      showToast("Passkey registered successfully!", "success", "Passkey Added");
      setPasskeyName("");
      await loadPasskeys();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Passkey registration failed or was cancelled";
      showToast(msg, "error", "Registration Failed");
    } finally {
      setRegistering(false);
    }
  }

  async function confirmRevoke() {
    if (!passkeyToRevoke) return;
    setRevoking(true);
    try {
      await api.passkeys.revoke(passkeyToRevoke.id);
      setPasskeys((prev) => prev.filter((p) => p.id !== passkeyToRevoke.id));
      showToast("Passkey revoked successfully.", "success");
      setPasskeyToRevoke(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to revoke passkey", "error");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Fingerprint size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--text)]">Passkeys & WebAuthn</h2>
              {passkeys.length > 0 ? (
                <Badge tone="success">{passkeys.length} Active</Badge>
              ) : (
                <Badge tone="neutral">None registered</Badge>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">
              Sign in passwordlessly with Touch ID, Face ID, Windows Hello, or hardware security keys.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          loading={registering}
          onClick={() => {
            setPasskeyName("");
            setShowNameModal(true);
          }}
          className="shrink-0 text-xs"
        >
          <Plus size={14} className="mr-1.5" /> Add Passkey
        </Button>
      </div>

      <div className="mt-5 space-y-2.5">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading passkeys…</p>
        ) : passkeys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center">
            <KeyRound size={24} className="mx-auto text-[var(--subtle)] mb-2" />
            <p className="text-xs font-semibold text-[var(--text)]">No passkeys created yet</p>
            <p className="text-[11px] text-[var(--muted)] mt-1 max-w-sm mx-auto">
              Passkeys replace passwords with phishing-resistant cryptographic credentials stored on your device.
            </p>
          </div>
        ) : (
          passkeys.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-solid)] p-3.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 border border-white/10 text-[var(--accent)]">
                  {p.deviceType === "mobile" ? <Smartphone size={16} /> : <Laptop size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-[var(--text)] truncate">{p.name}</div>
                  <div className="text-[10px] text-[var(--subtle)] mt-0.5">
                    Added: {new Date(p.createdAt).toLocaleDateString()}
                    {p.lastUsedAt && ` · Used: ${new Date(p.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPasskeyToRevoke(p)}
                className="icon-button h-8 w-8 text-rose-400 hover:text-rose-300"
                title="Revoke passkey"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Name Passkey Modal */}
      <Modal
        open={showNameModal}
        title="Register New Passkey"
        onClose={() => setShowNameModal(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBeginRegister(passkeyName);
          }}
          className="space-y-4"
        >
          <p className="text-xs text-[var(--muted)]">
            Your browser or device will prompt you to verify biometrics (Touch ID / Face ID / PIN) or plug in a hardware key.
          </p>

          <Input
            label="Passkey Name (Optional)"
            placeholder="e.g. MacBook Pro TouchID, YubiKey 5C"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowNameModal(false)}
            >
              Cancel
            </Button>
            <Button>Continue with Device</Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Passkey Confirmation Modal */}
      <Modal
        open={Boolean(passkeyToRevoke)}
        title="Revoke passkey?"
        onClose={() => !revoking && setPasskeyToRevoke(null)}
      >
        <p className="text-sm text-[var(--muted)]">
          Are you sure you want to revoke <strong className="text-[var(--text)]">{passkeyToRevoke?.name}</strong>?
        </p>
        <p className="mt-2 text-xs text-rose-300">
          You will no longer be able to sign in using this passkey credential.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={revoking}
            onClick={() => setPasskeyToRevoke(null)}
          >
            Cancel
          </Button>
          <Button variant="danger" loading={revoking} onClick={confirmRevoke}>
            Revoke Passkey
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
