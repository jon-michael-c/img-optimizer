import { useCallback, useEffect, useSyncExternalStore, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "image-optimizer-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribeToSystemTheme(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    (): "light" | "dark" => "light"
  ) as "light" | "dark";

  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const effective: "light" | "dark" =
    theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((value: Theme) => setThemeState(value), []);
  const toggle = useCallback(
    () =>
      setThemeState((t) =>
        t === "dark" ? "light" : t === "light" ? "system" : "dark"
      ),
    []
  );

  return { theme, setTheme, resolved: effective, toggle };
}
