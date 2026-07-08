/* ============================================================
   TMB SUMMER BOOK — DONNÉES DU PROGRAMME
   Transcrit fidèlement depuis le PDF officiel (saison 2026-2027)
   ============================================================ */

const CATEGORIES = [
  {
    key: "u1315",
    label: "U13 / U15",
    sub: "Région",
    color: "#e63946",
    tagline: "Construire les fondamentaux",
    freq: "3 séances / semaine",
    rpe: "5-6",
    bullets: [
      "Priorité à la qualité technique",
      "Poids du corps, élastiques, médecine-ball",
      "Peu de volume"
    ]
  },
  {
    key: "u18",
    label: "U18",
    sub: "Région / Élite",
    color: "#f2f2f2",
    tagline: "Développer la performance",
    freq: "4 séances / semaine",
    rpe: "6-8",
    bullets: [
      "Introduction à la force",
      "Début des charges libres"
    ]
  },
  {
    key: "nm3",
    label: "NM3",
    sub: "",
    color: "#3d8bfd",
    tagline: "Optimiser la performance",
    freq: "4 à 5 séances / semaine",
    rpe: "7-9",
    bullets: [
      "Force, puissance, vitesse",
      "Travail individualisé"
    ]
  }
];

/* Lien vidéo par nom d'exercice (normalisé) — évite la répétition */
const VIDEOS = {
  "Goblet Squat": "https://www.youtube.com/watch?v=6eR6DOdngjM",
  "Back Squat": "https://www.youtube.com/watch?v=B0Pki58hb50",
  "Split Squat": "https://www.youtube.com/shorts/YuLqw3kHPaw",
  "Hip Thrust": "https://www.youtube.com/watch?v=289C8n562vs",
  "Nordic": "https://www.youtube.com/watch?v=EC8eS5Pbns4",
  "Pompes": "https://www.youtube.com/watch?v=XQdj_HuN-D0",
  "Rowing Elastique": "https://www.youtube.com/shorts/ahutQTzOzII",
  "Rowing Haltères": "https://www.youtube.com/shorts/CugbMZRgk3w",
  "Rowing Barre": "https://www.youtube.com/shorts/TvwHyC9GOKE",
  "Développé Elastique": "https://www.youtube.com/watch?v=dBBodoI2ebM",
  "Développé Haltères": "https://www.youtube.com/shorts/TitY7SLFImE",
  "Développé Couché": "https://www.youtube.com/shorts/Hherlvp8WiI",
  "Tirage Elastique": "https://www.youtube.com/shorts/aGiPQLgPDa0",
  "Tirage Poulie": "https://www.youtube.com/shorts/UfezxRrKbUI",
  "Pallof Press": "https://www.youtube.com/shorts/vMv5vcJ3nAU",
  "Changements de direction": "https://www.youtube.com/shorts/y5TvWG9cF44",
  "Squat Jump": "https://www.youtube.com/shorts/36vnWAkL7ZQ",
  "Bondissements": "https://www.youtube.com/watch?v=nI8n1CQMX7Y",
  "Copenhagen léger": "https://www.youtube.com/shorts/6XDqX6pFelI",
  "Bulgarian Split Squat": "https://www.youtube.com/shorts/nlI7MQwLNwo",
  "Mollets": "https://www.youtube.com/shorts/C_uIUaBw-I0",
  "Tibialis Raise": "https://www.youtube.com/watch?v=VzIcGAgBiaM",
  "Planche latérale": "https://www.youtube.com/shorts/eZQRj1yG-gY",
  "Sauts horizontaux": "https://www.youtube.com/watch?v=U-xSivW_19Q",
  "Lancer médecine ball": "https://www.youtube.com/shorts/BYVMYgG5SSc",
  "Sauts latéraux": "https://www.youtube.com/shorts/vbtiAAMjX6Y"
};

/* Petit helper pour construire une ligne d'exercice avec vidéo auto-liée */
function ex(nom, u1315, u18, nm3, videoKey) {
  return { nom, u1315, u18, nm3, video: VIDEOS[videoKey || nom] || null };
}

/* ============================================================
   SEMAINE 1 — LES FONDATIONS
   ============================================================ */
