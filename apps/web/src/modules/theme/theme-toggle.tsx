"use client";

import type { ThemeMode } from "./use-theme";
import styles from "./theme-toggle.module.css";

type ThemeToggleProps = {
  theme: ThemeMode;
  onChange: (nextTheme: ThemeMode) => void;
  label: string;
  lightLabel: string;
  darkLabel: string;
};

/**
 * Renders a compact theme mode switcher.
 */
export function ThemeToggle({
  theme,
  onChange,
  label,
  lightLabel,
  darkLabel
}: ThemeToggleProps) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange("light")}
        disabled={theme === "light"}
      >
        {lightLabel}
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange("dark")}
        disabled={theme === "dark"}
      >
        {darkLabel}
      </button>
    </div>
  );
}
