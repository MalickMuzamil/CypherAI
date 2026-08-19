"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const DEFAULT_TIMEOUT_MINUTES = 15;

export function useAutoLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vaultly_autolock_minutes");
      return saved !== null ? Number(saved) : DEFAULT_TIMEOUT_MINUTES;
    }
    return DEFAULT_TIMEOUT_MINUTES;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const setAutoLockMinutes = useCallback((mins: number) => {
    setAutoLockMinutesState(mins);
    if (typeof window !== "undefined") {
      localStorage.setItem("vaultly_autolock_minutes", String(mins));
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (autoLockMinutes > 0 && !isLocked) {
      timerRef.current = setTimeout(() => {
        setIsLocked(true);
      }, autoLockMinutes * 60 * 1000);
    }
  }, [autoLockMinutes, isLocked]);

  useEffect(() => {
    if (autoLockMinutes <= 0 || isLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [autoLockMinutes, isLocked, resetTimer]);

  return {
    isLocked,
    lock,
    unlock,
    autoLockMinutes,
    setAutoLockMinutes,
  };
}