const WEEK1 = {
  id: 1,
  title: "SEMAINE 1 — LES FONDATIONS",
  objectif: "Reprendre progressivement un rythme d'entraînement, retrouver de bonnes sensations et préparer le corps aux semaines suivantes.",
  staffQuote: "La qualité d'exécution est plus importante que la quantité. On construit les bases de la saison.",
  schedule: [
    { day: "Lundi", u1315: "F1", u18: "F1", nm3: "F1" },
    { day: "Mardi", u1315: "C1", u18: "C1", nm3: "C1" },
    { day: "Mercredi", u1315: "@Repos", u18: "M1", nm3: "M1" },
    { day: "Jeudi", u1315: "F2", u18: "F2", nm3: "F2" },
    { day: "Vendredi", u1315: "V1", u18: "V1", nm3: "V1" },
    { day: "Samedi", u1315: "@Repos", u18: "@Récupération active", nm3: "C2" },
    { day: "Dimanche", u1315: "@Repos", u18: "@Repos", nm3: "@Repos" }
  ],
  defi: null,
  modules: {
    F1: {
      title: "Force bas du corps",
      type: "exercises",
      objectif: "Développer les fondamentaux de force et améliorer la stabilité des membres inférieurs.",
      echauffement: ["Course légère 3'", "Montées de genoux", "Talons-fesses", "Ouverture de hanches", "Squats", "Fentes", "Gainage dynamique"],
      rpe: { u1315: "5/10", u18: "6/10", nm3: "7/10" },
      exercises: [
        ex("Goblet Squat", "3 X 10", "4 X 8", "/"),
        ex("Back Squat", "/", "/", "4 X 6"),
        ex("Split Squat", "2 X 10", "3 X 8", "3 X 8"),
        ex("Hip Thrust", "2 X 12", "3 X 10", "4 X 8"),
        ex("Nordic", "2 X 5 (assisté)", "3 X 5", "4 X 6"),
        ex("Gainage", "2 X 30 sec", "3 X 40 sec", "3 X 60 sec")
      ]
    },
    C1: {
      title: "Développement aérobie",
      type: "cardio",
      objectif: "Construire une base cardio sans générer de fatigue importante.",
      note: "Possibilités : footing / vélo / natation / rameur. Pour la catégorie U13/U15, il est possible de modifier le footing continu en intervalles ludiques (10 X 1 min de course + 1 min de marche + 1 min cordes à sauter).",
      durations: { u1315: "25 min", u18: "35 min", nm3: "45 min" }
    },
    C2: {
      title: "Conditionnement",
      subtitle: "NM3 uniquement",
      type: "cardio",
      objectif: "Construire une base cardio sans générer de fatigue importante.",
      options: {
        nm3: ["10 X 100 à 75% avec 30 secondes de récup.", "12 X 30 secondes de courses à 50% avec 30 secondes de récup."]
      }
    },
    F2: {
      title: "Force haut du corps",
      type: "exercises",
      objectif: "Développer la stabilité des épaules et la force du haut du corps.",
      exercises: [
        ex("Pompes", "3 X 8", "4 X 10", "4 X 12"),
        ex("Rowing", "Elastique", "Haltères", "Barre", "Rowing Elastique"),
        ex("Développé", "Elastique", "Haltères", "Couché", "Développé Elastique"),
        ex("Tirage", "Elastique", "Poulie", "Tractions", "Tirage Elastique"),
        ex("Pallof Press", "2 X 10", "3 X 10", "3 X 12")
      ]
    },
    V1: {
      title: "Vitesse / Appuis",
      type: "exercises",
      objectif: "Retrouver de la vitesse sans fatigue excessive.",
      note: "Échauffement complet obligatoire. Repos complet entre les sprints.",
      exercises: [
        ex("Sprint 20 m", "4", "6", "8"),
        ex("Sprint 30 m", "/", "4", "6"),
        ex("Changements de direction", "4", "5", "6"),
        ex("Squat Jump", "2 X 6", "3 X 6", "3 X 8")
      ]
    },
    M1: {
      title: "Mobilités",
      type: "checklist",
      objectif: "À réaliser au minimum une fois dans la semaine.",
      duration: "10 min",
      items: [
        { nom: "Mobilité chevilles" }, { nom: "Mobilité hanches" }, { nom: "Rotation thoracique" },
        { nom: "Étirement des fléchisseurs de hanche" }, { nom: "Mollets" }, { nom: "Ischios" }
      ]
    }
  }
};

/* ============================================================
   SEMAINE 2 — LA DISCIPLINE
   ============================================================ */
