/* ============================================================
   TMB SUMMER BOOK — 90. BOOTSTRAP
   Point d'entrée : récupère la session, charge le profil, puis
   dispatch vers la section d'atterrissage par défaut du rôle (admin →
   Admin, coach/joueur → Entraînement). C'est ici que chaque rendu de
   vue passe par TMB.errors.safeRender (02-error-boundary.js) : une
   panne dans une vue affiche une carte d'erreur locale, sans toucher à
   la topbar (nom + badge de rôle, jamais rendue via safeRender). La
   déconnexion et le thème vivent désormais dans la section Profil
   (80-view-settings.js) — voir la note dans docs/ARCHITECTURE.md §5 sur
   ce que ça change pour l'isolation de pannes.
   ============================================================ */
(function () {
  "use strict";
  const { $ } = window.TMB.core;
  const { showView, renderTopbar } = window.TMB.nav;
  const { safeRender } = window.TMB.errors;

  async function handleSessionChange() {
    const sb = window.TMB.supabase.client;
    if (!window.TMB.state.session) {
      window.TMB.state.profile = null;
      showView("auth");
      await safeRender("auth", () => window.TMB.views.auth.render(), "#view-auth");
      return;
    }
    try {
      window.TMB.state.profile = await window.TMB.data.loadUserProfile(window.TMB.state.session.user.id);
    } catch (err) {
      window.TMB.core.toast(err.message || String(err), true);
      return;
    }
    if (!window.TMB.state.profile) {
      $("#view-auth").innerHTML = `<div class="auth-wrap"><div class="auth-card"><p>Ton profil est en cours de création, réessaie dans un instant.</p><button class="btn-primary" id="retryProfileBtn">Réessayer</button></div></div>`;
      showView("auth");
      $("#retryProfileBtn").addEventListener("click", handleSessionChange);
      return;
    }
    renderTopbar();
    try { window.TMB.state.categories = await window.TMB.data.loadCategories(); } catch (e) { window.TMB.state.categories = []; }

    const role = window.TMB.state.profile.role;
    const defaultSection = role === "admin" ? "admin" : "training";
    showView(defaultSection);
    await safeRender(defaultSection, () => window.TMB.views[defaultSection].render(), "#view-" + defaultSection);
    if (window.TMB.nav.renderSectionNav) window.TMB.nav.renderSectionNav();
  }

  async function init() {
    if (!window.TMB.supabase.ready) return; // config manquante, déjà signalé (03-supabase-client.js)
    const sb = window.TMB.supabase.client;

    const { data } = await sb.auth.getSession();
    window.TMB.state.session = data.session;
    await handleSessionChange();

    sb.auth.onAuthStateChange((_event, newSession) => {
      const prev = window.TMB.state.session;
      const changed = (newSession && newSession.user && newSession.user.id) !== (prev && prev.user && prev.user.id);
      window.TMB.state.session = newSession;
      if (changed) handleSessionChange();
    });
  }

  window.TMB.bootstrap.handleSessionChange = handleSessionChange;
  window.TMB.bootstrap.init = init;

  document.addEventListener("DOMContentLoaded", init);
})();
