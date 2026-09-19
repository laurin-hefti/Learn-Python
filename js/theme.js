// Dark mode: follows system preference by default, toggle overrides, remembers in localStorage.

const THEME_KEY = 'pymaster-theme';
const MEDIA = '(prefers-color-scheme: dark)';

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}

function getSystemTheme() {
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateToggleIcon(theme);
}

function updateToggleIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}

function initTheme() {
  const stored = getStoredTheme();
  const initial = stored || getSystemTheme();
  applyTheme(initial);

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  // Only auto-switch with OS if the user hasn't chosen explicitly
  window.matchMedia(MEDIA).addEventListener('change', (e) => {
    if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });
}

document.addEventListener('DOMContentLoaded', initTheme);
