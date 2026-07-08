#!/usr/bin/env node
"use strict";

/* Vérifie qu'un client SANS session (juste la clé anon, personne
   connecté) ne voit aucune donnée sur les tables sensibles. Toutes les
   policies RLS de ce projet ciblent le rôle "authenticated" — le rôle
   "anon" n'a donc aucun accès par défaut. Zéro écriture, script 100%
   lecture seule. */

const { requireEnv } = require("./lib/env");
const { restClient } = require("./lib/rest-client");

const env = requireEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);
const client = restClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, null);

const TABLES = [
  "tmb_profiles",
  "tmb_training_plans",
  "tmb_training_days",
  "tmb_exercises",
  "tmb_player_validations"
];

(async () => {
  let failures = 0;
  for (const table of TABLES) {
    const { data } = await client.select(table, "?select=*&limit=1");
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      console.log(`✅ PASS: ${table} — aucune donnée visible sans connexion.`);
    } else {
      console.log(`❌ FAIL: ${table} — ${rows.length} ligne(s) visible(s) SANS connexion (RLS ne bloque pas le rôle anon) !`);
      failures++;
    }
  }
  process.exit(failures ? 1 : 0);
})().catch((err) => { console.error("Erreur inattendue :", err.message); process.exit(1); });