const WEEK2 = {
  id: 2,
  title: "SEMAINE 2 — LA DISCIPLINE",
  objectif: "Installer une routine de travail et augmenter progressivement la charge sans dégrader la qualité des mouvements.",
  staffQuote: "La régularité construit les progrès. Cette semaine, on garde la même exigence technique tout en augmentant légèrement le volume.",
  schedule: [
    { day: "Lundi", u1315: "F1", u18: "F1", nm3: "F1" },
    { day: "Mardi", u1315: "C1", u18: "C1", nm3: "C1" },
    { day: "Mercredi", u1315: "@Repos", u18: "M1", nm3: "M1" },
    { day: "Jeudi", u1315: "F2", u18: "F2", nm3: "F2" },
    { day: "Vendredi", u1315: "V1", u18: "V1", nm3: "V1" },
    { day: "Samedi", u1315: "@Repos", u18: "@Mobilité", nm3: "C2" },
    { day: "Dimanche", u1315: "@Repos", u18: "@Repos", nm3: "@Repos" }
  ],
  defi: null,
  modules: {
    F1: {
      title: "Force bas du corps",
      type: "exercises",
      objectif: "Renforcer les membres inférieurs et améliorer le contrôle des appuis.",
      echauffement: ["Course légère 3'", "Mobilité hanches/chevilles", "Squats", "Fentes marchées", "Montées de genoux", "Gainage dynamique"],
      rpe: { u1315: "6/10", u18: "7/10", nm3: "8/10" },
      exercises: [
        ex("Goblet Squat", "3 X 12", "4 X 8", "/"),
        ex("Back Squat", "/", "/", "5 X 6"),
        ex("Split Squat", "3 X 10", "3 X 10", "4 X 8"),
        ex("Hip Thrust", "3 X 12", "4 X 10", "4 X 8"),
        ex("Nordic", "3 X 5 (assisté)", "3 X 6", "4 X 6"),
        ex("Gainage", "3 X 30 sec", "3 X 45 sec", "3 X 60 sec")
      ]
    },
    C1: {
      title: "Développement aérobie",
      type: "cardio",
      objectif: "Améliorer la capacité à maintenir un effort continu.",
      note: "Possibilités : footing / vélo / natation / rameur. Pour la catégorie U13/U15, il est possible de modifier le footing continu en intervalles ludiques (10 X 1 min de course + 1 min de marche + 1 min cordes à sauter).",
      durations: { u1315: "30 min", u18: "40 min", nm3: "50 min" }
    },
    C2: {
      title: "Conditionnement",
      subtitle: "NM3 uniquement",
      type: "cardio",
      objectif: "Construire une base cardio sans générer de fatigue importante.",
      options: {
        nm3: ["12 X 100 à 80% avec 30 secondes de récup.", "14 X 30 secondes de courses à 50% avec 30 secondes de récup.", "6 x 200m à 75% avec 1 min 30 de récupération."]
      }
    },
    F2: {
      title: "Force haut du corps",
      type: "exercises",
      objectif: "Développer la force fonctionnelle du haut du corps.",
      exercises: [
        ex("Pompes", "3 X 10", "4 X 10", "4 X 12"),
        ex("Rowing", "Elastique", "Haltères", "Barre", "Rowing Elastique"),
        ex("Développé", "Elastique", "Haltères", "Couché", "Développé Elastique"),
        ex("Tirage", "Elastique", "Poulie", "Tractions", "Tirage Elastique"),
        ex("Pallof Press", "3 X 10", "3 X 12", "3 X 12")
      ]
    },
    V1: {
      title: "Vitesse / Appuis",
      type: "exercises",
      objectif: "Retrouver de la vitesse sans fatigue excessive.",
      note: "Échauffement complet obligatoire. Repos complet entre les sprints.",
      exercises: [
        ex("Sprint 20 m", "5", "6", "8"),
        ex("Sprint 30 m", "/", "5", "6"),
        ex("Changements de direction", "5", "6", "6"),
        ex("Squat Jump", "3 X 6", "3 X 8", "4 X 8"),
        ex("Bondissements", "/", "2 X 20 m", "3 X 20 m")
      ]
    },
    M1: {
      title: "Mobilités",
      type: "checklist",
      objectif: "À réaliser au minimum une fois dans la semaine.",
      duration: "10 min",
      items: [
        { nom: "Mobilité chevilles" }, { nom: "Mobilité hanches" }, { nom: "Rotation thoracique" },
        { nom: "Étirement des fléchisseurs de hanche" }, { nom: "Mollets" }, { nom: "Ischios-jambiers" },
        { nom: "Copenhagen léger", video: VIDEOS["Copenhagen léger"] }
      ]
    }
  }
};

/* ============================================================
   SEMAINE 3 — L'ENGAGEMENT
   ============================================================ */
