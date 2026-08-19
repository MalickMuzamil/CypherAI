"use client";

import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";
type ToastItem = { id: number; title?: string; message: string; tone: ToastTone };

const ToastContext = createContext<{
  showToast: (message: string, tone?: ToastTone, title?: string) => void;
}>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = "success", title?: string) => {
    const id = Date.now() + Math.random();
    setItems(v => [...v.slice(-3), { id, message, tone, title }]);
    window.setTimeout(() => setItems(v => v.filter(x => x.id !== id)), 3600);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {items.map(item => <ToastItemView key={item.id} item={item} onClose={() => setItems(v => v.filter(x => x.id !== item.id))} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItemView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "error" ? XCircle : item.tone === "warning" ? CircleAlert : Info;
  const tone = item.tone === "success" ? "text-emerald-500" : item.tone === "error" ? "text-rose-500" : item.tone === "warning" ? "text-amber-500" : "text-[var(--accent)]";

  return (
    <div className="glass pointer-events-auto flex items-start gap-3 rounded-[18px] p-4 shadow-2xl">
      <Icon size={19} className={`mt-0.5 shrink-0 ${tone}`} />
      <div className="min-w-0 flex-1">
        {item.title && <div className="text-sm font-semibold">{item.title}</div>}
        <div className={`text-sm ${item.title ? "mt-0.5 text-[var(--muted)]" : ""}`}>{item.message}</div>
      </div>
      <button className="icon-button h-7 w-7 shrink-0 border-0 bg-transparent shadow-none" onClick={onClose} aria-label="Close notification">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
