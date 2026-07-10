// @ts-check
const { test, expect } = require("@playwright/test");
const { buildMockSupabaseInitScript, installMockRoutes } = require("./helpers/mock-supabase");

test.describe("Écran de connexion", () => {
  test("affiche le formulaire de connexion et bascule vers inscription", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript({ categories: [], profiles: [] }, null));
    await installMockRoutes(page);
    await page.goto("/index.html");

    await expect(page.locator("#authForm")).toBeVisible();
    await expect(page.locator(".auth-card h1")).toContainText("Summer 2026");

    await page.click('.auth-tab[data-mode="signup"]');
    await expect(page.locator("#fUsername")).toBeVisible();
    await expect(page.locator("#fCategory")).toBeVisible();
    await expect(page.locator("#fFirstName")).toBeVisible();
  });
});

test.describe("Dispatch par rôle", () => {
  const baseDb = {
    categories: [{ id: 1, name: "U13", min_age: 11, max_age: 13 }],
    profiles: [
      { id: "admin-1", email: "admin@test.dev", first_name: "Ada", last_name: "Min", role: "admin", assigned_category_id: null },
      { id: "coach-1", email: "coach@test.dev", first_name: "Cathy", last_name: "Coach", role: "coach", assigned_category_id: 1 },
      { id: "player-1", email: "p@test.dev", first_name: "Léo", last_name: "Joueur", role: "player", assigned_category_id: 1 }
    ],
    plans: [], days: [], exercises: [], validations: []
  };

  test("un compte admin atterrit sur la section Admin (#view-admin)", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript(baseDb, "admin-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");
    await expect(page.locator("#view-admin")).toBeVisible();
    await expect(page.locator("#topbarUserRole")).toHaveText("Admin");
    // 4 sections pour l'admin : Entraînement, Programme, Admin, Profil.
    await expect(page.locator("#sectionNav .section-nav-item")).toHaveCount(4);
  });

  test("un compte coach atterrit sur la section Entraînement (#view-training)", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript(baseDb, "coach-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");
    await expect(page.locator("#view-training")).toBeVisible();
    await expect(page.locator("#topbarUserRole")).toHaveText("Coach");
    // 3 sections pour le coach : Entraînement, Programme, Profil (pas Admin).
    await expect(page.locator("#sectionNav .section-nav-item")).toHaveCount(3);
  });

  test("un compte joueur atterrit sur la section Entraînement (#view-training)", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript(baseDb, "player-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");
    await expect(page.locator("#view-training")).toBeVisible();
    await expect(page.locator("#topbarUserRole")).toHaveText("Joueur");
    // 2 sections pour le joueur : Entraînement, Profil (pas Programme ni Admin).
    await expect(page.locator("#sectionNav .section-nav-item")).toHaveCount(2);
  });

  test("le bouton déconnexion (section Profil) appelle bien signOut", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript(baseDb, "player-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");
    // Déconnexion vit désormais dans la section Profil, pas la topbar.
    await page.click('#sectionNav [data-id="settings"]');
    await page.click("#logoutBtn");
    const loggedOut = await page.evaluate(() => window.__LOGGED_OUT__ === true);
    expect(loggedOut).toBe(true);
  });
});
