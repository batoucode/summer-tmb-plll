# Legacy (v1)

Fichiers de l'ancienne version statique de l'application, conservés en
référence, **non utilisés par l'application actuelle** (v2, multi-rôles,
branchée sur Supabase) :

- `data.js` — anciennes données du programme (5 semaines × 3 catégories
  `u1315`/`u18`/`nm3`), remplacées par `assets/default_program.json` et les
  tables `tmb_training_plans` / `tmb_exercises` en base.
- `cloud.js` — ancien client de synchronisation basé sur un compte
  identifiant/mot de passe "maison" (fonctions RPC `tmb_login_or_signup` /
  `tmb_save_state`), remplacé par l'authentification Supabase Auth
  standard (email + mot de passe) dans `assets/app.js`.

Voir le `README.md` à la racine pour la documentation de la version
actuelle.
