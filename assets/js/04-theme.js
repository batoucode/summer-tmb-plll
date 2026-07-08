/* ============================================================
   TMB SUMMER BOOK — 04. THÈME (clair / sombre)
   Appliqué le plus tôt possible au chargement (avant que le reste de
   l'UI ne se dessine) pour limiter le flash de mauvais thème.
   Réutilise les mêmes variables CSS que le reste de l'app
   (:root[data-theme="dark"] dans assets/style.css) — aucun cas
   particulier ailleurs dans le code.
   ============================================================ */
(function () {
  "use strict";
  const THEME_KEY = "tmb_theme";

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function toggleTheme() {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  }

  applyTheme(localStorage.getItem(THEME_KEY) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  Object.assign(window.TMB.theme, { applyTheme, toggleTheme, currentTheme });
})();
