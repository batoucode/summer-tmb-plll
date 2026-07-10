/* ============================================================
   TMB SUMMER BOOK — 10. AUTH
   Inscription / connexion / déconnexion via Supabase Auth. La connexion
   se fait par identifiant ("username") plutôt que par email : Supabase
   Auth reste géré par email en interne, donc on résout d'abord
   identifiant → email via la fonction RPC tmb_email_for_username
   (accessible à anon, voir supabase/schema.sql) avant d'appeler
   signInWithPassword.
   ============================================================ */
(function () {
  "use strict";
  const sb = window.TMB.supabase.client;

  /* Supabase Auth exige un email même quand l'utilisateur n'en saisit
     pas (email optionnel à l'inscription) : on génère un email
     technique invisible, jamais utilisé pour se connecter. */
  function placeholderEmail(username) {
    return `${String(username).toLowerCase()}@tmb.local`;
  }

  async function signUp({ username, password, firstName, lastName, categoryId, email }) {
    const finalEmail = (email && email.trim()) || placeholderEmail(username);
    const { data, error } = await sb.auth.signUp({
      email: finalEmail,
      password,
      options: { data: { username, first_name: firstName, last_name: lastName, assigned_category_id: categoryId || null } }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(username, password) {
    const { data: email, error: lookupErr } = await sb.rpc("tmb_email_for_username", { p_username: username });
    if (lookupErr) throw lookupErr;
    if (!email) throw new Error("Invalid login credentials");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  async function updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  /* Client Supabase isolé (session non persistée) utilisé uniquement pour
     que l'admin puisse créer un compte joueur/coach sans remplacer sa
     propre session (auth.signUp() connecte automatiquement le nouvel
     utilisateur sur le client qui l'appelle). Voir docs/SECURITY.md
     section "Limitations connues". */
  function adminCreateAccount({ username, password, firstName, lastName, categoryId, email }) {
    const tmp = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "tmb_tmp_invite" }
    });
    const finalEmail = (email && email.trim()) || placeholderEmail(username);
    return tmp.auth.signUp({
      email: finalEmail,
      password,
      options: { data: { username, first_name: firstName, last_name: lastName, assigned_category_id: categoryId || null } }
    }).then(({ data, error }) => {
      if (error) throw error;
      return data;
    });
  }

  Object.assign(window.TMB.auth, { signUp, signIn, signOut, adminCreateAccount, updatePassword });
})();
