"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      const nextTheme = storedTheme === "dark" ? "dark" : "light";
      setTheme(nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", next);
      } catch {}
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  return { theme, toggleTheme, mounted };
}
