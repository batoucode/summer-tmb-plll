#!/usr/bin/env node
"use strict";

/* Vérifie qu'un joueur ne peut PAS lire les validations d'un autre
   joueur. Le joueur A crée une validation de test sur un exercice
   existant, le joueur B tente de la lire — doit voir zéro ligne.
   Nettoie systématiquement la ligne de test créée (bloc finally). */

const { requireEnv } = require("./lib/env");
const { signIn, getUser, restClient } = require("./lib/rest-client");

const env = requireEnv([
  "SUPABASE_URL", "SUPABASE_ANON_KEY",
  "TEST_PLAYER_A_EMAIL", "TEST_PLAYER_A_PASSWORD",
  "TEST_PLAYER_B_EMAIL", "TEST_PLAYER_B_PASSWORD"
]);

(async () => {
  let failures = 0;

  const tokenA = await signIn(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, env.TEST_PLAYER_A_EMAIL, env.TEST_PLAYER_A_PASSWORD);
  const clientA = restClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, tokenA);
  const userA = await getUser(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, tokenA);

  const { data: exos } = await clientA.select("tmb_exercises", "?select=id&limit=1");
  if (!exos || !exos.length) {
    console.log("⚠️  SKIP : aucun exercice en base pour faire le test (importe d'abord le programme par défaut depuis l'espace Admin).");
    process.exit(0);
  }
  const exerciseId = exos[0].id;

  const upsertRes = await clientA.upsert("tmb_player_validations", {
    player_id: userA.id, exercise_id: exerciseId, validated: true, validation_date: new Date().toISOString()
  }, "player_id,exercise_id");

  if (!upsertRes.ok) {
    console.log(`⚠️  SKIP : le joueur A n'a pas pu créer sa propre validation de test (${JSON.stringify(upsertRes.data)}). Vérifie TEST_PLAYER_A_*.`);
    process.exit(0);
  }

  try {
    const tokenB = await signIn(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, env.TEST_PLAYER_B_EMAIL, env.TEST_PLAYER_B_PASSWORD);
    const clientB = restClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, tokenB);
    const { data: seenByB } = await clientB.select("tmb_player_validations", `?player_id=eq.${userA.id}`);

    if (!seenByB || seenByB.length === 0) {
      console.log("✅ PASS: le joueur B ne voit aucune validation du joueur A.");
    } else {
      console.log(`❌ FAIL: le joueur B a pu lire ${seenByB.length} validation(s) du joueur A !`);
      failures++;
    }
  } finally {
    // Toujours nettoyer la ligne de test, même si l'assertion a échoué.
    await clientA.del("tmb_player_validations", `?player_id=eq.${userA.id}&exercise_id=eq.${exerciseId}`);
  }

  process.exit(failures ? 1 : 0);
})().catch((err) => { console.error("Erreur inattendue :", err.message); process.exit(1); });
