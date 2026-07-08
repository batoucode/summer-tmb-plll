#!/usr/bin/env node
"use strict";

/* Lance tous les scripts de sécurité dans l'ordre et affiche un résumé.
   Usage : node security/run-all.js */

const { spawnSync } = require("child_process");
const path = require("path");

const SCRIPTS = [
  "01-unauth-rejected.js",
  "02-player-cannot-read-others-validations.js",
  "03-player-cannot-write-categories-or-plans.js",
  "04-coach-scope-enforced.js",
  "05-role-selfescalation-blocked.js",
  "06-no-service-role-key-in-repo.js"
];

let failed = 0;
for (const script of SCRIPTS) {
  console.log(`\n=== ${script} ===`);
  const res = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: "inherit", env: process.env });
  if (res.status !== 0) failed++;
}

console.log(`\n${SCRIPTS.length - failed}/${SCRIPTS.length} scripts OK.`);
process.exit(failed ? 1 : 0);
