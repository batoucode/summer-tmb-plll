/* ============================================================
   TMB SUMMER BOOK — 10. AUTH
   Inscription / connexion / déconnexion via Supabase Auth.
   ============================================================ */
(function () {
  "use strict";
  const sb = window.TMB.supabase.client;

  async function signUp({ email, password, firstName, lastName, birthDate }) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, birth_date: birthDate } }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  /* Client Supabase isolé (session non persistée) utilisé uniquement pour
     que l'admin puisse créer un compte joueur/coach sans remplacer sa
     propre session (auth.signUp() connecte automatiquement le nouvel
     utilisateur sur le client qui l'appelle). Voir docs/SECURITY.md
     section "Limitations connues". */
  function adminCreateAccount({ email, password, firstName, lastName, birthDate }) {
    const tmp = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "tmb_tmp_invite" }
    });
    return tmp.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, birth_date: birthDate } }
    }).then(({ data, error }) => {
      if (error) throw error;
      return data;
    });
  }

  Object.assign(window.TMB.auth, { signUp, signIn, signOut, adminCreateAccount });
})();
