'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }

    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  function toggle() {
    const current: Theme = theme ?? 'light';
    const next = nextTheme(current);
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-secondary btn-sm theme-toggle"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
