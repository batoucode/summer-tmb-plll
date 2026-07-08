/* ============================================================
   TMB SUMMER BOOK — 90. BOOTSTRAP
   Point d'entrée : récupère la session, charge le profil, puis
   dispatch vers la bonne vue par rôle. C'est ici que chaque rendu de
   vue passe par TMB.errors.safeRender (02-error-boundary.js) : une
   panne dans une vue affiche une carte d'erreur locale, ne touche pas
   à la topbar ni au bouton de déconnexion (câblés ci-dessous,
   indépendamment de la vue affichée).
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
    if (role === "admin") {
      showView("admin");
      await safeRender("admin", () => window.TMB.views.admin.render(), "#view-admin");
    } else if (role === "coach") {
      showView("coach");
      await safeRender("coach", () => window.TMB.views.coach.render(), "#view-coach");
    } else {
      showView("player");
      await safeRender("player", () => window.TMB.views.player.render(), "#view-player");
    }
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

    const logoutBtn = $("#logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await window.TMB.auth.signOut();
      });
    }
  }

  window.TMB.bootstrap.handleSessionChange = handleSessionChange;
  window.TMB.bootstrap.init = init;

  document.addEventListener("DOMContentLoaded", init);
})();