const WEEK3 = {
  id: 3,
  title: "SEMAINE 3 — L'ENGAGEMENT",
  objectif: "Développer la force, la vitesse et la capacité à répéter les efforts tout en maintenant une excellente qualité de mouvement.",
  staffQuote: "La progression vient de la régularité. Cette semaine, chacun doit sortir de sa zone de confort, sans jamais sacrifier la technique.",
  schedule: [
    { day: "Lundi", u1315: "F1", u18: "F1", nm3: "F1" },
    { day: "Mardi", u1315: "C1", u18: "C1", nm3: "C1" },
    { day: "Mercredi", u1315: "@Mobilité basique", u18: "M1", nm3: "M1" },
    { day: "Jeudi", u1315: "F2", u18: "F2", nm3: "F2" },
    { day: "Vendredi", u1315: "V1", u18: "V1", nm3: "V1" },
    { day: "Samedi", u1315: "@Repos", u18: "C2", nm3: "C2" },
    { day: "Dimanche", u1315: "@Repos", u18: "@Repos", nm3: "@Repos" }
  ],
  defi: {
    title: "Défi Semaine 3",
    items: [
      "100 lancers francs (sur plusieurs jours)",
      "200 dribbles main faible",
      "5 minutes de travail de coordination avec un ballon"
    ]
  },
  modules: {
    F1: {
      title: "Force bas du corps",
      type: "exercises",
      objectif: "Augmenter la production de force et améliorer la stabilité sur une jambe.",
      echauffement: ["5 min cardio léger", "Mobilité hanches/chevilles", "Activation fessiers", "2 X 10 squats", "2 X 10 fentes marchées"],
      rpe: { u1315: "6/10", u18: "7/10", nm3: "8/10" },
      exercises: [
        ex("Goblet Squat", "4 X 10", "4 X 6 ou 8", "/"),
        ex("Back Squat", "/", "/", "5 X 5"),
        ex("Bulgarian Split Squat", "3 X 8", "3 X 8", "4 X 8"),
        ex("Hip Thrust", "3 X 10", "4 X 8", "4 X 8"),
        ex("Nordic", "3 X 5 (assisté)", "3 X 6", "4 X 6"),
        ex("Mollets", "2 X 15", "3 X 15", "4 X 15"),
        ex("Gainage", "3 X 35 sec", "3 X 45 sec", "3 X 60 sec")
      ]
    },
    C1: {
      title: "Conditionnement",
      type: "cardio",
      objectif: "Développer la capacité à répéter les efforts.",
      durations: { u1315: "8 X 1 min de course / 1 min de récup.", u18: "10 X 1 min de course / 1 min de récup.", nm3: "12 X 1 min de course / 1 min de récup." }
    },
    C2: {
      title: "Conditionnement spécifique",
      subtitle: "U18 + NM3",
      type: "cardio",
      objectif: "Développer la capacité à répéter les efforts.",
      options: {
        u18: ["8 X 150 m à 80% récupération 45 secondes."],
        nm3: ["10 X 150 m à 85% ou 8 X 200 m à 80% récupération 45 secondes.", "15 X 30 secondes récupération 30 secondes."]
      }
    },
    F2: {
      title: "Force haut du corps",
      type: "exercises",
      objectif: "Développer la force fonctionnelle utile au basket.",
      exercises: [
        ex("Pompes", "3 X 12", "4 X 10", "4 X 12 Ou 4 X 8 lestées"),
        ex("Rowing", "Elastique", "Haltères", "Barre", "Rowing Elastique"),
        ex("Développé", "Elastique", "Haltères", "Couché", "Développé Elastique"),
        ex("Tractions/Tirage", "Tirage élastique", "3 X 8", "4 X 8", "Tirage Elastique"),
        ex("Pallof Press", "3 X 12", "3 X 12", "3 X 15"),
        ex("Planche latérale", "2 X 30 sec", "3 X 40 sec", "3 X 60 sec")
      ]
    },
    V1: {
      title: "Vitesse / Appuis",
      type: "exercises",
      objectif: "Développer la vitesse maximale et la qualité des changements de direction.",
      note: "Échauffement complet obligatoire. Récupération 2 min entre les sprints pour privilégier la qualité.",
      exercises: [
        ex("Sprint 10 m", "4", "4", "4"),
        ex("Sprint 20 m", "4", "6", "8"),
        ex("Sprint 30 m", "/", "6", "6"),
        ex("Changements de direction 5-5m", "4", "5", "6"),
        ex("Squat Jump", "3 X 6", "3 X 8", "4 X 8"),
        ex("Bondissements", "2 X 15 m", "3 X 20 m", "4 X 20 m")
      ]
    },
    M1: {
      title: "Mobilités",
      type: "checklist",
      duration: "10-15 min",
      items: [
        { nom: "Mobilité chevilles" }, { nom: "Rotation thoracique" }, { nom: "Ouverture des hanches" },
        { nom: "Étirement des fléchisseurs de hanche" }, { nom: "Mollets 2 X 15" },
        { nom: "Tibialis Raise 2 X 15", video: VIDEOS["Tibialis Raise"] },
        { nom: "Copenhagen léger 2 X 30 sec", video: VIDEOS["Copenhagen léger"] }
      ]
    }
  }
};

