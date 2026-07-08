#!/usr/bin/env node
"use strict";

/* Vérifie le garde-fou tmb_guard_profile_update (supabase/schema.sql) :
   un compte non-admin qui tente de changer son propre "role" voit la
   requête HTTP "réussir" (RLS l'autorise à modifier SA ligne) mais la
   valeur reste inchangée en base (le trigger la réécrit silencieusement
   avant l'écriture). On vérifie l'état AVANT et APRÈS, pas juste le
   code HTTP de la réponse. */

const { requireEnv } = require("./lib/env");
const { signIn, getUser, restClient } = require("./lib/rest-client");

const env = requireEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY", "TEST_PLAYER_A_EMAIL", "TEST_PLAYER_A_PASSWORD"]);

(async () => {
  const token = await signIn(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, env.TEST_PLAYER_A_EMAIL, env.TEST_PLAYER_A_PASSWORD);
  const client = restClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, token);
  const user = await getUser(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, token);

  const { data: before } = await client.select("tmb_profiles", `?id=eq.${user.id}&select=role`);
  const roleBefore = before && before[0] && before[0].role;
  if (!roleBefore) {
    console.log("⚠️  SKIP : impossible de lire le profil du compte de test.");
    process.exit(0);
  }
  if (roleBefore === "admin") {
    console.log("⚠️  SKIP : TEST_PLAYER_A_* est déjà admin, ce test a besoin d'un compte non-admin.");
    process.exit(0);
  }

  await client.update("tmb_profiles", `?id=eq.${user.id}`, { role: "admin" });

  const { data: after } = await client.select("tmb_profiles", `?id=eq.${user.id}&select=role`);
  const roleAfter = after && after[0] && after[0].role;

  if (roleAfter === roleBefore) {
    console.log(`✅ PASS: tentative d'auto-promotion sans effet (role toujours "${roleAfter}").`);
    process.exit(0);
  } else {
    console.log(`❌ FAIL: le rôle est passé de "${roleBefore}" à "${roleAfter}" — un compte a pu se promouvoir lui-même !`);
    // On restaure l'état d'origine pour ne pas laisser un compte de
    // test avec des droits élevés, même si on ne devrait normalement
    // pas pouvoir arriver ici.
    await client.update("tmb_profiles", `?id=eq.${user.id}`, { role: roleBefore });
    process.exit(1);
  }
})().catch((err) => { console.error("Erreur inattendue :", err.message); process.exit(1); });
