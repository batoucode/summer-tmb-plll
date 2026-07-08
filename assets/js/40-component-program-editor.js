/* ============================================================
   TMB SUMMER BOOK — 40. COMPOSANT PARTAGÉ : ÉDITEUR DE PROGRAMME
   Utilisé par 50-view-admin.js (catégorie libre) et 60-view-coach.js
   (catégorie verrouillée sur celle du coach). Contrat :

     TMB.components.programEditor.mount(container, {
       categoryId,              // id de catégorie initialement affichée
       week,                    // numéro de semaine initial (1-5)
       allowedCategories,       // liste des catégories sélectionnables
                                 // (null = toutes, cf. TMB.state.categories)
       lockCategory              // true = pas de sélecteur (vue coach)
     })

   Une erreur ici remonte à l'appelant (admin ou coach) et s'affiche
   donc comme une erreur de LEUR vue — c'est normal et documenté dans
   docs/ARCHITECTURE.md (le composant n'a pas sa propre carte d'erreur
   séparée, il n'a pas de conteneur de vue à lui).
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, el, escapeHtml, toast, DAY_LABELS } = window.TMB.core;
  const data = window.TMB.data;

  function exerciseCardTemplate(ex, idx) {
    return `
      <div class="exo-edit-card" data-idx="${idx}" data-id="${ex.id || ""}">
        <div class="field-row">
          <div class="field field-grow">
            <label>Nom de l'exercice</label>
            <input type="text" data-f="name" value="${escapeHtml(ex.name || "")}" placeholder="ex: Goblet Squat">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>🔄 Séries</label>
            <input type="number" min="0" data-f="sets" value="${ex.sets ?? ""}">
          </div>
          <div class="field">
            <label>⏱️ Durée (sec)</label>
            <input type="number" min="0" data-f="duration" value="${ex.duration ?? ""}">
          </div>
          <div class="field">
            <label>💪 Intensité (1-10)</label>
            <input type="number" min="1" max="10" data-f="intensity" value="${ex.intensity ?? ""}">
          </div>
        </div>
        <div class="field-row">
          <div class="field field-grow">
            <label>Consigne (séries x reps, texte libre)</label>
            <input type="text" data-f="reps" value="${escapeHtml(ex.reps || "")}" placeholder="ex: 3 X 10">
          </div>
        </div>
        <button type="button" class="btn-danger-ghost btn-del-exo">🗑️ Supprimer</button>
      </div>
    `;
  }

  function readExerciseCard(cardEl) {
    return {
      name: $('[data-f="name"]', cardEl).value.trim(),
      sets: numOrNull($('[data-f="sets"]', cardEl).value),
      duration: numOrNull($('[data-f="duration"]', cardEl).value),
      intensity: numOrNull($('[data-f="intensity"]', cardEl).value),
      reps: $('[data-f="reps"]', cardEl).value.trim() || null
    };
  }
  function numOrNull(v) { return v === "" || v == null ? null : Number(v); }

  /* Monte l'éditeur de programme dans `container` pour la catégorie et
     semaine données. Si `lockCategory` est vrai, aucun sélecteur de
     catégorie n'est affiché (cas coach). Le programme est organisé par
     jour (Lundi à Dimanche + un créneau bonus "Défi") : on édite un jour
     à la fois, sélectionné via des onglets. */
  async function mountProgramEditor(container, opts) {
    const state = {
      categoryId: opts.categoryId,
      week: opts.week || 1,
      dayIndex: 0,
      allowedCategories: opts.allowedCategories, // null = toutes
      plan: null,
      days: [] // jours existants en base pour ce plan
    };

    function dayByIndex(idx) { return state.days.find((d) => d.day_index === idx); }

    async function load() {
      if (!state.categoryId) { container.innerHTML = `<div class="empty-state">Aucune catégorie disponible.</div>`; return; }
      container.innerHTML = `<div class="empty-state">Chargement…</div>`;
      const { plan, days } = await data.loadProgram(state.categoryId, state.week);
      state.plan = plan;
      state.days = days;
      draw();
    }

    function draw() {
      const categories = window.TMB.state.categories;
      const catOptions = (state.allowedCategories || categories)
        .map((c) => `<option value="${c.id}" ${c.id === state.categoryId ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("");
      const weekTabs = [1, 2, 3, 4, 5].map((w) =>
        `<button class="week-tab ${w === state.week ? "active" : ""}" data-w="${w}">S${w}</button>`).join("");

      container.innerHTML = `
        <div class="editor-toolbar">
          ${opts.lockCategory
            ? `<div class="locked-cat">Catégorie : <strong>${escapeHtml((categories.find((c) => c.id === state.categoryId) || {}).name || "—")}</strong></div>`
            : `<div class="field"><label>Catégorie</label><select id="edCategory">${catOptions}</select></div>`}
          <div class="week-tabs">${weekTabs}</div>
        </div>

        ${state.plan ? `
        <div class="plan-card">
          <div class="field">
            <label>Objectif de la semaine</label>
            <textarea id="edObjective" rows="2">${escapeHtml(state.plan.objective || "")}</textarea>
          </div>
          <div class="field">
            <label>Mot du staff</label>
            <textarea id="edStaffQuote" rows="2">${escapeHtml(state.plan.staff_quote || "")}</textarea>
          </div>
        </div>

        <div class="week-tabs" id="edDayTabs">
          ${DAY_LABELS.map((label, i) => {
            const d = dayByIndex(i);
            const cls = i === state.dayIndex ? "active" : (d ? (d.is_rest ? "is-rest" : "") : "is-empty");
            return `<button class="week-tab ${cls}" data-d="${i}">${i === 7 ? "🏆" : label.slice(0, 3)}</button>`;
          }).join("")}
        </div>

        <div id="edDayBody"></div>
        ` : `
        <div class="empty-state">
          <p>Aucun plan pour cette catégorie et cette semaine.</p>
          <button type="button" class="btn-primary" id="edCreatePlan">Créer le plan de la semaine ${state.week}</button>
        </div>`}
      `;

      if (!opts.lockCategory) {
        $("#edCategory", container).addEventListener("change", (e) => {
          state.categoryId = Number(e.target.value);
          load();
        });
      }
      $$(".week-tabs:not(#edDayTabs) .week-tab", container).forEach((btn) => btn.addEventListener("click", () => {
        state.week = Number(btn.dataset.w);
        load();
      }));

      if (!state.plan) {
        $("#edCreatePlan", container).addEventListener("click", async () => {
          try {
            state.plan = await data.ensurePlan(state.categoryId, state.week);
            state.days = [];
            draw();
          } catch (err) { toast(err.message || String(err), true); }
        });
        return;
      }

      $$("#edDayTabs .week-tab", container).forEach((btn) => btn.addEventListener("click", () => {
        state.dayIndex = Number(btn.dataset.d);
        drawDay();
      }));

      $("#edObjective", container).addEventListener("blur", () => saveWeekInfo());
      $("#edStaffQuote", container).addEventListener("blur", () => saveWeekInfo());

      drawDay();
    }

    async function saveWeekInfo() {
      try {
        await data.updatePlan(state.plan.id, {
          objective: $("#edObjective", container).value.trim(),
          staff_quote: $("#edStaffQuote", container).value.trim()
        });
      } catch (err) { toast(err.message || String(err), true); }
    }

    function drawDay() {
      const body = $("#edDayBody", container);
      const day = dayByIndex(state.dayIndex);
      const dayLabel = DAY_LABELS[state.dayIndex];

      if (!day) {
        body.innerHTML = `
          <div class="empty-state">
            <p>${escapeHtml(dayLabel)} n'a pas encore de séance définie.</p>
            <button type="button" class="btn-primary" id="edCreateDay">Créer ${state.dayIndex === 7 ? "le défi bonus" : "ce jour"}</button>
          </div>`;
        $("#edCreateDay", body).addEventListener("click", async () => {
          try {
            const newDay = await data.ensureDay(state.plan.id, state.dayIndex);
            state.days.push(newDay);
            drawDay();
          } catch (err) { toast(err.message || String(err), true); }
        });
        return;
      }

      body.innerHTML = `
        <div class="plan-card">
          <div class="field-row">
            <div class="field field-grow">
              <label>Intitulé de la séance</label>
              <input type="text" id="dyLabel" value="${escapeHtml(day.label || "")}" placeholder="ex: Force bas du corps">
            </div>
          </div>
          ${state.dayIndex < 7 ? `
          <label class="checkbox-row">
            <input type="checkbox" id="dyIsRest" ${day.is_rest ? "checked" : ""}>
            <span>Jour de repos (aucun exercice)</span>
          </label>` : ""}
          <div class="field-row" id="dyDetailsFields" style="${day.is_rest ? "display:none" : ""}">
            <div class="field field-grow">
              <label>Échauffement</label>
              <textarea id="dyWarmup" rows="2">${escapeHtml(day.warmup || "")}</textarea>
            </div>
            <div class="field">
              <label>RPE cible</label>
              <input type="text" id="dyRpe" value="${escapeHtml(day.rpe || "")}" placeholder="ex: 7/10">
            </div>
          </div>
        </div>

        <div id="dyExoSection" style="${day.is_rest ? "display:none" : ""}">
          <div class="section-title">Exercices</div>
          <div id="edExoList" class="exo-edit-grid"></div>
          <button type="button" class="btn-secondary" id="edAddExo">➕ Ajouter un exercice</button>
        </div>

        <button type="button" class="btn-primary btn-block btn-publish" id="edPublish">📤 Publier les modifications</button>
      `;

      if (state.dayIndex < 7) {
        $("#dyIsRest", body).addEventListener("change", (e) => {
          $("#dyDetailsFields", body).style.display = e.target.checked ? "none" : "";
          $("#dyExoSection", body).style.display = e.target.checked ? "none" : "";
        });
      }

      const list = $("#edExoList", body);
      function bindExoCard(card) {
        $(".btn-del-exo", card).addEventListener("click", async () => {
          const id = card.dataset.id;
          if (!confirm("Supprimer cet exercice ?")) return;
          try {
            if (id) await data.deleteExercise(id);
            card.remove();
            toast("Exercice supprimé.");
          } catch (err) { toast(err.message || String(err), true); }
        });
      }
      day.exercises.forEach((ex, idx) => {
        const card = el(exerciseCardTemplate(ex, idx));
        list.appendChild(card);
        bindExoCard(card);
      });

      // Ajoute une carte vide directement dans le DOM (pas de redraw) pour
      // ne pas perdre les champs déjà remplis (intitulé du jour, exercices
      // en cours d'édition) qui ne sont pas encore publiés.
      $("#edAddExo", body).addEventListener("click", () => {
        const card = el(exerciseCardTemplate({ id: null, name: "", sets: null, duration: null, intensity: 5, reps: "" }, list.children.length));
        list.appendChild(card);
        bindExoCard(card);
      });

      $("#edPublish", body).addEventListener("click", async () => {
        const btn = $("#edPublish", body);
        btn.disabled = true;
        btn.textContent = "Publication…";
        try {
          const isRest = state.dayIndex < 7 && $("#dyIsRest", body).checked;
          await data.updateDay(day.id, {
            label: $("#dyLabel", body).value.trim(),
            is_rest: isRest,
            warmup: isRest ? null : ($("#dyWarmup", body).value.trim() || null),
            rpe: isRest ? null : ($("#dyRpe", body).value.trim() || null)
          });
          if (!isRest) {
            const cards = $$(".exo-edit-card", body);
            for (let i = 0; i < cards.length; i++) {
              const card = cards[i];
              const rowData = readExerciseCard(card);
              const id = card.dataset.id;
              if (!rowData.name) continue;
              if (id) {
                await data.updateExercise(id, { ...rowData, position: i });
              } else {
                await data.addExercise(day.id, { ...rowData, position: i });
              }
            }
          }
          toast("Programme publié ✅");
          await load();
        } catch (err) {
          toast(err.message || String(err), true);
        } finally {
          btn.disabled = false;
          btn.textContent = "📤 Publier les modifications";
        }
      });
    }

    await load();
  }

  window.TMB.components.programEditor.mount = mountProgramEditor;
})();
