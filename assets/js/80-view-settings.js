/* ============================================================
   TMB SUMMER BOOK — 80. VUE PARAMÈTRES
   Écran self-service pour coach/joueur : modifier son identifiant de
   connexion, sa catégorie et son mot de passe. Pas de menu interne
   propre — accessible depuis le bouton "⚙️ Paramètres" de la topbar
   (voir 90-bootstrap.js), retour via handleSessionChange qui réaffiche
   automatiquement la bonne vue selon le rôle.
   ============================================================ */
(function () {
  "use strict";
  const { $, escapeHtml, toast } = window.TMB.core;
  const data = window.TMB.data;
  const auth = window.TMB.auth;

  function renderSettingsView() {
    const root = $("#view-settings");
    const profile = window.TMB.state.profile;
    const categories = window.TMB.state.categories;

    root.innerHTML = `
      <div class="page">
        <div class="page-title">Paramètres</div>

        <div class="card">
          <div class="section-title">Profil</div>
          <div class="field">
            <label>Identifiant de connexion</label>
            <input type="text" id="stUsername" pattern="[a-zA-Z0-9_.\-]{3,24}" value="${escapeHtml(profile.username || "")}">
          </div>
          <div class="field">
            <label>Catégorie</label>
            <select id="stCategory">
              ${categories.map((c) => `<option value="${c.id}" ${c.id === profile.assigned_category_id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
            </select>
          </div>
          <div class="form-error" id="stProfileError"></div>
          <button class="btn-primary" id="stProfileSave">Enregistrer</button>
        </div>

        <div class="card">
          <div class="section-title">Mot de passe</div>
          <div class="field">
            <label>Nouveau mot de passe</label>
            <input type="password" id="stPassword" minlength="6" placeholder="Laisser vide pour ne pas changer">
          </div>
          <div class="field">
            <label>Confirmer le nouveau mot de passe</label>
            <input type="password" id="stPasswordConfirm" minlength="6">
          </div>
          <div class="form-error" id="stPasswordError"></div>
          <button class="btn-primary" id="stPasswordSave">Changer le mot de passe</button>
        </div>

        <button class="btn-secondary" id="stBack">← Retour</button>
      </div>
    `;

    $("#stBack", root).addEventListener("click", () => {
      window.TMB.bootstrap.handleSessionChange();
    });

    $("#stProfileSave", root).addEventListener("click", async () => {
      const errEl = $("#stProfileError", root);
      errEl.textContent = "";
      const username = $("#stUsername", root).value.trim();
      const categoryId = Number($("#stCategory", root).value);
      try {
        await data.updateProfileFields(profile.id, { username, assigned_category_id: categoryId });
        profile.username = username;
        profile.assigned_category_id = categoryId;
        window.TMB.nav.renderTopbar();
        toast("Profil mis à jour.");
      } catch (err) {
        errEl.textContent = translateSettingsError(err);
      }
    });

    $("#stPasswordSave", root).addEventListener("click", async () => {
      const errEl = $("#stPasswordError", root);
      errEl.textContent = "";
      const pw = $("#stPassword", root).value;
      const pwConfirm = $("#stPasswordConfirm", root).value;
      if (!pw) { errEl.textContent = "Saisis un nouveau mot de passe."; return; }
      if (pw !== pwConfirm) { errEl.textContent = "Les deux mots de passe ne correspondent pas."; return; }
      try {
        await auth.updatePassword(pw);
        $("#stPassword", root).value = "";
        $("#stPasswordConfirm", root).value = "";
        toast("Mot de passe changé.");
      } catch (err) {
        errEl.textContent = translateSettingsError(err);
      }
    });
  }

  function translateSettingsError(err) {
    const msg = String((err && err.message) || err);
    if (/username.*format|tmb_profiles_username_format/i.test(msg)) return "Identifiant invalide (3 à 24 caractères, lettres/chiffres/._- uniquement).";
    if (/duplicate|already registered|already exists|tmb_profiles_username_lower_idx/i.test(msg)) return "Cet identifiant est déjà pris.";
    if (/password/i.test(msg) && /short|least/i.test(msg)) return "Mot de passe trop court (6 caractères minimum).";
    return msg || "Une erreur est survenue.";
  }

  window.TMB.views.settings.render = renderSettingsView;
})();
