# `security/` — tests des règles de sécurité (RLS)

Scripts Node autonomes qui vérifient, **en conditions réelles contre ta
propre instance Supabase**, que les policies RLS de
`supabase/schema.sql` font bien ce qu'elles sont censées faire. Zéro
dépendance à installer (`fetch` natif, Node 18+), utilisent uniquement
la **clé anon** — jamais la clé `service_role`.

> ⚠️ **Ne jamais lancer ces scripts contre les vraies données du club**
> avec des comptes réels. Certains créent des lignes de test (nettoyées
> automatiquement à la fin, y compris en cas d'échec). Utilise des
> comptes jetables dédiés, idéalement dans une catégorie de test
> séparée.

---

## 1. Préparer les comptes de test

Avant de lancer quoi que ce soit, crée **une seule fois**, via l'app
elle-même (formulaire d'inscription + espace Admin) :

1. Une catégorie dédiée, par exemple `TMB_SECURITY_TEST` (peut se faire
   en réimportant/éditant le programme, ou en laissant une catégorie
   existante peu utilisée — l'important est qu'elle soit isolée du
   programme réel du club).
2. **Deux comptes joueurs jetables** ("Player A" et "Player B"),
   inscrits normalement, avec une date de naissance qui les fait tomber
   dans une catégorie quelconque (peu importe laquelle pour ces tests,
   sauf mention contraire).
3. **Un compte coach jetable**, promu "coach" par un admin et assigné à
   la catégorie `TMB_SECURITY_TEST` (pour le script `04`).
4. S'assurer qu'au moins une catégorie et un exercice existent en base
   (importer le programme par défaut depuis l'espace Admin si ce n'est
   pas déjà fait).

## 2. Variables d'environnement

```bash
export SUPABASE_URL="https://sb.batoucode.ovh"
export SUPABASE_ANON_KEY="eyJ..."                 # clé anon, publique par design

export TEST_PLAYER_A_EMAIL="playerA-test@example.com"
export TEST_PLAYER_A_PASSWORD="..."
export TEST_PLAYER_B_EMAIL="playerB-test@example.com"
export TEST_PLAYER_B_PASSWORD="..."

export TEST_COACH_EMAIL="coach-test@example.com"
export TEST_COACH_PASSWORD="..."
```

Chaque script indique clairement, en échouant, la ou les variables
manquantes — pas besoin de toutes les définir pour lancer un seul
script en particulier (`01` et `06` ne demandent que
`SUPABASE_URL`/`SUPABASE_ANON_KEY`).

## 3. Lancer les tests

```bash
# Un seul script :
node security/01-unauth-rejected.js

# Tous, dans l'ordre, avec un résumé à la fin :
node security/run-all.js
```

## 4. Lire les résultats

- `✅ PASS: ...` — la règle de sécurité tient.
- `❌ FAIL: ...` — **une règle ne tient pas**, à corriger en priorité
  (regarder la policy RLS correspondante dans `supabase/schema.sql`,
  voir la table de correspondance dans `docs/SECURITY.md` §2). Le
  script sort avec un code non-zéro.
- `⚠️  SKIP: ...` — le test n'a pas pu s'exécuter (compte de test mal
  configuré, base vide...) ; ce n'est ni un succès ni un échec, juste
  une indication qu'il faut vérifier la préparation (§1).

## 5. Détail des scripts

| Script | Vérifie | Réseau ? |
|---|---|---|
| `01-unauth-rejected.js` | Une requête sans session ne retourne aucune donnée | Oui (lecture seule) |
| `02-player-cannot-read-others-validations.js` | Isolation des validations entre joueurs | Oui (crée puis supprime 1 ligne de test) |
| `03-player-cannot-write-categories-or-plans.js` | Un joueur ne peut pas écrire le programme | Oui (tentatives d'écriture, nettoyées si elles réussissent par erreur) |
| `04-coach-scope-enforced.js` | Un coach ne peut écrire que dans sa propre catégorie | Oui (idem) |
| `05-role-selfescalation-blocked.js` | Un non-admin ne peut pas changer son propre rôle | Oui (une tentative, annulée si elle réussissait) |
| `06-no-service-role-key-in-repo.js` | Aucune clé `service_role` ni JWT inattendu dans le dépôt | Non — scan de fichiers local uniquement, toujours sans risque |

`lib/env.js` et `lib/rest-client.js` sont des utilitaires internes
partagés (chargeur de variables d'environnement, client HTTP minimal
vers l'API REST + Auth de Supabase), pas des scripts à lancer
directement.
