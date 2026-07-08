# 🏀 TMB Summer Book — 2026-2027

L'application de suivi de la préparation physique estivale du **TMB
(Tours Métropole Basket)**. Ce document explique ce qu'elle fait et
comment elle est organisée, en langage simple — pas besoin d'être
développeur pour le lire.

**Dépôt** : `https://github.com/batoucode/summer-tmb-plll`

---

## 1. C'est quoi, cette appli ?

Chaque été, le club distribue un programme de préparation physique sur
5 semaines pour préparer la reprise. Cette application transforme ce
programme papier en site web interactif :

- Chaque joueur voit **son** programme, semaine par semaine, jour par
  jour, avec des vidéos de démonstration pour les exercices.
- Il coche ce qu'il a fait — exercice par exercice, ou toute une séance
  d'un coup — et voit sa progression en temps réel.
- Les coachs peuvent modifier le programme de leur catégorie
  directement depuis l'app (plus besoin de refaire un PDF).
- Un administrateur gère les comptes (qui est coach, de quelle
  catégorie, etc.) et peut modifier le programme de tout le monde.

C'est un simple site web (pas d'application à installer) : ça marche
dans le navigateur, sur téléphone comme sur ordinateur.

---

## 2. Qui fait quoi ?

L'app a 3 types de comptes :

| Compte | Ce qu'il peut faire |
|---|---|
| 🧑‍💼 **Admin** | Voit et gère tout : les comptes des joueurs/coachs, et le programme de **toutes** les catégories |
| 🧑‍🏫 **Coach** | Modifie le programme de **sa seule** catégorie (objectif de la semaine, échauffement, exercices) |
| 🏀 **Joueur** | Voit le programme de sa catégorie, coche ses séances, suit sa progression |

La **catégorie** (U13, U15, U18 ou NM3) d'un joueur est calculée
automatiquement à partir de sa date de naissance, à son inscription.

---

## 3. Comment ça marche, pas à pas

1. **On s'inscrit** : email, mot de passe, prénom, nom, date de
   naissance. Un compte "Joueur" est créé automatiquement, avec la
   bonne catégorie.
2. **On se connecte** : l'app affiche directement le bon écran selon le
   type de compte (Admin / Coach / Joueur).
3. **L'admin** peut transformer un joueur en coach et lui assigner une
   catégorie, depuis l'onglet *Utilisateurs*.
4. **Le coach** choisit une semaine, puis un jour, remplit les
   informations (objectif, échauffement, liste d'exercices) et clique
   sur *Publier*.
5. **Le joueur** ouvre sa semaine, voit ses 7 jours (avec un pastille
   "Fait" / "À faire" / "Repos" sur chacun), entre dans un jour et
   coche ses exercices — ou valide toute la séance en un seul clic.

Tout est sauvegardé en ligne : la progression suit le joueur, qu'il se
connecte depuis son téléphone ou un ordinateur.

---

## 4. Comment lancer l'appli

Aucune installation nécessaire, c'est un site statique classique.

```bash
npx serve .
# ou, si Python est installé :
python3 -m http.server 8000
```

Puis ouvrir l'adresse affichée dans un navigateur. Il faut simplement
une connexion internet (pour charger la bibliothèque Supabase et parler
à la base de données du club).

**Mettre en place la base de données** (une seule fois, pour une
nouvelle instance) :
1. Ouvrir l'éditeur SQL du tableau de bord Supabase du club.
2. Copier-coller l'intégralité de `supabase/schema.sql` et l'exécuter.
3. Créer un premier compte via l'app — il devient automatiquement
   Admin.
4. Se connecter avec ce compte → onglet *Utilisateurs* → bouton **📥
   Importer le programme par défaut** (charge les 5 semaines depuis
   `assets/default_program.json`).

---

## 5. Essayer des changements de design

Il existe une page dédiée, `design/index.html`, qui affiche **tous les
éléments visuels de l'app d'un coup** (couleurs, boutons, cartes,
onglets...) sans avoir besoin de se connecter. C'est l'endroit pour
tester rapidement un changement de couleur ou d'espacement : les
réglages sont centralisés tout en haut de `assets/style.css`, et
changer une valeur là-bas met à jour aussi bien cette page que l'app
réelle — impossible que les deux se désynchronisent.

---

## 6. Pour aller plus loin (technique)

Ce README reste volontairement simple. Pour le détail technique :

- **`docs/ARCHITECTURE.md`** — comment le code est organisé en modules,
  pourquoi, et comment un bug dans un module n'en casse pas un autre.
  (Export Word : `docs/ARCHITECTURE.docx`.)
- **`docs/SECURITY.md`** — comment les données sont protégées, ce que
  chaque type de compte peut/ne peut pas faire, limites connues.
  (Export Word : `docs/SECURITY.docx`.)
- **`supabase/schema.sql`** — le schéma complet de la base de données
  (tables, règles de sécurité, automatisations).
- **`security/README.md`** — comment lancer les tests qui vérifient que
  les règles de sécurité tiennent vraiment.

### Stack technique en un coup d'œil

| Aspect | Détail |
|---|---|
| Frontend | HTML/CSS/JavaScript, aucun framework, aucune étape de build |
| Authentification | Supabase Auth (email + mot de passe) |
| Base de données | Supabase Postgres, avec des règles de sécurité au niveau de chaque ligne (RLS) |
| Hébergement | Site statique — n'importe quel serveur de fichiers convient |

---

## 7. Limites connues

- Pas de vrai email d'invitation automatique (l'admin communique un mot
  de passe temporaire à la main).
- Supprimer un compte depuis l'app ne supprime que son profil, pas son
  accès de connexion (nécessite une action côté tableau de bord
  Supabase).
- Les catégories U13 et U15 partagent le même programme par défaut.

Détails complets dans `docs/SECURITY.md`.

---

## 8. Arborescence

```
index.html                     Page d'entrée (charge les modules dans le bon ordre)
assets/
  js/                          Les 14 modules de l'app (voir docs/ARCHITECTURE.md)
  style.css                    Design (couleurs, espacements... tout centralisé en haut)
  supabase-config.js           Adresse + clé publique de la base de données
  default_program.json         Programme par défaut (5 semaines × 4 catégories)
design/
  index.html                  Catalogue visuel, sans connexion requise (voir §5)
docs/
  ARCHITECTURE.md / .docx      Documentation technique du découpage en modules
  SECURITY.md / .docx          Documentation sécurité
security/
  *.js                        Tests automatisés des règles de sécurité
tests/e2e/
  *.spec.js                   Tests automatisés de non-régression (Playwright)
supabase/
  schema.sql                   Toute la base de données en un seul fichier
legacy/
  app.monolithic.js, data.js, cloud.js   Anciennes versions, conservées en référence
```

---

Site réalisé par [DESCODES](https://descodes.com)
