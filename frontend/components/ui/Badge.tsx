export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const styles = {
    neutral: "bg-black/[.05] dark:bg-white/[.08] text-[var(--muted)] border border-[var(--line)]",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[tone]}`}>{children}</span>;
}
