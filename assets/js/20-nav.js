/* ============================================================
   TMB SUMMER BOOK — 20. NAV
   Navigation entre les 4 conteneurs de vue + topbar (nom, badge de
   rôle). Module volontairement minimal et peu dépendant : c'est ce qui
   doit continuer à fonctionner même si le rendu d'une vue plante (voir
   02-error-boundary.js) — notamment le bouton de déconnexion, branché
   dans 90-bootstrap.js, jamais à l'intérieur d'un safeRender de vue.
   ============================================================ */
(function () {
  "use strict";
  const { $ } = window.TMB.core;

  function showView(name) {
    ["auth", "admin", "coach", "player", "settings"].forEach((v) => {
      $("#view-" + v).classList.toggle("hidden", v !== name);
    });
    $("#topbar").classList.toggle("hidden", name === "auth");
  }

  function renderTopbar() {
    const profile = window.TMB.state.profile;
    const { fullName, ROLE_LABELS } = window.TMB.core;
    if (!profile) return;
    $("#topbarUserName").textContent = fullName(profile);
    $("#topbarUserRole").textContent = ROLE_LABELS[profile.role] || profile.role;
    $("#topbarUserRole").className = "role-badge role-" + profile.role;
    const settingsBtn = $("#settingsBtn");
    if (settingsBtn) settingsBtn.classList.toggle("hidden", profile.role === "admin");
  }

  Object.assign(window.TMB.nav, { showView, renderTopbar });
})();
