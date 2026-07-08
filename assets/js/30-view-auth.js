/* ============================================================
   TMB SUMMER BOOK — 30. VUE AUTH
   Écran de connexion / inscription (thème rouge TMB). Le succès de
   signIn/signUp ne redirige pas directement : c'est
   sb.auth.onAuthStateChange (dans 90-bootstrap.js) qui détecte la
   nouvelle session et déclenche le passage à la bonne vue par rôle.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, toast } = window.TMB.core;

  let authMode = "login"; // "login" | "signup"
  const TMB_LOGO_URL = "https://toursmetropolebasket.com/wp-content/themes/utbm/build/svg/logoUTBM.svg";

  function renderAuthView() {
    const root = $("#view-auth");
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <img class="auth-logo-img" src="${TMB_LOGO_URL}" alt="Tours Métropole Basket" loading="eager">
          <h1>Summer 2026<br>TMB-PLLL</h1>
          <p class="auth-sub">Ton programme de préparation physique estivale : séances, exercices et suivi de progression, tout l'été avec le TMB.</p>

          <div class="auth-tabs">
            <button class="auth-tab ${authMode === "login" ? "active" : ""}" data-mode="login">Connexion</button>
            <button class="auth-tab ${authMode === "signup" ? "active" : ""}" data-mode="signup">Inscription</button>
          </div>

          <form id="authForm" class="auth-form" autocomplete="off">
            ${authMode === "signup" ? `
              <div class="field-row">
                <div class="field">
                  <label>Prénom</label>
                  <input type="text" id="fFirstName" required>
                </div>
                <div class="field">
                  <label>Nom</label>
                  <input type="text" id="fLastName" required>
                </div>
              </div>
              <div class="field">
                <label>Date de naissance</label>
                <input type="date" id="fBirthDate" required>
              </div>
            ` : ""}
            <div class="field">
              <label>Email</label>
              <input type="email" id="fEmail" required>
            </div>
            <div class="field">
              <label>Mot de passe</label>
              <input type="password" id="fPassword" minlength="6" required>
            </div>
            <div class="form-error" id="authError"></div>
            <button type="submit" class="btn-primary btn-block" id="authSubmit">
              ${authMode === "signup" ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>
          ${authMode === "signup" ? `<p class="auth-hint">Ta catégorie (U13/U15/U18/NM3) est déduite automatiquement de ta date de naissance.</p>` : ""}
        </div>
      </div>
    `;
    $$(".auth-tab", root).forEach((btn) => btn.addEventListener("click", () => { authMode = btn.dataset.mode; renderAuthView(); }));
    $("#authForm", root).addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = $("#authError", root);
      const submitBtn = $("#authSubmit", root);
      errEl.textContent = "";
      submitBtn.disabled = true;
      const email = $("#fEmail", root).value.trim();
      const password = $("#fPassword", root).value;
      try {
        if (authMode === "signup") {
          await window.TMB.auth.signUp({
            email, password,
            firstName: $("#fFirstName", root).value.trim(),
            lastName: $("#fLastName", root).value.trim(),
            birthDate: $("#fBirthDate", root).value
          });
          toast("Compte créé. Si la confirmation par e-mail est activée, vérifie ta boîte mail avant de te connecter.");
          authMode = "login";
          renderAuthView();
        } else {
          await window.TMB.auth.signIn(email, password);
        }
      } catch (err) {
        errEl.textContent = translateAuthError(err);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function translateAuthError(err) {
    const msg = String((err && err.message) || err);
    if (/already registered|already exists/i.test(msg)) return "Un compte existe déjà avec cet email.";
    if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
    if (/password/i.test(msg) && /short|least/i.test(msg)) return "Mot de passe trop court (6 caractères minimum).";
    return msg || "Une erreur est survenue.";
  }

  window.TMB.views.auth.render = renderAuthView;
})();
