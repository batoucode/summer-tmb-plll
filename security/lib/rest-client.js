"use strict";

/* Client minimal pour parler directement à l'API REST Supabase
   (PostgREST) et à Auth, avec fetch natif (Node 18+). Aucune
   dépendance, jamais de clé service_role. */

async function signIn(supabaseUrl, anonKey, email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Connexion échouée pour ${email} : ${data.error_description || data.msg || res.status}`);
  }
  return data.access_token;
}

async function getUser(supabaseUrl, anonKey, accessToken) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Impossible de récupérer l'utilisateur courant : ${data.msg || res.status}`);
  return data; // { id, email, ... }
}

/* accessToken absent = requêtes "anon" (non connecté), utile pour
   01-unauth-rejected.js. */
function restClient(supabaseUrl, anonKey, accessToken) {
  const baseHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken || anonKey}`,
    "Content-Type": "application/json"
  };

  async function req(method, path, body, extraHeaders) {
    const res = await fetch(`${supabaseUrl}/rest/v1${path}`, {
      method,
      headers: { ...baseHeaders, ...(extraHeaders || {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (_e) { /* réponse vide, ex. DELETE */ }
    return { ok: res.ok, status: res.status, data };
  }

  return {
    select: (table, query) => req("GET", `/${table}${query || ""}`),
    insert: (table, row) => req("POST", `/${table}`, row, { Prefer: "return=representation" }),
    update: (table, query, patch) => req("PATCH", `/${table}${query}`, patch, { Prefer: "return=representation" }),
    upsert: (table, row, onConflict) =>
      req("POST", `/${table}?on_conflict=${onConflict}`, row, { Prefer: "resolution=merge-duplicates,return=representation" }),
    del: (table, query) => req("DELETE", `/${table}${query}`, null, { Prefer: "return=representation" })
  };
}

module.exports = { signIn, getUser, restClient };
