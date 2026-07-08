#!/usr/bin/env node
"use strict";

/* Vérifie qu'un compte "player" ne peut pas écrire dans les tables du
   programme (réservées admin/coach). Si une écriture réussit
   contrairement à l'attendu, le script échoue BRUYAMMENT (c'est le bug
   qu'on cherche) et nettoie quand même la ligne créée. */

const { requireEnv } = require("./lib/env");
const { signIn, restClient } = require("./lib/rest-client");

const env = requireEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY", "TEST_PLAYER_A_EMAIL", "TEST_PLAYER_A_PASSWORD"]);

(async () => {
  let failures = 0;
  const token = await signIn(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, env.TEST_PLAYER_A_EMAIL, env.TEST_PLAYER_A_PASSWORD);
  const client = restClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, token);

  // 1. Écriture sur tmb_categories (toujours interdite, même à l'admin
  //    via l'app — ici on vérifie côté RLS directement).
  const catName = `HACK_TEST_${Date.now()}`;
  const catRes = await client.insert("tmb_categories", { name: catName, min_age: 1, max_age: 2 });
  if (!catRes.ok) {
    console.log("✅ PASS: écriture refusée sur tmb_categories.");
  } else {
    console.log("❌ FAIL: un compte joueur a pu écrire dans tmb_categories !");
    failures++;
    await client.del("tmb_categories", `?name=eq.${catName}`);
  }

  // 2. Écriture sur tmb_training_plans, avec un category_id VALIDE
  //    (récupéré en lecture, autorisée à tous) pour être sûr que
  //    l'échec attendu vient bien de RLS et pas d'une contrainte de
  //    clé étrangère invalide.
  const { data: cats } = await client.select("tmb_categories", "?select=id&limit=1");
  if (!cats || !cats.length) {
    console.log("⚠️  SKIP (partiel) : aucune catégorie en base pour tester tmb_training_plans (importe d'abord le programme par défaut).");
  } else {
    const planRes = await client.insert("tmb_training_plans", {
      category_id: cats[0].id, week_number: 1, objective: "HACK_TEST"
    });
    if (!planRes.ok) {
      console.log("✅ PASS: écriture refusée sur tmb_training_plans.");
    } else {
      console.log("❌ FAIL: un compte joueur a pu écrire dans tmb_training_plans !");
      failures++;
      const created = Array.isArray(planRes.data) ? planRes.data[0] : null;
      if (created && created.id) await client.del("tmb_training_plans", `?id=eq.${created.id}`);
    }
  }

  process.exit(failures ? 1 : 0);
})().catch((err) => { console.error("Erreur inattendue :", err.message); process.exit(1); });
