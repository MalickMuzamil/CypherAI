"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vaultly-theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("theme-dark", isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("vaultly-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("theme-dark", next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      onClick={toggle}
      className="icon-button h-11 w-11"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
