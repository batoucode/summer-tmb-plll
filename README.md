# TMB — Summer Book 2026-2027

Plateforme de suivi de la préparation physique estivale du **TMB (Tours
Métropole Basket)**, avec 3 rôles : **Admin**, **Coach**, **Joueur**.
Application web statique (HTML/CSS/JS vanilla, aucun framework, aucun
build), branchée sur **Supabase** (Auth + Postgres + RLS).

**Dépôt** : `https://github.com/batoucode/summer-tmb-plll`

> Pour la documentation de l'ancienne version (statique, sans compte,
> localStorage) : voir `legacy/README.md`. Les anciennes données sont dans
> `legacy/data.js`.

---

## 1. Rôles & workflow

| Rôle | Accès |
|---|---|
| **Admin** | Tout : gestion des comptes (rôles, catégories), gestion des programmes de **toutes** les catégories, import/réinitialisation des données par défaut |
| **Coach** | Lecture/écriture du programme (objectif, échauffement, RPE, exercices) de **sa seule** catégorie assignée |
| **Joueur** | Lecture du programme de sa catégorie, validation de ses propres exercices, suivi de sa progression |

1. **Inscription** : un utilisateur s'inscrit (email + mot de passe + prénom/nom + date de naissance). Un profil est créé automatiquement avec `role = 'player'` et une catégorie déduite de son âge (`U13` 11-13 ans, `U15` 14-15 ans, `U18` 16-18 ans, `NM3` 19 ans et +).
2. **Premier compte créé sur l'instance = admin automatiquement** (bootstrap, voir §5). Tous les suivants sont `player` par défaut.
3. **Connexion** : redirection automatique vers la vue correspondant au rôle.
4. **Admin** : promeut un joueur en coach et lui assigne une catégorie via l'onglet *Utilisateurs*.
5. **Coach** : édite le programme de sa catégorie — semaine (S1 à S5) puis jour (Lundi à Dimanche + un créneau bonus "Défi") — et clique sur *Publier les modifications*.
6. **Joueur** : parcourt sa semaine jour par jour, coche ses exercices un par un ou valide toute une séance d'un coup ; la progression est sauvegardée en base et persistante entre appareils/sessions.

---

## 2. Stack technique

| Aspect | Détail |
|---|---|
| Frontend | HTML5 + CSS3 + JS ES6 vanilla, aucun framework, aucun bundler |
| Auth | Supabase Auth (email + mot de passe) |
| Données | Supabase Postgres, Row Level Security (RLS) sur toutes les tables |
| Accès aux données | `@supabase/supabase-js@2` (CDN jsDelivr) → PostgREST |
| Hébergement | Site statique (aucun serveur applicatif requis) |

---

## 3. Configuration

Les identifiants Supabase (clé **publique/anon**, volontairement exposable
côté client) sont dans `assets/supabase-config.js` :

```js
const SUPABASE_URL = "https://sb.batoucode.ovh";
const SUPABASE_ANON_KEY = "eyJ...";
```

Pour pointer vers une autre instance Supabase, modifier ces deux valeurs
(URL du projet + clé `anon` visible dans *Project Settings → API*). La
sécurité réelle est assurée par les policies RLS définies dans
`supabase/schema.sql`, pas par cette clé.

---

## 4. Mise en place de la base de données

1. Ouvrir l'éditeur SQL de l'instance Supabase (`sb.batoucode.ovh` ou
   autre).
2. Exécuter l'intégralité de `supabase/schema.sql`. Le script est
   **idempotent** (peut être rejoué sans erreur).

