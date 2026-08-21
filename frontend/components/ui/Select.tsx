"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

interface OptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children?: ReactNode;
  options?: OptionItem[];
  className?: string;
  disabled?: boolean;
  title?: string;
  placeholder?: string;
}

export function Select({
  label,
  value,
  onChange,
  children,
  options: optionsProp,
  className = "",
  disabled = false,
  title,
  placeholder = "Select...",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Extract options from optionsProp or React children (<option>)
  const parsedOptions = React.useMemo<OptionItem[]>(() => {
    if (optionsProp) return optionsProp;
    const list: OptionItem[] = [];
    if (children) {
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === "option") {
          const props = child.props as { value?: any; children?: any; disabled?: boolean };
          list.push({
            value: String(props.value ?? props.children ?? ""),
            label: String(props.children ?? props.value ?? ""),
            disabled: Boolean(props.disabled),
          });
        }
      });
    }
    return list;
  }, [optionsProp, children]);

  const selectedOption = React.useMemo(
    () => parsedOptions.find((o) => String(o.value) === String(value)),
    [parsedOptions, value]
  );
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = React.useCallback(
    (val: string) => {
      if (disabled) return;
      setOpen(false);
      if (onChange) {
        onChange({ target: { value: val } });
      }
    },
    [disabled, onChange]
  );

  return (
    <div className="space-y-2 relative" ref={ref} title={title}>
      {label && <label className="label">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`field flex items-center justify-between text-left cursor-pointer appearance-none pr-3 text-[var(--text)] transition-all ${
          open ? "ring-2 ring-[var(--accent)]/40 border-[var(--accent)]" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${
            open ? "rotate-180 text-[var(--accent)]" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-[var(--line-strong)] bg-[var(--page-deep)] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] scrollbar-thin modal-panel-animate">
          {parsedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-[var(--accent)] text-white font-semibold shadow-sm"
                    : "text-[var(--text)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                } ${opt.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="ml-2 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}