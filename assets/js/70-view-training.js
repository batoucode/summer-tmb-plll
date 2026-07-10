/* ============================================================
   TMB SUMMER BOOK — 70. VUE ENTRAÎNEMENT
   Semaine → liste des jours (comme un planning papier) → détail d'un
   jour avec ses exercices, validables un par un ou d'un coup ("Valider
   toute la séance"). Générique par rôle : montre l'entraînement à faire
   pour QUICONQUE a une catégorie assignée à son profil (joueur bien
   sûr, mais aussi un coach ou un admin qui s'entraîne lui-même avec son
   équipe) — voir profile.assigned_category_id, pas profile.role.
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, el, escapeHtml, toast, DAY_LABELS } = window.TMB.core;
  const data = window.TMB.data;

  let trainingWeek = 1;
  let trainingDayIndex = null; // null = vue "semaine" (liste des jours)
  let trainingExerciseId = null; // id de l'exercice affiché en détail, ou null

  /* Convention DAY_LABELS : Lundi=0 … Dimanche=6 (+7 = créneau bonus,
     jamais "aujourd'hui"). Date.getDay() natif renvoie 0=Dimanche, à
     remapper. Sert uniquement à mettre en évidence le jour réel dans
     la vue "semaine" (badge "Aujourd'hui") — n'affecte pas la
     navigation, qui reste au clic. */
  function todayDayIndex() {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  function dayStatus(day, validations) {
    if (day.is_rest) return { label: "Repos", cls: "rest", done: 0, total: 0 };
    const total = day.exercises.length;
    const done = day.exercises.filter((e) => validations[e.id] && validations[e.id].validated).length;
    if (total === 0) return { label: "—", cls: "empty", done: 0, total: 0 };
    if (done === total) return { label: "Fait", cls: "done", done, total };
    if (done > 0) return { label: `${done}/${total}`, cls: "partial", done, total };
    return { label: "À faire", cls: "todo", done, total };
  }

  async function renderTrainingView() {
    const root = $("#view-training");
    const profile = window.TMB.state.profile;
    if (!profile.assigned_category_id) {
      root.innerHTML = `<div class="page"><div class="empty-state">Aucune catégorie ne t'est assignée pour le moment. Contacte un administrateur.</div></div>`;
      return;
    }
    root.innerHTML = `<div class="page"><div class="empty-state">Chargement…</div></div>`;

    const { plan, days } = await data.loadProgram(profile.assigned_category_id, trainingWeek);
    const allExerciseIds = days.flatMap((d) => d.exercises.map((e) => e.id));
    const validations = await data.loadValidations(profile.id, allExerciseIds);
    const categories = window.TMB.state.categories;
    const catName = (categories.find((c) => c.id === profile.assigned_category_id) || {}).name || "";

    if (trainingExerciseId !== null && trainingDayIndex !== null) {
      const day = days.find((d) => d.day_index === trainingDayIndex);
      const ex = day && day.exercises.find((e) => e.id === trainingExerciseId);
      if (day && ex) { await renderExerciseDetail(root, { day, ex, catName }); return; }
      trainingExerciseId = null;
    }
    if (trainingDayIndex !== null) {
      renderDayDetail(root, { plan, days, validations, catName });
    } else {
      renderWeekOverview(root, { plan, days, validations, catName });
    }
  }

  function renderWeekOverview(root, { plan, days, validations, catName }) {
    const totalEx = days.reduce((s, d) => s + d.exercises.length, 0);
    const doneEx = days.reduce((s, d) => s + d.exercises.filter((e) => validations[e.id] && validations[e.id].validated).length, 0);
    const pct = totalEx ? Math.round((doneEx / totalEx) * 100) : 0;

    root.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Programme · ${escapeHtml(catName)}</div>
        <div class="page-title">${plan ? escapeHtml(plan.objective || `Semaine ${trainingWeek}`) : "Semaine " + trainingWeek}</div>

        <div class="week-tabs round" id="trainingWeekTabs">
          ${[1, 2, 3, 4, 5].map((w) => `<button class="week-tab round ${w === trainingWeek ? "active" : ""}" data-w="${w}">S${w}</button>`).join("")}
        </div>

        <div class="progress-card">
          <div class="progress-ring" style="--pct:${pct}"><div class="progress-ring-inner">${pct}%</div></div>
          <div class="progress-labels">
            <div class="title">Progression de la semaine</div>
            <div class="sub">${doneEx} / ${totalEx} exercices validés</div>
          </div>
        </div>

        ${plan && plan.staff_quote ? `<div class="info-card"><p><strong>Le mot du staff :</strong> ${escapeHtml(plan.staff_quote)}</p></div>` : ""}

        <div class="section-title">Jours de la semaine</div>
        <div id="trainingDayList" class="day-list"></div>
      </div>
    `;

    $$(".week-tab", root).forEach((btn) => btn.addEventListener("click", () => { trainingWeek = Number(btn.dataset.w); renderTrainingView(); }));

    const list = $("#trainingDayList", root);
    if (!days.length) {
      list.innerHTML = `<div class="empty-state">Programme pas encore publié pour cette semaine.</div>`;
      return;
    }
    const todayIdx = todayDayIndex();
    days.forEach((day) => {
      const st = dayStatus(day, validations);
      const label = DAY_LABELS[day.day_index];
      const isToday = day.day_index === todayIdx;
      const card = el(`
        <button type="button" class="day-card ${st.cls} ${isToday ? "is-today" : ""}" data-d="${day.day_index}" ${day.is_rest ? "disabled" : ""}>
          <div class="day-card-left">
            <div class="day-name">${day.day_index === 7 ? "🏆 " : ""}${escapeHtml(label)}${isToday ? `<span class="day-today-badge">Aujourd'hui</span>` : ""}</div>
            <div class="day-session">${escapeHtml(day.label || (day.is_rest ? "Repos" : ""))}</div>
          </div>
          <span class="status-pill ${st.cls}">${st.label}</span>
        </button>
      `);
      if (!day.is_rest) {
        card.addEventListener("click", () => { trainingDayIndex = day.day_index; renderTrainingView(); });
      }
      list.appendChild(card);
    });
  }

  function renderDayDetail(root, { days, validations, catName }) {
    const day = days.find((d) => d.day_index === trainingDayIndex);
    if (!day) { trainingDayIndex = null; renderTrainingView(); return; }
    const profile = window.TMB.state.profile;
    const label = DAY_LABELS[day.day_index];
    const allDone = day.exercises.length > 0 && day.exercises.every((e) => validations[e.id] && validations[e.id].validated);

    root.innerHTML = `
      <div class="page">
        <button class="btn-ghost" id="backToWeek">← Retour à la semaine</button>
        <div class="page-eyebrow">${escapeHtml(label)} · ${escapeHtml(catName)}</div>
        <div class="page-title">${escapeHtml(day.label || "")}</div>

        ${day.warmup || day.rpe ? `
        <div class="info-card">
          ${day.warmup ? `<p><strong>Échauffement :</strong> ${escapeHtml(day.warmup)}</p>` : ""}
          ${day.rpe ? `<p><strong>RPE cible :</strong> ${escapeHtml(day.rpe)}</p>` : ""}
        </div>` : ""}

        ${day.exercises.length ? `
        <button type="button" class="btn-primary btn-block" id="bulkValidateBtn">
          ${allDone ? "↺ Tout dé-valider" : "✅ Valider toute la séance"}
        </button>` : ""}

        <div id="trainingExoList" class="player-exo-grid"></div>
      </div>
    `;

    $("#backToWeek", root).addEventListener("click", () => { trainingDayIndex = null; renderTrainingView(); });

    const list = $("#trainingExoList", root);
    if (!day.exercises.length) {
      list.innerHTML = `<div class="empty-state">Aucun exercice pour cette séance.</div>`;
    }
    day.exercises.forEach((ex) => {
      const isDone = !!(validations[ex.id] && validations[ex.id].validated);
      const card = el(`
        <div class="player-exo-card ${isDone ? "is-done" : ""}" data-id="${ex.id}">
          <div class="pe-top">
            <button type="button" class="pe-name" aria-label="Voir la fiche de l'exercice">${escapeHtml(ex.name)}</button>
            <button type="button" class="pe-check" aria-label="Valider">${isDone ? "✅" : "⬜"}</button>
          </div>
          <div class="pe-meta">
            ${ex.reps ? `<span class="pe-chip">🔄 ${escapeHtml(ex.reps)}</span>` : (ex.sets ? `<span class="pe-chip">🔄 x${ex.sets}</span>` : "")}
            ${ex.duration ? `<span class="pe-chip">⏱️ ${ex.duration}s</span>` : ""}
            ${ex.intensity ? `<span class="pe-chip">💪 ${ex.intensity}/10</span>` : ""}
          </div>
        </div>
      `);
      $(".pe-name", card).addEventListener("click", () => {
        trainingExerciseId = ex.id;
        renderTrainingView();
      });
      $(".pe-check", card).addEventListener("click", async () => {
        const nowDone = !card.classList.contains("is-done");
        card.classList.toggle("is-done", nowDone);
        $(".pe-check", card).textContent = nowDone ? "✅" : "⬜";
        try {
          await data.toggleValidation(ex.id, profile.id, nowDone);
          validations[ex.id] = { validated: nowDone };
          refreshBulkButton(root, day, validations);
        } catch (err) {
          card.classList.toggle("is-done", !nowDone);
          $(".pe-check", card).textContent = !nowDone ? "✅" : "⬜";
          toast(err.message || String(err), true);
        }
      });
      list.appendChild(card);
    });

    const bulkBtn = $("#bulkValidateBtn", root);
    if (bulkBtn) {
      bulkBtn.addEventListener("click", async () => {
        const willValidate = bulkBtn.textContent.includes("Valider");
        bulkBtn.disabled = true;
        try {
          await data.bulkValidateDay(day.exercises.map((e) => e.id), profile.id, willValidate);
          day.exercises.forEach((e) => { validations[e.id] = { validated: willValidate }; });
          $$(".player-exo-card", root).forEach((card) => {
            card.classList.toggle("is-done", willValidate);
            $(".pe-check", card).textContent = willValidate ? "✅" : "⬜";
          });
          refreshBulkButton(root, day, validations);
          toast(willValidate ? "Séance validée ✅" : "Séance dé-validée.");
        } catch (err) {
          toast(err.message || String(err), true);
        } finally {
          bulkBtn.disabled = false;
        }
      });
    }
  }

  function refreshBulkButton(root, day, validations) {
    const bulkBtn = $("#bulkValidateBtn", root);
    if (!bulkBtn) return;
    const allDone = day.exercises.length > 0 && day.exercises.every((e) => validations[e.id] && validations[e.id].validated);
    bulkBtn.textContent = allDone ? "↺ Tout dé-valider" : "✅ Valider toute la séance";
  }

  /* Convertit un lien YouTube (watch/shorts/youtu.be) en URL d'embed
     responsive ; renvoie null pour tout le reste (Vimeo, lien direct,
     etc.), auquel cas on affiche un simple lien "▶ Voir la vidéo". */
  function youtubeEmbedUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
      if (!/youtube\.com$/.test(u.hostname.replace(/^www\./, ""))) return null;
      if (u.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    } catch (e) { return null; }
  }

  function videoBlockHtml(videoUrl) {
    if (!videoUrl) return "";
    const embedUrl = youtubeEmbedUrl(videoUrl);
    if (embedUrl) {
      return `<div class="exo-video-embed"><iframe src="${embedUrl}" title="Vidéo de l'exercice" allowfullscreen loading="lazy"></iframe></div>`;
    }
    return `<a class="pe-video" href="${videoUrl}" target="_blank" rel="noopener">▶ Voir la vidéo</a>`;
  }

  /* Page dédiée d'un exercice (clic sur son nom depuis renderDayDetail) :
     séries/consigne définies par le coach (lecture seule), chronomètre,
     et — si l'exercice est lié à la bibliothèque partagée
     (tmb_exercise_library, voir 11-data-api.js) — vidéo/description/
     schéma renseignés par le coach. Sans lien bibliothèque (exercice
     "personnalisé" ponctuel), on retombe sur l'ancien champ video_url. */
  async function renderExerciseDetail(root, { day, ex, catName }) {
    const label = DAY_LABELS[day.day_index];
    let libEntry = null;
    if (ex.library_id) {
      try { libEntry = await data.loadLibraryExerciseById(ex.library_id); } catch (e) { libEntry = null; }
    }
    const videoUrl = (libEntry && libEntry.video_url) || ex.video_url || null;
    const description = libEntry && libEntry.description;
    const schemaUrl = libEntry && libEntry.schema_url;

    root.innerHTML = `
      <div class="page">
        <button class="btn-ghost" id="backToDay">← Retour à ${escapeHtml(label)}</button>
        <div class="page-eyebrow">${escapeHtml(label)} · ${escapeHtml(catName)}</div>
        <div class="page-title">${escapeHtml(ex.name)}</div>

        <div class="pe-meta">
          ${ex.reps ? `<span class="pe-chip">🔄 ${escapeHtml(ex.reps)}</span>` : (ex.sets ? `<span class="pe-chip">🔄 x${ex.sets}</span>` : "")}
          ${ex.duration ? `<span class="pe-chip">⏱️ ${ex.duration}s</span>` : ""}
          ${ex.intensity ? `<span class="pe-chip">💪 ${ex.intensity}/10</span>` : ""}
        </div>

        <div class="card">
          <div class="section-title">Chronomètre</div>
          <div id="exoChrono"></div>
        </div>

        ${videoUrl || description || schemaUrl ? `
        <div class="card">
          <div class="section-title">Comment faire</div>
          ${videoBlockHtml(videoUrl)}
          ${description ? `<p class="exo-detail-desc">${escapeHtml(description)}</p>` : ""}
          ${schemaUrl ? `<img class="exo-schema-img" src="${schemaUrl}" alt="Schéma de l'exercice" loading="lazy">` : ""}
        </div>` : ""}
      </div>
    `;

    $("#backToDay", root).addEventListener("click", () => { trainingExerciseId = null; renderTrainingView(); });
    window.TMB.components.timer.mount($("#exoChrono", root), { durationSeconds: ex.duration });
  }

  window.TMB.views.training.render = renderTrainingView;
})();