/* ============================================================
   SEMAINE 4 — LA MONTÉE EN PUISSANCE
   ============================================================ */
const WEEK4 = {
  id: 4,
  title: "SEMAINE 4 — LA MONTÉE EN PUISSANCE",
  objectif: "Développer les qualités explosives et préparer le corps aux exigences du basket.",
  staffQuote: "La vitesse n'est pas seulement de courir vite. C'est savoir accélérer, freiner et repartir avec maîtrise.",
  schedule: [
    { day: "Lundi", u1315: "F1", u18: "F1", nm3: "F1" },
    { day: "Mardi", u1315: "C1", u18: "C1", nm3: "C1" },
    { day: "Mercredi", u1315: "@Mobilité basique", u18: "M1", nm3: "M1" },
    { day: "Jeudi", u1315: "P1", u18: "P1", nm3: "P1" },
    { day: "Vendredi", u1315: "V1", u18: "V1", nm3: "V1" },
    { day: "Samedi", u1315: "@Repos", u18: "C2", nm3: "C2" },
    { day: "Dimanche", u1315: "@Repos", u18: "@Repos", nm3: "@Repos" }
  ],
  defi: {
    title: "Défi Semaine 4",
    items: [
      "250 tirs (répartis sur la semaine)",
      "50 lancers francs consécutifs en fin de séance",
      "5 minutes de travail de dribble main faible",
      "10 minutes de finition près du cercle"
    ]
  },
  modules: {
    F1: {
      title: "Force bas du corps",
      type: "exercises",
      objectif: "Maintenir les gains de force tout en favorisant la vitesse d'exécution.",
      echauffement: ["5 min cardio léger", "Mobilité hanches/chevilles", "Activation fessiers", "2 accélérations de 15m"],
      rpe: { u1315: "6/10", u18: "7/10", nm3: "8/10" },
      exercises: [
        ex("Goblet Squat", "3 X 10", "3 X 6", "/"),
        ex("Back Squat", "/", "/", "5 X 5"),
        ex("Bulgarian Split Squat", "3 X 8", "3 X 8", "4 X 6"),
        ex("Hip Thrust", "3 X 10", "4 X 8", "4 X 6"),
        ex("Nordic", "3 X 5", "3 X 6", "4 X 6"),
        ex("Mollets", "3 X 15", "3 X 15", "4 X 15"),
        ex("Gainage", "3 X 40 sec", "3 X 50 sec", "3 X 60 sec")
      ]
    },
    C1: {
      title: "Développement aérobie",
      type: "cardio",
      objectif: "Entretenir les qualités cardio sans générer une fatigue excessive.",
      note: "Alternatives : vélo / natation / rameur.",
      durations: { u1315: "30 min de course", u18: "40 min de course", nm3: "45 - 50 min de course" }
    },
    C2: {
      title: "Conditionnement spécifique",
      subtitle: "U18 + NM3",
      type: "cardio",
      objectif: "Entretenir les qualités cardio sans générer une fatigue excessive.",
      options: {
        u18: ["10 X 150 m à 80% récupération 45 secondes.", "12 X 30 secondes récupération 30 secondes."],
        nm3: ["8 X 200 m à 85% récupération 45 secondes.", "15 X 30 secondes récupération 30 secondes.", "10 répétitions de touche ligne (terrain de basket) avec récupération de 45 secondes."]
      }
    },
    P1: {
      title: "Puissance",
      type: "exercises",
      objectif: "Développer la capacité à produire de la force rapidement.",
      note: "Repos de 60 à 90 secondes entre les séries.",
      exercises: [
        ex("Squat Jump", "3 X 6", "3 X 6", "4 X 6"),
        ex("Sauts horizontaux", "3 X 5", "3 X 6", "4 X 6"),
        ex("Bondissements", "2 X 15 m", "3 X 20 m", "4 X 20 m"),
        ex("Lancer médecine ball*", "3 X 6", "3 X 8", "4 X 8", "Lancer médecine ball")
      ]
    },
    V1: {
      title: "Vitesse / Changements de direction",
      type: "exercises",
      objectif: "Être plus rapide sur les premiers appuis.",
      note: "Échauffement complet obligatoire. Récupération complète entre chaque effort.",
      exercises: [
        ex("Sprint 10 m", "4", "4", "4"),
        ex("Sprint 20 m", "4", "6", "8"),
        ex("Sprint 30 m", "/", "6", "6"),
        ex("Changements de direction 5-5m", "4", "5", "6"),
        ex("Squat Jump", "3 X 6", "3 X 8", "4 X 8"),
        ex("Bondissements", "2 X 15 m", "3 X 20 m", "4 X 20 m")
      ]
    },
    M1: {
      title: "Mobilités",
      type: "checklist",
      duration: "10-15 min",
      items: [
        { nom: "Mobilité chevilles" }, { nom: "Rotation thoracique" }, { nom: "Ouverture des hanches" },
        { nom: "Étirement des fléchisseurs de hanche" },
        { nom: "Copenhagen 2 X 30 sec", video: VIDEOS["Copenhagen léger"] },
        { nom: "Tibialis Raise 2 X 15", video: VIDEOS["Tibialis Raise"] },
        { nom: "Mollets 2 X 20" },
        { nom: "Équilibre unipodal 2 X 30 sec (les deux jambes)" }
      ]
    }
  }
};