Le script crée :
- les tables `tmb_categories`, `tmb_profiles`, `tmb_training_plans`,
  `tmb_training_days`, `tmb_exercises`, `tmb_player_validations` (préfixe
  `tmb_` car l'instance est partagée entre plusieurs projets) ;
- les policies RLS (lecture publique authentifiée pour le programme,
  écriture réservée admin/coach selon la catégorie, validations privées
  par joueur) ;
- un trigger qui crée automatiquement le profil applicatif à chaque
  inscription (`auth.users` → `tmb_profiles`), avec calcul de la
  catégorie à partir de la date de naissance ;
- un garde-fou empêchant un utilisateur non-admin de modifier son propre
  rôle ou sa catégorie assignée.

> Le schéma est passé par 3 versions pendant le développement (v1 = ancien
> système localStorage, v2 = multi-rôles avec un plan par semaine, v3 =
> retour à une granularité par jour à l'intérieur du plan). `schema.sql`
> contient les migrations douces v2 → v3 ; si tu avais déjà exécuté une
> version antérieure du script **sans données de production**, relance-le
> simplement tel quel. S'il y avait déjà des exercices/validations
> réels en base, ils sont vidés lors de la migration (impossible de les
> rattacher automatiquement à un jour précis) — réimporte les données par
> défaut ensuite depuis l'espace Admin.

---

## 5. Initialisation des données (seed)

1. **Créer le premier compte** via le formulaire d'inscription de l'app.
   Il devient automatiquement `admin` (aucun autre compte n'existe encore
   sur `tmb_profiles`).
2. Se connecter avec ce compte → onglet **Utilisateurs** de l'espace
   Admin → bouton **📥 Importer le programme par défaut**.
3. Ce bouton appelle `seedDatabase()` (`assets/app.js`), qui lit
   `assets/default_program.json` et peuple `tmb_categories`,
   `tmb_training_plans`, `tmb_training_days` et `tmb_exercises`.
4. Pour réimporter/écraser plus tard (après modification manuelle du
   JSON par exemple), le même bouton devient **♻️ Réinitialiser les
   données du programme** dès qu'au moins une catégorie existe déjà
   (confirmation demandée avant écrasement).

`assets/default_program.json` a été généré à partir de l'ancien
`legacy/data.js` (5 semaines, transcription fidèle du Summer Book
officiel). Les catégories `U13` et `U15` partagent les mêmes exercices
(l'ancien programme ne distinguait qu'un groupe `U13/U15` unique) ; à
adapter via l'éditeur de programme si besoin de les différencier.

---

## 6. Arborescence

```
index.html                     Coquille HTML (topbar + 4 conteneurs de vues)
assets/
  supabase-config.js           URL + clé anon Supabase
  app.js                       Auth, routage par rôle, CRUD, seed, rendu des 3 vues
  style.css                    Design system "Sportif & Aéré"
  default_program.json         Données d'amorçage (5 semaines × 4 catégories)
  logo.svg
supabase/
  schema.sql                   Schéma complet (tables + RLS + triggers), idempotent
legacy/
  data.js, cloud.js            Ancienne version (v1) — non utilisée, conservée en référence
  README.md
ressources/
  Summer book TMB ....pdf      Document source officiel
```

---

## 7. Modèle de données (résumé)

```
tmb_categories          id, name, min_age, max_age
tmb_profiles             id (= auth.users.id), email, first_name, last_name,
                          birth_date, role, assigned_category_id
tmb_training_plans       id, category_id, week_number (1-5), objective, staff_quote
tmb_training_days        id, plan_id, day_index (0=Lundi..6=Dimanche, 7=Défi bonus),
                          label, is_rest, warmup, rpe
tmb_exercises            id, day_id, name, sets, duration(s), intensity(1-10),
                          reps (texte libre, ex. "3 X 10"), position, video_url
tmb_player_validations   id, player_id, exercise_id, validated, validation_date
```

Hiérarchie : **catégorie → plan (1 par semaine) → jour (jusqu'à 8 :
Lundi-Dimanche + Défi) → exercices**. L'échauffement et le RPE sont portés
par le jour (pas par la semaine entière), comme dans le programme papier
original où chaque séance a ses propres consignes. Le champ `reps` (texte
libre) complète `sets`/`duration`/`intensity` pour garder la fidélité aux
consignes originales qui ne se réduisent pas toujours à un seul nombre
(ex. "3 X 10", "2 X 30 sec (assisté)").

Il n'existe pas de table de "validation de jour" séparée : un jour est
considéré comme fait quand tous ses exercices sont validés. Le bouton
**✅ Valider toute la séance** de la vue Joueur fait un upsert groupé sur
tous les exercices du jour en un seul aller-retour réseau.

---

## 8. Limitations connues / écarts assumés

- **Pas de vrai email d'invitation.** Créer un compte pour un joueur
  depuis l'espace Admin (*➕ Ajouter un compte*) crée directement le
  compte avec un mot de passe temporaire à communiquer manuellement — un
  vrai envoi d'email d'invitation nécessite l'API Admin de Supabase Auth
  (clé `service_role`), qui ne peut pas être exposée dans une app
  statique sans backend. Une Edge Function dédiée serait l'étape
  suivante si ce besoin devient prioritaire.
- **Suppression de compte partielle.** Le bouton *Supprimer* dans
  l'espace Admin supprime le profil applicatif (`tmb_profiles`, cascade
  sur les validations) mais pas le compte `auth.users` sous-jacent : ça
  nécessite aussi la clé `service_role` (tableau de bord Supabase ou
  Edge Function).
- **U13 et U15 partagent le même contenu par défaut** (voir §5), faute de
  distinction dans les données sources.
- **Le créneau "Défi" (day_index 7)** est un bonus optionnel, pas un vrai
  jour de la semaine : il n'apparaît dans la vue Joueur que pour les
  semaines qui en ont un (S3 et S4 dans les données par défaut).

---

## 9. Lancer en local

```bash
npx serve .
# ou
python3 -m http.server 8000
```

Aucune installation, aucun build. Nécessite un accès réseau à
`cdn.jsdelivr.net` (SDK Supabase) et à l'instance Supabase configurée
dans `assets/supabase-config.js`.

---

Site réalisé par [DESCODES](https://descodes.com)
