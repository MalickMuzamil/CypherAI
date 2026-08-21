"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = "lg",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  /* Mount only on client (SSR safe) */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Prevent body scroll while open */
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, mounted]);

  if (!mounted || !open) return null;

  const panel = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      {/* ── Backdrop ── */}
      <div
        className="modal-backdrop-animate absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ── Panel ── uses CSS variables so it matches light/dark theme */}
      <div
        className={`
          modal-panel-animate relative w-full ${sizeMap[size]}
          rounded-[22px] overflow-hidden
          border border-[var(--line-strong)]
          bg-[var(--surface-solid)]
          shadow-[var(--shadow)]
        `}
      >
        {/* Top shimmer */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 40%,rgba(255,255,255,0.5) 60%,transparent 100%)",
          }}
        />

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[var(--line)]">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="text-base font-semibold tracking-tight text-[var(--text)] truncate"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="icon-button shrink-0 h-8 w-8 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 max-h-[78vh] overflow-y-auto scrollbar-thin text-[var(--text)]">
          {children}
        </div>
      </div>
    </div>
  );

  /* Portal to document.body so fixed positioning is never clipped */
  return createPortal(panel, document.body);
}