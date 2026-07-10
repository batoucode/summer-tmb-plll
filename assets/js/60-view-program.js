/* ============================================================
   TMB SUMMER BOOK — 60. VUE PROGRAMME
   Onglet Éditer (composant partagé 40-component-program-editor.js,
   sélecteur de catégorie libre) + onglet Stats joueurs (régularité à
   l'entraînement par catégorie). Visible par l'admin (toutes
   catégories, toujours éditable) et le coach (toutes catégories en
   lecture, la sienne en écriture — voir canEditCategory dans le
   composant partagé). Jamais montré au joueur (voir 25-section-nav.js).
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, escapeHtml, fullName } = window.TMB.core;
  const data = window.TMB.data;

  let programTab = "edit";
  let statsCategoryId = null;
  const WEEKS = [1, 2, 3, 4, 5];

  function defaultCategoryId() {
    const profile = window.TMB.state.profile;
    const categories = window.TMB.state.categories;
    if (profile.assigned_category_id) return profile.assigned_category_id;
    return categories.length ? categories[0].id : null;
  }

  async function renderProgramView() {
    const root = $("#view-program");
    const categories = window.TMB.state.categories;
    if (!categories.length) {
      root.innerHTML = `<div class="page"><div class="empty-state">Aucune catégorie : importe d'abord le programme par défaut depuis l'onglet Admin.</div></div>`;
      return;
    }
    root.innerHTML = `
      <div class="page">
        <div class="page-title">Programme</div>
        <div class="tabs">
          <button class="tab ${programTab === "edit" ? "active" : ""}" data-tab="edit">✏️ Éditer</button>
          <button class="tab ${programTab === "stats" ? "active" : ""}" data-tab="stats">📊 Stats joueurs</button>
        </div>
        <div id="programTabBody"></div>
      </div>
    `;
    $$(".tab", root).forEach((btn) => btn.addEventListener("click", () => { programTab = btn.dataset.tab; renderProgramView(); }));

    const body = $("#programTabBody", root);
    if (programTab === "edit") await renderEditTab(body);
    else await renderStatsTab(body);
  }

  async function renderEditTab(body) {
    await window.TMB.components.programEditor.mount(body, {
      categoryId: defaultCategoryId(),
      week: 1,
      allowedCategories: null,
      lockCategory: false
    });
  }

  async function renderStatsTab(body) {
    if (statsCategoryId == null) statsCategoryId = defaultCategoryId();
    const categories = window.TMB.state.categories;

    body.innerHTML = `
      <div class="field" style="max-width:280px">
        <label>Catégorie</label>
        <select id="statsCategory">
          ${categories.map((c) => `<option value="${c.id}" ${c.id === statsCategoryId ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
        </select>
      </div>
      <div id="statsTableWrap"><div class="empty-state">Chargement…</div></div>
    `;
    $("#statsCategory", body).addEventListener("change", (e) => {
      statsCategoryId = Number(e.target.value);
      renderStatsTable($("#statsTableWrap", body));
    });
    await renderStatsTable($("#statsTableWrap", body));
  }

  /* Un jour compte comme "entraînable" s'il n'est pas un jour de repos et
     a au moins un exercice défini (rien à valider sinon). Un jour est
     "validé" pour un joueur quand tous ses exercices le sont — même
     règle que côté vue Entraînement (voir supabase/schema.sql, section 6). */
  async function renderStatsTable(wrap) {
    wrap.innerHTML = `<div class="empty-state">Chargement…</div>`;
    let players, weekPrograms;
    try {
      [players, weekPrograms] = await Promise.all([
        data.loadPlayersByCategory(statsCategoryId),
        Promise.all(WEEKS.map((w) => data.loadProgram(statsCategoryId, w)))
      ]);
    } catch (err) {
      wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
      return;
    }

    if (!players.length) {
      wrap.innerHTML = `<div class="empty-state">Aucun joueur dans cette catégorie pour le moment.</div>`;
      return;
    }

    const trainableDaysByWeek = weekPrograms.map((prog) => (prog.days || []).filter((d) => !d.is_rest && d.exercises.length > 0));
    const totalTrainableDays = trainableDaysByWeek.reduce((sum, days) => sum + days.length, 0);
    const allExerciseIds = weekPrograms.flatMap((prog) => (prog.days || []).flatMap((d) => d.exercises.map((e) => e.id)));

    let validationsByPlayer;
    try {
      validationsByPlayer = await Promise.all(players.map((p) => data.loadValidations(p.id, allExerciseIds)));
    } catch (err) {
      wrap.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
      return;
    }

    const rows = players.map((player, i) => {
      const valMap = validationsByPlayer[i];
      let lastDate = null;
      const weekStats = trainableDaysByWeek.map((days) => {
        let done = 0;
        days.forEach((day) => {
          const allValidated = day.exercises.length > 0 && day.exercises.every((ex) => {
            const v = valMap[ex.id];
            const ok = !!(v && v.validated);
            if (ok && v.validation_date && (!lastDate || v.validation_date > lastDate)) lastDate = v.validation_date;
            return ok;
          });
          if (allValidated) done++;
        });
        return { done, total: days.length };
      });
      const totalDone = weekStats.reduce((s, w) => s + w.done, 0);
      const pct = totalTrainableDays ? Math.round((totalDone / totalTrainableDays) * 100) : null;
      return { player, weekStats, pct, lastDate };
    });

    wrap.innerHTML = `
      <p style="color:var(--text-faint);font-size:0.85rem;margin:12px 0 8px">
        Un jour compte comme "validé" quand tous ses exercices le sont. Colonnes S1 à S5 : jours validés / jours prévus cette semaine-là.
      </p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Joueur</th>
            ${WEEKS.map((w) => `<th>S${w}</th>`).join("")}
            <th>Régularité</th>
            <th>Dernière activité</th>
          </tr></thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td>${escapeHtml(fullName(r.player))}</td>
                ${r.weekStats.map((w) => `<td>${w.total ? `${w.done}/${w.total}` : "—"}</td>`).join("")}
                <td>${r.pct === null ? "—" : `<span class="status-pill ${pctClass(r.pct)}">${r.pct}%</span>`}</td>
                <td>${r.lastDate ? formatDate(r.lastDate) : "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function pctClass(pct) {
    if (pct >= 80) return "done";
    if (pct >= 40) return "partial";
    return "todo";
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  }

  window.TMB.views.program.render = renderProgramView;
})();
