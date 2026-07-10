/* ============================================================
   TMB SUMMER BOOK — 50. VUE ADMIN
   Onglet Utilisateurs (rôles, catégories, création de compte, seed) +
   onglet Programmes (composant partagé, catégorie libre).
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, el, escapeHtml, toast, fullName, ROLE_LABELS } = window.TMB.core;
  const data = window.TMB.data;

  let adminTab = "users";

  async function renderAdminView() {
    const root = $("#view-admin");
    root.innerHTML = `
      <div class="page">
        <div class="page-title">Espace Administrateur</div>
        <div class="tabs">
          <button class="tab ${adminTab === "users" ? "active" : ""}" data-tab="users">👥 Utilisateurs</button>
          <button class="tab ${adminTab === "program" ? "active" : ""}" data-tab="program">🧑‍🏫 Vue Coach</button>
        </div>
        <div id="adminTabBody"></div>
      </div>
    `;
    $$(".tab", root).forEach((btn) => btn.addEventListener("click", () => { adminTab = btn.dataset.tab; renderAdminView(); }));

    const body = $("#adminTabBody", root);
    if (adminTab === "users") await renderAdminUsersTab(body);
    else await renderAdminProgramTab(body);
  }

  async function renderAdminUsersTab(body) {
    body.innerHTML = `<div class="empty-state">Chargement…</div>`;
    let users;
    try { users = await data.loadAllUsers(); } catch (err) { body.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; return; }

    const categories = window.TMB.state.categories;
    const catOptions = (excludeNone) => categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")
      + (excludeNone ? "" : `<option value="">—</option>`);

    body.innerHTML = `
      <div class="admin-actions">
        <button class="btn-primary" id="btnAddPlayer">➕ Ajouter un compte</button>
        ${categories.length === 0 ? `<button class="btn-secondary" id="btnSeed">📥 Importer le programme par défaut</button>` : `<button class="btn-secondary" id="btnReseed">♻️ Réinitialiser les données du programme</button>`}
      </div>
      <div id="addPlayerForm" class="card hidden"></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Nom</th><th>Prénom</th><th>Identifiant</th><th>Email</th><th>Catégorie</th><th>Rôle</th><th></th></tr></thead>
          <tbody id="usersBody"></tbody>
        </table>
      </div>
    `;

    const tbody = $("#usersBody", body);
    users.forEach((u) => {
      const row = el(`
        <tr data-id="${u.id}">
          <td>${escapeHtml(u.last_name || "")}</td>
          <td>${escapeHtml(u.first_name || "")}</td>
          <td><input type="text" class="rowUsername" value="${escapeHtml(u.username || "")}"></td>
          <td>${escapeHtml(u.email || "")}</td>
          <td>
            <select class="rowCategory">
              ${catOptions()}
            </select>
          </td>
          <td>
            <select class="rowRole">
              ${Object.keys(ROLE_LABELS).map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${ROLE_LABELS[r]}</option>`).join("")}
            </select>
          </td>
          <td><button class="btn-danger-ghost btnDeleteUser">🗑️</button></td>
        </tr>
      `);
      $(".rowCategory", row).value = u.assigned_category_id || "";
      tbody.appendChild(row);

      $(".rowRole", row).addEventListener("change", async (e) => {
        try {
          const catId = $(".rowCategory", row).value || null;
          await data.updateUserRole(u.id, e.target.value, catId ? Number(catId) : null);
          toast("Rôle mis à jour.");
        } catch (err) { toast(err.message || String(err), true); }
      });
      $(".rowCategory", row).addEventListener("change", async (e) => {
        try {
          const catId = e.target.value ? Number(e.target.value) : null;
          await data.updateUserRole(u.id, $(".rowRole", row).value, catId);
          toast("Catégorie mise à jour.");
        } catch (err) { toast(err.message || String(err), true); }
      });
      $(".rowUsername", row).addEventListener("blur", async (e) => {
        const val = e.target.value.trim();
        if (val === (u.username || "")) return;
        try {
          await data.updateProfileFields(u.id, { username: val });
          u.username = val;
          toast("Identifiant mis à jour.");
        } catch (err) {
          e.target.value = u.username || "";
          toast(err.message || String(err), true);
        }
      });
      $(".btnDeleteUser", row).addEventListener("click", async () => {
        if (!confirm(`Supprimer le compte de ${fullName(u)} ?\n\n(Seul le profil applicatif est supprimé ; le compte d'authentification doit être purgé côté tableau de bord Supabase — voir docs/SECURITY.md.)`)) return;
        try {
          await data.deleteUserProfile(u.id);
          row.remove();
          toast("Profil supprimé.");
        } catch (err) { toast(err.message || String(err), true); }
      });
    });

    $("#btnAddPlayer", body).addEventListener("click", () => {
      const box = $("#addPlayerForm", body);
      box.classList.toggle("hidden");
      if (box.classList.contains("hidden")) return;
      box.innerHTML = `
        <div class="field-row">
          <div class="field"><label>Prénom</label><input type="text" id="npFirst"></div>
          <div class="field"><label>Nom</label><input type="text" id="npLast"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Identifiant de connexion</label><input type="text" id="npUsername" pattern="[a-zA-Z0-9_.\-]{3,24}"></div>
          <div class="field">
            <label>Catégorie</label>
            <select id="npCategory">${catOptions()}</select>
          </div>
        </div>
        <div class="field"><label>Email (optionnel)</label><input type="email" id="npEmail"></div>
        <div class="field"><label>Mot de passe temporaire</label><input type="text" id="npPass" placeholder="min. 6 caractères"></div>
        <p class="auth-hint">Aucun envoi d'e-mail automatique n'est possible depuis une app statique sans clé service_role. Communique l'identifiant et ce mot de passe temporaire directement à la personne concernée ; elle pourra les changer plus tard depuis Paramètres.</p>
        <button class="btn-primary" id="npSubmit">Créer le compte</button>
      `;
      $("#npSubmit", box).addEventListener("click", async () => {
        try {
          const catVal = $("#npCategory", box).value;
          await window.TMB.auth.adminCreateAccount({
            firstName: $("#npFirst", box).value.trim(),
            lastName: $("#npLast", box).value.trim(),
            username: $("#npUsername", box).value.trim(),
            categoryId: catVal ? Number(catVal) : null,
            email: $("#npEmail", box).value.trim(),
            password: $("#npPass", box).value
          });
          toast("Compte créé.");
          box.classList.add("hidden");
          await renderAdminUsersTab(body);
        } catch (err) { toast(err.message || String(err), true); }
      });
    });

    const seedBtn = $("#btnSeed", body) || $("#btnReseed", body);
    if (seedBtn) {
      seedBtn.addEventListener("click", async () => {
        if (seedBtn.id === "btnReseed" && !confirm("Réinitialiser écrase les plans/exercices existants avec les données par défaut. Continuer ?")) return;
        seedBtn.disabled = true;
        seedBtn.textContent = "Import en cours…";
        try {
          await data.seedDatabase(true);
          window.TMB.state.categories = await data.loadCategories();
          toast("Programme importé ✅");
          await renderAdminView();
        } catch (err) {
          toast(err.message || String(err), true);
          seedBtn.disabled = false;
        }
      });
    }
  }

  async function renderAdminProgramTab(body) {
    const categories = window.TMB.state.categories;
    if (!categories.length) {
      body.innerHTML = `<div class="empty-state">Aucune catégorie : importe d'abord le programme par défaut depuis l'onglet Utilisateurs.</div>`;
      return;
    }
    await window.TMB.components.programEditor.mountCoachStyleView(body, {
      categoryId: categories[0].id,
      allowedCategories: null,
      lockCategory: false,
      nested: true
    });
  }

  window.TMB.views.admin.render = renderAdminView;
})();
