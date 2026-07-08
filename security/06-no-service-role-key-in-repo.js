#!/usr/bin/env node
"use strict";

/* Scan statique, ZÉRO réseau, toujours sans risque : vérifie qu'aucune
   clé au format JWT ne traîne dans le dépôt en dehors de
   assets/supabase-config.js (où la clé "anon" est attendue et
   documentée comme publique par design, voir docs/SECURITY.md §1).

   Volontairement basé sur la FORME d'un secret (un JWT), pas sur le
   simple mot "service_role" : ce mot apparaît légitimement dans la
   documentation (docs/SECURITY.md), les commentaires du code et ce
   script lui-même sans qu'il y ait la moindre fuite — un scan par mot
   génère trop de faux positifs pour être utile.

   Le dossier security/ lui-même est exclu du scan : ce script définit
   ses propres motifs de détection (qui contiennent forcément des
   fragments du type "eyJ" dans leur code source), ce qui produirait un
   faux positif sur lui-même sinon. */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IGNORE_DIRS = new Set([".git", "node_modules", "security"]);
const SCAN_EXTENSIONS = /\.(js|json|md|sql|html|env|txt)$/i;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
const ALLOWED_JWT_FILE = path.join("assets", "supabase-config.js");

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!SCAN_EXTENSIONS.test(entry.name)) continue;

    const rel = path.relative(ROOT, full);
    const content = fs.readFileSync(full, "utf8");

    if (JWT_PATTERN.test(content) && rel !== ALLOWED_JWT_FILE) {
      findings.push(`${rel} : contient une chaîne au format JWT en dehors de ${ALLOWED_JWT_FILE}`);
    }
  }
}

walk(ROOT);

if (findings.length) {
  console.log("❌ FAIL — éléments suspects trouvés :");
  findings.forEach((f) => console.log("  - " + f));
  process.exit(1);
} else {
  console.log("✅ PASS: aucune clé service_role ni JWT inattendu trouvé dans le dépôt.");
  process.exit(0);
}