/* ============================================================
   SEMAINE 5 — PRÊT AU COMBAT
   ============================================================ */
const WEEK5 = {
  id: 5,
  title: "SEMAINE 5 — PRÊT AU COMBAT",
  objectif: "Arriver frais, dynamique et prêt pour la reprise du 10 août.",
  staffQuote: "La préparation est terminée. Cette semaine, on entretient les qualités développées pendant l'été pour arriver avec de bonnes sensations. La fraîcheur est une qualité physique.",
  schedule: [
    { day: "Lundi", u1315: "F1", u18: "F1", nm3: "F1" },
    { day: "Mardi", u1315: "C1", u18: "C1", nm3: "C1" },
    { day: "Mercredi", u1315: "@Mobilité basique", u18: "M1", nm3: "M1" },
    { day: "Jeudi", u1315: "P1", u18: "P1", nm3: "P1" },
    { day: "Vendredi", u1315: "V1", u18: "V1", nm3: "V1" },
    { day: "Samedi", u1315: "@Repos", u18: "@Repos", nm3: "@Repos" },
    { day: "Dimanche", u1315: "@Repos", u18: "@Repos", nm3: "@Repos" }
  ],
  defi: null,
  modules: {
    F1: {
      title: "Force (volume réduit)",
      type: "exercises",
      objectif: "Entretenir la force sans créer de fatigue.",
      echauffement: ["5 min cardio léger", "Mobilité hanches/chevilles", "Activation fessiers"],
      note: "Finir chaque série avec la sensation de pouvoir réaliser encore 2 ou 3 répétitions. Bon indicateur sur la qualité de la préparation physique réalisée.",
      exercises: [
        ex("Goblet Squat", "2 X 10", "3 X 5", "/"),
        ex("Back Squat", "/", "/", "3 X 3"),
        ex("Bulgarian Split Squat", "2 X 8", "2 X 6", "3 X 6"),
        ex("Hip Thrust", "2 X 10", "3 X 6", "3 X 6"),
        ex("Nordic", "2 X 5", "2 X 5", "3 X 5"),
        ex("Gainage", "2 X 30 sec", "2 X 45 sec", "2 X 60 sec")
      ]
    },
    C1: {
      title: "Endurance légère",
      type: "cardio",
      objectif: "Entretenir la condition physique.",
      note: "Allure facile, le but est simplement de faire circuler le sang et de récupérer.",
      durations: { u1315: "20 min de course", u18: "30 min de course", nm3: "35 min de course" }
    },
    P1: {
      title: "Puissance",
      type: "exercises",
      objectif: "Retrouver la tonicité.",
      note: "Repos complet entre chaque série et chaque exercice.",
      exercises: [
        ex("Squat Jump", "2 X 5", "3 X 5", "3 X 5"),
        ex("Sauts horizontaux explosifs", "2 X 10", "2 X 10", "3 X 10"),
        ex("Bondissements", "2 X 10 m", "3 X 10 m", "3 X 10 m")
      ]
    },
    V1: {
      title: "Vitesse",
      type: "exercises",
      objectif: "Garder de la vitesse avant la reprise.",
      note: "Qualité avant quantité. Si les sensations sont mauvaises, on arrête.",
      exercises: [
        ex("Sprint 10 m", "4", "4", "4"),
        ex("Sprint 20 m", "4", "4", "6"),
        ex("Changements de direction 5-5m", "3", "4", "4")
      ]
    },
    M1: {
      title: "Mobilités",
      type: "checklist",
      duration: "15 min",
      items: [
        { nom: "Mobilité chevilles" }, { nom: "Rotation thoracique" }, { nom: "Ouverture des hanches" },
        { nom: "Étirement des fléchisseurs de hanche" }, { nom: "Mollets" }, { nom: "Ischios" }
      ]
    }
  }
};

