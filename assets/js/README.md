# `assets/js/` — modules de l'application

Chaque fichier est un `<script>` classique indépendant (pas de modules
ES, pas de bundler), chargé dans `index.html` **dans l'ordre des
préfixes numériques ci-dessous** — cet ordre est important, chaque
fichier ne doit utiliser que ce qui a déjà été chargé avant lui.

Tous les fichiers attachent leurs exports à l'espace de noms partagé
`window.TMB` (créé par `00-namespace.js`) au lieu de déclarer des
variables globales. Voir `docs/ARCHITECTURE.md` à la racine du dépôt
pour le détail complet (diagramme, table du namespace, mécanisme
d'isolation des pannes).

| Fichier | Rôle |
|---|---|
| `00-namespace.js` | Squelette `window.TMB` — doit rester trivial |
| `01-core-dom.js` | Aides DOM génériques ($, $$, échappement HTML, notifications...) |
| `02-error-boundary.js` | Isolation de panne : `safeRender()` + filet global |
| `03-supabase-client.js` | Client Supabase unique, garde-fou de config |
| `10-auth.js` | Inscription / connexion / déconnexion |
| `11-data-api.js` | CRUD programme (catégories, profils, plans, jours, exercices, validations) |
| `12-seed.js` | Import des données par défaut (`assets/default_program.json`) |
| `20-nav.js` | Affichage des 5 conteneurs de vue + topbar (doit rester minimal) |
| `25-section-nav.js` | Barre de navigation entre sections (Entraînement/Programme/Admin/Profil), desktop + mobile |
| `30-view-auth.js` | Écran de connexion / inscription |
| `40-component-program-editor.js` | Éditeur de programme partagé (section Programme), y compris la bibliothèque partagée d'exercices |
| `45-component-timer.js` | Chronomètre / minuteur partagé (page dédiée d'un exercice, section Entraînement) |
| `50-view-admin.js` | Section Admin (gestion des comptes) |
| `60-view-program.js` | Section Programme (édition + stats de régularité par catégorie) — admin/coach |
| `70-view-training.js` | Section Entraînement (semaine, jour, page dédiée par exercice avec chrono) — n'importe quel rôle avec une catégorie assignée |
| `80-view-settings.js` | Section Profil (identifiant, catégorie, mot de passe, déconnexion, thème) — tous rôles |
| `90-bootstrap.js` | Démarrage, session, dispatch vers la section d'atterrissage par rôle |

**Convention des préfixes** : `0x` = infra, `1x` = auth/données, `2x` =
navigation, `3x` = vue auth, `4x` = composants partagés, `5x/6x/7x/8x`
= sections applicatives, `9x` = démarrage. Les trous entre les tranches
sont volontaires — un module s'insère proprement sans tout renuméroter.

**Ajouter un nouveau module** : choisis le préfixe de la bonne tranche,
attache tes exports à un sous-objet dédié de `window.TMB` (jamais une
clé déjà utilisée par un autre fichier), ajoute la balise `<script>`
dans `index.html` au bon endroit, et si c'est une section top-level :
enveloppe son rendu avec `TMB.errors.safeRender(...)`, ajoute son
conteneur `#view-<id>` dans `index.html`, ajoute `<id>` au tableau de
`showView()` (20-nav.js) et à la liste des sections par rôle dans
`25-section-nav.js`.
