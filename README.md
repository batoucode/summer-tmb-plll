# TMB — Summer Book 2026-2027

Application web (statique, sans dépendance) de suivi de la préparation physique
estivale du TMB : programme complet sur 5 semaines pour les catégories
U13/U15, U18 et NM3, transcrit depuis le Summer Book officiel du club.

## Fonctionnalités

- Sélection de catégorie (U13/U15, U18, NM3) avec séances adaptées
- 5 semaines détaillées : objectifs, mot du staff, échauffements, RPE,
  exercices avec séries/répétitions, vidéos de démonstration
- Suivi de progression par jour/semaine (cases à cocher), sauvegardé en local
  (`localStorage`, aucune donnée envoyée à un serveur)
- Vue d'ensemble du programme : anneau de progression, mini-calendrier des
  semaines, heatmap de régularité
- Défis basket bonus (semaines 3 et 4)
- Rappels des règles d'or (sommeil, hydratation, ne pas rattraper une séance)

## Lancer en local

Aucune installation nécessaire — ouvrir `index.html` dans un navigateur, ou
servir le dossier avec un serveur statique quelconque, par ex. :

```bash
npx serve .
```

## Structure

```
index.html          Structure de la page
assets/style.css     Design system (thème sombre / rouge)
assets/data.js       Données du programme (5 semaines x 3 catégories)
assets/app.js        Logique de l'application (rendu + progression)
ressources/          Document source (PDF officiel)
```

---

Site réalisé par [DESCODES](https://descodes.com)
