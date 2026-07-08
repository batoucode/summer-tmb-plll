/* ============================================================
   TMB SUMMER BOOK — 03. SUPABASE CLIENT
   Client Supabase unique, partagé par tous les modules de données.
   Si la configuration manque (assets/supabase-config.js absent ou
   incomplet), on arrête tout de suite avec un message clair : c'est un
   pré-requis bloquant, pas une "panne de module" au sens de
   02-error-boundary.js (rien ne peut fonctionner sans ça), donc on ne
   passe pas par safeRender ici.
   ============================================================ */
(function () {
  "use strict";

  const hasConfig = typeof window.supabase !== "undefined"
    && typeof SUPABASE_URL !== "undefined" && !!SUPABASE_URL
    && typeof SUPABASE_ANON_KEY !== "undefined" && !!SUPABASE_ANON_KEY;

  if (!hasConfig) {
    document.body.innerHTML = '<div class="boot-error">Configuration Supabase manquante (assets/supabase-config.js).</div>';
    window.TMB.supabase.ready = false;
    return;
  }

  window.TMB.supabase.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.TMB.supabase.ready = true;
})();
