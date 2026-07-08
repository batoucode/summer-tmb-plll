#!/usr/bin/env node
"use strict";

/* Vérifie qu'un coach : (a) NE PEUT PAS écrire un plan dans une
   catégorie qui n'est pas la sienne, (b) PEUT écrire dans sa propre
   catégorie (vérification positive, pas seulement négative). Le compte
   de test doit être assigné à la catégorie TMB_SECURITY_TEST (voir
   security/README.md) pour que le nettoyage de la vérification
   positive soit sans risque. */

const { requireEnv } = require("./lib/env");
const { signIn, getUser, restClient } = require("./lib/rest-client");

const env = requireEnv([
  "SUPABASE_URL", "SUPABASE_ANON_KEY",
  "TEST_COACH_EMAIL", "TEST_COACH_PASSWORD"
]);

(async () => {
  let failures = 0;
  const token = await signIn(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, env.TEST_COACH_EMAIL, env.TEST_COACH_PASSWORD);
  const client = restClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, token);
  const user = await getUser(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, token);

  const { data: profileRows } = await client.select("tmb_profiles", `?id=eq.${user.id}&select=role,assigned_category_id`);
  const profile = profileRows && profileRows[0];
  if (!profile || profile.role !== "coach" || !profile.assigned_category_id) {
    console.log("⚠️  SKIP : TEST_COACH_* n'est pas un compte coach avec une catégorie assignée. Vérifie la configuration (voir security/README.md).");
    process.exit(0);
  }
  const ownCategoryId = profile.assigned_category_id;

  const { data: allCats } = await client.select("tmb_categories", "?select=id");
  const otherCategory = (allCats || []).find((c) => c.id !== ownCategoryId);

  // (a) négatif : écriture hors de sa catégorie.
  if (otherCategory) {
    const badRes = await client.insert("tmb_training_plans", {
      category_id: otherCategory.id, week_number: 1, objective: "HACK_TEST_COACH_SCOPE"
    });
    if (!badRes.ok) {
      console.log("✅ PASS: le coach ne peut pas écrire un plan hors de sa catégorie.");
    } else {
      console.log("❌ FAIL: le coach a pu écrire un plan dans une catégorie qui n'est pas la sienne !");
      failures++;
      const created = Array.isArray(badRes.data) ? badRes.data[0] : null;
      if (created && created.id) await client.del("tmb_training_plans", `?id=eq.${created.id}`);
    }
  } else {
    console.log("⚠️  SKIP (partiel) : une seule catégorie en base, impossible de tester le refus hors-catégorie.");
  }

  // (b) positif : écriture DANS sa catégorie doit réussir.
  const goodRes = await client.upsert("tmb_training_plans", {
    category_id: ownCategoryId, week_number: 5, objective: "HACK_TEST_COACH_SCOPE_OK"
  }, "category_id,week_number");
  if (goodRes.ok) {
    console.log("✅ PASS: le coach peut bien écrire un plan dans sa propre catégorie.");
    const created = Array.isArray(goodRes.data) ? goodRes.data[0] : null;
    if (created && created.id) {
      // Nettoyage : on remet le plan à un état neutre plutôt que de le
      // supprimer (le supprimer casserait la semaine 5 si elle existait
      // déjà avant ce test, à cause de l'upsert).
      await client.update("tmb_training_plans", `?id=eq.${created.id}`, { objective: null });
    }
  } else {
    console.log(`❌ FAIL: le coach n'a pas pu écrire un plan dans sa PROPRE catégorie (${JSON.stringify(goodRes.data)}).`);
    failures++;
  }

  process.exit(failures ? 1 : 0);
})().catch((err) => { console.error("Erreur inattendue :", err.message); process.exit(1); });
