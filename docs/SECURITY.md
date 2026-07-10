# Sécurité — TMB Summer Book

> Modèle de confiance, limites connues, et pointeur vers les tests de
> sécurité automatisés (`security/`). Pour l'architecture générale du
> code, voir `docs/ARCHITECTURE.md`.

---

## 1. Frontière de confiance : la clé anon est publique par design

`assets/supabase-config.js` contient une **clé anon**, volontairement
visible dans le code source livré au navigateur — n'importe qui peut la
lire. Ce n'est pas une fuite : c'est le fonctionnement normal de
Supabase. La sécurité réelle n'est **jamais** assurée côté client, elle
est **100% appliquée par PostgreSQL** via Row Level Security (RLS),
définie dans `supabase/schema.sql`. Toute requête, qu'elle vienne de
l'app officielle ou d'un `curl` fait à la main avec la clé anon, passe
par les mêmes policies.

La clé `service_role` (accès total, contourne RLS) **n'apparaît nulle
part dans ce dépôt** et ne doit jamais y être ajoutée.

---

## 2. Modèle RLS — qui peut lire/écrire quoi

| Table | Lecture | Écriture |
|---|---|---|
| `tmb_categories` | Tout le monde, y compris non connecté (`tmb_categories_select`, `to anon, authenticated`) | Admin uniquement (`tmb_categories_write`) |
| `tmb_profiles` | Soi-même, un admin (tout), un coach (les joueurs de sa catégorie) (`tmb_profiles_select`) | Soi-même ou un admin (`tmb_profiles_update`) ; suppression admin uniquement (`tmb_profiles_delete`) ; **pas d'insertion cliente** (créé uniquement par le trigger au signup) |
| `tmb_training_plans` | Tout utilisateur connecté (`tmb_plans_select`) | Admin (toutes catégories) ou coach (sa seule catégorie) (`tmb_plans_write`) |
| `tmb_training_days` | Tout utilisateur connecté (`tmb_days_select`) | Admin ou coach de la catégorie du plan parent (`tmb_days_write`) |
| `tmb_exercises` | Tout utilisateur connecté (`tmb_exercises_select`) | Admin ou coach de la catégorie du jour parent (`tmb_exercises_write`) |
| `tmb_player_validations` | Soi-même, un admin, un coach de la catégorie concernée (`tmb_validations_select`) | Soi-même (ses propres validations) ou un admin (`tmb_validations_write`) |

Toutes les autres policies utilisent `to authenticated` : un utilisateur
non connecté (`anon`) n'a accès à rien d'autre, y compris en lecture.
Seule exception : `tmb_categories` est aussi lisible par `anon`, car
l'écran d'inscription (`assets/js/30-view-auth.js`) affiche le choix de
catégorie **avant** connexion. Deux fonctions `SECURITY DEFINER`
supplémentaires sont exposées à `anon` pour le même besoin (connexion
par identifiant plutôt que par email, voir §7) :
`tmb_email_for_username(text)` (retourne l'email correspondant à un
identifiant, ou `null` — jamais utilisée pour lister les profils) et
`tmb_username_available(text)` (booléen, pour la vérification de
disponibilité à l'inscription).

---

## 3. Garde-fou anti auto-promotion

Un trigger `tmb_guard_profile_update` (avant chaque `UPDATE` sur
`tmb_profiles`) **réécrit silencieusement** `role` à son ancienne valeur
si l'auteur de la requête n'est pas admin. Concrètement : un joueur qui
tente `UPDATE tmb_profiles SET role = 'admin' WHERE id = auth.uid()` via
l'API REST directement (en contournant l'interface) voit sa requête
"réussir" (pas d'erreur) mais son rôle reste inchangé en base — c'est un
choix délibéré (échec silencieux côté trigger plutôt que rejet, pour
rester simple), testé par `security/05-role-selfescalation-blocked.js`.

`assigned_category_id` n'est **pas** verrouillé par ce trigger : chacun
peut changer sa propre catégorie depuis l'écran Profil
(`assets/js/80-view-settings.js`) — c'est volontaire, la catégorie est
un critère de visibilité de contenu, pas une frontière de sécurité au
même titre que le rôle.

Le tout premier compte créé sur une instance vierge devient admin
automatiquement (`tmb_handle_new_user`, voir `supabase/schema.sql`) —
c'est le seul moyen de bootstrapper un admin sans clé `service_role`.
**Conséquence pratique** : sur une instance déjà initialisée, ne jamais
vider la table `tmb_profiles` sans y penser, sous peine qu'un compte
quelconque devienne admin au prochain signup.

---

## 4. Limites connues (assumées, pas des bugs)

- **Pas de vrai email d'invitation.** Le bouton *Ajouter un compte* de
  l'espace Admin (`assets/js/50-view-admin.js`) crée directement le
  compte avec un mot de passe temporaire à communiquer manuellement. Un
  vrai envoi d'email d'invitation nécessite l'API Admin de Supabase
  Auth (clé `service_role`), impossible à exposer dans une app statique
  sans backend. Une Edge Function dédiée serait l'étape suivante si ce
  besoin devient prioritaire.
- **Suppression de compte partielle.** Le bouton *Supprimer* dans
  l'espace Admin supprime le profil applicatif (`tmb_profiles`, cascade
  sur les validations) mais pas le compte `auth.users` sous-jacent :
  ça nécessite aussi la clé `service_role` (tableau de bord Supabase ou
  Edge Function).
