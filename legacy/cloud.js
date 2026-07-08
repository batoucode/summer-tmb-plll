/* ============================================================
   TMB SUMMER BOOK — Synchro cloud (Supabase self-hébergé)
   Compte simple identifiant/mot de passe, sans Supabase Auth :
   voir tmb_login_or_signup / tmb_save_state dans supabase/schema.sql.
   ============================================================ */

(function () {
  "use strict";

  const SESSION_KEY = "tmb_summerbook_session";
  let client = null;

  function available() {
    return typeof window.supabase !== "undefined" && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
  }

  function getClient() {
    if (!client && available()) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function setSession(username, password) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username, password }));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  async function login(username, password) {
    const sb = getClient();
    if (!sb) throw new Error("UNAVAILABLE");
    const { data, error } = await sb.rpc("tmb_login_or_signup", { p_username: username, p_password: password });
    if (error) throw error;
    setSession(username, password);
    return data && data[0];
  }

  async function saveState(category, weekIndex, theme, progress) {
    const session = getSession();
    const sb = getClient();
    if (!session || !sb) return;
    const { error } = await sb.rpc("tmb_save_state", {
      p_username: session.username,
      p_password: session.password,
      p_category: category,
      p_week_index: weekIndex,
      p_theme: theme,
      p_progress: progress
    });
    if (error) throw error;
  }

  window.TMBCloud = { available, getSession, setSession, clearSession, login, saveState };
})();
