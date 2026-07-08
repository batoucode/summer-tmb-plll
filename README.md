# TMB — Summer Book 2026-2027

> Documentation technique complète de l'application dans son état **actuel**
> (avant refonte). Ce document sert de référence pour comprendre
> l'architecture, les données et le fonctionnement du projet tel qu'il existe
> aujourd'hui, avant la restructuration complète prévue.

**Dépôt Git** : `https://github.com/batoucode/summer-tmb-plll`
**Branche courante** : `claude/git-repo-address-zwnymx`
**Dernière mise à jour de cette doc** : 08/07/2026

---

## 1. Résumé du projet

Application web **statique** (HTML/CSS/JS "vanilla", sans framework ni build
step) de suivi de la préparation physique estivale du **TMB (Tours
Métropole Basket)**. Elle transcrit le *Summer Book* officiel du club
(document PDF fourni par le staff) en une expérience interactive :
programme d'entraînement sur 5 semaines, décliné pour 3 catégories de
joueurs, avec suivi de progression et synchronisation cloud optionnelle.

### Fonctionnalités actuelles

- Sélection de catégorie (**U13/U15**, **U18**, **NM3**) avec séances adaptées
  à chacune (charges, répétitions, RPE différents)
- 5 semaines détaillées : objectif de semaine, mot du staff, échauffements,
  RPE, exercices avec séries/répétitions par catégorie, vidéos de
  démonstration YouTube
- Suivi de progression par jour/semaine (cases à cocher), persistant en
  local (`localStorage`)
- Synchronisation cloud **optionnelle** via Supabase (compte
  identifiant/mot de passe simplifié, sans Supabase Auth)
- Vue d'ensemble / page "Progression" : anneau de progression global,
  mini-calendrier des semaines, heatmap de régularité par jour
- Bibliothèque d'exercices (fiches technique + vidéo, indépendante du
  programme, filtrable par famille musculaire)
- Défis basket bonus certaines semaines
- Page "Documents" : accès direct au PDF officiel source
- Page "Aide" : mode d'emploi, explication du RPE, règles d'or
- Thème clair / sombre (bascule manuelle, mémorisée)

---

## 2. Stack technique

