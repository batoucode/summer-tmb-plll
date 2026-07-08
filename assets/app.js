/* ============================================================
   TMB SUMMER BOOK v2 — Plateforme multi-rôles (admin / coach / player)
   Vanilla JS, aucune dépendance hors @supabase/supabase-js (CDN).
   Toutes les données transitent par Supabase (Auth + Postgres/RLS) :
   voir supabase/schema.sql pour le modèle complet.
   ============================================================ */

(function () {
  "use strict";

  if (typeof window.supabase === "undefined" || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    document.body.innerHTML = '<div class="boot-error">Configuration Supabase manquante (assets/supabase-config.js).</div>';
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ---------------- Helpers DOM ---------------- */
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  let toastTimer = null;
  function toast(message, isError) {
    const box = $("#toast");
    if (!box) return;
    box.textContent = message;
    box.classList.remove("hidden");
    box.classList.toggle("toast-error", !!isError);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.add("hidden"), 3800);
  }
  function ageFromBirthDate(birthDate) {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }
  function fullName(p) {
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";
  }
  const ROLE_LABELS = { admin: "Admin", coach: "Coach", player: "Joueur" };
  const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche", "Défi bonus"];

  /* ---------------- État global ---------------- */
  let session = null;
  let profile = null;
  let categories = [];

  /* ================================================================
     AUTH
     ================================================================ */
  async function signUp({ email, password, firstName, lastName, birthDate }) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, birth_date: birthDate } }
    });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signOut() {
    await sb.auth.signOut();
  }

  /* Client Supabase isolé (session non persistée) utilisé uniquement pour
     que l'admin puisse créer un compte joueur/coach sans remplacer sa
     propre session (auth.signUp() connecte automatiquement le nouvel
     utilisateur sur le client qui l'appelle). Voir README section
     "Limitations connues". */
  function adminCreateAccount({ email, password, firstName, lastName, birthDate }) {
    const tmp = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "tmb_tmp_invite" }
    });
    return tmp.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, birth_date: birthDate } }
    }).then(({ data, error }) => {
      if (error) throw error;
      return data;
    });
  }

  /* ================================================================
     DATA API
     ================================================================ */
  async function loadCategories() {
    const { data, error } = await sb.from("tmb_categories").select("*").order("min_age");
    if (error) throw error;
    return data || [];
  }

  async function loadUserProfile(userId) {
    const { data, error } = await sb.from("tmb_profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function loadAllUsers() {
    const { data, error } = await sb.from("tmb_profiles").select("*").order("last_name", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data || [];
  }

  async function updateUserRole(userId, newRole, categoryId) {
    const { error } = await sb.from("tmb_profiles").update({ role: newRole, assigned_category_id: categoryId }).eq("id", userId);
    if (error) throw error;
  }

  async function deleteUserProfile(userId) {
    const { error } = await sb.from("tmb_profiles").delete().eq("id", userId);
    if (error) throw error;
  }

  /* Charge le plan d'une (catégorie, semaine) avec tous ses jours et,
     pour chaque jour, ses exercices (triés par position). Un jour
     absent en base n'apparaît simplement pas dans `days`. */
  async function loadProgram(categoryId, weekNumber) {
    const { data: plan, error: planErr } = await sb.from("tmb_training_plans")
      .select("*").eq("category_id", categoryId).eq("week_number", weekNumber).maybeSingle();
    if (planErr) throw planErr;
    if (!plan) return { plan: null, days: [] };

    const { data: dayRows, error: dayErr } = await sb.from("tmb_training_days")
      .select("*").eq("plan_id", plan.id).order("day_index", { ascending: true });
    if (dayErr) throw dayErr;

    const dayIds = (dayRows || []).map((d) => d.id);
    let exercisesByDay = {};
    if (dayIds.length) {
      const { data: exRows, error: exErr } = await sb.from("tmb_exercises")
        .select("*").in("day_id", dayIds).order("position", { ascending: true });
      if (exErr) throw exErr;
      (exRows || []).forEach((e) => {
        (exercisesByDay[e.day_id] = exercisesByDay[e.day_id] || []).push(e);
      });
    }
    const days = (dayRows || []).map((d) => ({ ...d, exercises: exercisesByDay[d.id] || [] }));
    return { plan, days };
  }

  async function ensurePlan(categoryId, weekNumber) {
    const { data, error } = await sb.from("tmb_training_plans")
      .upsert({ category_id: categoryId, week_number: weekNumber }, { onConflict: "category_id,week_number" })
      .select().single();
    if (error) throw error;
    return data;
  }

  async function updatePlan(planId, fields) {
    const { error } = await sb.from("tmb_training_plans").update(fields).eq("id", planId);
    if (error) throw error;
  }

  async function ensureDay(planId, dayIndex) {
    const { data, error } = await sb.from("tmb_training_days")
      .upsert({ plan_id: planId, day_index: dayIndex }, { onConflict: "plan_id,day_index" })
      .select().single();
    if (error) throw error;
    return { ...data, exercises: [] };
  }

  async function updateDay(dayId, fields) {
    const { error } = await sb.from("tmb_training_days").update(fields).eq("id", dayId);
    if (error) throw error;
  }

  async function updateExercise(exerciseId, data) {
    const { error } = await sb.from("tmb_exercises").update(data).eq("id", exerciseId);
    if (error) throw error;
  }

  async function addExercise(dayId, data) {
    const { data: row, error } = await sb.from("tmb_exercises").insert({ day_id: dayId, ...data }).select().single();
    if (error) throw error;
    return row;
  }

  async function deleteExercise(exerciseId) {
    const { error } = await sb.from("tmb_exercises").delete().eq("id", exerciseId);
    if (error) throw error;
  }

  async function loadValidations(playerId, exerciseIds) {
    if (!exerciseIds.length) return {};
    const { data, error } = await sb.from("tmb_player_validations")
      .select("*").eq("player_id", playerId).in("exercise_id", exerciseIds);
    if (error) throw error;
    const map = {};
    (data || []).forEach((v) => { map[v.exercise_id] = v; });
    return map;
  }

  async function toggleValidation(exerciseId, playerId, validated) {
    const { error } = await sb.from("tmb_player_validations").upsert({
      player_id: playerId,
      exercise_id: exerciseId,
      validated,
      validation_date: validated ? new Date().toISOString() : null
    }, { onConflict: "player_id,exercise_id" });
    if (error) throw error;
  }

  /* Valide (ou dévalide) en un seul aller-retour tous les exercices
     d'une même journée — bouton "Valider toute la séance" côté joueur. */
  async function bulkValidateDay(exerciseIds, playerId, validated) {
    if (!exerciseIds.length) return;
    const rows = exerciseIds.map((exerciseId) => ({
      player_id: playerId,
      exercise_id: exerciseId,
      validated,
      validation_date: validated ? new Date().toISOString() : null
    }));
    const { error } = await sb.from("tmb_player_validations").upsert(rows, { onConflict: "player_id,exercise_id" });
    if (error) throw error;
  }

  /* ---------------- Seed (import des données par défaut) ---------------- */
  async function seedDatabase(force) {
    const { count, error: countErr } = await sb.from("tmb_categories").select("id", { count: "exact", head: true });
    if (countErr) throw countErr;
    if (count > 0 && !force) return { seeded: false, reason: "already-populated" };

    const res = await fetch("assets/default_program.json");
    if (!res.ok) throw new Error("Impossible de charger assets/default_program.json");
    const data = await res.json();

    for (const cat of data.categories) {
      const { error } = await sb.from("tmb_categories").upsert(
        { name: cat.name, min_age: cat.min_age, max_age: cat.max_age }, { onConflict: "name" }
      );
      if (error) throw error;
    }
    const { data: cats, error: catsErr } = await sb.from("tmb_categories").select("*");
    if (catsErr) throw catsErr;
    const catByName = Object.fromEntries(cats.map((c) => [c.name, c]));

    for (const week of data.weeks) {
      for (const catName of Object.keys(week.by_category)) {
        const cat = catByName[catName];
        if (!cat) continue;
        const { data: plan, error: planErr } = await sb.from("tmb_training_plans")
          .upsert({
            category_id: cat.id, week_number: week.week,
            objective: week.objective, staff_quote: week.staff_quote
          }, { onConflict: "category_id,week_number" })
          .select().single();
        if (planErr) throw planErr;

        for (const day of week.by_category[catName].days) {
          const { data: dayRow, error: dayErr } = await sb.from("tmb_training_days")
            .upsert({
              plan_id: plan.id, day_index: day.day_index,
              label: day.label, is_rest: day.is_rest, warmup: day.warmup, rpe: day.rpe
            }, { onConflict: "plan_id,day_index" })
            .select().single();
          if (dayErr) throw dayErr;

          const { error: delErr } = await sb.from("tmb_exercises").delete().eq("day_id", dayRow.id);
          if (delErr) throw delErr;

          const rows = day.exercises.map((e, i) => ({
            day_id: dayRow.id, name: e.name, sets: e.sets, duration: e.duration,
            intensity: e.intensity, reps: e.reps, video_url: e.video_url, position: i
          }));
          if (rows.length) {
            const { error: insErr } = await sb.from("tmb_exercises").insert(rows);
            if (insErr) throw insErr;
          }
        }
      }
    }
    return { seeded: true };
  }

  /* ================================================================
     NAVIGATION ENTRE VUES
     ================================================================ */
  function showView(name) {
    ["auth", "admin", "coach", "player"].forEach((v) => {
      $("#view-" + v).classList.toggle("hidden", v !== name);
    });
    $("#topbar").classList.toggle("hidden", name === "auth");
  }

  function renderTopbar() {
    if (!profile) return;
    $("#topbarUserName").textContent = fullName(profile);
    $("#topbarUserRole").textContent = ROLE_LABELS[profile.role] || profile.role;
    $("#topbarUserRole").className = "role-badge role-" + profile.role;
  }

  /* ================================================================
     VUE : AUTH (connexion / inscription)
     ================================================================ */
  let authMode = "login"; // "login" | "signup"
  function renderAuthView() {
    const root = $("#view-auth");
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <div class="auth-logo">🏀</div>
          <h1>TMB Summer Book</h1>
          <p class="auth-sub">Préparation physique estivale — 2026-2027</p>

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
          await signUp({
            email, password,
            firstName: $("#fFirstName", root).value.trim(),
            lastName: $("#fLastName", root).value.trim(),
            birthDate: $("#fBirthDate", root).value
          });
          toast("Compte créé. Si la confirmation par e-mail est activée, vérifie ta boîte mail avant de te connecter.");
          authMode = "login";
          renderAuthView();
        } else {
          await signIn(email, password);
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

  /* ================================================================
     COMPOSANT PARTAGÉ : ÉDITEUR DE PROGRAMME (admin + coach)
     ================================================================ */
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
      const { plan, days } = await loadProgram(state.categoryId, state.week);
      state.plan = plan;
      state.days = days;
      draw();
    }

    function draw() {
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
            state.plan = await ensurePlan(state.categoryId, state.week);
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
        await updatePlan(state.plan.id, {
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
            const newDay = await ensureDay(state.plan.id, state.dayIndex);
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
            if (id) await deleteExercise(id);
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
          await updateDay(day.id, {
            label: $("#dyLabel", body).value.trim(),
            is_rest: isRest,
            warmup: isRest ? null : ($("#dyWarmup", body).value.trim() || null),
            rpe: isRest ? null : ($("#dyRpe", body).value.trim() || null)
          });
          if (!isRest) {
            const cards = $$(".exo-edit-card", body);
            for (let i = 0; i < cards.length; i++) {
              const card = cards[i];
              const data = readExerciseCard(card);
              const id = card.dataset.id;
              if (!data.name) continue;
              if (id) {
                await updateExercise(id, { ...data, position: i });
              } else {
                await addExercise(day.id, { ...data, position: i });
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

  /* ================================================================
     VUE : ADMIN
     ================================================================ */
  let adminTab = "users";
  async function renderAdminView() {
    const root = $("#view-admin");
    root.innerHTML = `
      <div class="page">
        <div class="page-title">Espace Administrateur</div>
        <div class="tabs">
          <button class="tab ${adminTab === "users" ? "active" : ""}" data-tab="users">👥 Utilisateurs</button>
          <button class="tab ${adminTab === "program" ? "active" : ""}" data-tab="program">📋 Programmes</button>
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
    try { users = await loadAllUsers(); } catch (err) { body.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; return; }

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
          <thead><tr><th>Nom</th><th>Prénom</th><th>Email</th><th>Âge</th><th>Catégorie</th><th>Rôle</th><th></th></tr></thead>
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
          <td>${escapeHtml(u.email || "")}</td>
          <td>${ageFromBirthDate(u.birth_date) ?? "—"}</td>
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
          await updateUserRole(u.id, e.target.value, catId ? Number(catId) : null);
          toast("Rôle mis à jour.");
        } catch (err) { toast(err.message || String(err), true); }
      });
      $(".rowCategory", row).addEventListener("change", async (e) => {
        try {
          const catId = e.target.value ? Number(e.target.value) : null;
          await updateUserRole(u.id, $(".rowRole", row).value, catId);
          toast("Catégorie mise à jour.");
        } catch (err) { toast(err.message || String(err), true); }
      });
      $(".btnDeleteUser", row).addEventListener("click", async () => {
        if (!confirm(`Supprimer le compte de ${fullName(u)} ?\n\n(Seul le profil applicatif est supprimé ; le compte d'authentification doit être purgé côté tableau de bord Supabase — voir README.)`)) return;
        try {
          await deleteUserProfile(u.id);
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
          <div class="field"><label>Date de naissance</label><input type="date" id="npBirth"></div>
          <div class="field"><label>Email</label><input type="email" id="npEmail"></div>
        </div>
        <div class="field"><label>Mot de passe temporaire</label><input type="text" id="npPass" placeholder="min. 6 caractères"></div>
        <p class="auth-hint">Aucun envoi d'e-mail automatique n'est possible depuis une app statique sans clé service_role. Communique ce mot de passe temporaire directement à la personne concernée ; elle pourra le changer plus tard.</p>
        <button class="btn-primary" id="npSubmit">Créer le compte</button>
      `;
      $("#npSubmit", box).addEventListener("click", async () => {
        try {
          await adminCreateAccount({
            firstName: $("#npFirst", box).value.trim(),
            lastName: $("#npLast", box).value.trim(),
            birthDate: $("#npBirth", box).value,
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
          await seedDatabase(true);
          categories = await loadCategories();
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
    body.innerHTML = `<div id="adminProgramEditor"></div>`;
    if (!categories.length) {
      $("#adminProgramEditor", body).innerHTML = `<div class="empty-state">Aucune catégorie : importe d'abord le programme par défaut depuis l'onglet Utilisateurs.</div>`;
      return;
    }
    await mountProgramEditor($("#adminProgramEditor", body), {
      categoryId: categories[0].id,
      week: 1,
      allowedCategories: null,
      lockCategory: false
    });
  }

  /* ================================================================
     VUE : COACH
     ================================================================ */
  async function renderCoachView() {
    const root = $("#view-coach");
    if (!profile.assigned_category_id) {
      root.innerHTML = `<div class="page"><div class="empty-state">Aucune catégorie ne t'est assignée pour le moment. Contacte un administrateur.</div></div>`;
      return;
    }
    root.innerHTML = `
      <div class="page">
        <div class="page-title">Espace Coach</div>
        <div id="coachEditor"></div>
      </div>
    `;
    await mountProgramEditor($("#coachEditor", root), {
      categoryId: profile.assigned_category_id,
      week: 1,
      allowedCategories: categories.filter((c) => c.id === profile.assigned_category_id),
      lockCategory: true
    });
  }

  /* ================================================================
     VUE : PLAYER
     Semaine → liste des jours (comme un planning papier) → détail d'un
     jour avec ses exercices, validables un par un ou d'un coup ("Valider
     toute la séance").
     ================================================================ */
  let playerWeek = 1;
  let playerDayIndex = null; // null = vue "semaine" (liste des jours)

  function dayStatus(day, validations) {
    if (day.is_rest) return { label: "Repos", cls: "rest", done: 0, total: 0 };
    const total = day.exercises.length;
    const done = day.exercises.filter((e) => validations[e.id] && validations[e.id].validated).length;
    if (total === 0) return { label: "—", cls: "empty", done: 0, total: 0 };
    if (done === total) return { label: "Fait", cls: "done", done, total };
    if (done > 0) return { label: `${done}/${total}`, cls: "partial", done, total };
    return { label: "À faire", cls: "todo", done, total };
  }

  async function renderPlayerView() {
    const root = $("#view-player");
    if (!profile.assigned_category_id) {
      root.innerHTML = `<div class="page"><div class="empty-state">Aucune catégorie ne t'est assignée pour le moment. Contacte un administrateur.</div></div>`;
      return;
    }
    root.innerHTML = `<div class="page"><div class="empty-state">Chargement…</div></div>`;

    const { plan, days } = await loadProgram(profile.assigned_category_id, playerWeek);
    const allExerciseIds = days.flatMap((d) => d.exercises.map((e) => e.id));
    const validations = await loadValidations(profile.id, allExerciseIds);
    const catName = (categories.find((c) => c.id === profile.assigned_category_id) || {}).name || "";

    if (playerDayIndex !== null) {
      renderPlayerDayDetail(root, { plan, days, validations, catName });
    } else {
      renderPlayerWeekOverview(root, { plan, days, validations, catName });
    }
  }

  function renderPlayerWeekOverview(root, { plan, days, validations, catName }) {
    const totalEx = days.reduce((s, d) => s + d.exercises.length, 0);
    const doneEx = days.reduce((s, d) => s + d.exercises.filter((e) => validations[e.id] && validations[e.id].validated).length, 0);
    const pct = totalEx ? Math.round((doneEx / totalEx) * 100) : 0;

    root.innerHTML = `
      <div class="page">
        <div class="page-eyebrow">Programme · ${escapeHtml(catName)}</div>
        <div class="page-title">${plan ? escapeHtml(plan.objective || `Semaine ${playerWeek}`) : "Semaine " + playerWeek}</div>

        <div class="week-tabs round" id="playerWeekTabs">
          ${[1, 2, 3, 4, 5].map((w) => `<button class="week-tab round ${w === playerWeek ? "active" : ""}" data-w="${w}">S${w}</button>`).join("")}
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
        <div id="playerDayList" class="day-list"></div>
      </div>
    `;

    $$(".week-tab", root).forEach((btn) => btn.addEventListener("click", () => { playerWeek = Number(btn.dataset.w); renderPlayerView(); }));

    const list = $("#playerDayList", root);
    if (!days.length) {
      list.innerHTML = `<div class="empty-state">Programme pas encore publié pour cette semaine.</div>`;
      return;
    }
    days.forEach((day) => {
      const st = dayStatus(day, validations);
      const label = DAY_LABELS[day.day_index];
      const card = el(`
        <button type="button" class="day-card ${st.cls}" data-d="${day.day_index}" ${day.is_rest ? "disabled" : ""}>
          <div class="day-card-left">
            <div class="day-name">${day.day_index === 7 ? "🏆 " : ""}${escapeHtml(label)}</div>
            <div class="day-session">${escapeHtml(day.label || (day.is_rest ? "Repos" : ""))}</div>
          </div>
          <span class="status-pill ${st.cls}">${st.label}</span>
        </button>
      `);
      if (!day.is_rest) {
        card.addEventListener("click", () => { playerDayIndex = day.day_index; renderPlayerView(); });
      }
      list.appendChild(card);
    });
  }

  function renderPlayerDayDetail(root, { days, validations, catName }) {
    const day = days.find((d) => d.day_index === playerDayIndex);
    if (!day) { playerDayIndex = null; renderPlayerView(); return; }
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

        <div id="playerExoList" class="player-exo-grid"></div>
      </div>
    `;

    $("#backToWeek", root).addEventListener("click", () => { playerDayIndex = null; renderPlayerView(); });

    const list = $("#playerExoList", root);
    if (!day.exercises.length) {
      list.innerHTML = `<div class="empty-state">Aucun exercice pour cette séance.</div>`;
    }
    day.exercises.forEach((ex) => {
      const isDone = !!(validations[ex.id] && validations[ex.id].validated);
      const card = el(`
        <div class="player-exo-card ${isDone ? "is-done" : ""}" data-id="${ex.id}">
          <div class="pe-top">
            <div class="pe-name">${escapeHtml(ex.name)}</div>
            <button type="button" class="pe-check" aria-label="Valider">${isDone ? "✅" : "⬜"}</button>
          </div>
          <div class="pe-meta">
            ${ex.reps ? `<span class="pe-chip">🔄 ${escapeHtml(ex.reps)}</span>` : (ex.sets ? `<span class="pe-chip">🔄 x${ex.sets}</span>` : "")}
            ${ex.duration ? `<span class="pe-chip">⏱️ ${ex.duration}s</span>` : ""}
            ${ex.intensity ? `<span class="pe-chip">💪 ${ex.intensity}/10</span>` : ""}
          </div>
          ${ex.video_url ? `<a class="pe-video" href="${ex.video_url}" target="_blank" rel="noopener">▶ Voir la vidéo</a>` : ""}
        </div>
      `);
      $(".pe-check", card).addEventListener("click", async () => {
        const nowDone = !card.classList.contains("is-done");
        card.classList.toggle("is-done", nowDone);
        $(".pe-check", card).textContent = nowDone ? "✅" : "⬜";
        try {
          await toggleValidation(ex.id, profile.id, nowDone);
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
          await bulkValidateDay(day.exercises.map((e) => e.id), profile.id, willValidate);
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

  /* ================================================================
     BOOTSTRAP / SESSION
     ================================================================ */
  async function handleSessionChange() {
    if (!session) {
      profile = null;
      showView("auth");
      renderAuthView();
      return;
    }
    try {
      profile = await loadUserProfile(session.user.id);
    } catch (err) {
      toast(err.message || String(err), true);
      return;
    }
    if (!profile) {
      $("#view-auth").innerHTML = `<div class="auth-wrap"><div class="auth-card"><p>Ton profil est en cours de création, réessaie dans un instant.</p><button class="btn-primary" id="retryProfileBtn">Réessayer</button></div></div>`;
      showView("auth");
      $("#retryProfileBtn").addEventListener("click", handleSessionChange);
      return;
    }
    renderTopbar();
    try { categories = await loadCategories(); } catch (e) { categories = []; }

    if (profile.role === "admin") { showView("admin"); await renderAdminView(); }
    else if (profile.role === "coach") { showView("coach"); await renderCoachView(); }
    else { showView("player"); await renderPlayerView(); }
  }

  async function init() {
    const { data } = await sb.auth.getSession();
    session = data.session;
    await handleSessionChange();

    sb.auth.onAuthStateChange((_event, newSession) => {
      const changed = (newSession && newSession.user && newSession.user.id) !== (session && session.user && session.user.id);
      session = newSession;
      if (changed) handleSessionChange();
    });

    $("#logoutBtn").addEventListener("click", async () => {
      await signOut();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