const WEEKS = [WEEK1, WEEK2, WEEK3, WEEK4, WEEK5];

const GOLDEN_RULES = [
  "Dormir au minimum 8 heures par nuit.",
  "Bien s'hydrater.",
  "Ne pas chercher à \"rattraper\" une séance manquée."
];

const INTRO = {
  kicker: "Préparation physique estivale",
  season: "Saison 2026 - 2027",
  lead: "La saison ne commence pas le 10 août.\nElle commence aujourd'hui.",
  body: "Le travail réalisé pendant ces cinq semaines déterminera notre capacité à nous entraîner fort dès la reprise. La préparation estivale est une responsabilité individuelle au service d'une ambition collective.",
  motto: "Tous ensemble.",
  goals: [
    "Maintenir une condition physique solide",
    "Limiter la perte de force et d'explosivité",
    "Préparer les appuis, les accélérations et les changements de direction",
    "Réduire le risque de blessures",
    "Arriver au premier entraînement avec un corps prêt pour le basket"
  ]
};

const OUTRO = {
  title: "Le mot de la fin",
  lines: [
    "La préparation estivale est un investissement.",
    "Merci pour ton engagement.",
    "Rendez-vous le 10 août.",
    "Tous ensemble."
  ]
};

const CHEVALIER_QUOTE = "Le chevalier ne devient pas plus fort au combat. Il devient plus fort pendant sa préparation.";

const PDF_PATH = "ressources/Summer book TMB 2K26_2K27 - Summer book TMB 2K262K27.pdf";

/* ============================================================
   BIBLIOTHÈQUE D'EXERCICES — fiche + conseil technique par exercice
   ============================================================ */
const FAMILIES = {
  legs: { label: "Bas du corps", icon: "legs" },
  upper: { label: "Haut du corps", icon: "upper" },
  core: { label: "Gainage", icon: "core" },
  speed: { label: "Vitesse / Puissance", icon: "speed" },
  mobility: { label: "Mobilité", icon: "mobility" }
};

/* Ordre important : entrées les plus spécifiques en premier
   (ex. "bulgarian" avant "split squat") pour éviter les faux positifs. */
