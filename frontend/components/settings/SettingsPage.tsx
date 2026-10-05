"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { api } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

export function SettingsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { showToast } = useToast();

  useEffect(() => {
    api.notifications
      .list()
      .then((data) => {
        setNotifications(data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function read(id: string) {
    await api.notifications.markRead(id);
    setNotifications((v) =>
      v.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    showToast("Notification marked as read", "success");
  }

  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const paginatedNotifications = notifications.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Settings & notifications</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Notification state is persisted by the backend.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Bell size={17} className="text-[var(--accent)]" />
          <h2 className="font-medium">Notifications</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 animate-pulse"
              >
                <div className="h-5 w-12 rounded-full bg-black/10 dark:bg-white/10 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded-lg bg-black/10 dark:bg-white/10" />
                  <div className="h-3 w-64 rounded-md bg-black/5 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-xs text-[var(--muted)]">
            No notifications yet.
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {paginatedNotifications.map((n, idx) => (
                <button
                  key={n.id || (n as any)._id || idx}
                  onClick={() => read(n.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    n.read
                      ? "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]/30"
                      : "border-[var(--accent)]/40 bg-[var(--accent-soft)]/20 shadow-sm"
                  }`}
                >
                  <div className="mt-0.5">
                    <Badge tone={n.read ? "neutral" : "success"}>
                      {n.read ? "Read" : "New"}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--text)]">{n.title}</div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{n.message}</p>
                    <p className="mt-1.5 text-[10px] text-[var(--subtle)] font-mono">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {n.read && <Check size={15} className="text-emerald-400 shrink-0 mt-1" />}
                </button>
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={notifications.length}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[5, 10, 25, 50]}
              onItemsPerPageChange={setItemsPerPage}
              onPageChange={setPage}
              itemName="notifications"
            />
          </>
        )}
      </Card>
    </AppShell>
  );
}
