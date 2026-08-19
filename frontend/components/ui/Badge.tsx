export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const styles = {
    neutral: "bg-black/[.04] text-[var(--muted)] border border-[var(--line)]",
    success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/10",
    warning: "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20",
    danger: "bg-rose-500/10 text-rose-600 border border-rose-500/10"
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[tone]}`}>{children}</span>;
}
