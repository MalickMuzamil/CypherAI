"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PasswordHealthResponse } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

export function PasswordHealth() {
  const [health, setHealth] = useState<PasswordHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  async function loadHealth() {
    setLoading(true);
    try {
      const data = await api.credentials.health();
      setHealth(data);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to load password health analysis",
        "error",
        "Analysis Failed"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealth();
  }, []);

  const aggregate = health?.aggregate || {
    score: 0,
    total: 0,
    weakCount: 0,
    reuseCount: 0,
    oldCount: 0,
    strongCount: 0,
  };

  function getScoreColor(score: number) {
    if (score >= 80) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (score >= 60) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    return "text-rose-400 border-rose-500/40 bg-rose-500/10";
  }

  function getScoreTone(score: number): "success" | "warning" | "danger" {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "danger";
  }

  const atRiskCredentials = (health?.credentials || []).filter(
    (c) => c.isWeak || c.isReused || c.isOld
  );

  return (
    <Card className="relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--text)]">Password Health Score</h2>
              {health && (
                <Badge tone={getScoreTone(aggregate.score)}>
                  {aggregate.score >= 80 ? "Healthy" : aggregate.score >= 60 ? "Moderate" : "At Risk"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">
              Automated zero-knowledge entropy, reuse, and age analysis.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          onClick={loadHealth}
          className="shrink-0 text-xs"
        >
          <RefreshCw size={13} className="mr-1.5" /> Re-analyze
        </Button>
      </div>

      {loading && !health ? (
        <p className="mt-5 text-sm text-[var(--muted)]">Analyzing encrypted vault health…</p>
      ) : (
        <>
          {/* Main Score Banner & Metric Cards */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Overall Score */}
            <div className={`rounded-2xl border p-4 flex flex-col justify-between ${getScoreColor(aggregate.score)}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Vault Health</span>
              <div className="my-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono tracking-tight">{aggregate.score}%</span>
                <span className="text-xs opacity-75">/ 100</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/20 overflow-hidden">
                <div
                  className="h-full bg-current transition-all duration-500 rounded-full"
                  style={{ width: `${aggregate.score}%` }}
                />
              </div>
            </div>

            {/* Weak Passwords */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-solid)] p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--subtle)] flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-rose-400" /> Weak Passwords
              </span>
              <div className="my-1 text-2xl font-bold font-mono text-[var(--text)]">
                {aggregate.weakCount}
              </div>
              <span className="text-[10px] text-[var(--muted)]">
                {aggregate.weakCount === 0 ? "No weak passwords found" : "Below 10 chars or low entropy"}
              </span>
            </div>

            {/* Reused Passwords */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-solid)] p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--subtle)] flex items-center gap-1.5">
                <Copy size={12} className="text-amber-400" /> Reused Passwords
              </span>
              <div className="my-1 text-2xl font-bold font-mono text-[var(--text)]">
                {aggregate.reuseCount}
              </div>
              <span className="text-[10px] text-[var(--muted)]">
                {aggregate.reuseCount === 0 ? "All passwords unique" : "Duplicate hash detected"}
              </span>
            </div>

            {/* Old Passwords */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-solid)] p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--subtle)] flex items-center gap-1.5">
                <Clock size={12} className="text-sky-400" /> Old Passwords
              </span>
              <div className="my-1 text-2xl font-bold font-mono text-[var(--text)]">
                {aggregate.oldCount}
              </div>
              <span className="text-[10px] text-[var(--muted)]">
                Older than 90 days
              </span>
            </div>
          </div>

          {/* Recommendations List */}
          {health?.recommendations && health.recommendations.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]/50 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] mb-2 block">
                Security Recommendations
              </span>
              <ul className="space-y-2 text-xs text-[var(--muted)]">
                {health.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* At-risk Credentials List */}
          {atRiskCredentials.length > 0 && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <span className="text-xs font-semibold text-[var(--text)] mb-3 block">
                Credentials Needing Attention ({atRiskCredentials.length})
              </span>

              <div className="space-y-2">
                {atRiskCredentials.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-solid)] p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text)] truncate">{c.name}</span>
                        <span className="text-[11px] text-[var(--subtle)]">({c.username})</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {c.isWeak && <Badge tone="danger">Weak Password</Badge>}
                        {c.isReused && <Badge tone="warning">Reused</Badge>}
                        {c.isOld && <Badge tone="neutral">&gt; 90 Days Old</Badge>}
                      </div>
                    </div>

                    <Link href={`/vault/${c.id}`}>
                      <Button size="sm" variant="secondary" className="shrink-0 text-xs">
                        Update <ExternalLink size={12} className="ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
