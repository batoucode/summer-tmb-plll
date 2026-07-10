/* ============================================================
   TMB SUMMER BOOK — 25. BOTTOM NAV (mobile)
   Barre flottante en bas d'écran, visible uniquement sous 640px (voir
   assets/style.css) : reprend Paramètres/Thème/Déconnexion (topbar) et
   les onglets internes de l'espace Admin (Utilisateurs/Programme),
   masqués sur mobile pour désencombrer la topbar. Sur desktop, ce
   composant reste inerte (display:none) — topbar/onglets habituels
   inchangés. Un seul et même composant pour les 3 rôles ; les items
   affichés varient selon le rôle courant.
   ============================================================ */
(function () {
  "use strict";
  const { $ } = window.TMB.core;

  function isSettingsOpen() {
    const el = $("#view-settings");
    return !!el && !el.classList.contains("hidden");
  }

  function openSettings() {
    window.TMB.nav.showView("settings");
    window.TMB.errors.safeRender("settings", () => window.TMB.views.settings.render(), "#view-settings");
  }

  function goHome(role) {
    window.TMB.nav.showView(role);
    window.TMB.errors.safeRender(role, () => window.TMB.views[role].render(), "#view-" + role);
  }

  function itemsForRole(role) {
    const common = [
      { id: "settings", icon: "⚙️", label: "Réglages", action: openSettings, isActive: isSettingsOpen },
      { id: "theme", icon: "🌓", label: "Thème", action: () => window.TMB.theme.toggleTheme(), isActive: () => false },
      { id: "logout", icon: "🚪", label: "Quitter", action: () => window.TMB.auth.signOut(), isActive: () => false }
    ];

    if (role === "admin") {
      return [
        {
          id: "users", icon: "👥", label: "Joueurs",
          action: () => window.TMB.views.admin.setTab("users"),
          isActive: () => !isSettingsOpen() && window.TMB.views.admin.getTab() === "users"
        },
        {
          id: "program", icon: "🧑‍🏫", label: "Programme",
          action: () => window.TMB.views.admin.setTab("program"),
          isActive: () => !isSettingsOpen() && window.TMB.views.admin.getTab() === "program"
        },
        ...common
      ];
    }

    return [
      { id: "home", icon: "🏀", label: "Programme", action: () => goHome(role), isActive: () => !isSettingsOpen() },
      ...common
    ];
  }

  function renderBottomNav() {
    const root = $("#bottomNav");
    if (!root) return;
    const profile = window.TMB.state.profile;
    if (!profile) { root.innerHTML = ""; return; }

    const items = itemsForRole(profile.role);
    root.innerHTML = items.map((it) => `
      <button type="button" class="bottom-nav-item ${it.isActive() ? "active" : ""}" data-id="${it.id}">
        <span class="bn-icon">${it.icon}</span>
        <span>${it.label}</span>
      </button>
    `).join("");
    items.forEach((it) => {
      root.querySelector(`[data-id="${it.id}"]`).addEventListener("click", () => {
        it.action();
        renderBottomNav();
      });
    });
  }

  window.TMB.nav.renderBottomNav = renderBottomNav;
})();
