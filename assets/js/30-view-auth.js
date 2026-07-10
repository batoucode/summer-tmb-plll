/* ============================================================
   TMB SUMMER BOOK — 30. VUE AUTH
   Écran de connexion / inscription (thème rouge TMB). Le succès de
   signIn/signUp ne redirige pas directement : c'est
   sb.auth.onAuthStateChange (dans 90-bootstrap.js) qui détecte la
   nouvelle session et déclenche le passage à la bonne vue par rôle.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, toast, escapeHtml } = window.TMB.core;

  let authMode = "login"; // "login" | "signup"
  let authCategories = [];
  const TMB_LOGO_URL = "https://toursmetropolebasket.com/wp-content/themes/utbm/build/svg/logoUTBM.svg";

  async function renderAuthView() {
    const root = $("#view-auth");
    if (authMode === "signup" && authCategories.length === 0) {
      try { authCategories = await window.TMB.data.loadCategories(); } catch (e) { authCategories = []; }
    }
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
                <label>Catégorie</label>
                <select id="fCategory" required>
                  <option value="" disabled selected>Choisis ta catégorie</option>
                  ${authCategories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
                </select>
              </div>
            ` : ""}
            <div class="field">
              <label>Identifiant de connexion</label>
              <input type="text" id="fUsername" pattern="[a-zA-Z0-9_.\-]{3,24}" required>
            </div>
            ${authMode === "signup" ? `
              <div class="field">
                <label>Email (optionnel)</label>
                <input type="email" id="fEmail">
              </div>
            ` : ""}
            <div class="field">
              <label>Mot de passe</label>
              <input type="password" id="fPassword" minlength="6" required>
            </div>
            <div class="form-error" id="authError"></div>
            <button type="submit" class="btn-primary btn-block" id="authSubmit">
              ${authMode === "signup" ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>
          ${authMode === "signup" ? `<p class="auth-hint">Choisis ton identifiant de connexion (3 à 24 caractères) : c'est lui qui te servira à te connecter, pas ton email. Un administrateur ou toi-même (menu Paramètres) pourrez le modifier plus tard.</p>` : ""}
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
      const username = $("#fUsername", root).value.trim();
      const password = $("#fPassword", root).value;
      try {
        if (authMode === "signup") {
          await window.TMB.auth.signUp({
            username, password,
            firstName: $("#fFirstName", root).value.trim(),
            lastName: $("#fLastName", root).value.trim(),
            categoryId: Number($("#fCategory", root).value),
            email: $("#fEmail", root).value.trim()
          });
          toast("Compte créé. Si la confirmation par e-mail est activée, vérifie ta boîte mail avant de te connecter.");
          authMode = "login";
          renderAuthView();
        } else {
          await window.TMB.auth.signIn(username, password);
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
    if (/username.*format|tmb_profiles_username_format/i.test(msg)) return "Identifiant invalide (3 à 24 caractères, lettres/chiffres/._- uniquement).";
    if (/duplicate|already registered|already exists|tmb_profiles_username_lower_idx/i.test(msg)) return "Cet identifiant est déjà pris.";
    if (/invalid login credentials/i.test(msg)) return "Identifiant ou mot de passe incorrect.";
    if (/password/i.test(msg) && /short|least/i.test(msg)) return "Mot de passe trop court (6 caractères minimum).";
    return msg || "Une erreur est survenue.";
  }

  window.TMB.views.auth.render = renderAuthView;
})();
