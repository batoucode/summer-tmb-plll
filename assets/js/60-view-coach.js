/* ============================================================
   TMB SUMMER BOOK — 60. VUE COACH
   Composant partagé (40-component-program-editor.js), catégorie
   verrouillée sur celle assignée au coach.
   ============================================================ */
(function () {
  "use strict";
  const { $ } = window.TMB.core;

  async function renderCoachView() {
    const root = $("#view-coach");
    const profile = window.TMB.state.profile;
    if (!profile.assigned_category_id) {
      root.innerHTML = `<div class="page"><div class="empty-state">Aucune catégorie ne t'est assignée pour le moment. Contacte un administrateur.</div></div>`;
      return;
    }
    const categories = window.TMB.state.categories;
    await window.TMB.components.programEditor.mountCoachStyleView(root, {
      categoryId: profile.assigned_category_id,
      allowedCategories: categories.filter((c) => c.id === profile.assigned_category_id),
      lockCategory: true,
      nested: false
    });
  }

  window.TMB.views.coach.render = renderCoachView;
})();
