"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Activity, Globe, Monitor } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import type { AuditEvent } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";

export function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    api.audit
      .list()
      .then((data) => {
        setEvents(data || []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Unable to load audit logs");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalPages = Math.ceil(events.length / itemsPerPage);
  const paginatedEvents = useMemo(() => events.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  ), [events, page, itemsPerPage]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Audit activity</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Immutable security events supplied by the backend.
        </p>
      </div>

      {error && (
        <Card className="mb-4">
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-black/10 dark:bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 rounded-md bg-black/10 dark:bg-white/10" />
                  <div className="h-3 w-56 rounded-md bg-black/5 dark:bg-white/5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">No activity recorded yet.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-2.5">
            {paginatedEvents.map((e, idx) => (
              <Card key={e.id || (e as any)._id || idx} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text)]">{e.action}</span>
                      <span className="rounded-md bg-black/[0.04] dark:bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                        {e.resourceType}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)] font-medium">
                      {e.actorName || e.actorId} · {e.ipAddress || "IP unavailable"} ·{" "}
                      {new Date(e.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-[var(--subtle)]">
                      <span className="flex items-center gap-1">
                        <Globe size={13} className="text-[var(--accent)]" />
                        {e.ipAddress || "—"}
                      </span>
                      <span className="flex items-center gap-1 truncate max-w-full">
                        <Monitor size={13} className="text-sky-400 shrink-0" />
                        <span className="truncate">{e.userAgent || "—"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={events.length}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[5, 10, 25, 50]}
            onItemsPerPageChange={setItemsPerPage}
            onPageChange={setPage}
            itemName="audit logs"
          />
        </>
      )}
    </AppShell>
  );
}
