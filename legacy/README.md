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
  standard (email + mot de passe).
- `app.monolithic.js` — version de `assets/app.js` juste avant son
  découpage en modules (2026-07-08) : une seule IIFE de ~1100 lignes
  mélangeant auth, accès aux données et les 3 vues (admin/coach/joueur).
  Remplacée par `assets/js/*.js`, voir `docs/ARCHITECTURE.md` à la
  racine pour le détail du découpage et le mécanisme d'isolation des
  pannes entre modules.

Voir le `README.md` à la racine pour la documentation de la version
actuelle.
