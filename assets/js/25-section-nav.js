/* ============================================================
   TMB SUMMER BOOK — 25. SECTION NAV
   Barre de navigation entre les grandes sections de l'app. Un seul
   composant, deux présentations selon la largeur d'écran (voir
   assets/style.css, .section-nav) : rangée de pastilles sous la topbar
   sur desktop, pilule flottante en bas d'écran sur mobile. Les sections
   affichées dépendent du rôle courant :
     - admin  : Entraînement, Programme, Admin, Profil
     - coach  : Entraînement, Programme, Profil
     - player : Entraînement, Profil
   (Programme n'est jamais montré au joueur — lui seul suit son propre
   entraînement, il n'a pas à parcourir le programme des autres
   catégories.)
   ============================================================ */
(function () {
  "use strict";
  const { $ } = window.TMB.core;

  function sectionsForRole(role) {
    const training = { id: "training", icon: "🏃", label: "Entraînement" };
    const program = { id: "program", icon: "📋", label: "Programme" };
    const admin = { id: "admin", icon: "🧑‍💼", label: "Admin" };
    const profileItem = { id: "settings", icon: "👤", label: "Profil" };

    if (role === "admin") return [training, program, admin, profileItem];
    if (role === "coach") return [training, program, profileItem];
    return [training, profileItem];
  }

  function goToSection(sectionId) {
    window.TMB.nav.showView(sectionId);
    window.TMB.errors.safeRender(sectionId, () => window.TMB.views[sectionId].render(), "#view-" + sectionId);
    renderSectionNav();
  }

  function renderSectionNav() {
    const root = $("#sectionNav");
    if (!root) return;
    const profile = window.TMB.state.profile;
    if (!profile) { root.innerHTML = ""; return; }

    const sections = sectionsForRole(profile.role);
    const current = window.TMB.state.currentSection;

    root.innerHTML = sections.map((s) => `
      <button type="button" class="section-nav-item ${s.id === current ? "active" : ""}" data-id="${s.id}">
        <span class="sn-icon">${s.icon}</span>
        <span>${s.label}</span>
      </button>
    `).join("");
    sections.forEach((s) => {
      root.querySelector(`[data-id="${s.id}"]`).addEventListener("click", () => goToSection(s.id));
    });
  }

  window.TMB.nav.renderSectionNav = renderSectionNav;
})();
