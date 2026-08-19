"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, UserCheck, UserX, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import type { Role, User } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";

export function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Disable user confirmation modal
  const [userToDisable, setUserToDisable] = useState<User | null>(null);
  const [disabling, setDisabling] = useState(false);

  // Change role confirmation modal
  const [roleModalData, setRoleModalData] = useState<{
    user: User;
    newRole: Role;
  } | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      if (currentUser.role !== "SUPER_ADMIN") {
        showToast(
          "Access denied. Super Admin privileges required.",
          "error",
          "Unauthorized"
        );
        router.push("/dashboard");
        return;
      }
      loadUsers();
    }
  }, [currentUser, authLoading, router, showToast]);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.admin.users();
      const normalized: User[] = (data || []).map((u: any) => ({
        ...u,
        id: String(u.id || u._id),
      }));
      setUsers(normalized);
      setError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to load users";
      setError(msg);
      showToast(msg, "error", "API Error");
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChangeSelect(targetUser: User, newRole: Role) {
    if (
      targetUser.role === "SUPER_ADMIN" ||
      targetUser.id === currentUser?.id ||
      targetUser.email === currentUser?.email
    ) {
      showToast(
        "Super Admin role cannot be modified.",
        "warning",
        "Action Restricted"
      );
      return;
    }
    if (targetUser.role === newRole) return;
    setRoleModalData({ user: targetUser, newRole });
  }

  async function confirmRoleChange() {
    if (!roleModalData) return;
    if (
      roleModalData.user.role === "SUPER_ADMIN" ||
      roleModalData.user.id === currentUser?.id ||
      roleModalData.user.email === currentUser?.email
    ) {
      showToast("Super Admin accounts cannot be modified.", "warning");
      setRoleModalData(null);
      return;
    }

    setUpdatingRole(true);
    try {
      const updated = await api.admin.updateRole(
        roleModalData.user.id,
        roleModalData.newRole
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === roleModalData.user.id ? { ...u, ...updated } : u
        )
      );
      showToast("User role updated successfully.", "success", "Role Changed");
      setRoleModalData(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update user role";
      showToast(msg, "error", "Update Failed");
    } finally {
      setUpdatingRole(false);
    }
  }

  function handleDisableClick(targetUser: User) {
    if (
      targetUser.role === "SUPER_ADMIN" ||
      targetUser.id === currentUser?.id ||
      targetUser.email === currentUser?.email
    ) {
      showToast(
        "Super Admin accounts cannot be disabled.",
        "warning",
        "Action Restricted"
      );
      return;
    }
    setUserToDisable(targetUser);
  }

  async function confirmDisableUser() {
    if (!userToDisable) return;
    if (
      userToDisable.role === "SUPER_ADMIN" ||
      userToDisable.id === currentUser?.id ||
      userToDisable.email === currentUser?.email
    ) {
      showToast("Super Admin accounts cannot be disabled.", "warning");
      setUserToDisable(null);
      return;
    }

    setDisabling(true);
    try {
      await api.admin.disableUser(userToDisable.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToDisable.id ? { ...u, disabled: true } : u
        )
      );
      showToast("User disabled successfully.", "success", "User Disabled");
      setUserToDisable(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to disable user";
      showToast(msg, "error", "Action Failed");
    } finally {
      setDisabling(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  if (authLoading) {
    return (
      <AppShell>
        <Card>
          <p className="text-sm text-[var(--muted)]">Verifying permissions…</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
              <Shield size={13} /> Super Admin
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manage organization members, assign roles, and enforce vault access
            policies.
          </p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={17}
        />
        <input
          suppressHydrationWarning
          className="field pl-10"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {error && (
        <Card className="mb-4 border-rose-500/20 bg-rose-500/10">
          <div className="flex items-center gap-3 text-rose-300">
            <ShieldAlert size={18} />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {loading ? (
        <Card>
          <div className="space-y-3 py-4">
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
          </div>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">
            {search ? "No matching users found." : "No users returned by API."}
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedUsers.map((u) => {
              const isSelf =
                u.id === currentUser?.id || u.email === currentUser?.email;
              const isSuperAdmin = u.role === "SUPER_ADMIN";
              const isProtected = isSuperAdmin || isSelf;

              return (
                <Card
                  key={u.id}
                  className={`transition duration-150 ${
                    u.disabled ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-[var(--text)]">
                          {u.name}
                        </h2>
                        {isSelf && (
                          <Badge tone="warning">You (Super Admin)</Badge>
                        )}
                        <Badge
                          tone={
                            u.role === "SUPER_ADMIN"
                              ? "warning"
                              : u.role === "ADMIN"
                              ? "neutral"
                              : "neutral"
                          }
                        >
                          {u.role}
                        </Badge>
                        <Badge tone={u.disabled ? "danger" : "success"}>
                          {u.disabled ? "Disabled" : "Active"}
                        </Badge>
                        {u.mfaEnabled && (
                          <Badge tone="success">2FA Enabled</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">{u.email}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-[var(--subtle)]">
                        <span>
                          Joined: {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          Last login:{" "}
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleString()
                            : "Never"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0">
                      <div className="w-36">
                        <Select
                          label=""
                          value={u.role}
                          disabled={isProtected || u.disabled}
                          title={
                            isProtected
                              ? "Super Admin role cannot be modified."
                              : u.disabled
                              ? "Account is disabled"
                              : "Change role"
                          }
                          onChange={(e) =>
                            handleRoleChangeSelect(u, e.target.value as Role)
                          }
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </Select>
                      </div>

                      <Button
                        variant={u.disabled ? "secondary" : "danger"}
                        disabled={isProtected || u.disabled}
                        onClick={() => handleDisableClick(u)}
                        title={
                          isProtected
                            ? "Super Admin account cannot be disabled."
                            : u.disabled
                            ? "User is already disabled"
                            : "Disable user"
                        }
                        className="shrink-0"
                      >
                        {u.disabled ? (
                          <>
                            <UserCheck size={15} /> Disabled
                          </>
                        ) : (
                          <>
                            <UserX size={15} /> Disable
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
            itemName="users"
          />
        </>
      )}

      {/* Disable Confirmation Dialog */}
      <Modal
        open={Boolean(userToDisable)}
        title="Disable user?"
        onClose={() => !disabling && setUserToDisable(null)}
      >
        <p className="text-sm text-[var(--muted)]">
          Are you sure you want to disable{" "}
          <strong className="text-[var(--text)]">{userToDisable?.name}</strong>{" "}
          ({userToDisable?.email})?
        </p>
        <p className="mt-2 text-xs text-rose-300/90">
          This user will immediately lose access to their vault and all active
          sessions will be terminated.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={disabling}
            onClick={() => setUserToDisable(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={disabling}
            onClick={confirmDisableUser}
          >
            Disable user
          </Button>
        </div>
      </Modal>

      {/* Role Change Confirmation Dialog */}
      <Modal
        open={Boolean(roleModalData)}
        title="Change user role?"
        onClose={() => !updatingRole && setRoleModalData(null)}
      >
        <p className="text-sm text-[var(--muted)]">
          Are you sure you want to change the role of{" "}
          <strong className="text-[var(--text)]">
            {roleModalData?.user.name}
          </strong>{" "}
          from{" "}
          <span className="font-semibold text-[var(--accent)]">
            {roleModalData?.user.role}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-emerald-400">
            {roleModalData?.newRole}
          </span>
          ?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={updatingRole}
            onClick={() => setRoleModalData(null)}
          >
            Cancel
          </Button>
          <Button loading={updatingRole} onClick={confirmRoleChange}>
            Update role
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
