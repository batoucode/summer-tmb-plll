// @ts-check
const { test, expect } = require("@playwright/test");
const { buildMockSupabaseInitScript, installMockRoutes } = require("./helpers/mock-supabase");

/* Vérifie le mécanisme central de docs/ARCHITECTURE.md §5 : un module
   de vue qui plante affiche une carte d'erreur DANS SON SEUL
   conteneur, sans casser la topbar ni le bouton de déconnexion. On
   sabote le fichier réseau du module Joueur (70-view-player.js) pour
   simuler "un bug livré dans ce module précis", sans toucher aux
   autres. */

const db = {
  categories: [{ id: 1, name: "U13", min_age: 11, max_age: 13 }],
  profiles: [{ id: "player-1", email: "p@test.dev", first_name: "Léo", last_name: "Joueur", role: "player", assigned_category_id: 1 }],
  plans: [], days: [], exercises: [], validations: []
};

test("un module de vue cassé affiche une carte d'erreur locale sans casser le reste", async ({ page }) => {
  await page.addInitScript(buildMockSupabaseInitScript(db, "player-1"));
  await installMockRoutes(page);
  await page.route("**/70-view-player.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `window.TMB.views.player.render = function () { throw new Error("Panne simulée dans le module Joueur"); };`
  }));

  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

  await page.goto("/index.html");

  await expect(page.locator(".error-card")).toBeVisible();
  await expect(page.locator(".error-card")).toContainText("player");
  await expect(page.locator("#topbar")).toBeVisible();
  await expect(page.locator("#logoutBtn")).toBeVisible();

  await page.click("#logoutBtn");
  const loggedOut = await page.evaluate(() => window.__LOGGED_OUT__ === true);
  expect(loggedOut).toBe(true);

  expect(consoleErrors.some((e) => e.includes("[TMB:player]"))).toBe(true);
});

test("le bouton Réessayer relance le rendu de la session", async ({ page }) => {
  await page.addInitScript(buildMockSupabaseInitScript(db, "player-1"));
  await installMockRoutes(page);
  await page.route("**/70-view-player.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `window.TMB.views.player.render = function () { throw new Error("Panne simulée"); };`
  }));
  await page.goto("/index.html");

  await expect(page.locator("#errRetryBtn")).toBeVisible();
  await page.click("#errRetryBtn");
  // Le module est toujours cassé (même route sabotée) : la carte
  // d'erreur doit simplement réapparaître, pas planter la page.
  await expect(page.locator(".error-card")).toBeVisible();
});