- **`adminCreateAccount` utilise un client Supabase jetable**
  (`assets/js/10-auth.js`, session non persistée) pour que la création
  d'un compte par l'admin ne remplace pas sa propre session — c'est une
  contournement du comportement par défaut de `supabase-js`
  (`auth.signUp()` connecte automatiquement l'appelant sur le nouveau
  compte), pas une faille, mais bon à savoir si ce code est modifié.
- **`video_url` n'est pas validé côté schéma.** Un coach/admin peut
  écrire n'importe quelle chaîne dans `tmb_exercises.video_url`,
  injectée telle quelle dans un `<a href>` (`assets/js/70-view-training.js`).
  Risque faible (seuls admin/coach peuvent l'écrire, protégés par RLS),
  mais en défense en profondeur, un futur renforcement pourrait
  restreindre les schémas acceptés (`https://` uniquement) côté
  formulaire de l'éditeur.
- **U13 et U15 partagent le même contenu par défaut** dans
  `assets/default_program.json`, faute de distinction dans les données
  sources originales.
- **Pas de réinitialisation du mot de passe d'un autre utilisateur
  depuis l'espace Admin.** L'admin peut éditer identifiant/rôle/
  catégorie d'un compte existant, mais pas son mot de passe : ça
  nécessiterait de manipuler `auth.users` directement (clé
  `service_role`, jamais exposée côté client) — écrire une fonction
  `SECURITY DEFINER` qui modifierait `auth.users.encrypted_password`
  via pgcrypto a été jugé trop risqué (incompatibilité potentielle avec
  le format interne de GoTrue selon les versions de Supabase) pour un
  gain limité. La personne concernée doit changer son propre mot de
  passe via l'écran Profil (`assets/js/80-view-settings.js`), ou
  l'admin passe par le tableau de bord Supabase directement.

---

## 5. Ce qui protège la disponibilité (pas la sécurité au sens strict)

Le mécanisme d'isolation des pannes décrit dans `docs/ARCHITECTURE.md`
§5 (`assets/js/02-error-boundary.js`) évite qu'un bug dans un module
plante toute l'application pour un utilisateur donné. Ce n'est **pas**
un mécanisme de sécurité (il ne protège aucune donnée), juste de
robustesse : à ne pas confondre avec les policies RLS, qui sont la
seule vraie barrière de sécurité de cette app.

---

## 6. Connexion par identifiant plutôt que par email

Supabase Auth reste géré par email en interne (sessions, RLS
`auth.uid()`) — l'app n'a pas remplacé Supabase Auth, elle a juste
ajouté une correspondance identifiant → email en amont :

1. L'utilisateur choisit un **identifiant de connexion** (`username`,
   colonne `tmb_profiles.username`, unique insensible à la casse) à
   l'inscription, au lieu d'un email obligatoire.
2. À la connexion, le client appelle `tmb_email_for_username(username)`
   (fonction `SECURITY DEFINER`, accessible à `anon`) pour récupérer
   l'email associé, puis appelle normalement
   `signInWithPassword({ email, password })`.
3. Si l'identifiant n'existe pas, la fonction retourne `null` et le
   client affiche le même message générique ("Identifiants invalides")
   que pour un mot de passe erroné — pas d'oracle qui distinguerait
   "identifiant inconnu" de "mauvais mot de passe".
4. L'email reste **optionnel** à l'inscription. S'il n'est pas fourni,
   un email technique invisible (`<identifiant>@tmb.local`) est généré
   côté client uniquement pour satisfaire l'exigence interne de
   Supabase Auth — il n'est jamais utilisé pour se connecter et n'a pas
   besoin d'être une adresse valide/joignable.

---

## 7. Tests de sécurité automatisés (`security/`)

Scripts Node autonomes (zéro dépendance, `fetch` natif) qui vérifient
en conditions réelles que les policies RLS ci-dessus tiennent, en
utilisant uniquement la **clé anon** (jamais `service_role`) :

| Script | Vérifie |
|---|---|
| `01-unauth-rejected.js` | Une requête sans session ne retourne aucune donnée |
| `02-player-cannot-read-others-validations.js` | Isolation des validations entre joueurs |
| `03-player-cannot-write-categories-or-plans.js` | Un joueur ne peut pas écrire le programme |
| `04-coach-scope-enforced.js` | Un coach ne peut écrire que dans sa propre catégorie |
| `05-role-selfescalation-blocked.js` | Un non-admin ne peut pas changer son propre rôle |
| `06-no-service-role-key-in-repo.js` | Scan statique : aucune clé `service_role` dans le dépôt |

Voir `security/README.md` pour les prérequis et le mode d'emploi
détaillé. **Ces scripts sont à exécuter par toi, sur ta propre
instance, avec des comptes de test jetables** — jamais depuis ce
dépôt/CI avec de vraies données du club, et jamais avec la clé
`service_role`.
