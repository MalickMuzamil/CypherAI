"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Fingerprint,
  ShieldCheck,
  Smartphone,
  Trash2,
  ExternalLink,
  Laptop,
  Tablet,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { QrCode } from "@/components/ui/QrCode";
import { OtpInput } from "@/components/ui/OtpInput";
import { api } from "@/lib/api";
import type { DeviceSession } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { PasswordHealth } from "./PasswordHealth";
import { BreachMonitor } from "./BreachMonitor";
import { PasskeyManager } from "./PasskeyManager";

export function SecurityPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [mfa, setMfa] = useState<{ otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const [settingUpMfa, setSettingUpMfa] = useState(false);
  const [enablingMfa, setEnablingMfa] = useState(false);
  const [error, setError] = useState("");
  const [loadingDevices, setLoadingDevices] = useState(true);

  // See All Sessions modal state
  const [showAllSessionsModal, setShowAllSessionsModal] = useState(false);

  // Revoke device confirmation modal
  const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceSession | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [showRevokeOthersModal, setShowRevokeOthersModal] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const data = await api.devices.list();
      setDevices(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const [isReconfiguringMfa, setIsReconfiguringMfa] = useState(false);
  const [showReconfigureModal, setShowReconfigureModal] = useState(false);
  const [reconfigurePassword, setReconfigurePassword] = useState("");
  const [reconfigureError, setReconfigureError] = useState("");
  const [verifyingReconfigurePassword, setVerifyingReconfigurePassword] = useState(false);

  async function handleAuthorizeReconfigure(e: React.FormEvent) {
    e.preventDefault();
    if (!reconfigurePassword.trim()) {
      setReconfigureError("Please enter your master password.");
      return;
    }
    setVerifyingReconfigurePassword(true);
    setReconfigureError("");
    try {
      await api.auth.verifyPassword(reconfigurePassword);
      setShowReconfigureModal(false);
      setReconfigurePassword("");
      await handleSetupMfa(true);
    } catch (err) {
      setReconfigureError(
        err instanceof Error ? err.message : "Incorrect master password"
      );
    } finally {
      setVerifyingReconfigurePassword(false);
    }
  }

  async function handleSetupMfa(isReconfigure = false) {
    setSettingUpMfa(true);
    try {
      const data = await api.auth.setupMfa();
      setMfa(data);
      if (isReconfigure) {
        setIsReconfiguringMfa(true);
      }
      showToast(
        "Scan the QR code with your authenticator app.",
        "info",
        "Authenticator Setup"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to setup MFA";
      showToast(msg, "error", "Setup Failed");
    } finally {
      setSettingUpMfa(false);
    }
  }

  async function handleEnableMfa() {
    if (!code || code.length < 6) {
      showToast("Please enter a valid 6-digit code.", "warning");
      return;
    }
    setEnablingMfa(true);
    try {
      await api.auth.enableMfa(code);
      setMfa(null);
      setIsReconfiguringMfa(false);
      setCode("");
      setShowManualKey(false);
      await refreshUser();
      showToast("MFA enabled successfully.", "success", "Security Updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to enable MFA";
      showToast(msg, "error", "Verification Failed");
    } finally {
      setEnablingMfa(false);
    }
  }

  async function confirmRevoke() {
    if (!deviceToRevoke) return;
    setRevoking(true);
    try {
      await api.devices.revoke(deviceToRevoke.id);
      setDevices((v) => v.filter((x) => x.id !== deviceToRevoke.id));
      showToast("Session revoked successfully.", "success", "Device Removed");
      setDeviceToRevoke(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to revoke session";
      showToast(msg, "error", "Action Failed");
    } finally {
      setRevoking(false);
    }
  }

  async function confirmRevokeOthers() {
    setRevokingOthers(true);
    try {
      await api.devices.revokeOthers();
      setDevices((v) => v.filter((x) => x.current));
      showToast("All other sessions revoked successfully.", "success", "Sessions Cleared");
      setShowRevokeOthersModal(false);
      setShowAllSessionsModal(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to revoke other sessions", "error");
    } finally {
      setRevokingOthers(false);
    }
  }

  function getDeviceIcon(deviceType?: string) {
    if (deviceType === "mobile") return <Smartphone size={17} className="text-[var(--accent)] shrink-0" />;
    if (deviceType === "tablet") return <Tablet size={17} className="text-sky-400 shrink-0" />;
    return <Laptop size={17} className="text-emerald-400 shrink-0" />;
  }

  // Ensure current device is ALWAYS at the very top (index 0)
  const sortedDevices = [...devices].sort((a, b) => {
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });

  const displayedDevices = sortedDevices.slice(0, 4);
  const otherDevicesCount = sortedDevices.filter((d) => !d.current).length;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Security Center</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Zero-knowledge vault defense, automated threat detection, Passkeys, and session security.
        </p>
      </div>

      <div className="space-y-6">
        {/* Phase 2: Password Health Dashboard */}
        <PasswordHealth />

        {/* Phase 3: Breach Monitoring */}
        <BreachMonitor />

        {/* Phase 4: Passkeys / WebAuthn */}
        <PasskeyManager />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* MFA Card */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-emerald-500/10 text-emerald-500">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[var(--text)]">
                    Two-Factor Authentication (2FA)
                  </h2>
                  {user?.mfaEnabled ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="warning">Disabled</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  TOTP authenticator flow for enhanced protection.
                </p>
              </div>
            </div>

            {user?.mfaEnabled && !isReconfiguringMfa ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-[16px] border border-emerald-500/20 bg-emerald-500/[.04] p-4 text-xs text-[var(--text)]">
                  <div className="font-medium text-emerald-400">
                    ✓ 2-Factor Authentication is Enabled
                  </div>
                  <p className="mt-1 text-[var(--muted)]">
                    Your account requires a 6-digit TOTP verification code from your
                    authenticator app whenever signing in.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setReconfigurePassword("");
                      setReconfigureError("");
                      setShowReconfigureModal(true);
                    }}
                    className="text-xs"
                  >
                    Reconfigure Authenticator App
                  </Button>
                </div>
              </div>
            ) : mfa ? (
              <div className="mt-5 space-y-5 rounded-[20px] border border-[var(--line)] bg-[var(--surface-solid)] p-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] mb-1">
                    Step 1 — Scan QR Code
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-3">
                    Scan this QR code with your authenticator app.
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <QrCode value={mfa.otpauthUrl} size={180} />
                    <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-[var(--subtle)]">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 border border-white/10">Google Authenticator</span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 border border-white/10">Microsoft Authenticator</span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 border border-white/10">Authy</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManualKey((v) => !v)}
                      className="text-[11px] text-[var(--accent)] hover:underline"
                    >
                      {showManualKey ? "Hide setup key" : "Can't scan the QR code?"}
                    </button>
                    {showManualKey && (
                      <div className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                          Manual Setup Key / URI
                        </span>
                        <code className="mt-1 block break-all font-mono text-xs text-[var(--text)] select-all">
                          {mfa.otpauthUrl}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--line)] pt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] mb-1">
                    Step 2 — Enter Authenticator Code
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-3">
                    Enter the 6-digit code generated by your authenticator app.
                  </p>
                  <OtpInput
                    value={code}
                    onChange={setCode}
                    disabled={enablingMfa}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4">
                  <Button
                    variant="secondary"
                    disabled={enablingMfa}
                    onClick={() => {
                      setMfa(null);
                      setIsReconfiguringMfa(false);
                      setCode("");
                      setShowManualKey(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={enablingMfa}
                    disabled={enablingMfa || code.length < 6}
                    onClick={handleEnableMfa}
                  >
                    Verify & Enable MFA
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="mt-5"
                loading={settingUpMfa}
                disabled={settingUpMfa}
                onClick={() => handleSetupMfa(false)}
              >
                Set up 2FA
              </Button>
            )}
          </Card>

          {/* Active Sessions Card */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--text)]">
                    Active Devices & Sessions
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Hardware fingerprints & session guard.
                  </p>
                </div>
              </div>

              {otherDevicesCount > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowRevokeOthersModal(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 shrink-0"
                >
                  <LogOut size={12} className="mr-1" /> Revoke Others
                </Button>
              )}
            </div>

            <div className="mt-5 space-y-2.5">
              {loadingDevices ? (
                <p className="text-sm text-[var(--muted)]">Loading active sessions…</p>
              ) : sortedDevices.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No active sessions found.</p>
              ) : (
                displayedDevices.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3 rounded-[16px] border p-3.5 transition-colors ${
                      d.current
                        ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                        : "border-[var(--line)] bg-[var(--surface-solid)]"
                    }`}
                  >
                    {getDeviceIcon(d.deviceType)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                        <span>{d.deviceName}</span>
                        {d.os && <span className="text-[10px] text-[var(--subtle)]">({d.os})</span>}
                        {d.current && <Badge tone="success">Current device</Badge>}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)] truncate">
                        {d.browser || "Unknown browser"} · {d.ipAddress || "—"} ·{" "}
                        {new Date(d.lastActiveAt).toLocaleString()}
                      </div>
                    </div>
                    {!d.current && (
                      <button
                        onClick={() => setDeviceToRevoke(d)}
                        className="icon-button h-8 w-8 text-rose-400 hover:text-rose-300 shrink-0"
                        title="Revoke session"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {!loadingDevices && sortedDevices.length > 0 && (
              <div className="mt-4 border-t border-[var(--line)] pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllSessionsModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  <span>See all active sessions ({sortedDevices.length})</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
          </Card>
        </div>
      </div>

      {/* All Active Sessions Modal */}
      <Modal
        open={showAllSessionsModal}
        title="All Active Sessions"
        onClose={() => setShowAllSessionsModal(false)}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[var(--muted)]">
            All active browser and mobile sessions signed into your account.
          </p>
          {otherDevicesCount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowRevokeOthersModal(true)}
              className="text-xs text-rose-400"
            >
              Revoke All Others
            </Button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-1.5 space-y-2.5 scrollbar-thin">
          {sortedDevices.map((d) => (
            <div
              key={d.id}
              className={`flex items-center gap-3 rounded-[16px] border p-3.5 transition-colors ${
                d.current
                  ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                  : "border-[var(--line)] bg-[var(--surface-solid)]"
              }`}
            >
              {getDeviceIcon(d.deviceType)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <span>{d.deviceName}</span>
                  {d.os && <span className="text-[10px] text-[var(--subtle)]">({d.os})</span>}
                  {d.current && <Badge tone="success">Current device</Badge>}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)] truncate">
                  {d.browser || "Unknown browser"} · {d.ipAddress || "—"} ·{" "}
                  {new Date(d.lastActiveAt).toLocaleString()}
                </div>
              </div>
              {!d.current && (
                <button
                  onClick={() => setDeviceToRevoke(d)}
                  className="icon-button h-8 w-8 text-rose-400 hover:text-rose-300 shrink-0"
                  title="Revoke session"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center border-t border-[var(--line)] pt-4">
          <span className="text-xs text-[var(--muted)]">
            Total active sessions: <strong className="text-[var(--text)]">{sortedDevices.length}</strong>
          </span>
          <Button variant="secondary" onClick={() => setShowAllSessionsModal(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Revoke Session Confirmation Dialog */}
      <Modal
        open={Boolean(deviceToRevoke)}
        title="Revoke session?"
        onClose={() => !revoking && setDeviceToRevoke(null)}
      >
        <p className="text-sm text-[var(--muted)]">
          Are you sure you want to revoke the session for{" "}
          <strong className="text-[var(--text)]">
            {deviceToRevoke?.deviceName}
          </strong>{" "}
          ({deviceToRevoke?.browser || "Device"})?
        </p>
        <p className="mt-2 text-xs text-rose-300/90">
          This device will be immediately signed out and its access revoked.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={revoking}
            onClick={() => setDeviceToRevoke(null)}
          >
            Cancel
          </Button>
          <Button variant="danger" loading={revoking} onClick={confirmRevoke}>
            Revoke session
          </Button>
        </div>
      </Modal>

      {/* Revoke Other Sessions Confirmation Dialog */}
      <Modal
        open={showRevokeOthersModal}
        title="Revoke all other sessions?"
        onClose={() => !revokingOthers && setShowRevokeOthersModal(false)}
      >
        <p className="text-sm text-[var(--muted)]">
          This will immediately sign out all other devices and active sessions ({otherDevicesCount} session{otherDevicesCount === 1 ? '' : 's'}), keeping only this current device logged in.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={revokingOthers}
            onClick={() => setShowRevokeOthersModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={revokingOthers}
            onClick={confirmRevokeOthers}
          >
            Revoke All Other Sessions
          </Button>
        </div>
      </Modal>

      {/* Authorize Reconfigure Modal */}
      <Modal
        open={showReconfigureModal}
        title="Authorize 2FA Reconfiguration"
        onClose={() => !verifyingReconfigurePassword && setShowReconfigureModal(false)}
      >
        <form onSubmit={handleAuthorizeReconfigure} className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
            <ShieldCheck size={20} className="shrink-0" />
            <p className="text-xs text-[var(--text)]">
              Enter your master password to authorize reconfiguring your authenticator app.
            </p>
          </div>

          <Input
            label="Master Password"
            type="password"
            placeholder="Enter your master password"
            required
            autoFocus
            value={reconfigurePassword}
            onChange={(e) => {
              setReconfigurePassword(e.target.value);
              setReconfigureError("");
            }}
            error={reconfigureError}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <Button
              type="button"
              variant="secondary"
              disabled={verifyingReconfigurePassword}
              onClick={() => setShowReconfigureModal(false)}
            >
              Cancel
            </Button>
            <Button loading={verifyingReconfigurePassword} disabled={verifyingReconfigurePassword}>
              Authorize & Generate QR
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
