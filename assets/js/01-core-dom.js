/* ============================================================
   TMB SUMMER BOOK — 01. CORE / DOM
   Aides génériques sans dépendance (sélecteurs DOM, échappement HTML,
   notifications, calcul d'âge, libellés partagés). Ne dépend que de
   00-namespace.js.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  let toastTimer = null;
  function toast(message, isError) {
    const box = $("#toast");
    if (!box) return;
    box.textContent = message;
    box.classList.remove("hidden");
    box.classList.toggle("toast-error", !!isError);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.add("hidden"), 3800);
  }

  function ageFromBirthDate(birthDate) {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }

  function fullName(p) {
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";
  }

  const ROLE_LABELS = { admin: "Admin", coach: "Coach", player: "Joueur" };
  const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche", "Défi bonus"];

  Object.assign(window.TMB.core, {
    $, $$, escapeHtml, el, toast, ageFromBirthDate, fullName, ROLE_LABELS, DAY_LABELS
  });
})();
