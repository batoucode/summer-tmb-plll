/* ============================================================
   TMB SUMMER BOOK — LOGIQUE DE L'APPLICATION
   Vanilla JS, aucune dépendance externe.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "tmb_summerbook_v2";
  const DAY_LABELS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  /* ---------- State ---------- */
  let state = {
    category: "u1315",
    weekIndex: 0,
    progress: {},   // key -> array<boolean> | boolean
    expanded: {}    // transient: weekIndex_dayIndex -> bool (not persisted)
  };

  /* ---------- Persistence ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.category = parsed.category || "u1315";
        state.weekIndex = typeof parsed.weekIndex === "number" ? parsed.weekIndex : 0;
        state.progress = parsed.progress || {};
      }
    } catch (e) { /* ignore corrupt storage */ }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: state.category,
      weekIndex: state.weekIndex,
      progress: state.progress
    }));
  }

  /* ---------- Schedule day resolution ---------- */
  function resolveDay(week, dayIndex) {
    const entry = week.schedule[dayIndex];
    const raw = entry[state.category];
    if (raw.charAt(0) === "@") {
      const label = raw.slice(1);
      if (label === "Repos") {
        return { kind: "rest", label: "Repos" };
      }
      return { kind: "single", label };
    }
    const mod = week.modules[raw];
    return { kind: mod.type, code: raw, module: mod, label: mod.title };
  }

  function unitCount(resolved) {
    if (resolved.kind === "exercises") return resolved.module.exercises.length;
    if (resolved.kind === "checklist") return resolved.module.items.length;
    if (resolved.kind === "cardio") return 1;
    if (resolved.kind === "single") return 1;
    return 0;
  }

  function progressKey(weekId, dayIndex) {
    return `w${weekId}_d${dayIndex}_${state.category}`;
  }

  function defiKey(weekId) {
    return `defi_w${weekId}`;
  }

  function getChecks(key, count) {
    const arr = state.progress[key];
    if (Array.isArray(arr) && arr.length === count) return arr;
    return new Array(count).fill(false);
  }

  function toggleCheck(key, count, idx) {
    const arr = getChecks(key, count).slice();
    arr[idx] = !arr[idx];
    state.progress[key] = arr;
    save();
  }

  function resetKey(key, count) {
    state.progress[key] = new Array(count).fill(false);
    save();
  }

  /* ---------- Stats ---------- */
  function dayStats(week, dayIndex) {
    const resolved = resolveDay(week, dayIndex);
    if (resolved.kind === "rest") return { total: 0, done: 0, resolved };
    const count = unitCount(resolved);
    const checks = getChecks(progressKey(week.id, dayIndex), count);
    const done = checks.filter(Boolean).length;
    return { total: count, done, resolved, checks };
  }

  function weekStats(week) {
    let total = 0, done = 0;
    for (let d = 0; d < 7; d++) {
      const s = dayStats(week, d);
      total += s.total;
      done += s.done;
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function programStats() {
    let total = 0, done = 0;
    const perWeek = WEEKS.map((w) => {
      const s = weekStats(w);
      total += s.total;
      done += s.done;
      return s;
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, perWeek };
  }

  function todayDayIndex() {
    // JS getDay(): 0=Dimanche..6=Samedi -> map to our Lundi-first index
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  /* ---------- Rendering helpers ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function videoIcon(url) {
    if (!url) return "";
    return `<a class="vid-link" href="${url}" target="_blank" rel="noopener" title="Voir la vidéo" onclick="event.stopPropagation()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7-11-7z" fill="currentColor"/></svg>
    </a>`;
  }

  /* ---------- Category selector ---------- */
  function renderCategorySelector() {
    const container = document.getElementById("categorySelector");
    container.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const active = cat.key === state.category;
      const card = el("button", "cat-card" + (active ? " active" : ""));
      card.style.setProperty("--cat-color", cat.color);
      card.innerHTML = `
        <div class="cat-card-top">
          <span class="cat-dot" style="background:${cat.color}"></span>
          <span class="cat-name">${cat.label}${cat.sub ? `<small>${cat.sub}</small>` : ""}</span>
          ${active ? '<span class="cat-check">✓</span>' : ""}
        </div>
        <div class="cat-tagline">${cat.tagline}</div>
        <div class="cat-meta">
          <span>${cat.freq}</span>
          <span>RPE ${cat.rpe}</span>
        </div>
      `;
      card.addEventListener("click", () => {
        state.category = cat.key;
        save();
        renderAll();
      });
      container.appendChild(card);
    });
  }

  /* ---------- Program overview ---------- */
  function renderOverview() {
    const stats = programStats();
    const ring = document.getElementById("overviewRing");
    const pct = stats.pct;
    ring.style.setProperty("--pct", pct);
    document.getElementById("overviewPct").textContent = pct + "%";
    document.getElementById("overviewSub").textContent = `${stats.done} / ${stats.total} séances validées`;

    const dots = document.getElementById("overviewWeeks");
    dots.innerHTML = "";
    stats.perWeek.forEach((w, i) => {
      const d = el("button", "week-dot" + (i === state.weekIndex ? " current" : "") + (w.pct === 100 ? " full" : w.pct > 0 ? " partial" : ""));
      d.textContent = "S" + (i + 1);
      d.title = `Semaine ${i + 1} — ${w.pct}%`;
      d.addEventListener("click", () => { state.weekIndex = i; save(); renderAll(); });
      dots.appendChild(d);
    });

    // Heatmap 5 x 7
    const heat = document.getElementById("heatmap");
    heat.innerHTML = "";
    WEEKS.forEach((week) => {
      const row = el("div", "heat-row");
      for (let d = 0; d < 7; d++) {
        const s = dayStats(week, d);
        const cell = el("div", "heat-cell");
        if (s.resolved.kind === "rest") cell.classList.add("heat-rest");
        else if (s.total === 0) cell.classList.add("heat-empty");
        else {
          const frac = s.done / s.total;
          if (frac === 0) cell.classList.add("heat-0");
          else if (frac < 1) cell.classList.add("heat-partial");
          else cell.classList.add("heat-full");
        }
        cell.title = `${DAY_LABELS_ORDER[d]} — S${week.id}`;
        row.appendChild(cell);
      }
      heat.appendChild(row);
    });
  }

  /* ---------- Week tabs ---------- */
  function renderWeekTabs() {
    const tabs = document.getElementById("weekTabs");
    tabs.innerHTML = "";
    WEEKS.forEach((w, i) => {
      const btn = el("button", "week-tab" + (i === state.weekIndex ? " active" : ""), "S" + (i + 1));
      btn.addEventListener("click", () => { state.weekIndex = i; save(); renderAll(); });
      tabs.appendChild(btn);
    });
  }

  /* ---------- Module body renderers ---------- */
  function renderExercisesBody(module, week, dayIndex) {
    const count = module.exercises.length;
    const key = progressKey(week.id, dayIndex);
    const checks = getChecks(key, count);
    let html = "";
    if (module.objectif) html += `<p class="module-objectif">${escapeHtml(module.objectif)}</p>`;
    if (module.rpe) {
      html += `<div class="rpe-row"><span class="rpe-label">RPE</span><span class="rpe-pill" style="--c:${CATEGORIES.find(c=>c.key===state.category).color}">${module.rpe[state.category]}</span></div>`;
    }
    if (module.echauffement) {
      html += `<details class="collapse"><summary>Échauffement</summary><ul class="plain-list">${module.echauffement.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul></details>`;
    }
    if (module.note) html += `<p class="module-note">${escapeHtml(module.note)}</p>`;

    html += `<div class="exercise-list">`;
    module.exercises.forEach((exo, idx) => {
      const val = exo[state.category];
      const checked = checks[idx];
      html += `
        <label class="exercise-row ${checked ? "checked" : ""}">
          <input type="checkbox" data-key="${key}" data-count="${count}" data-idx="${idx}" ${checked ? "checked" : ""}>
          <span class="exercise-name">${escapeHtml(exo.nom)}${videoIcon(exo.video)}</span>
          <span class="exercise-val">${escapeHtml(val)}</span>
        </label>`;
    });
    html += `</div>`;
    return html;
  }

  function renderChecklistBody(module, week, dayIndex) {
    const count = module.items.length;
    const key = progressKey(week.id, dayIndex);
    const checks = getChecks(key, count);
    let html = "";
    if (module.objectif) html += `<p class="module-objectif">${escapeHtml(module.objectif)}</p>`;
    if (module.duration) html += `<div class="duration-chip">${escapeHtml(module.duration)}</div>`;
    html += `<div class="exercise-list">`;
    module.items.forEach((item, idx) => {
      const checked = checks[idx];
      html += `
        <label class="exercise-row ${checked ? "checked" : ""}">
          <input type="checkbox" data-key="${key}" data-count="${count}" data-idx="${idx}" ${checked ? "checked" : ""}>
          <span class="exercise-name">${escapeHtml(item.nom)}${videoIcon(item.video)}</span>
        </label>`;
    });
    html += `</div>`;
    return html;
  }

  function renderCardioBody(module, week, dayIndex) {
    const key = progressKey(week.id, dayIndex);
    const checks = getChecks(key, 1);
    const checked = checks[0];
    let html = "";
    if (module.objectif) html += `<p class="module-objectif">${escapeHtml(module.objectif)}</p>`;
    if (module.durations) {
      const catObj = CATEGORIES.find(c => c.key === state.category);
      html += `<div class="duration-chip" style="--c:${catObj.color}">${escapeHtml(module.durations[state.category])}</div>`;
    }
    if (module.options && module.options[state.category]) {
      html += `<ul class="plain-list options-list">${module.options[state.category].map(o => `<li>${escapeHtml(o)}</li>`).join("")}</ul>`;
    }
    if (module.note) html += `<p class="module-note">${escapeHtml(module.note)}</p>`;
    html += `
      <label class="exercise-row single ${checked ? "checked" : ""}">
        <input type="checkbox" data-key="${key}" data-count="1" data-idx="0" ${checked ? "checked" : ""}>
        <span class="exercise-name">Séance réalisée</span>
      </label>`;
    return html;
  }

  function renderSingleBody(resolved, week, dayIndex) {
    const key = progressKey(week.id, dayIndex);
    const checks = getChecks(key, 1);
    const checked = checks[0];
    return `
      <label class="exercise-row single ${checked ? "checked" : ""}">
        <input type="checkbox" data-key="${key}" data-count="1" data-idx="0" ${checked ? "checked" : ""}>
        <span class="exercise-name">Fait</span>
      </label>`;
  }

  /* ---------- Day card ---------- */
  function renderDayCard(week, dayIndex) {
    const dayName = DAY_LABELS_ORDER[dayIndex];
    const resolved = resolveDay(week, dayIndex);
    const stats = dayStats(week, dayIndex);
    const isToday = dayIndex === todayDayIndex();
    const expandKey = `${week.id}_${dayIndex}`;
    const isRest = resolved.kind === "rest";
    const isDone = !isRest && stats.total > 0 && stats.done === stats.total;

    const card = el("div", "day-card" + (isRest ? " rest" : "") + (isDone ? " done" : "") + (isToday ? " today" : ""));

    let statusHtml;
    if (isRest) statusHtml = `<span class="status-pill rest">Repos</span>`;
    else if (isDone) statusHtml = `<span class="status-pill done">✓ Fait</span>`;
    else if (stats.done > 0) statusHtml = `<span class="status-pill partial">${stats.done}/${stats.total}</span>`;
    else statusHtml = `<span class="status-pill todo">À faire</span>`;

    const header = el("div", "day-header");
    header.innerHTML = `
      <div class="day-header-left">
        <span class="day-name">${dayName}${isToday ? '<span class="today-badge">Aujourd\'hui</span>' : ""}</span>
        <span class="day-session">${escapeHtml(resolved.label)}</span>
      </div>
      <div class="day-header-right">
        ${statusHtml}
        ${!isRest ? '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>' : ""}
      </div>
    `;
    card.appendChild(header);

    if (!isRest) {
      const body = el("div", "day-body" + (state.expanded[expandKey] ? " open" : ""));
      if (resolved.kind === "exercises") body.innerHTML = renderExercisesBody(resolved.module, week, dayIndex);
      else if (resolved.kind === "checklist") body.innerHTML = renderChecklistBody(resolved.module, week, dayIndex);
      else if (resolved.kind === "cardio") body.innerHTML = renderCardioBody(resolved.module, week, dayIndex);
      else if (resolved.kind === "single") body.innerHTML = renderSingleBody(resolved, week, dayIndex);
      body.innerHTML += `<button class="btn-reset-day" data-reset-key="${progressKey(week.id, dayIndex)}" data-reset-count="${unitCount(resolved)}">Réinitialiser ce jour</button>`;
      card.appendChild(body);

      header.addEventListener("click", () => {
        state.expanded[expandKey] = !state.expanded[expandKey];
        body.classList.toggle("open");
        header.querySelector(".chev")?.classList.toggle("rot");
      });
    }

    return card;
  }

  /* ---------- Week content ---------- */
  function renderWeekContent() {
    const week = WEEKS[state.weekIndex];
    const wrap = document.getElementById("weekContent");
    wrap.innerHTML = "";

    const headerCard = el("div", "week-header-card");
    const s = weekStats(week);
    headerCard.innerHTML = `
      <div class="week-header-top">
        <h2>${escapeHtml(week.title)}</h2>
        <span class="week-pct">${s.pct}%</span>
      </div>
      <div class="week-progress-bar"><div class="fill" style="width:${s.pct}%"></div></div>
      <p class="week-objectif">${escapeHtml(week.objectif)}</p>
      <div class="staff-quote">
        <span class="staff-label">Le mot du staff</span>
        <p>${escapeHtml(week.staffQuote)}</p>
      </div>
    `;
    wrap.appendChild(headerCard);

    const daysWrap = el("div", "days-wrap");
    for (let d = 0; d < 7; d++) daysWrap.appendChild(renderDayCard(week, d));
    wrap.appendChild(daysWrap);

    if (week.defi) {
      const dKey = defiKey(week.id);
      const checks = getChecks(dKey, week.defi.items.length);
      const defiCard = el("div", "defi-card");
      defiCard.innerHTML = `
        <div class="defi-title">🏀 ${escapeHtml(week.defi.title)}</div>
        <div class="exercise-list">
          ${week.defi.items.map((item, idx) => `
            <label class="exercise-row ${checks[idx] ? "checked" : ""}">
              <input type="checkbox" data-key="${dKey}" data-count="${week.defi.items.length}" data-idx="${idx}" ${checks[idx] ? "checked" : ""}>
              <span class="exercise-name">${escapeHtml(item)}</span>
            </label>`).join("")}
        </div>
      `;
      wrap.appendChild(defiCard);
    }
  }

  /* ---------- Static intro / rules / outro ---------- */
  function renderStatic() {
    document.getElementById("chevalierQuoteTop").textContent = `« ${CHEVALIER_QUOTE} »`;

    const rules = document.getElementById("goldenRules");
    rules.innerHTML = GOLDEN_RULES.map(r => `<div class="rule-chip">✅ ${escapeHtml(r)}</div>`).join("");

    const outro = document.getElementById("outroCard");
    outro.innerHTML = `
      <div class="outro-title">🏀 ${escapeHtml(OUTRO.title)} 🏀</div>
      ${OUTRO.lines.map((l, i) => `<p class="${i === 0 ? "strong" : ""}">${escapeHtml(l)}</p>`).join("")}
      <p class="chevalier-quote">« ${CHEVALIER_QUOTE} »</p>
    `;
  }

  /* ---------- Global event delegation ---------- */
  function bindDelegatedEvents() {
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (t.matches('input[type="checkbox"][data-key]')) {
        const key = t.dataset.key;
        const count = parseInt(t.dataset.count, 10);
        const idx = parseInt(t.dataset.idx, 10);
        toggleCheck(key, count, idx);
        renderAll();
      }
    });

    document.addEventListener("click", (e) => {
      const resetBtn = e.target.closest("[data-reset-key]");
      if (resetBtn) {
        e.stopPropagation();
        resetKey(resetBtn.dataset.resetKey, parseInt(resetBtn.dataset.resetCount, 10));
        renderAll();
      }
    });

    const resetAllBtn = document.getElementById("resetAllBtn");
    if (resetAllBtn) {
      resetAllBtn.addEventListener("click", () => {
        if (!confirm("Réinitialiser toute la progression enregistrée sur cet appareil ?")) return;
        state.progress = {};
        save();
        renderAll();
      });
    }
  }

  /* ---------- Master render ---------- */
  function renderAll() {
    renderCategorySelector();
    renderOverview();
    renderWeekTabs();
    renderWeekContent();
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    load();
    renderStatic();
    bindDelegatedEvents();
    renderAll();
  });
})();
