"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Apply resolved theme to DOM
  const applyTheme = (mode: ThemeMode) => {
    let resolved: ResolvedTheme = "light";
    if (mode === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = mode;
    }

    setResolvedTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);

    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute("content", resolved);
    }
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem("bizzpal-theme", mode);
    applyTheme(mode);
  };

  const cycleTheme = () => {
    setThemeState(prev => {
      const cycleOrder: ThemeMode[] = ["light", "dark", "system"];
      const nextIndex = (cycleOrder.indexOf(prev) + 1) % cycleOrder.length;
      const nextMode = cycleOrder[nextIndex];
      localStorage.setItem("bizzpal-theme", nextMode);
      applyTheme(nextMode);
      return nextMode;
    });
  };

  useEffect(() => {
    setMounted(true);
    const migrated = localStorage.getItem("bizzpal-theme-default-v3");
    let stored = localStorage.getItem("bizzpal-theme") as ThemeMode | null;
    if (!migrated) {
      localStorage.setItem("bizzpal-theme", "light");
      localStorage.setItem("bizzpal-theme-default-v3", "light");
      stored = "light";
    }
    const initialMode: ThemeMode = stored === "dark" ? "dark" : "light";
    setThemeState(initialMode);
    applyTheme(initialMode);
    if (!stored || stored === "system") {
      localStorage.setItem("bizzpal-theme", "light");
    }

    // Keyboard shortcut: ⌘/Ctrl + Shift + L to cycle themes
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "L" || e.key === "l")) {
        e.preventDefault();
        cycleTheme();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
