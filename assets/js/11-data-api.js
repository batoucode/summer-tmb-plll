/* ============================================================
   TMB SUMMER BOOK — 11. DATA API
   Accès en lecture/écriture au programme (catégories, profils, plans,
   jours, exercices, validations). Aucune règle métier ici au-delà du
   strict CRUD — la sécurité réelle est appliquée côté base par les
   policies RLS (voir supabase/schema.sql et docs/SECURITY.md).
   ============================================================ */
(function () {
  "use strict";
  const sb = window.TMB.supabase.client;

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

  Object.assign(window.TMB.data, {
    loadCategories, loadUserProfile, loadAllUsers, updateUserRole, deleteUserProfile,
    loadProgram, ensurePlan, updatePlan, ensureDay, updateDay,
    updateExercise, addExercise, deleteExercise,
    loadValidations, toggleValidation, bulkValidateDay
  });
})();
