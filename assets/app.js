/* ============================================================
   TMB SUMMER BOOK — LOGIQUE DE L'APPLICATION
   Vanilla JS, routeur par hash, aucune dépendance externe.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "tmb_summerbook_v2";
  const DAY_LABELS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  /* ---------- Icônes (SVG inline, currentColor) ---------- */
  const ICONS = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
    calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>',
    document: '<path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4"/><path d="M8.5 12.5h7M8.5 15.5h7M8.5 18h4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.3a2.6 2.6 0 1 1 3.9 2.3c-.9.6-1.3 1-1.3 2"/><path d="M12 17h.01"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    play: '<path d="M7 4.5v15l13-7.5-13-7.5Z"/>',
    dumbbell: '<path d="M6.5 8.5v7M4 10v4M17.5 8.5v7M20 10v4M8 12h8"/>',
    bolt: '<path d="M13 3 5 13.5h5.5L11 21l8-11h-5.5L13 3Z"/>',
    shield: '<path d="M12 3.5 19 6v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-2.5Z"/>',
    leaf: '<path d="M6 18c8 1 12-3 12-12-9 0-12 4-12 12Z"/><path d="M6 18c1-4 3-7 8-9.5"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9.7-9.3C.7 7.6 2.7 4 6.3 4c2 0 3.5 1 5.7 3.3C14.2 5 15.7 4 17.7 4c3.6 0 5.6 3.6 4 7.2C19.5 15.9 12 20.5 12 20.5Z"/>',
    moon: '<path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2Z"/>',
    droplet: '<path d="M12 3.5s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.5 12 3.5 12 3.5Z"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
    trophy: '<path d="M8 4.5h8v5a4 4 0 0 1-8 0v-5Z"/><path d="M8 6H5.5a2 2 0 0 0-2 2c0 2 1.5 3.5 4 3.5M16 6h2.5a2 2 0 0 1 2 2c0 2-1.5 3.5-4 3.5"/><path d="M12 13.5V17M9 20.5h6M9.5 20.5V18h5v2.5"/>',
    basketball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.5 5.5c2.5 2.2 3.8 4.3 3.8 6.5s-1.3 4.3-3.8 6.5M18.5 5.5c-2.5 2.2-3.8 4.3-3.8 6.5s1.3 4.3 3.8 6.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    reset: '<path d="M4 12a8 8 0 1 1 2.6 5.9"/><path d="M4 17v-4h4"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12H5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'
  };
  function icon(name, size) {
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
  }
  const FAM_ICON = { legs: "dumbbell", upper: "dumbbell", core: "shield", speed: "bolt", mobility: "leaf" };

  /* ---------- State ---------- */
  let state = {
    category: "u1315",
    weekIndex: 0,
    theme: "light",
    progress: {}
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.category = parsed.category || "u1315";
        state.weekIndex = typeof parsed.weekIndex === "number" ? parsed.weekIndex : 0;
        state.theme = parsed.theme === "dark" ? "dark" : "light";
        state.progress = parsed.progress || {};
      }
    } catch (e) { /* ignore corrupt storage */ }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: state.category,
      weekIndex: state.weekIndex,
      theme: state.theme,
      progress: state.progress
    }));
    scheduleCloudSync();
  }

  let cloudSyncTimer = null;
  function scheduleCloudSync() {
    if (typeof TMBCloud === "undefined" || !TMBCloud.getSession()) return;
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
      TMBCloud.saveState(state.category, state.weekIndex, state.theme, state.progress).catch(() => {});
    }, 800);
  }
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
  }

  /* ---------- Schedule / blocks (identique à la logique précédente) ---------- */
  function resolveDay(week, dayIndex) {
    const entry = week.schedule[dayIndex];
    const raw = entry[state.category];
    if (raw.charAt(0) === "@") {
      const label = raw.slice(1);
      if (label === "Repos") return { kind: "rest", label: "Repos" };
      return { kind: "single", label };
    }
    const mod = week.modules[raw];
    return { kind: mod.type, code: raw, module: mod, label: mod.title };
  }

  function getBlocks(resolved) {
    if (resolved.kind === "rest") return [];
    const m = resolved.module;
    if (resolved.kind === "exercises") {
      const blocks = [];
      if (m.echauffement && m.echauffement.length) {
        blocks.push({ key: "warmup", label: "Échauffement", hasValue: false, items: m.echauffement.map((t) => ({ nom: t })) });
      }
      blocks.push({ key: "main", label: m.echauffement ? "Exercices" : null, hasValue: true, items: m.exercises });
      return blocks;
    }
    if (resolved.kind === "checklist") return [{ key: "main", label: null, hasValue: false, items: m.items }];
    if (resolved.kind === "cardio") return [{ key: "main", label: null, hasValue: false, items: [{ nom: "Séance réalisée" }] }];
    if (resolved.kind === "single") return [{ key: "main", label: null, hasValue: false, items: [{ nom: "Fait" }] }];
    return [];
  }

  function blockKey(weekId, dayIndex, block) { return `w${weekId}_d${dayIndex}_${state.category}_${block.key}`; }
  function defiKey(weekId) { return `defi_w${weekId}`; }

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
  function resetKeys(keys) {
    keys.forEach(({ key, count }) => { state.progress[key] = new Array(count).fill(false); });
    save();
  }

  function dayStats(week, dayIndex) {
    const resolved = resolveDay(week, dayIndex);
    if (resolved.kind === "rest") return { total: 0, done: 0, resolved, blocks: [] };
    const blocks = getBlocks(resolved);
    let total = 0, done = 0;
    blocks.forEach((b) => {
      const checks = getChecks(blockKey(week.id, dayIndex, b), b.items.length);
      total += b.items.length;
      done += checks.filter(Boolean).length;
    });
    return { total, done, resolved, blocks };
  }
  function weekStats(week) {
    let total = 0, done = 0;
    for (let d = 0; d < 7; d++) { const s = dayStats(week, d); total += s.total; done += s.done; }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function programStats() {
    let total = 0, done = 0;
    const perWeek = WEEKS.map((w) => { const s = weekStats(w); total += s.total; done += s.done; return s; });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, perWeek };
  }
  function todayDayIndex() {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }
  function findWeek(weekId) { return WEEKS.find((w) => w.id === weekId); }
  function currentCategory() { return CATEGORIES.find((c) => c.key === state.category); }

  /* ---------- Helpers rendu ---------- */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function famBadge(family, size) {
    const fam = FAMILIES[family];
    if (!fam) return "";
    return `<span class="li-icon fam-${family}" style="width:${size}px;height:${size}px">${icon(FAM_ICON[family] || "dumbbell", Math.round(size * 0.5))}</span>`;
  }

  /* ---------- Routeur ---------- */
  function parseRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (!hash) return { name: "home", params: [] };
    const parts = hash.split("/").filter((p) => p.length).map((p) => decodeURIComponent(p));
    return { name: parts[0], params: parts.slice(1) };
  }
  function navigate(path) { location.hash = path; }

  function render() {
    const route = parseRoute();
    const container = document.getElementById("pageContainer");
    window.scrollTo(0, 0);
    switch (route.name) {
      case "programme": renderProgramme(container, route.params); break;
      case "jour": renderJour(container, route.params); break;
      case "exercice": renderExercice(container, route.params); break;
      case "bibliotheque": renderBibliotheque(container, route.params); break;
      case "documents": renderDocuments(container); break;
      case "aide": renderAide(container); break;
      case "progression": renderProgression(container); break;
      case "compte": renderCompte(container); break;
      default: renderHome(container); break;
    }
    renderBottomNav(route.name);
  }

  /* ---------- Topbar / Bottom nav ---------- */
  function renderBottomNav(routeName) {
    const navMap = [
      { route: "home", label: "Accueil", icon: "home" },
      { route: "programme", label: "Programme", icon: "calendar" },
      { route: "progression", label: "Progression", icon: "chart" },
      { route: "documents", label: "Documents", icon: "document" }
    ];
    const activeRoute = ["jour", "exercice"].includes(routeName) ? "programme"
      : routeName === "bibliotheque" ? "programme"
      : ["aide", "compte"].includes(routeName) ? "" : routeName;
    const nav = document.getElementById("bottomNav");
    nav.innerHTML = navMap.map((n) => `
      <button class="nav-tab ${activeRoute === n.route ? "active" : ""}" data-nav="${n.route}">
        ${icon(n.icon, 21)}
        <span class="nt-label">${n.label}</span>
      </button>`).join("");
    nav.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigate("/" + btn.dataset.nav));
    });
  }

  /* ---------- Page: Accueil ---------- */
  function renderHome(container) {
    const cat = currentCategory();
    container.innerHTML = `
      <div class="page">
        <div class="hero">
          ${icon("basketball", 160).replace("<svg", '<svg class="ball-deco"')}
          <div class="kicker">${escapeHtml(INTRO.kicker)} · ${escapeHtml(INTRO.season)}</div>
          <h1>${escapeHtml(INTRO.lead).split("\n").join("<br>")}</h1>
          <p>${escapeHtml(INTRO.body)}</p>
          <div class="motto">${escapeHtml(INTRO.motto)}</div>
        </div>

        <div class="section-title">Objectifs de la préparation</div>
        <div class="goal-grid">
          ${INTRO.goals.map((g) => `<div class="goal-chip">${icon("check", 16)}<span>${escapeHtml(g)}</span></div>`).join("")}
        </div>

        <div class="section-title">Explorer</div>
        <div class="quick-grid">
          <button class="quick-card" data-nav="/programme">
            <span class="qc-icon fam-legs">${icon("calendar", 21)}</span>
            <div class="qc-title">Programme</div>
            <div class="qc-sub">Les 5 semaines détaillées</div>
          </button>
          <button class="quick-card" data-nav="/bibliotheque">
            <span class="qc-icon fam-upper">${icon("dumbbell", 21)}</span>
            <div class="qc-title">Bibliothèque</div>
            <div class="qc-sub">Fiches exercices</div>
          </button>
          <button class="quick-card" data-nav="/documents">
            <span class="qc-icon fam-speed">${icon("document", 21)}</span>
            <div class="qc-title">Documents</div>
            <div class="qc-sub">Le Summer Book en PDF</div>
          </button>
          <button class="quick-card" data-nav="/progression">
            <span class="qc-icon fam-mobility">${icon("chart", 21)}</span>
            <div class="qc-title">Progression</div>
            <div class="qc-sub">Ton suivi complet</div>
          </button>
        </div>

        <div class="section-title">Règles d'or</div>
        <div class="golden-rules">
          ${[["moon", GOLDEN_RULES[0]], ["droplet", GOLDEN_RULES[1]], ["ban", GOLDEN_RULES[2]]].map(([ic, txt]) =>
            `<div class="rule-chip"><span class="ri">${icon(ic, 20)}</span><span>${escapeHtml(txt)}</span></div>`).join("")}
        </div>

        <div class="section-title">Ta catégorie</div>
        <div class="cat-selector" id="categorySelector"></div>

        <div class="outro-card">
          <div class="outro-title">🏀 ${escapeHtml(OUTRO.title)} 🏀</div>
          ${OUTRO.lines.map((l, i) => `<p class="${i === 0 ? "strong" : ""}">${escapeHtml(l)}</p>`).join("")}
          <p class="chevalier-quote">« ${escapeHtml(CHEVALIER_QUOTE)} »</p>
        </div>

        <div class="theme-toggle-row">
          <span class="ttl">${icon(state.theme === "dark" ? "basketball" : "sun", 18)} Thème ${state.theme === "dark" ? "rouge" : "clair"}</span>
          <span class="theme-switch ${state.theme === "dark" ? "on" : ""}" id="themeSwitch">
            <span class="knob">${icon(state.theme === "dark" ? "basketball" : "sun", 13)}</span>
          </span>
        </div>

        <div class="descodes-footer">
          <a href="https://descodes.com" target="_blank" rel="noopener">
            <span>Site réalisé par</span><span class="code-icon">&lt;/&gt;</span>
            <span class="brand-name"><span class="brand-des">DES</span><span class="brand-codes">CODES</span></span>
          </a>
        </div>
      </div>
    `;
    renderCategorySelector(container.querySelector("#categorySelector"));
    container.querySelectorAll("[data-nav]").forEach((btn) => btn.addEventListener("click", () => navigate(btn.dataset.nav)));
    container.querySelector("#themeSwitch").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save();
      applyTheme();
      render();
    });
  }

  function renderCategorySelector(mount) {
    if (!mount) return;
    mount.innerHTML = CATEGORIES.map((cat) => {
      const active = cat.key === state.category;
      return `
        <button class="cat-card ${active ? "active" : ""}" data-cat="${cat.key}" style="--cat-color:${cat.color}">
          <div class="cat-card-top">
            <span class="cat-dot" style="background:${cat.color}"></span>
            <span class="cat-name">${escapeHtml(cat.label)}${cat.sub ? `<small>${escapeHtml(cat.sub)}</small>` : ""}</span>
            ${active ? `<span class="cat-check">${icon("check", 18)}</span>` : ""}
          </div>
          <div class="cat-tagline">${escapeHtml(cat.tagline)}</div>
          <div class="cat-meta"><span>${escapeHtml(cat.freq)}</span><span>RPE ${escapeHtml(cat.rpe)}</span></div>
        </button>`;
    }).join("");
    mount.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => { state.category = btn.dataset.cat; save(); render(); });
    });
  }

  /* ---------- Page: Programme ---------- */
  function renderProgramme(container, params) {
    let weekIdx = state.weekIndex;
    if (params[0]) { const n = parseInt(params[0], 10) - 1; if (n >= 0 && n < WEEKS.length) weekIdx = n; }
    state.weekIndex = weekIdx;
    save();
    const week = WEEKS[weekIdx];
    const s = weekStats(week);

    container.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Programme · ${escapeHtml(currentCategory().label)}</div>
        <div class="page-title">Les 5 semaines</div>
        <div class="week-tabs" id="weekTabs"></div>

        <div class="week-header-card">
          <div class="week-header-top"><h2>${escapeHtml(week.title)}</h2><span class="week-pct">${s.pct}%</span></div>
          <div class="week-progress-bar"><div class="fill" style="width:${s.pct}%"></div></div>
          <p class="week-objectif">${escapeHtml(week.objectif)}</p>
          <div class="staff-quote"><span class="staff-label">Le mot du staff</span><p>${escapeHtml(week.staffQuote)}</p></div>
        </div>

        <div class="section-title">Jours de la semaine</div>
        <div class="days-wrap" id="daysWrap"></div>

        <div id="defiWrap"></div>
      </div>
    `;

    const tabs = container.querySelector("#weekTabs");
    tabs.innerHTML = WEEKS.map((w, i) => `<button class="week-tab ${i === weekIdx ? "active" : ""}" data-w="${i + 1}">S${i + 1}</button>`).join("");
    tabs.querySelectorAll("[data-w]").forEach((btn) => btn.addEventListener("click", () => navigate("/programme/" + btn.dataset.w)));

    const daysWrap = container.querySelector("#daysWrap");
    for (let d = 0; d < 7; d++) daysWrap.appendChild(buildDayCard(week, d));

    if (week.defi) {
      const dKey = defiKey(week.id);
      const checks = getChecks(dKey, week.defi.items.length);
      const wrap = container.querySelector("#defiWrap");
      wrap.innerHTML = `
        <div class="section-title">Défi de la semaine</div>
        <div class="defi-card">
          <div class="defi-title">${icon("trophy", 22)} ${escapeHtml(week.defi.title)}</div>
          <div class="exercise-list">
            ${week.defi.items.map((item, idx) => `
              <label class="exercise-row ${checks[idx] ? "checked" : ""}">
                <input type="checkbox" data-key="${dKey}" data-count="${week.defi.items.length}" data-idx="${idx}" ${checks[idx] ? "checked" : ""}>
                <span class="exercise-name">${escapeHtml(item)}</span>
              </label>`).join("")}
          </div>
        </div>`;
      bindCheckboxes(wrap);
    }
  }

  function buildDayCard(week, dayIndex) {
    const dayName = DAY_LABELS_ORDER[dayIndex];
    const resolved = resolveDay(week, dayIndex);
    const stats = dayStats(week, dayIndex);
    const isToday = dayIndex === todayDayIndex();
    const isRest = resolved.kind === "rest";
    const isDone = !isRest && stats.total > 0 && stats.done === stats.total;

    const card = document.createElement(isRest ? "div" : "button");
    card.className = "day-card" + (isRest ? " rest" : "") + (isToday ? " today" : "");
    if (!isRest) card.style.textAlign = "left";
    if (!isRest) card.style.font = "inherit";
    if (!isRest) card.style.width = "100%";
    if (!isRest) card.style.border = "1px solid var(--border)";

    const famKey = isRest ? "rest" : (resolved.kind === "cardio" ? "cardio" : (resolved.module && resolved.module.exercises ? familyOfModule(resolved.module) : "mobility"));

    let statusHtml;
    if (isRest) statusHtml = `<span class="status-pill rest">Repos</span>`;
    else if (isDone) statusHtml = `<span class="status-pill done">${icon("check", 12)} Fait</span>`;
    else if (stats.done > 0) statusHtml = `<span class="status-pill partial">${stats.done}/${stats.total}</span>`;
    else statusHtml = `<span class="status-pill todo">À faire</span>`;

    card.innerHTML = `
      <div class="day-card-inner">
        <span class="day-icon fam-${famKey}">${icon(isRest ? "moon" : (FAM_ICON[famKey] || "calendar"), 22)}</span>
        <div class="day-info">
          <div class="day-name">${dayName}${isToday ? '<span class="today-badge">Aujourd\'hui</span>' : ""}</div>
          <div class="day-session">${escapeHtml(resolved.label)}</div>
        </div>
        <div class="day-right">
          ${statusHtml}
          ${!isRest ? icon("chevronRight", 18).replace("<svg", '<svg class="chev"') : ""}
        </div>
      </div>`;
    if (!isRest) card.addEventListener("click", () => navigate(`/jour/${week.id}/${dayIndex}`));
    return card;
  }

  function familyOfModule(module) {
    if (!module.exercises || !module.exercises.length) return "mobility";
    const info = getExerciseInfo(module.exercises[0].nom);
    return info ? info.family : "legs";
  }

  /* ---------- Page: Jour ---------- */
  function renderJour(container, params) {
    const weekId = parseInt(params[0], 10);
    const dayIndex = parseInt(params[1], 10);
    const week = findWeek(weekId);
    if (!week || isNaN(dayIndex)) { renderNotFound(container, "/programme"); return; }
    const resolved = resolveDay(week, dayIndex);
    if (resolved.kind === "rest") { navigate(`/programme/${weekId}`); return; }
    const m = resolved.module;
    const blocks = getBlocks(resolved);

    let bodyHtml = "";
    if (m.objectif) bodyHtml += `<p class="module-objectif">${escapeHtml(m.objectif)}</p>`;
    if (m.rpe) bodyHtml += `<div class="rpe-row"><span class="rpe-label">RPE</span><span class="rpe-pill" style="--c:${currentCategory().color}">${m.rpe[state.category]}</span></div>`;
    if (m.durations) bodyHtml += `<div class="duration-chip" style="--c:${currentCategory().color}">${escapeHtml(m.durations[state.category])}</div>`;
    if (m.duration) bodyHtml += `<div class="duration-chip">${escapeHtml(m.duration)}</div>`;
    if (m.options && m.options[state.category]) bodyHtml += `<ul class="plain-list options-list">${m.options[state.category].map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>`;
    if (m.note) bodyHtml += `<p class="module-note">${escapeHtml(m.note)}</p>`;

    container.innerHTML = `
      <div class="page">
        <button class="back-link" id="backBtn">${icon("chevronLeft", 16)} Semaine ${week.id}</button>
        <div class="page-eyebrow">${DAY_LABELS_ORDER[dayIndex]}</div>
        <div class="page-title">${escapeHtml(m.title)}</div>
        <div class="info-card">${bodyHtml}</div>
        <div id="blocksWrap"></div>
      </div>
    `;
    container.querySelector("#backBtn").addEventListener("click", () => navigate(`/programme/${week.id}`));

    const blocksWrap = container.querySelector("#blocksWrap");
    blocks.forEach((b) => {
      const key = blockKey(week.id, dayIndex, b);
      const checks = getChecks(key, b.items.length);
      const section = document.createElement("div");
      if (b.label) section.innerHTML += `<div class="block-label">${escapeHtml(b.label)}</div>`;
      const list = document.createElement("div");
      list.className = "exercise-list";
      b.items.forEach((item, idx) => {
        const checked = checks[idx];
        const row = document.createElement("label");
        row.className = "exercise-row" + (checked ? " checked" : "");
        const valHtml = b.hasValue ? `<span class="exercise-val">${escapeHtml(item[state.category])}</span>` : "";
        row.innerHTML = `
          <input type="checkbox" data-key="${key}" data-count="${b.items.length}" data-idx="${idx}" ${checked ? "checked" : ""}>
          <span class="exercise-name">${escapeHtml(item.nom)}</span>
          ${valHtml}
          <a class="info-link" href="#/exercice/${week.id}/${dayIndex}/${b.key}/${idx}">${icon("chevronRight", 16)}</a>
        `;
        row.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          toggleCheck(key, b.items.length, idx);
          row.classList.toggle("checked", e.target.checked);
        });
        row.querySelector(".info-link").addEventListener("click", (e) => { e.preventDefault(); navigate(`/exercice/${week.id}/${dayIndex}/${b.key}/${idx}`); });
        list.appendChild(row);
      });
      section.appendChild(list);
      blocksWrap.appendChild(section);
    });

    const resetBtn = document.createElement("button");
    resetBtn.className = "btn-reset-day";
    resetBtn.textContent = "Réinitialiser ce jour";
    resetBtn.addEventListener("click", () => {
      resetKeys(blocks.map((b) => ({ key: blockKey(week.id, dayIndex, b), count: b.items.length })));
      render();
    });
    blocksWrap.appendChild(resetBtn);
  }

  /* ---------- Page: Exercice (fiche + validation) ---------- */
  function renderExercice(container, params) {
    const weekId = parseInt(params[0], 10);
    const dayIndex = parseInt(params[1], 10);
    const bKey = params[2];
    const idx = parseInt(params[3], 10);
    const week = findWeek(weekId);
    if (!week) { renderNotFound(container, "/programme"); return; }
    const resolved = resolveDay(week, dayIndex);
    const blocks = getBlocks(resolved);
    const block = blocks.find((b) => b.key === bKey);
    const item = block && block.items[idx];
    if (!block || !item) { renderNotFound(container, `/jour/${weekId}/${dayIndex}`); return; }

    const info = getExerciseInfo(item.nom);
    const family = info ? info.family : "mobility";
    const famColors = { legs: "#e0402a", upper: "#2f6fed", core: "#4c4fc4", speed: "#c76b12", mobility: "#1f9d55" };
    const key = blockKey(week.id, dayIndex, block);
    const checked = getChecks(key, block.items.length)[idx];

    container.innerHTML = `
      <div class="page">
        <button class="back-link" id="backBtn">${icon("chevronLeft", 16)} ${DAY_LABELS_ORDER[dayIndex]} — ${escapeHtml(resolved.label)}</button>

        <div class="exo-hero" style="background:linear-gradient(135deg, ${famColors[family]}, #16233f)">
          <div class="exo-icon">${icon(FAM_ICON[family] || "dumbbell", 32)}</div>
          <h1>${escapeHtml(item.nom)}</h1>
          <div class="exo-family">${escapeHtml((FAMILIES[family] || {}).label || "Exercice")}</div>
        </div>

        ${block.hasValue ? `
        <div class="exo-value-card">
          <div class="lbl">Consigne pour ${escapeHtml(currentCategory().label)}</div>
          <div class="val">${escapeHtml(item[state.category])}</div>
        </div>` : ""}

        <div class="exo-desc">
          <span class="lbl">Comment faire</span>
          ${info ? escapeHtml(info.desc) : "Suis les consignes du staff pour cet exercice, en priorisant toujours la qualité d'exécution."}
        </div>

        ${item.video ? `<a class="btn-video" href="${item.video}" target="_blank" rel="noopener">${icon("play", 18)} Voir la vidéo de démonstration</a>` : ""}

        <button class="btn-validate ${checked ? "is-done" : ""}" id="validateBtn">
          ${icon("check", 18)} ${checked ? "Validé" : "Marquer comme fait"}
        </button>
      </div>
    `;
    container.querySelector("#backBtn").addEventListener("click", () => navigate(`/jour/${week.id}/${dayIndex}`));
    container.querySelector("#validateBtn").addEventListener("click", () => {
      toggleCheck(key, block.items.length, idx);
      render();
    });
  }

  function renderNotFound(container, backPath) {
    container.innerHTML = `
      <div class="page">
        <div class="info-card" style="text-align:center">
          <p class="module-objectif">Cette page n'existe pas (ou plus) pour ta catégorie actuelle.</p>
          <button class="btn-validate" id="backHomeBtn">Retour</button>
        </div>
      </div>`;
    container.querySelector("#backHomeBtn").addEventListener("click", () => navigate(backPath || "/"));
  }

  /* ---------- Page: Bibliothèque ---------- */
  function renderBibliotheque(container, params) {
    if (params[0]) { renderBibliothequeItem(container, params[0]); return; }
    const families = Object.keys(FAMILIES);
    container.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Bibliothèque</div>
        <div class="page-title">Fiches exercices</div>
        <p class="page-lead">Retrouve la technique et les vidéos de tous les exercices du programme.</p>
        <div class="lib-filter" id="libFilter">
          <button class="active" data-fam="all">Tous</button>
          ${families.map((f) => `<button data-fam="${f}">${escapeHtml(FAMILIES[f].label)}</button>`).join("")}
        </div>
        <div class="lib-grid" id="libGrid"></div>
      </div>
    `;
    const grid = container.querySelector("#libGrid");
    function renderGrid(fam) {
      const list = fam === "all" ? EXERCISE_LIBRARY : EXERCISE_LIBRARY.filter((e) => e.family === fam);
      grid.innerHTML = list.map((e) => `
        <button class="lib-card" data-key="${encodeURIComponent(e.key)}">
          ${famBadge(e.family, 44)}
          <div>
            <div class="li-title">${escapeHtml(e.key)}</div>
            <div class="li-fam">${escapeHtml(FAMILIES[e.family].label)}</div>
          </div>
        </button>`).join("");
      grid.querySelectorAll("[data-key]").forEach((btn) => btn.addEventListener("click", () => navigate(`/bibliotheque/${btn.dataset.key}`)));
    }
    renderGrid("all");
    container.querySelectorAll("#libFilter button").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll("#libFilter button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderGrid(btn.dataset.fam);
      });
    });
  }

  function renderBibliothequeItem(container, encodedKey) {
    const key = decodeURIComponent(encodedKey);
    const info = EXERCISE_LIBRARY.find((e) => e.key === key);
    if (!info) { renderNotFound(container, "/bibliotheque"); return; }
    const famColors = { legs: "#e0402a", upper: "#2f6fed", core: "#4c4fc4", speed: "#c76b12", mobility: "#1f9d55" };
    const video = VIDEOS[key];

    // Occurrences dans le programme pour la catégorie actuelle
    const occurrences = [];
    WEEKS.forEach((week) => {
      for (let d = 0; d < 7; d++) {
        const resolved = resolveDay(week, d);
        if (resolved.kind === "rest") continue;
        getBlocks(resolved).forEach((b) => {
          b.items.forEach((item) => {
            const i = getExerciseInfo(item.nom);
            if (i && i.key === key) occurrences.push({ weekId: week.id, dayIndex: d });
          });
        });
      }
    });

    container.innerHTML = `
      <div class="page">
        <button class="back-link" id="backBtn">${icon("chevronLeft", 16)} Bibliothèque</button>
        <div class="exo-hero" style="background:linear-gradient(135deg, ${famColors[info.family]}, #16233f)">
          <div class="exo-icon">${icon(FAM_ICON[info.family] || "dumbbell", 32)}</div>
          <h1>${escapeHtml(info.key)}</h1>
          <div class="exo-family">${escapeHtml(FAMILIES[info.family].label)}</div>
        </div>
        <div class="exo-desc"><span class="lbl">Comment faire</span>${escapeHtml(info.desc)}</div>
        ${video ? `<a class="btn-video" href="${video}" target="_blank" rel="noopener">${icon("play", 18)} Voir la vidéo de démonstration</a>` : ""}
        ${occurrences.length ? `
          <div class="section-title">Dans le programme</div>
          <div class="lib-filter" style="flex-wrap:wrap">
            ${occurrences.map((o) => `<button data-w="${o.weekId}" data-d="${o.dayIndex}">S${o.weekId} · ${DAY_LABELS_ORDER[o.dayIndex]}</button>`).join("")}
          </div>` : ""}
      </div>
    `;
    container.querySelector("#backBtn").addEventListener("click", () => navigate("/bibliotheque"));
    container.querySelectorAll("[data-w]").forEach((btn) => btn.addEventListener("click", () => navigate(`/jour/${btn.dataset.w}/${btn.dataset.d}`)));
  }

  /* ---------- Page: Documents ---------- */
  function renderDocuments(container) {
    const href = encodeURI(PDF_PATH);
    container.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Documents</div>
        <div class="page-title">Le Summer Book</div>
        <p class="page-lead">Le document officiel complet, tel que distribué par le staff.</p>
        <div class="pdf-card">
          <div class="pi">${icon("document", 56)}</div>
          <h3>Summer Book — Saison 2026-2027</h3>
          <p>Programme complet, PDF original</p>
          <a class="btn-open" href="${href}" target="_blank" rel="noopener">${icon("chevronRight", 16)} Ouvrir le PDF</a>
        </div>
        <div class="section-title">Sommaire</div>
        <div class="lib-grid" id="docToc"></div>
      </div>
    `;
    const toc = container.querySelector("#docToc");
    toc.innerHTML = WEEKS.map((w) => `
      <button class="lib-card" data-w="${w.id}">
        ${famBadge("mobility", 44)}
        <div><div class="li-title">${escapeHtml(w.title)}</div><div class="li-fam">${escapeHtml(w.objectif)}</div></div>
      </button>`).join("");
    toc.querySelectorAll("[data-w]").forEach((btn) => btn.addEventListener("click", () => navigate("/programme/" + btn.dataset.w)));
  }

  /* ---------- Page: Aide ---------- */
  function renderAide(container) {
    container.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Aide</div>
        <div class="page-title">Comment utiliser l'app</div>

        <div class="help-block">
          <h3>${icon("check", 18)} Valider une séance</h3>
          <p>Ouvre un jour dans le Programme, coche chaque élément (échauffement puis exercices) au fur et à mesure. Touche le nom d'un exercice pour ouvrir sa fiche complète (consigne, technique, vidéo).</p>
        </div>

        <div class="help-block">
          <h3>${icon("dumbbell", 18)} Les catégories</h3>
          <p><strong>U13/U15</strong> — construire les fondamentaux, 3 séances/semaine, priorité à la technique.</p>
          <p><strong>U18</strong> — développer la performance, 4 séances/semaine, introduction à la force.</p>
          <p><strong>NM3</strong> — optimiser la performance, 4 à 5 séances/semaine, travail individualisé.</p>
        </div>

        <div class="help-block">
          <h3>${icon("bolt", 18)} Le RPE</h3>
          <p>Le RPE (Rate of Perceived Exertion) mesure l'intensité ressentie de 1 à 10.</p>
          <div class="rpe-scale">
            <div class="rpe-scale-row"><span class="sw" style="background:#1f9d55"></span>5-6 : effort modéré, confortable</div>
            <div class="rpe-scale-row"><span class="sw" style="background:#2f6fed"></span>7-8 : effort soutenu, exigeant</div>
            <div class="rpe-scale-row"><span class="sw" style="background:#e0402a"></span>9 : quasi maximal</div>
          </div>
        </div>

        <div class="help-block">
          <h3>${icon("moon", 18)} Règles d'or</h3>
          <ul>${GOLDEN_RULES.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
        </div>

        <div class="help-block" style="text-align:center">
          <h3 style="justify-content:center">Crédits</h3>
          <p>Contenu du programme : staff TMB — Application : <a href="https://descodes.com" target="_blank" rel="noopener">DESCODES</a></p>
        </div>
      </div>
    `;
  }

  /* ---------- Page: Progression ---------- */
  function renderProgression(container) {
    const stats = programStats();
    container.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Progression · ${escapeHtml(currentCategory().label)}</div>
        <div class="page-title">Ton suivi</div>

        <div class="overview-card">
          <div class="overview-top">
            <div class="ring" style="--pct:${stats.pct}"><div class="ring-inner">${stats.pct}%</div></div>
            <div class="overview-labels">
              <div class="title">Programme complet</div>
              <div class="sub">${stats.done} / ${stats.total} éléments validés</div>
            </div>
          </div>
          <div class="week-dots" id="progWeekDots"></div>
          <div class="heatmap" id="progHeatmap"></div>
        </div>

        <div class="reset-all-wrap">
          <button class="btn-reset-all" id="resetAllBtn">${icon("reset", 14)} Réinitialiser toute la progression</button>
        </div>
      </div>
    `;
    const dots = container.querySelector("#progWeekDots");
    dots.innerHTML = stats.perWeek.map((w, i) => `
      <button class="week-dot ${w.pct === 100 ? "full" : w.pct > 0 ? "partial" : ""}" data-w="${i + 1}">S${i + 1}</button>`).join("");
    dots.querySelectorAll("[data-w]").forEach((btn) => btn.addEventListener("click", () => navigate("/programme/" + btn.dataset.w)));

    const heat = container.querySelector("#progHeatmap");
    WEEKS.forEach((week) => {
      const row = document.createElement("div");
      row.className = "heat-row";
      for (let d = 0; d < 7; d++) {
        const s = dayStats(week, d);
        const cell = document.createElement("div");
        cell.className = "heat-cell";
        if (s.resolved.kind === "rest") cell.classList.add("heat-rest");
        else if (s.total === 0) cell.classList.add("heat-empty");
        else {
          const frac = s.done / s.total;
          cell.classList.add(frac === 0 ? "heat-0" : frac < 1 ? "heat-partial" : "heat-full");
        }
        cell.title = `${DAY_LABELS_ORDER[d]} — S${week.id}`;
        row.appendChild(cell);
      }
      heat.appendChild(row);
    });

    container.querySelector("#resetAllBtn").addEventListener("click", () => {
      if (!confirm("Réinitialiser toute la progression enregistrée sur cet appareil ?")) return;
      state.progress = {};
      save();
      render();
    });
  }

  /* ---------- Page: Mon compte (synchro cloud) ---------- */
  function renderCompte(container) {
    const hasCloud = typeof TMBCloud !== "undefined" && TMBCloud.available();
    const session = hasCloud ? TMBCloud.getSession() : null;

    container.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Mon compte</div>
        <div class="page-title">${session ? "Connecté" : "Se connecter"}</div>
        <p class="page-lead">Connecte-toi pour retrouver ta progression sur n'importe quel appareil (téléphone, tablette...). Si l'identifiant n'existe pas encore, il est créé automatiquement.</p>
        <div id="compteBody"></div>
      </div>
    `;
    const body = container.querySelector("#compteBody");

    if (!hasCloud) {
      body.innerHTML = `<div class="info-card"><p class="module-objectif">La synchronisation en ligne n'est pas disponible pour le moment. Ta progression reste sauvegardée sur cet appareil.</p></div>`;
      return;
    }

    if (session) {
      body.innerHTML = `
        <div class="info-card" style="text-align:center">
          <span class="sync-badge">${icon("check", 14)} Synchronisé</span>
          <p class="module-objectif" style="margin-top:10px">Connecté en tant que <strong>${escapeHtml(session.username)}</strong>.</p>
          <button class="btn-validate" id="logoutBtn" style="background:var(--red)">Se déconnecter</button>
        </div>`;
      body.querySelector("#logoutBtn").addEventListener("click", () => {
        TMBCloud.clearSession();
        render();
      });
      return;
    }

    body.innerHTML = `
      <div class="info-card">
        <div class="form-field">
          <label>Identifiant</label>
          <input type="text" id="loginUser" placeholder="ex: Lucas.T" autocomplete="off" autocapitalize="off">
        </div>
        <div class="form-field">
          <label>Mot de passe</label>
          <input type="text" id="loginPass" placeholder="ex: basket26" autocomplete="off" autocapitalize="off">
        </div>
        <div class="form-error" id="loginError"></div>
        <button class="btn-validate" id="loginBtn">Se connecter</button>
      </div>`;

    const userInput = body.querySelector("#loginUser");
    const passInput = body.querySelector("#loginPass");
    const errEl = body.querySelector("#loginError");
    const btn = body.querySelector("#loginBtn");

    async function doLogin() {
      const u = userInput.value.trim();
      const p = passInput.value;
      errEl.textContent = "";
      if (!u || p.length < 3) {
        errEl.textContent = "Identifiant requis, mot de passe : 3 caractères minimum.";
        return;
      }
      btn.textContent = "Connexion…";
      btn.disabled = true;
      try {
        const remote = await TMBCloud.login(u, p);
        if (remote) {
          state.category = remote.category || state.category;
          state.weekIndex = typeof remote.week_index === "number" ? remote.week_index : state.weekIndex;
          state.theme = remote.theme === "dark" ? "dark" : "light";
          state.progress = remote.progress || {};
          save();
          applyTheme();
        }
        render();
      } catch (e) {
        const msg = String((e && e.message) || "");
        errEl.textContent = msg.includes("INVALID_PASSWORD") ? "Mot de passe incorrect."
          : msg.includes("INVALID_INPUT") ? "Identifiant ou mot de passe invalide."
          : "Connexion impossible. Réessaie plus tard.";
        btn.textContent = "Se connecter";
        btn.disabled = false;
      }
    }

    btn.addEventListener("click", doLogin);
    [userInput, passInput].forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); }));
  }

  /* ---------- Checkbox delegation (défi, etc.) ---------- */
  function bindCheckboxes(scope) {
    scope.querySelectorAll('input[type="checkbox"][data-key]').forEach((cb) => {
      cb.addEventListener("change", () => {
        toggleCheck(cb.dataset.key, parseInt(cb.dataset.count, 10), parseInt(cb.dataset.idx, 10));
        cb.closest(".exercise-row").classList.toggle("checked", cb.checked);
      });
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    load();
    applyTheme();
    document.getElementById("topbarCrest").addEventListener("click", () => navigate("/"));
    document.getElementById("topbarBrand").addEventListener("click", () => navigate("/"));
    document.getElementById("topbarHelpBtn").addEventListener("click", () => navigate("/aide"));
    document.getElementById("topbarAccountBtn").addEventListener("click", () => navigate("/compte"));
    window.addEventListener("hashchange", render);
    render();

    // Restaure l'état depuis le cloud en arrière-plan si une session existe
    // (l'app a déjà rendu la version locale/en cache, donc pas d'attente).
    if (typeof TMBCloud !== "undefined" && TMBCloud.available()) {
      const session = TMBCloud.getSession();
      if (session) {
        TMBCloud.login(session.username, session.password).then((remote) => {
          if (!remote) return;
          state.category = remote.category || state.category;
          state.weekIndex = typeof remote.week_index === "number" ? remote.week_index : state.weekIndex;
          state.theme = remote.theme === "dark" ? "dark" : "light";
          state.progress = remote.progress || {};
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            category: state.category, weekIndex: state.weekIndex, theme: state.theme, progress: state.progress
          }));
          applyTheme();
          render();
        }).catch(() => { /* session invalide ou hors-ligne : on garde la version locale */ });
      }
    }
  });
})();
