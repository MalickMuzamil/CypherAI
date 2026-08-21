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
  const ITEMS_PER_PAGE = 5;

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

  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
  const paginatedEvents = useMemo(() => events.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  ), [events, page]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Audit activity</h1>
        <p className="mt-1 text-sm text-slate-500">
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
          <div className="space-y-2">
            {paginatedEvents.map((e, idx) => (
              <Card key={e.id || (e as any)._id || idx} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-medium">{e.action}</span>
                      <span className="text-xs text-slate-600">{e.resourceType}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {e.actorName || e.actorId} · {e.ipAddress || "IP unavailable"} ·{" "}
                      {new Date(e.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex gap-3 text-[11px] text-slate-700">
                      <span>
                        <Globe size={12} className="mr-1 inline" />
                        {e.ipAddress || "—"}
                      </span>
                      <span>
                        <Monitor size={12} className="mr-1 inline" />
                        {e.userAgent || "—"}
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
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
            itemName="audit logs"
          />
        </>
      )}
    </AppShell>
  );
}
