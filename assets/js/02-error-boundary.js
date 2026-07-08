/* ============================================================
   TMB SUMMER BOOK — 02. ERROR BOUNDARY
   Isolation de panne : si le rendu d'une vue (auth/admin/coach/player)
   lève une erreur (synchrone ou promesse rejetée), on affiche une carte
   d'erreur à l'intérieur de SON SEUL conteneur au lieu de planter toute
   la page. La topbar / le bouton déconnexion vivent dans d'autres
   modules (20-nav.js, 90-bootstrap.js) et ne passent jamais par ce
   wrapper : ils restent fonctionnels même si une vue est cassée.

   Limites (à avoir en tête, documentées aussi dans
   docs/ARCHITECTURE.md) : tous les modules partagent le même
   window/thread JS — ceci n'est PAS une sandbox comme une iframe ou un
   Worker. Un module peut toujours corrompre TMB.state ou geler l'UI
   avec une boucle infinie ; rien ici ne protège contre ça.
   ============================================================ */
(function () {
  "use strict";

  // Toujours appeler avec une fonction "thunk" : safeRender("coach", () =>
  // TMB.views.coach.render(), "#view-coach") — PAS safeRender("coach",
  // TMB.views.coach.render, ...). Avec une thunk, l'éventuelle erreur
  // d'évaluation de `TMB.views.coach.render` elle-même (namespace pas
  // encore prêt) se produit À L'INTÉRIEUR du try/catch ci-dessous, pas
  // avant. Sans thunk, cette erreur échapperait au filet.
  async function safeRender(moduleName, renderFn, containerSelector) {
    try {
      const result = renderFn();
      if (result && typeof result.then === "function") await result;
    } catch (err) {
      showErrorCard(moduleName, err, containerSelector);
    }
  }

  function showErrorCard(moduleName, err, containerSelector) {
    logError(moduleName, err);
    const core = window.TMB.core;
    const box = containerSelector && core.$ && core.$(containerSelector);
    if (box) {
      box.innerHTML = `
        <div class="page"><div class="empty-state error-card">
          <p>⚠️ Une erreur est survenue en chargeant cet écran (${moduleName}).</p>
          <p class="error-detail">${core.escapeHtml((err && err.message) || String(err))}</p>
          <button type="button" class="btn-secondary" id="errRetryBtn">Réessayer</button>
        </div></div>`;
      const retryBtn = core.$("#errRetryBtn", box);
      if (retryBtn) {
        retryBtn.addEventListener("click", () => {
          if (window.TMB.bootstrap && window.TMB.bootstrap.handleSessionChange) {
            window.TMB.bootstrap.handleSessionChange();
          }
        });
      }
    }
    try { core.toast(`Erreur (${moduleName}) — voir la console.`, true); } catch (_e) { /* toast lui-même indisponible */ }
  }

  function logError(moduleName, err) {
    console.error(`[TMB:${moduleName}]`, err);
  }

  // Filet de sécurité global : capture tout ce qui ne passe pas par
  // safeRender (erreur dans un gestionnaire d'événement non protégé,
  // promesse oubliée, etc.). Ne tente aucun re-rendu — le contexte de
  // la panne y est trop incertain — se contente de logguer clairement.
  window.addEventListener("error", (e) => logError("window", (e && e.error) || (e && e.message) || e));
  window.addEventListener("unhandledrejection", (e) => logError("window", e && e.reason));

  Object.assign(window.TMB.errors, { safeRender, showErrorCard, logError });
})();
