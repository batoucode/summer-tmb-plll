"use strict";

/* Charge les variables d'environnement obligatoires ; échoue
   proprement (message clair, pas de stack trace) si l'une manque.
   N'affiche jamais la valeur des secrets. */
function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Variable(s) d'environnement manquante(s) : ${missing.join(", ")}`);
    console.error("Voir security/README.md pour la liste complète et comment les définir.");
    process.exit(1);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]]));
}

module.exports = { requireEnv };
