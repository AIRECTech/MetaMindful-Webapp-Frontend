// Dark mode utility with localStorage persistence

const DARK_MODE_KEY = "airec_chat_dark_mode";

export const getDarkMode = (): boolean => {
  return false;
};

export const setDarkMode = (_enabled: boolean): void => {
  localStorage.setItem(DARK_MODE_KEY, "false");
  document.documentElement.classList.remove("dark");
};

export const toggleDarkMode = (): boolean => {
  setDarkMode(false);
  return false;
};

// Initialize dark mode on load
export const initDarkMode = (): void => {
  setDarkMode(false);
};


