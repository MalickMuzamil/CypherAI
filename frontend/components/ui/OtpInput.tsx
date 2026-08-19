"use client";

import React, { useRef, useEffect } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
}

export function OtpInput({
  value = "",
  onChange,
  disabled = false,
  onComplete,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split current value into array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && !disabled && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;

    // Take character
    const char = val[val.length - 1];
    const newDigits = [...digits];
    newDigits[index] = char;
    const newCombined = newDigits.join("").slice(0, 6);

    onChange(newCombined);

    if (newCombined.length === 6 && onComplete) {
      onComplete(newCombined);
    }

    // Auto advance to next box
    if (index < 5 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // If current box is empty, clear previous and focus previous
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        const newCombined = newDigits.join("");
        onChange(newCombined);
        inputsRef.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    onChange(pasted);

    if (pasted.length === 6 && onComplete) {
      onComplete(pasted);
    }

    // Focus appropriate box
    const nextIndex = Math.min(pasted.length, 5);
    inputsRef.current[nextIndex]?.focus();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          disabled={disabled}
          value={digit}
          suppressHydrationWarning
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className={`h-12 w-11 sm:h-14 sm:w-12 rounded-xl text-center font-mono text-xl font-bold outline-none transition-all ${
            digit
              ? "border-2 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-2 ring-[var(--accent)]/40 shadow-md shadow-[var(--accent)]/15"
              : "border-2 border-slate-300 dark:border-white/20 bg-slate-100/90 dark:bg-white/5 text-[var(--text)] hover:border-[var(--accent)]/50"
          } ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          }`}
        />
      ))}
    </div>
  );
}
