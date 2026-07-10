/* ============================================================
   TMB SUMMER BOOK — 00. NAMESPACE
   Squelette de l'espace de noms partagé window.TMB. Chaque module
   suivant attache ses exports ici (voir docs/ARCHITECTURE.md pour la
   carte complète).

   Ce fichier doit rester TRIVIAL (un simple objet littéral, aucune
   logique, aucun appel de fonction). C'est le seul module dont une
   panne romprait le mécanisme d'isolation de tous les autres : si ce
   fichier échoue, `TMB` n'existe pas et rien ne peut se raccrocher
   nulle part. Le garder minimal réduit ce risque au niveau le plus bas
   possible dans cette architecture.
   ============================================================ */
window.TMB = {
  core: {},                 // helpers DOM génériques + constantes partagées
  errors: {},                // isolation de panne (safeRender, logs)
  theme: {},                  // thème clair / sombre (localStorage + préférence système)
  state: {                    // état partagé, toujours lu "en direct" (jamais copié)
    session: null,
    profile: null,
    categories: [],
    currentSection: null       // section affichée : training/program/admin/settings
  },
  supabase: { client: null, ready: false },
  auth: {},                    // inscription / connexion / déconnexion
  data: {},                     // CRUD programme + validations + seed
  nav: {},                       // navigation entre sections, topbar
  components: { programEditor: {} }, // composant partagé Programme
  views: { auth: {}, training: {}, program: {}, admin: {}, settings: {} },
  bootstrap: {}                    // démarrage de session, point d'entrée
};
