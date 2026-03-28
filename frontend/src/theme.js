export const SUPPORTED_THEMES = ['dark', 'light'];
export const DEFAULT_THEME = 'dark';

function normalizeTheme(raw) {
  return SUPPORTED_THEMES.includes(raw) ? raw : DEFAULT_THEME;
}

export function getCurrentTheme() {
  const saved = localStorage.getItem('theme');
  return normalizeTheme(saved);
}

export function applyTheme(theme) {
  const normalized = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', normalized);
  return normalized;
}

export function setCurrentTheme(theme) {
  const normalized = applyTheme(theme);
  localStorage.setItem('theme', normalized);
  return normalized;
}

export function toggleTheme() {
  const current = getCurrentTheme();
  return setCurrentTheme(current === 'light' ? 'dark' : 'light');
}

export function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    applyTheme(saved);
    return;
  }

  applyTheme(DEFAULT_THEME);
  localStorage.setItem('theme', DEFAULT_THEME);
}
