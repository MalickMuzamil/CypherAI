"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  itemName?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 5,
  itemName = "items",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : currentPage * itemsPerPage;

  // Generate page numbers array
  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 sm:flex-row">
      <div className="text-xs text-[var(--muted)]">
        {totalItems ? (
          <span>
            Showing <strong className="text-[var(--text)]">{startItem}</strong>–
            <strong className="text-[var(--text)]">{endItem}</strong> of{" "}
            <strong className="text-[var(--text)]">{totalItems}</strong> {itemName}
          </span>
        ) : (
          <span>
            Page <strong className="text-[var(--text)]">{currentPage}</strong> of{" "}
            <strong className="text-[var(--text)]">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-[var(--text)] transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous Page"
        >
          <ChevronLeft size={15} />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-xs text-[var(--text)] hover:bg-white/10"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-xs text-[var(--muted)]">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
              p === currentPage
                ? "bg-[var(--accent)] text-white font-semibold"
                : "border border-white/10 bg-white/5 text-[var(--text)] hover:bg-white/10"
            }`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-xs text-[var(--muted)]">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-xs text-[var(--text)] hover:bg-white/10"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-[var(--text)] transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next Page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
