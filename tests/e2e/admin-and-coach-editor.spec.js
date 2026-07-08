// @ts-check
const { test, expect } = require("@playwright/test");
const { buildMockSupabaseInitScript, installMockRoutes } = require("./helpers/mock-supabase");

test.describe("Éditeur de programme — Admin", () => {
  test("créer un plan, un jour, ajouter un exercice et publier", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript({
      categories: [{ id: 1, name: "U13", min_age: 11, max_age: 13 }],
      profiles: [{ id: "admin-1", email: "admin@test.dev", first_name: "Ada", last_name: "Min", role: "admin", assigned_category_id: null }],
      plans: [], days: [], exercises: [], validations: []
    }, "admin-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");

    await page.click('.tab[data-tab="program"]');
    await expect(page.locator("#edCreatePlan")).toBeVisible();
    await page.click("#edCreatePlan");

    await expect(page.locator("#edDayTabs")).toBeVisible();
    await expect(page.locator("#edDayTabs .week-tab")).toHaveCount(8);

    await page.click('#edDayTabs .week-tab[data-d="0"]');
    await page.click("#edCreateDay");
    await expect(page.locator("#dyLabel")).toBeVisible();

    await page.fill("#dyLabel", "Force bas du corps");
    await page.click("#edAddExo");
    await page.fill('.exo-edit-card [data-f="name"]', "Squat");
    await page.click("#edPublish");

    await expect(page.locator(".toast")).toContainText("publié");

    const days = await page.evaluate(() => window.__DB__.days);
    expect(days).toHaveLength(1);
    expect(days[0].label).toBe("Force bas du corps");
    const exercises = await page.evaluate(() => window.__DB__.exercises);
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe("Squat");
  });

  test("importer le programme par défaut quand aucune catégorie n'existe", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript({
      categories: [],
      profiles: [{ id: "admin-1", email: "admin@test.dev", first_name: "Ada", last_name: "Min", role: "admin", assigned_category_id: null }],
      plans: [], days: [], exercises: [], validations: []
    }, "admin-1"));
    await installMockRoutes(page);
    // La vraie requête irait chercher assets/default_program.json ; on
    // laisse le fichier réel du dépôt être servi normalement (même
    // serveur statique), pas besoin de le mocker.
    await page.goto("/index.html");

    await expect(page.locator("#btnSeed")).toBeVisible();
    await page.click("#btnSeed");
    await expect(page.locator(".toast")).toContainText("importé", { timeout: 15000 });

    const categories = await page.evaluate(() => window.__DB__.categories);
    expect(categories.length).toBeGreaterThan(0);
  });
});

test.describe("Éditeur de programme — Coach (catégorie verrouillée)", () => {
  test("le coach ne voit pas de sélecteur de catégorie et peut publier", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript({
      categories: [{ id: 1, name: "U13", min_age: 11, max_age: 13 }],
      profiles: [{ id: "coach-1", email: "coach@test.dev", first_name: "Cathy", last_name: "Coach", role: "coach", assigned_category_id: 1 }],
      plans: [], days: [], exercises: [], validations: []
    }, "coach-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");

    await expect(page.locator(".locked-cat")).toBeVisible();
    await expect(page.locator("#edCategory")).toHaveCount(0);

    await page.click("#edCreatePlan");
    await page.click('#edDayTabs .week-tab[data-d="0"]');
    await page.click("#edCreateDay");
    await page.fill("#dyLabel", "Cardio");
    await page.click("#edPublish");
    await expect(page.locator(".toast")).toContainText("publié");
  });
});