const EXERCISE_LIBRARY = [
  { key: "Bulgarian Split Squat", match: ["bulgarian"], family: "legs",
    desc: "Pied arrière surélevé sur un banc. Descends en gardant le buste droit, pousse sur la jambe avant pour remonter." },
  { key: "Goblet Squat", match: ["goblet"], family: "legs",
    desc: "Tiens une charge contre la poitrine, descends en poussant les hanches en arrière, genoux alignés avec les pieds." },
  { key: "Back Squat", match: ["back squat"], family: "legs",
    desc: "Barre sur le haut du dos, pieds largeur d'épaules. Descends en contrôlant, garde le dos neutre et remonte en poussant dans le sol." },
  { key: "Split Squat", match: ["split squat"], family: "legs",
    desc: "Un pied devant, un pied derrière. Descends à la verticale sans que le genou avant dépasse la pointe de pied." },
  { key: "Squat Jump", match: ["squat jump"], family: "speed",
    desc: "Descends en squat puis saute le plus haut possible en tendant tout le corps. Réceptionne-toi en souplesse." },
  { key: "Hip Thrust", match: ["hip thrust"], family: "legs",
    desc: "Dos appuyé sur un banc, pousse les hanches vers le haut en contractant les fessiers. Évite de cambrer le bas du dos." },
  { key: "Nordic", match: ["nordic"], family: "legs",
    desc: "À genoux, chevilles bloquées. Résiste le plus longtemps possible en descendant lentement vers l'avant." },
  { key: "Mollets", match: ["mollet"], family: "legs",
    desc: "Monte sur la pointe des pieds, marque un temps d'arrêt en haut, puis redescends en contrôlant." },
  { key: "Gainage", match: ["gainage"], family: "core",
    desc: "Position de planche, corps aligné de la tête aux talons, abdos gainés. Ne laisse pas le bassin tomber." },
  { key: "Pompes", match: ["pompe"], family: "upper",
    desc: "Mains largeur d'épaules, corps gainé. Descends jusqu'à effleurer le sol puis pousse pour remonter." },
  { key: "Rowing", match: ["rowing"], family: "upper",
    desc: "Tire la charge vers le buste en resserrant les omoplates. Garde le dos droit et les coudes proches du corps." },
  { key: "Développé", match: ["développé", "developpe"], family: "upper",
    desc: "Pousse la charge devant ou au-dessus de la poitrine, sans bloquer les coudes en fin de mouvement." },
  { key: "Tractions/Tirage", match: ["tractions"], family: "upper",
    desc: "Tire le corps ou la charge vers toi en resserrant les omoplates. Garde le buste gainé, évite de te balancer." },
  { key: "Tirage", match: ["tirage"], family: "upper",
    desc: "Tire la barre ou la poignée vers toi en gardant le buste droit, resserre les omoplates en fin de mouvement." },
  { key: "Pallof Press", match: ["pallof"], family: "core",
    desc: "Élastique ou poulie sur le côté, pousse devant toi sans laisser le buste pivoter. Le gainage résiste à la rotation." },
  { key: "Planche latérale", match: ["planche latérale", "planche laterale"], family: "core",
    desc: "Sur le côté, appui sur l'avant-bras, corps aligné. Garde les hanches hautes sans t'affaisser." },
  { key: "Sprint", match: ["sprint"], family: "speed",
    desc: "Accélération maximale sur la distance indiquée. Récupération complète entre chaque répétition pour rester explosif." },
  { key: "Changements de direction", match: ["changement"], family: "speed",
    desc: "Décélère, change d'appui et raccélère dans l'autre direction le plus vite possible, sans perdre l'équilibre." },
  { key: "Bondissements", match: ["bondissement"], family: "speed",
    desc: "Enchaîne des sauts vers l'avant en cherchant la distance à chaque appui, sans temps d'arrêt." },
  { key: "Sauts horizontaux", match: ["sauts horizontaux", "sauts horizontaux explosifs"], family: "speed",
    desc: "Élan bras + jambes, saute le plus loin possible et réceptionne-toi en équilibre, genoux fléchis." },
  { key: "Sauts latéraux", match: ["sauts latéraux", "sauts lateraux"], family: "speed",
    desc: "Saute latéralement d'un appui à l'autre en contrôlant la réception à chaque fois." },
  { key: "Lancer médecine ball", match: ["médecine ball", "medecine ball"], family: "speed",
    desc: "Lance le ballon lesté avec l'ensemble du corps (jambes-hanches-bras), le plus loin ou le plus fort possible." },
  { key: "Mobilité chevilles", match: ["mobilité chevilles"], family: "mobility",
    desc: "Mobilise l'articulation de la cheville dans toutes les directions pour préparer les appuis." },
  { key: "Mobilité hanches", match: ["mobilité hanches", "ouverture des hanches", "ouverture de hanches"], family: "mobility",
    desc: "Grands cercles de hanches et ouvertures dynamiques pour préparer les changements de direction." },
  { key: "Rotation thoracique", match: ["rotation thoracique"], family: "mobility",
    desc: "À quatre pattes ou debout, tourne le haut du dos en gardant les hanches fixes." },
  { key: "Étirement des fléchisseurs de hanche", match: ["fléchisseurs de hanche", "flechisseurs de hanche"], family: "mobility",
    desc: "Fente avant, bascule légèrement le bassin pour étirer l'avant de la hanche arrière." },
  { key: "Ischios", match: ["ischio"], family: "mobility",
    desc: "Étirement des ischio-jambiers, jambe tendue, dos droit, sans forcer sur une douleur." },
  { key: "Copenhagen léger", match: ["copenhagen"], family: "core",
    desc: "Gainage latéral avec le pied surélevé sur un banc : travaille la face interne de la cuisse." },
  { key: "Tibialis Raise", match: ["tibialis"], family: "mobility",
    desc: "Dos au mur, remonte la pointe des pieds vers le tibia pour renforcer l'avant de la jambe." },
  { key: "Équilibre unipodal", match: ["unipodal"], family: "mobility",
    desc: "Tiens en équilibre sur une jambe, genou légèrement fléchi, gainage actif. Fais les deux côtés." }
];

function normalizeText(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getExerciseInfo(nom) {
  const n = normalizeText(nom);
  for (const entry of EXERCISE_LIBRARY) {
    if (entry.match.some((m) => n.includes(normalizeText(m)))) return entry;
  }
  return null;
}
