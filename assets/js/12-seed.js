/* ============================================================
   TMB SUMMER BOOK — 12. SEED
   Import des données par défaut (assets/default_program.json) vers
   Supabase. Isolé dans son propre fichier car c'est la seule fonction
   qui fait des écritures en masse (et peut écraser des données
   existantes en mode "force") — un bug ici ne doit pas pouvoir
   entraîner le reste du module Data API (11-data-api.js).
   ============================================================ */
(function () {
  "use strict";
  const sb = window.TMB.supabase.client;

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

  window.TMB.data.seedDatabase = seedDatabase;
})();
