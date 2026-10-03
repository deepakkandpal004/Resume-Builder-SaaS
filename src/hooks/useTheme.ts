"use client";
import { useEffect } from "react";

// Dark mode has been removed: the app is light-only.
// Kept as a no-op so existing imports don't break. Always reports the
// light theme and strips a stale `dark` class (e.g. from an old
// localStorage value) if one is ever present.
export const useTheme = (): { theme: "light"; toggleTheme: () => void; isDark: false } => {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      localStorage.removeItem("theme");
    } catch {
      // storage unavailable — nothing to clean up
    }
  }, []);

  return { theme: "light", toggleTheme: () => {}, isDark: false };
};
