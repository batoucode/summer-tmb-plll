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
| `tmb_categories` | Tout utilisateur connecté (`tmb_categories_select`) | Admin uniquement (`tmb_categories_write`) |
| `tmb_profiles` | Soi-même, un admin (tout), un coach (les joueurs de sa catégorie) (`tmb_profiles_select`) | Soi-même ou un admin (`tmb_profiles_update`) ; suppression admin uniquement (`tmb_profiles_delete`) ; **pas d'insertion cliente** (créé uniquement par le trigger au signup) |
| `tmb_training_plans` | Tout utilisateur connecté (`tmb_plans_select`) | Admin (toutes catégories) ou coach (sa seule catégorie) (`tmb_plans_write`) |
| `tmb_training_days` | Tout utilisateur connecté (`tmb_days_select`) | Admin ou coach de la catégorie du plan parent (`tmb_days_write`) |
| `tmb_exercises` | Tout utilisateur connecté (`tmb_exercises_select`) | Admin ou coach de la catégorie du jour parent (`tmb_exercises_write`) |
| `tmb_player_validations` | Soi-même, un admin, un coach de la catégorie concernée (`tmb_validations_select`) | Soi-même (ses propres validations) ou un admin (`tmb_validations_write`) |

Toutes les policies utilisent `to authenticated` : un utilisateur non
connecté (`anon`) n'a accès à rien, y compris en lecture.

---

## 3. Garde-fou anti auto-promotion

Un trigger `tmb_guard_profile_update` (avant chaque `UPDATE` sur
`tmb_profiles`) **réécrit silencieusement** `role` et
`assigned_category_id` à leur ancienne valeur si l'auteur de la requête
n'est pas admin. Concrètement : un joueur qui tente `UPDATE tmb_profiles
SET role = 'admin' WHERE id = auth.uid()` via l'API REST directement
(en contournant l'interface) voit sa requête "réussir" (pas d'erreur)
mais son rôle reste inchangé en base — c'est un choix délibéré (échec
silencieux côté trigger plutôt que rejet, pour rester simple), testé
par `security/05-role-selfescalation-blocked.js`.

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
  injectée telle quelle dans un `<a href>` (`assets/js/70-view-player.js`).
  Risque faible (seuls admin/coach peuvent l'écrire, protégés par RLS),
  mais en défense en profondeur, un futur renforcement pourrait
  restreindre les schémas acceptés (`https://` uniquement) côté
  formulaire de l'éditeur.
- **U13 et U15 partagent le même contenu par défaut** dans
  `assets/default_program.json`, faute de distinction dans les données
  sources originales.

---

## 5. Ce qui protège la disponibilité (pas la sécurité au sens strict)

Le mécanisme d'isolation des pannes décrit dans `docs/ARCHITECTURE.md`
§5 (`assets/js/02-error-boundary.js`) évite qu'un bug dans un module
plante toute l'application pour un utilisateur donné. Ce n'est **pas**
un mécanisme de sécurité (il ne protège aucune donnée), juste de
robustesse : à ne pas confondre avec les policies RLS, qui sont la
seule vraie barrière de sécurité de cette app.

---

## 6. Tests de sécurité automatisés (`security/`)

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
