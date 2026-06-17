// ─────────────────────────────────────────────────────────────
//  ThemeToggle.jsx
//
//  A floating dark/light mode toggle button with smooth
//  sun/moon icon animation. Placed in the bottom-right corner.
// ─────────────────────────────────────────────────────────────

import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full
        bg-white dark:bg-slate-700
        border border-slate-200 dark:border-slate-600
        shadow-lg shadow-slate-200/50 dark:shadow-black/30
        hover:shadow-xl hover:scale-110
        active:scale-95
        transition-all duration-300 ease-in-out
        flex items-center justify-center
        group cursor-pointer"
    >
      {/* Sun icon (shown in dark mode, clicking switches to light) */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-300 ease-in-out
          ${darkMode
            ? "opacity-100 rotate-0 scale-100 text-amber-400"
            : "opacity-0 rotate-90 scale-50 text-amber-400"
          }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon (shown in light mode, clicking switches to dark) */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-300 ease-in-out
          ${!darkMode
            ? "opacity-100 rotate-0 scale-100 text-slate-600"
            : "opacity-0 -rotate-90 scale-50 text-slate-600"
          }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}
