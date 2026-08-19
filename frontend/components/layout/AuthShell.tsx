import { LockKeyhole, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-5 sm:p-8">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="pointer-events-none absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-12%] right-[-5%] h-80 w-80 rounded-full bg-slate-400/10 blur-3xl" />
      <div className="relative w-full max-w-[430px]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[20px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)] shadow-lg shadow-[var(--accent)]/10">
            <LockKeyhole size={24} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-[30px] font-bold tracking-[-.04em]">Vaultly</h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">Private credentials. One secure vault.</p>
        </div>
        <div className="glass rounded-[30px] p-6 sm:p-8">{children}</div>
        <div className="mt-5 flex justify-center gap-2 text-[11px] font-medium text-[var(--subtle)]">
          <ShieldCheck size={14} /> Designed for encrypted vault backends
        </div>
      </div>
    </main>
  );
}
