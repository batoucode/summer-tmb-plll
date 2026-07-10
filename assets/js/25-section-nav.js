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

  /* Icônes trait fin (style "Feather"), cohérentes avec la maquette
     fournie par l'utilisateur : contour simple, pas d'aplat de couleur
     sauf sur l'icône active (voir .section-nav-item.active .sn-icon-wrap
     dans assets/style.css). */
  const ICONS = {
    training: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    program: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  };

  function sectionsForRole(role) {
    const training = { id: "training", icon: ICONS.training, label: "Entraînement" };
    const program = { id: "program", icon: ICONS.program, label: "Programme" };
    const admin = { id: "admin", icon: ICONS.admin, label: "Admin" };
    const profileItem = { id: "settings", icon: ICONS.settings, label: "Profil" };

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
      <button type="button" class="section-nav-item ${s.id === current ? "active" : ""}" data-id="${s.id}" aria-label="${s.label}">
        <span class="sn-icon-wrap"><span class="sn-icon">${s.icon}</span></span>
        <span class="sn-label">${s.label}</span>
      </button>
    `).join("");
    sections.forEach((s) => {
      root.querySelector(`[data-id="${s.id}"]`).addEventListener("click", () => goToSection(s.id));
    });
  }

  window.TMB.nav.renderSectionNav = renderSectionNav;
})();
