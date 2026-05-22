import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const getStoredTheme = () => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return 'system';
};

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  const isDarkMode = theme === 'dark' || (theme === 'system' && systemPrefersDark());

  useEffect(() => {
    const root = document.documentElement;
    const activeDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
    // If a page (landing) forces dark mode, do not override it here — still persist preference.
    if (root.dataset.landingDark === 'true') {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {}
      return;
    }

    root.classList.toggle('dark', activeDark);

    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      if (theme === 'system') {
        const root = document.documentElement;
        if (root.dataset.landingDark === 'true') return;
        root.classList.toggle('dark', event.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      return systemPrefersDark() ? 'light' : 'dark';
    });
  };

  const setTheme = (mode) => {
    if (mode === 'light' || mode === 'dark' || mode === 'system') {
      setThemeState(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);