// Dark mode utility with localStorage persistence

const DARK_MODE_KEY = "airec_chat_dark_mode";

export const getDarkMode = (): boolean => {
  // Check localStorage first
  const stored = localStorage.getItem(DARK_MODE_KEY);
  if (stored !== null) {
    return stored === "true";
  }
  // Fallback to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const setDarkMode = (enabled: boolean): void => {
  localStorage.setItem(DARK_MODE_KEY, String(enabled));
  if (enabled) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

export const toggleDarkMode = (): boolean => {
  const current = getDarkMode();
  const newMode = !current;
  setDarkMode(newMode);
  return newMode;
};

// Initialize dark mode on load
export const initDarkMode = (): void => {
  const enabled = getDarkMode();
  setDarkMode(enabled);
};


