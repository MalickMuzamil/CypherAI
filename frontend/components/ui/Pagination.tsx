"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  onItemsPerPageChange?: (size: number) => void;
  itemName?: string;
}

export const Pagination = React.memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  itemsPerPageOptions = [5, 10, 25, 50],
  onItemsPerPageChange,
  itemName = "items",
}: PaginationProps) {
  // Hide if no items or 0 pages
  if (totalItems === 0 || (totalPages <= 1 && !onItemsPerPageChange)) {
    return null;
  }

  const effectiveTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = totalItems
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : currentPage * itemsPerPage;

  // Smart window of page numbers with ellipsis
  const paginationRange = useMemo(() => {
    if (effectiveTotalPages <= 7) {
      return Array.from({ length: effectiveTotalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis-left" | "ellipsis-right")[] = [];
    const showLeftEllipsis = currentPage > 4;
    const showRightEllipsis = currentPage < effectiveTotalPages - 3;

    if (!showLeftEllipsis && showRightEllipsis) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("ellipsis-right");
      pages.push(effectiveTotalPages);
    } else if (showLeftEllipsis && !showRightEllipsis) {
      pages.push(1);
      pages.push("ellipsis-left");
      for (let i = effectiveTotalPages - 4; i <= effectiveTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push("ellipsis-left");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("ellipsis-right");
      pages.push(effectiveTotalPages);
    }

    return pages;
  }, [currentPage, effectiveTotalPages]);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs sm:flex-row sm:px-4 sm:py-3">
      {/* Left: Info & items per page selector */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[var(--muted)] sm:justify-start">
        {totalItems !== undefined ? (
          <span>
            Showing <strong className="font-semibold text-[var(--text)]">{startItem}</strong>–
            <strong className="font-semibold text-[var(--text)]">{endItem}</strong> of{" "}
            <strong className="font-semibold text-[var(--text)]">{totalItems}</strong> {itemName}
          </span>
        ) : (
          <span>
            Page <strong className="font-semibold text-[var(--text)]">{currentPage}</strong> of{" "}
            <strong className="font-semibold text-[var(--text)]">{effectiveTotalPages}</strong>
          </span>
        )}

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--line)]">
            <span className="text-[11px] text-[var(--subtle)]">Per page:</span>
            <select
              aria-label="Items per page"
              value={itemsPerPage}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                onItemsPerPageChange(nextSize);
                onPageChange(1);
              }}
              className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface-solid)] px-2 py-1 text-[11px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--line-strong)] focus:border-[var(--accent)] focus:outline-none"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation buttons */}
      {effectiveTotalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-solid)] text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)] hover:border-[var(--line-strong)] disabled:pointer-events-none disabled:opacity-40"
            aria-label="Previous Page"
            title="Previous Page"
          >
            <ChevronLeft size={15} />
          </button>

          {paginationRange.map((p, idx) => {
            if (p === "ellipsis-left" || p === "ellipsis-right") {
              return (
                <span
                  key={`${p}-${idx}`}
                  className="px-1.5 text-xs text-[var(--subtle)] select-none"
                >
                  …
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[var(--accent)] text-white font-semibold shadow-sm shadow-[var(--accent)]/20"
                    : "border border-[var(--line)] bg-[var(--surface-solid)] text-[var(--text)] hover:bg-[var(--surface-hover)] hover:border-[var(--line-strong)]"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(effectiveTotalPages, currentPage + 1))}
            disabled={currentPage >= effectiveTotalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-solid)] text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)] hover:border-[var(--line-strong)] disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next Page"
            title="Next Page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
});
