/* ============================================================
   TMB SUMMER BOOK — 04. THÈME (clair / sombre)
   Appliqué le plus tôt possible au chargement (avant que le reste de
   l'UI ne se dessine) pour limiter le flash de mauvais thème.
   Réutilise les mêmes variables CSS que le reste de l'app
   (:root[data-theme="dark"] dans assets/style.css) — aucun cas
   particulier ailleurs dans le code. L'interrupteur (#themeToggle,
   une case à cocher) vit dans la section Profil (80-view-settings.js),
   donc absent du DOM tant que cette vue n'a pas été ouverte une fois —
   `applyTheme` reste défensif là-dessus.
   ============================================================ */
(function () {
  "use strict";
  const THEME_KEY = "tmb_theme";

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const toggle = document.getElementById("themeToggle");
    if (toggle) toggle.checked = theme === "dark";
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
