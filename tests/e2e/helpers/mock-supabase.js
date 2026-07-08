"use strict";

/* Fabrique un faux client Supabase (window.supabase.createClient) pour
   tester l'app sans dépendre d'une vraie instance — utile ici car ce
   dépôt n'a pas d'accès réseau à l'instance self-hébergée du club
   depuis l'environnement de test (voir docs/ARCHITECTURE.md). Imite
   juste assez du SDK réel (from().select/eq/in/order/upsert/insert/
   update/delete, auth.getSession/onAuthStateChange/signOut) pour que
   assets/js/*.js fonctionne sans modification.

   `initialDb` : { profiles, categories, plans, days, exercises,
   validations }, `sessionUserId` : id du profil "connecté" au
   chargement (ou null pour démarrer déconnecté). */
function buildMockSupabaseInitScript(initialDb, sessionUserId) {
  const dbJson = JSON.stringify(initialDb);
  const sessionJson = JSON.stringify(sessionUserId);
  return `
window.__DB__ = ${dbJson};
window.__SESSION_USER_ID__ = ${sessionJson};

function __tmbTableFor(name) {
  const db = window.__DB__;
  function builder(rows) {
    const b = {
      _rows: rows,
      select() { return b; },
      eq(k, v) { b._rows = b._rows.filter(r => String(r[k]) === String(v)); return b; },
      in(k, arr) { b._rows = b._rows.filter(r => arr.map(String).includes(String(r[k]))); return b; },
      order() { return b; },
      maybeSingle: async () => ({ data: b._rows[0] || null, error: null }),
      single: async () => ({ data: b._rows[0] || null, error: null }),
      then(res) { return res({ data: b._rows, error: null, count: b._rows.length }); }
    };
    return b;
  }
  return {
    select(_sel, opts) {
      const rows = db[name] || [];
      if (opts && opts.count) return { then: (res) => res({ count: rows.length, error: null }) };
      return builder(rows.slice());
    },
    update(fields) {
      return { eq: (k, v) => { const row = (db[name] || []).find(r => String(r[k]) === String(v)); if (row) Object.assign(row, fields); return Promise.resolve({ error: null }); } };
    },
    insert(rowOrRows) {
      const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
      rows.forEach((r) => { r.id = r.id || (name + "-" + Math.random().toString(36).slice(2)); db[name].push(r); });
      return { select: () => ({ single: async () => ({ data: rows[0], error: null }) }) };
    },
    delete() {
      return { eq: (k, v) => { db[name] = (db[name] || []).filter(r => String(r[k]) !== String(v)); return Promise.resolve({ error: null }); } };
    },
    upsert(rowOrRows) {
      const rows = db[name];
      const items = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
      let last = null;
      items.forEach((row) => {
        let existing;
        if (name === "categories") existing = rows.find(r => r.name === row.name);
        if (name === "plans") existing = rows.find(r => r.category_id === row.category_id && r.week_number === row.week_number);
        if (name === "days") existing = rows.find(r => r.plan_id === row.plan_id && r.day_index === row.day_index);
        if (name === "validations") existing = rows.find(r => r.player_id === row.player_id && r.exercise_id === row.exercise_id);
        if (existing) Object.assign(existing, row); else { row.id = row.id || (name + "-" + Math.random().toString(36).slice(2)); rows.push(row); }
        last = existing || row;
      });
      return { select: () => ({ single: async () => ({ data: last, error: null }) }) };
    }
  };
}

window.supabase = {
  createClient: function () {
    return {
      auth: {
        getSession: async () => ({
          data: { session: window.__SESSION_USER_ID__ ? { user: { id: window.__SESSION_USER_ID__ } } : null }
        }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
        signOut: async () => { window.__SESSION_USER_ID__ = null; window.__LOGGED_OUT__ = true; }
      },
      from: (name) => {
        const map = {
          tmb_categories: "categories", tmb_profiles: "profiles",
          tmb_training_plans: "plans", tmb_training_days: "days",
          tmb_exercises: "exercises", tmb_player_validations: "validations"
        };
        return __tmbTableFor(map[name] || name);
      }
    };
  }
};
`;
}

/* Empêche le vrai SDK Supabase (CDN, injoignable depuis cet
   environnement) de remplacer notre faux client une fois chargé. */
async function installMockRoutes(page) {
  await page.route("**/supabase-js@2", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stubbed in tests/e2e */" })
  );
}

module.exports = { buildMockSupabaseInitScript, installMockRoutes };