| Aspect | Détail |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript ES6 **vanilla**, aucun framework (pas de React/Vue), aucun bundler |
| Rendu | SPA "maison" : un unique `index.html`, contenu généré dynamiquement via `innerHTML` / DOM API dans `app.js` |
| Routage | Routeur par hash (`location.hash`), fait main (`parseRoute` / `navigate` / `render` dans `app.js`) |
| Style | Un seul fichier CSS (`assets/style.css`), variables CSS (`:root`), thème clair/sombre via `[data-theme]` |
| Stockage local | `localStorage` (clé `tmb_summerbook_v2` pour l'état, `tmb_summerbook_session` pour la session cloud) |
| Backend / Cloud | Supabase (PostgreSQL + PostgREST), instance **self-hébergée** partagée (`sb.batoucode.ovh`) |
| Dépendance externe | `@supabase/supabase-js@2` chargée depuis le CDN jsDelivr |
| Hébergement | Site statique — aucun serveur applicatif requis (peut être servi par n'importe quel serveur de fichiers statiques) |

Aucun `package.json`, aucun gestionnaire de paquets, aucune étape de
build : le site est servi tel quel.

---

## 3. Arborescence du dépôt

```
summer-tmb-plll/
├── index.html                     Point d'entrée unique (SPA)
├── README.md                      Ce document
├── .gitignore
├── assets/
│   ├── app.js                     Logique applicative (routeur, rendu, état) — 899 lignes
│   ├── data.js                    Données du programme (5 semaines × 3 catégories) — 659 lignes
│   ├── cloud.js                   Client de synchronisation Supabase — 59 lignes
│   ├── supabase-config.js         Constantes de connexion Supabase (URL + clé anon)
│   ├── style.css                  Design system complet (thème sombre/clair) — 815 lignes
│   └── logo.svg                   Blason du club (TMB)
├── ressources/
│   └── Summer book TMB 2K26_2K27 - Summer book TMB 2K262K27.pdf
│                                   Document source officiel (PDF du staff)
└── supabase/
    └── schema.sql                 Schéma SQL de la base cloud (table + fonctions RPC)
```

Aucun sous-dossier `src/`, `dist/`, `public/`, `components/` : tout est à
plat dans `assets/`.

---

## 4. Point d'entrée — `index.html`

- Déclare la structure HTML minimale : `.topbar` (blason, nom, boutons
  compte/aide) + `#pageContainer` (zone injectée par le routeur JS) +
  `.bottom-nav` (barre de navigation basse, générée en JS).
- Un script inline en `<head>` lit `localStorage` **avant** le premier
  rendu pour appliquer le thème (clair/sombre) sans flash visuel (FOUC).
- Charge dans l'ordre, en fin de `<body>` :
  1. `@supabase/supabase-js@2` (CDN)
  2. `assets/supabase-config.js` (constantes)
  3. `assets/cloud.js` (client cloud)
  4. `assets/data.js` (données du programme)
  5. `assets/app.js` (logique + démarrage de l'app)

Il n'y a **aucun autre fichier HTML** — toutes les "pages" sont générées
par JavaScript dans `#pageContainer`.

---

## 5. Logique applicative — `assets/app.js`

Fichier unique en IIFE (`(function () { "use strict"; ... })()`), qui
concentre : icônes, état, règles métier du programme, routeur, et rendu de
toutes les pages.

### 5.1 État global (`state`)

```js
let state = {
  category: "u1315",   // "u1315" | "u18" | "nm3"
  weekIndex: 0,         // index de semaine affichée (0-4)
  theme: "light",       // "light" | "dark"
  progress: {}           // { [clé de bloc]: boolean[] }
};
```

- `load()` / `save()` : lecture/écriture dans `localStorage` sous la clé
  `tmb_summerbook_v2`.
- Chaque `save()` déclenche aussi `scheduleCloudSync()` (debounce de
  800 ms) qui pousse l'état vers Supabase **si une session cloud existe**.

### 5.2 Résolution du planning (`resolveDay`, `getBlocks`)

Le planning source (`WEEKS[i].schedule`) référence des **codes de module**
par catégorie (ex. `"F1"`, `"C1"`, `"@Repos"`) :
- un code préfixé `@` = jour spécial (repos, ou libellé libre type
  "Récupération active")
- un code brut (ex. `F1`) pointe vers `WEEKS[i].modules[code]`, qui définit
  le contenu réel de la séance (`type: "exercises" | "checklist" | "cardio"`)

`getBlocks()` transforme un module résolu en une liste de "blocs"
affichables (échauffement + exercices, ou checklist, ou séance cardio
simple), chacun identifié par une clé stable utilisée pour la progression :
`blockKey(weekId, dayIndex, block) = "w{id}_d{idx}_{catégorie}_{blockKey}"`.

### 5.3 Calcul de progression

- `getChecks` / `toggleCheck` / `resetKeys` : lecture/écriture des cases
  cochées dans `state.progress`.
- `dayStats`, `weekStats`, `programStats` : agrégation du nombre
  d'éléments cochés / total, utilisée pour les barres de progression,
  l'anneau global et la heatmap.

### 5.4 Routeur (hash-based)

```
#/                                     Accueil
#/programme[/<numéroSemaine>]          Vue d'une semaine (1 à 5)
#/jour/<weekId>/<dayIndex>             Détail d'un jour (0=Lundi … 6=Dimanche)
#/exercice/<weekId>/<dayIndex>/<blockKey>/<idx>   Fiche d'un exercice
#/bibliotheque[/<exerciceEncodé>]      Bibliothèque d'exercices (liste ou fiche)
#/documents                            Accès au PDF officiel
#/aide                                 Page d'aide
#/progression                          Vue d'ensemble de la progression
#/compte                               Connexion / déconnexion cloud
```

`render()` lit `location.hash` via `parseRoute()`, appelle la fonction de
rendu correspondante, puis met à jour la barre de navigation basse
(`renderBottomNav`). Chaque changement de `location.hash` déclenche un
nouveau rendu complet (`window.addEventListener("hashchange", render)`).

### 5.5 Pages / fonctions de rendu

| Fonction | Route | Rôle |
|---|---|---|
| `renderHome` | `/` | Accueil : intro, objectifs, accès rapides, règles d'or, sélecteur de catégorie, mot de fin, bascule de thème |
| `renderProgramme` | `/programme` | Onglets de semaine (S1-S5), carte d'en-tête (objectif + mot du staff), liste des 7 jours, défi éventuel |
| `renderJour` | `/jour/:w/:d` | Détail d'une séance : objectif, RPE, durée, liste d'exercices cochables, bouton "réinitialiser ce jour" |
| `renderExercice` | `/exercice/:w/:d/:b/:i` | Fiche d'un exercice : consigne par catégorie, description technique, lien vidéo, bouton de validation |
| `renderBibliotheque` / `renderBibliothequeItem` | `/bibliotheque` | Liste filtrable par famille + fiche détaillée d'un exercice, avec ses occurrences dans le programme |
| `renderDocuments` | `/documents` | Lien vers le PDF source + sommaire des semaines |
| `renderAide` | `/aide` | Mode d'emploi, catégories, échelle de RPE, règles d'or, crédits |
| `renderProgression` | `/progression` | Anneau de progression globale, points par semaine, heatmap 5×7 |
| `renderCompte` | `/compte` | Connexion/déconnexion à la synchro cloud (formulaire identifiant/mot de passe) |

Toutes ces fonctions génèrent du HTML via des template strings
(`innerHTML`), avec échappement systématique du texte dynamique
(`escapeHtml`).

### 5.6 Icônes

Un dictionnaire `ICONS` contient des paths SVG inline (pas de librairie
d'icônes externe), rendus via la fonction `icon(name, size)`.

---

## 6. Données du programme — `assets/data.js`

Fichier de **données pures** (constantes globales, pas de logique de
rendu), chargé avant `app.js`.

### 6.1 `CATEGORIES`

3 entrées (`u1315`, `u18`, `nm3`), chacune avec : `label`, `sub`, `color`
(couleur d'accent), `tagline`, `freq` (fréquence hebdo), `rpe` (plage
cible), `bullets` (points clés).

### 6.2 `VIDEOS`

Dictionnaire `{ "Nom d'exercice": "URL YouTube" }`, réutilisé pour éviter
la répétition de liens. Le helper `ex(nom, u1315, u18, nm3, videoKey)`
construit une ligne d'exercice en résolvant automatiquement sa vidéo.

### 6.3 `WEEK1` … `WEEK5` → `WEEKS`

Chaque semaine a la forme :

```js
{
  id: 1,
  title: "SEMAINE 1 — LES FONDATIONS",
  objectif: "…",
  staffQuote: "…",
  schedule: [ { day: "Lundi", u1315: "F1", u18: "F1", nm3: "F1" }, … ],  // 7 entrées
  defi: null | { title, items: [...] },
  modules: {
    F1: {
      title: "Force bas du corps",
      type: "exercises" | "checklist" | "cardio",
      objectif, rpe: { u1315, u18, nm3 },
      echauffement: [...],
      exercises: [ ex("Goblet Squat", "3 X 10", "4 X 8", "/"), … ]
    },
    …
  }
}
```

`WEEKS = [WEEK1, WEEK2, WEEK3, WEEK4, WEEK5]`.

### 6.4 Contenu éditorial

- `GOLDEN_RULES` : 3 règles d'or (sommeil, hydratation, ne pas rattraper)
- `INTRO` : texte d'accueil (accroche, saison, objectifs de la préparation)
- `OUTRO` : mot de fin
- `CHEVALIER_QUOTE` : citation affichée en page d'accueil
- `PDF_PATH` : chemin relatif vers le PDF source

### 6.5 Bibliothèque d'exercices

- `FAMILIES` : 5 familles (`legs`, `upper`, `core`, `speed`, `mobility`)
  avec label et icône associée.
- `EXERCISE_LIBRARY` : liste ordonnée de fiches `{ key, match: [...],
  family, desc }` — `match` contient les motifs de texte (normalisés,
  sans accents) utilisés pour rattacher un nom d'exercice du programme à
  sa fiche technique.
- `getExerciseInfo(nom)` : normalise le nom d'exercice et cherche la
  première fiche dont un des `match` est inclus dedans (ordre important :
  entrées spécifiques avant les génériques, ex. "Bulgarian Split Squat"
  avant "Split Squat").

---

## 7. Synchronisation cloud

### 7.1 `assets/supabase-config.js`

Constantes publiques `SUPABASE_URL` et `SUPABASE_ANON_KEY` (clé *anon*,
volontairement exposée côté client — la sécurité réelle est déléguée aux
fonctions SQL `SECURITY DEFINER` côté serveur).

### 7.2 `assets/cloud.js` — module `TMBCloud`

API exposée sur `window.TMBCloud` :

| Fonction | Rôle |
|---|---|
| `available()` | Vrai si le SDK Supabase est chargé et la config présente |
| `getSession()` / `setSession()` / `clearSession()` | Gestion de la session locale (`localStorage`, clé `tmb_summerbook_session`) — stocke **identifiant + mot de passe en clair côté client** (nécessaire car chaque appel RPC revérifie le mot de passe côté serveur) |
| `login(username, password)` | Appelle la fonction RPC `tmb_login_or_signup` ; crée le compte s'il n'existe pas |
| `saveState(category, weekIndex, theme, progress)` | Appelle la fonction RPC `tmb_save_state` pour pousser l'état courant |

### 7.3 `supabase/schema.sql`

- Table `public.tmb_players` (préfixe `tmb_` car l'instance Supabase est
  partagée entre plusieurs projets) : `id`, `username` (unique),
  `password_hash` (hashé via `pgcrypto`/`crypt`), `category`,
  `week_index`, `theme`, `progress` (`jsonb`), timestamps.
- **RLS activée, sans aucune policy** : la table est totalement fermée en
  accès direct (`anon`/`authenticated` n'ont aucun droit dessus).
- Deux fonctions `SECURITY DEFINER` exposées via RPC (PostgREST) :
  - `tmb_login_or_signup(p_username, p_password)` : crée le joueur au
    premier login, sinon vérifie le mot de passe (`crypt`) et retourne
    l'état sauvegardé.
  - `tmb_save_state(p_username, p_password, p_category, p_week_index,
    p_theme, p_progress)` : revérifie le mot de passe puis met à jour
    l'état.
- Ce n'est **pas** Supabase Auth : c'est un système de compte "maison"
  minimaliste (identifiant + mot de passe), pensé pour un usage simple par
  de jeunes joueurs sur plusieurs appareils.

### 7.4 Flux de synchronisation

1. Au chargement, l'app rend d'abord la version locale (`localStorage`),
   sans attendre le réseau.
2. Si une session cloud existe, `TMBCloud.login()` est rappelé en
   arrière-plan pour rapatrier l'état distant et ré-appliquer/re-render si
   nécessaire.
3. À chaque `save()` local, un push cloud est planifié (debounce 800 ms)
   si une session est active.
4. Aucune synchronisation temps réel entre appareils (pas d'abonnement
   realtime) : le dernier `save()` gagne.

---

## 8. Design system — `assets/style.css`

Fichier CSS unique (815 lignes), organisé en sections commentées :

```
:root { ... }                       Variables de thème clair (couleurs, espacements)
:root[data-theme="dark"] { ... }    Surcharge des variables en thème sombre
Top bar
Form fields (compte)
Page wrapper
Hero (Accueil)
Quick nav cards (Accueil)
Golden rules
Category cards
Overview / Progression
Week tabs
Week header card
Day cards (Programme -> spacious list)
Day detail page
Défi card
Exercise detail page
Bibliothèque
Documents (PDF)
Aide
Outro
Reset all
Theme toggle
DESCODES footer
Bottom nav
Family colors
Misc
```

Le thème repose sur des **variables CSS** (`--red`, `--navy`, `--border`,
etc.) redéfinies sous `[data-theme="dark"]`, ce qui permet de basculer
clair/sombre sans dupliquer les règles.

---

## 9. Assets statiques

- `assets/logo.svg` : blason du club (TMB), utilisé dans la topbar.
- `ressources/Summer book TMB 2K26_2K27 - Summer book TMB 2K262K27.pdf` :
  document source officiel, servi tel quel via la page "Documents".

---

## 10. Modèle de persistance (récapitulatif)

| Clé `localStorage` | Contenu |
|---|---|
| `tmb_summerbook_v2` | `{ category, weekIndex, theme, progress }` — état complet de l'app |
| `tmb_summerbook_session` | `{ username, password }` — session cloud (si connecté) |

Aucun cookie, aucun tracking, aucune donnée envoyée à un tiers en dehors
de l'instance Supabase self-hébergée du club (et seulement si l'utilisateur
choisit de se connecter).

---

## 11. Lancer le projet en local

Aucune installation ni build nécessaire.

```bash
# Option 1 : ouvrir directement
open index.html      # ou double-clic dans l'explorateur de fichiers

# Option 2 : servir en local (recommandé, évite les restrictions CORS/file://)
npx serve .
```

---

## 12. Points d'attention avant refonte

Éléments à garder en tête pour la restructuration à venir :

- **Couplage fort** entre `data.js` et `app.js` : les codes de module
  (`F1`, `C1`, `@Repos`…) et la structure `{ echauffement, exercises,
  rpe, … }` sont interprétés "à la main" par `resolveDay`/`getBlocks`. Toute
  évolution du modèle de données doit rester synchronisée avec ce
  résolveur.
- **Clés de progression positionnelles** : `blockKey` encode
  `weekId_dayIndex_catégorie_blockKey`. Si l'ordre ou les identifiants de
  semaines/jours/modules changent, les progressions déjà sauvegardées
  (local et cloud) risquent de ne plus correspondre.
- **Mot de passe stocké en clair côté client** (`localStorage`) pour
  permettre la revérification côté serveur à chaque appel — acceptable
  pour l'usage actuel (mineurs, mot de passe simple) mais à reconsidérer
  si le système de compte évolue.
- **Aucun test automatisé, aucun linter, aucun bundler** : tout changement
  de structure doit être vérifié manuellement dans le navigateur.
- **Un seul fichier CSS et un seul fichier JS de logique** (899 et 815
  lignes) : forte concentration de la logique, à éclater si la
  restructuration introduit une architecture par composants.

---

Site réalisé par [DESCODES](https://descodes.com)
