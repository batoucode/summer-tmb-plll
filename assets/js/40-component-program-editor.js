/* ============================================================
   TMB SUMMER BOOK — 40. COMPOSANT PARTAGÉ : ÉDITEUR DE PROGRAMME
   Utilisé par 60-view-program.js (section Programme, admin + coach).
   L'édition réelle (Publier, ajouter/supprimer un exercice...) n'est
   proposée que si canEditCategory() l'autorise — admin toujours, coach
   seulement pour sa propre catégorie ; sinon affichage en lecture seule
   (pastille "👁️ Lecture seule"). Contrat :

     TMB.components.programEditor.mount(container, {
       categoryId,              // id de catégorie initialement affichée
       week,                    // numéro de semaine initial (1-5)
       allowedCategories,       // liste des catégories sélectionnables
                                 // (null = toutes, cf. TMB.state.categories)
       lockCategory              // true = pas de sélecteur de catégorie
     })

   Une erreur ici remonte à l'appelant et s'affiche donc comme une
   erreur de SA vue — c'est normal et documenté dans docs/ARCHITECTURE.md
   (le composant n'a pas sa propre carte d'erreur séparée, il n'a pas de
   conteneur de vue à lui).
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, el, escapeHtml, toast, DAY_LABELS } = window.TMB.core;
  const data = window.TMB.data;

  /* Bibliothèque partagée d'exercices (tmb_exercise_library, voir
     11-data-api.js) : `library` liste toutes les entrées disponibles
     (chargée une fois par mountProgramEditor, voir plus bas). Choisir
     une entrée autoremplit nom + séries par défaut ; "➕ Nouvel
     exercice…" ouvre un mini-formulaire inline pour en créer une. */
  function exerciseCardTemplate(ex, idx, library) {
    const libId = ex.library_id || "";
    const libOptions = (library || [])
      .map((le) => `<option value="${le.id}" ${le.id === libId ? "selected" : ""}>${escapeHtml(le.name)}</option>`).join("");
    return `
      <div class="exo-edit-card" data-idx="${idx}" data-id="${ex.id || ""}" data-lib-id="${libId}">
        <div class="field-row">
          <div class="field field-grow">
            <label>Exercice (bibliothèque)</label>
            <select data-f="libSelect" class="exo-lib-select">
              <option value="">— Exercice personnalisé (nom libre) —</option>
              ${libOptions}
              <option value="__new__">➕ Nouvel exercice…</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field field-grow">
            <label>Nom de l'exercice</label>
            <input type="text" data-f="name" value="${escapeHtml(ex.name || "")}" placeholder="ex: Goblet Squat">
          </div>
          <button type="button" class="btn-secondary btn-edit-lib ${libId ? "" : "hidden"}">✏️ Vidéo / description</button>
        </div>

        <div class="lib-form hidden" data-lib-form>
          <div class="field-row">
            <div class="field field-grow"><label>Vidéo (lien)</label><input type="url" data-lf="video_url" placeholder="https://..."></div>
            <div class="field"><label>Séries par défaut</label><input type="number" min="0" data-lf="default_sets"></div>
          </div>
          <div class="field"><label>Description / explication</label><textarea rows="2" data-lf="description"></textarea></div>
          <div class="field"><label>Schéma (lien image, optionnel)</label><input type="url" data-lf="schema_url" placeholder="https://..."></div>
          <p class="lib-form-hint">⚠️ Modifier ceci change l'exercice pour toutes les catégories qui l'utilisent.</p>
          <div class="field-row">
            <button type="button" class="btn-primary btn-save-lib">Enregistrer l'exercice</button>
            <button type="button" class="btn-ghost btn-cancel-lib">Annuler</button>
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
    const libId = cardEl.dataset.libId;
    return {
      name: $('[data-f="name"]', cardEl).value.trim(),
      sets: numOrNull($('[data-f="sets"]', cardEl).value),
      duration: numOrNull($('[data-f="duration"]', cardEl).value),
      intensity: numOrNull($('[data-f="intensity"]', cardEl).value),
      reps: $('[data-f="reps"]', cardEl).value.trim() || null,
      library_id: libId && libId !== "__new__" ? libId : null
    };
  }
  function numOrNull(v) { return v === "" || v == null ? null : Number(v); }

  /* Un admin peut toujours éditer ; un coach uniquement sa propre
     catégorie (les autres s'affichent en lecture seule, pas d'écriture
     possible côté RLS de toute façon — voir tmb_plans_write et
     consorts dans supabase/schema.sql). Un joueur n'atteint jamais ce
     composant (section Programme masquée pour son rôle). */
  function canEditCategory(categoryId) {
    const profile = window.TMB.state.profile;
    if (!profile) return false;
    if (profile.role === "admin") return true;
    if (profile.role === "coach") return categoryId === profile.assigned_category_id;
    return false;
  }

  /* Monte l'éditeur de programme dans `container` pour la catégorie et
     semaine données. Si `lockCategory` est vrai, aucun sélecteur de
     catégorie n'est affiché. Le programme est organisé par jour (Lundi
     à Dimanche + un créneau bonus "Défi") : on édite un jour à la fois,
     sélectionné via des onglets. */
  async function mountProgramEditor(container, opts) {
    const state = {
      categoryId: opts.categoryId,
      week: opts.week || 1,
      dayIndex: 0,
      allowedCategories: opts.allowedCategories, // null = toutes
      plan: null,
      days: [], // jours existants en base pour ce plan
      exoEditMode: false, // false = tableau résumé, true = édition des cartes
      library: [] // bibliothèque partagée d'exercices (tmb_exercise_library), chargée une fois
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
      const editable = canEditCategory(state.categoryId);
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
          ${!editable ? `<span class="status-pill">👁️ Lecture seule</span>` : ""}
        </div>

        ${state.plan ? `
        <div class="plan-card section-card section-card--week">
          <div class="section-eyebrow">Semaine</div>
          <div class="field">
            <label>Objectif de la semaine</label>
            <textarea id="edObjective" rows="2" ${editable ? "" : "disabled"}>${escapeHtml(state.plan.objective || "")}</textarea>
          </div>
          <div class="field">
            <label>Mot du staff</label>
            <textarea id="edStaffQuote" rows="2" ${editable ? "" : "disabled"}>${escapeHtml(state.plan.staff_quote || "")}</textarea>
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
          ${editable ? `<button type="button" class="btn-primary" id="edCreatePlan">Créer le plan de la semaine ${state.week}</button>` : ""}
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
        if (editable) {
          $("#edCreatePlan", container).addEventListener("click", async () => {
            try {
              state.plan = await data.ensurePlan(state.categoryId, state.week);
              state.days = [];
              draw();
            } catch (err) { toast(err.message || String(err), true); }
          });
        }
        return;
      }

      $$("#edDayTabs .week-tab", container).forEach((btn) => btn.addEventListener("click", () => {
        state.dayIndex = Number(btn.dataset.d);
        state.exoEditMode = false;
        drawDay();
      }));

      if (editable) {
        $("#edObjective", container).addEventListener("blur", () => saveWeekInfo());
        $("#edStaffQuote", container).addEventListener("blur", () => saveWeekInfo());
      }

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
      const editable = canEditCategory(state.categoryId);

      if (!day) {
        body.innerHTML = `
          <div class="empty-state">
            <p>${escapeHtml(dayLabel)} n'a pas encore de séance définie.</p>
            ${editable ? `<button type="button" class="btn-primary" id="edCreateDay">Créer ${state.dayIndex === 7 ? "le défi bonus" : "ce jour"}</button>` : ""}
          </div>`;
        if (editable) {
          $("#edCreateDay", body).addEventListener("click", async () => {
            try {
              const newDay = await data.ensureDay(state.plan.id, state.dayIndex);
              state.days.push(newDay);
              state.exoEditMode = false;
              drawDay();
            } catch (err) { toast(err.message || String(err), true); }
          });
        }
        return;
      }

      body.innerHTML = `
        <div class="plan-card section-card section-card--day">
          <div class="section-eyebrow">Jour</div>
          <div class="field-row">
            <div class="field field-grow">
              <label>Intitulé de la séance</label>
              <input type="text" id="dyLabel" value="${escapeHtml(day.label || "")}" placeholder="ex: Force bas du corps" ${editable ? "" : "disabled"}>
            </div>
          </div>
          ${state.dayIndex < 7 ? `
          <label class="checkbox-row">
            <input type="checkbox" id="dyIsRest" ${day.is_rest ? "checked" : ""} ${editable ? "" : "disabled"}>
            <span>Jour de repos (aucun exercice)</span>
          </label>` : ""}
          <div class="field-row" id="dyDetailsFields" style="${day.is_rest ? "display:none" : ""}">
            <div class="field field-grow">
              <label>Échauffement</label>
              <textarea id="dyWarmup" rows="2" ${editable ? "" : "disabled"}>${escapeHtml(day.warmup || "")}</textarea>
            </div>
            <div class="field">
              <label>RPE cible</label>
              <input type="text" id="dyRpe" value="${escapeHtml(day.rpe || "")}" placeholder="ex: 7/10" ${editable ? "" : "disabled"}>
            </div>
          </div>
        </div>

        <div id="dyExoSection" class="plan-card section-card section-card--exo" style="${day.is_rest ? "display:none" : ""}">
          <div class="section-eyebrow">Exercices</div>
          <div id="edExoBody"></div>
        </div>

        ${editable ? `<button type="button" class="btn-primary btn-block btn-publish" id="edPublish">📤 Publier les modifications</button>` : ""}
      `;

      if (state.dayIndex < 7 && editable) {
        $("#dyIsRest", body).addEventListener("change", (e) => {
          $("#dyDetailsFields", body).style.display = e.target.checked ? "none" : "";
          $("#dyExoSection", body).style.display = e.target.checked ? "none" : "";
        });
      }

      drawExoBody();

      function drawExoBody() {
        const exoBody = $("#edExoBody", body);
        if (!editable || !state.exoEditMode) {
          exoBody.innerHTML = day.exercises.length ? `
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Exercice</th><th>Séries</th><th>Consigne</th><th>Durée</th><th>Intensité</th></tr></thead>
                <tbody>
                  ${day.exercises.map((ex) => `
                    <tr>
                      <td>${escapeHtml(ex.name)}</td>
                      <td>${ex.sets ?? "—"}</td>
                      <td>${escapeHtml(ex.reps || "—")}</td>
                      <td>${ex.duration ? ex.duration + "s" : "—"}</td>
                      <td>${ex.intensity ? ex.intensity + "/10" : "—"}</td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>
          ` : `<div class="empty-state">Aucun exercice pour cette séance.</div>`;
          if (editable) {
            exoBody.insertAdjacentHTML("beforeend", `<button type="button" class="btn-secondary" id="edToggleExoEdit">✏️ Modifier les exercices</button>`);
            $("#edToggleExoEdit", exoBody).addEventListener("click", () => {
              state.exoEditMode = true;
              drawExoBody();
            });
          }
          return;
        }

        exoBody.innerHTML = `
          <div id="edExoList" class="exo-edit-grid"></div>
          <div class="field-row">
            <button type="button" class="btn-secondary" id="edAddExo">➕ Ajouter un exercice</button>
            <button type="button" class="btn-ghost" id="edBackToSummary">← Revenir au résumé</button>
          </div>
        `;

        const list = $("#edExoList", exoBody);

        // Ajoute la nouvelle entrée bibliothèque à TOUS les menus déroulants
        // déjà affichés dans ce jour (pas seulement la carte qui l'a créée),
        // pour qu'elle soit immédiatement sélectionnable ailleurs aussi.
        function addLibraryOptionEverywhere(entry) {
          const optHtml = `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`;
          $$(".exo-lib-select", list).forEach((sel) => {
            sel.querySelector('option[value="__new__"]').insertAdjacentHTML("beforebegin", optHtml);
          });
        }

        function bindExoCard(card) {
          const select = $('[data-f="libSelect"]', card);
          const nameInput = $('[data-f="name"]', card);
          const setsInput = $('[data-f="sets"]', card);
          const editBtn = $(".btn-edit-lib", card);
          const libForm = $("[data-lib-form]", card);

          function showLibForm(entry) {
            libForm.classList.remove("hidden");
            $('[data-lf="video_url"]', libForm).value = (entry && entry.video_url) || "";
            $('[data-lf="description"]', libForm).value = (entry && entry.description) || "";
            $('[data-lf="schema_url"]', libForm).value = (entry && entry.schema_url) || "";
            $('[data-lf="default_sets"]', libForm).value = (entry && entry.default_sets) ?? "";
          }
          function hideLibForm() { libForm.classList.add("hidden"); }

          select.addEventListener("change", () => {
            const val = select.value;
            if (val === "__new__") {
              card.dataset.libId = "";
              showLibForm(null);
              return;
            }
            hideLibForm();
            card.dataset.libId = val;
            if (!val) { editBtn.classList.add("hidden"); return; }
            const entry = state.library.find((l) => l.id === val);
            if (entry) {
              nameInput.value = entry.name;
              if (!setsInput.value) setsInput.value = entry.default_sets ?? "";
            }
            editBtn.classList.remove("hidden");
          });

          editBtn.addEventListener("click", () => {
            showLibForm(state.library.find((l) => l.id === card.dataset.libId));
          });

          $(".btn-cancel-lib", card).addEventListener("click", () => {
            hideLibForm();
            if (!card.dataset.libId) select.value = "";
          });

          $(".btn-save-lib", card).addEventListener("click", async () => {
            const fields = {
              name: nameInput.value.trim() || "Nouvel exercice",
              video_url: $('[data-lf="video_url"]', libForm).value.trim() || null,
              description: $('[data-lf="description"]', libForm).value.trim() || null,
              schema_url: $('[data-lf="schema_url"]', libForm).value.trim() || null,
              default_sets: numOrNull($('[data-lf="default_sets"]', libForm).value)
            };
            try {
              if (card.dataset.libId) {
                await data.updateLibraryExercise(card.dataset.libId, fields);
                const entry = state.library.find((l) => l.id === card.dataset.libId);
                if (entry) Object.assign(entry, fields);
                select.querySelector(`option[value="${card.dataset.libId}"]`).textContent = fields.name;
                toast("Exercice mis à jour dans la bibliothèque.");
              } else {
                const row = await data.createLibraryExercise(fields);
                state.library.push(row);
                state.library.sort((a, b) => a.name.localeCompare(b.name));
                addLibraryOptionEverywhere(row);
                card.dataset.libId = row.id;
                select.value = row.id;
                editBtn.classList.remove("hidden");
                toast("Exercice créé dans la bibliothèque.");
              }
              nameInput.value = fields.name;
              hideLibForm();
            } catch (err) { toast(err.message || String(err), true); }
          });

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
          const card = el(exerciseCardTemplate(ex, idx, state.library));
          list.appendChild(card);
          bindExoCard(card);
        });

        // Ajoute une carte vide directement dans le DOM (pas de redraw) pour
        // ne pas perdre les champs déjà remplis (intitulé du jour, exercices
        // en cours d'édition) qui ne sont pas encore publiés.
        $("#edAddExo", exoBody).addEventListener("click", () => {
          const card = el(exerciseCardTemplate({ id: null, name: "", sets: null, duration: null, intensity: 5, reps: "" }, list.children.length, state.library));
          list.appendChild(card);
          bindExoCard(card);
        });

        $("#edBackToSummary", exoBody).addEventListener("click", () => {
          state.exoEditMode = false;
          drawExoBody();
        });
      }

      const publishBtn = $("#edPublish", body);
      if (publishBtn) {
        publishBtn.addEventListener("click", async () => {
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
            state.exoEditMode = false;
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
    }

    try { state.library = await data.loadExerciseLibrary(); } catch (err) { state.library = []; }
    await load();
  }

  window.TMB.components.programEditor.mount = mountProgramEditor;
})();
