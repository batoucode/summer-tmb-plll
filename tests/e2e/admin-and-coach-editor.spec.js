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

    // L'admin atterrit sur la section Admin par défaut ; navigue vers Programme
    // (onglet "✏️ Éditer" actif par défaut, pas besoin de clic supplémentaire).
    await page.click('#sectionNav [data-id="program"]');
    await expect(page.locator("#edCreatePlan")).toBeVisible();
    await page.click("#edCreatePlan");

    await expect(page.locator("#edDayTabs")).toBeVisible();
    await expect(page.locator("#edDayTabs .week-tab")).toHaveCount(8);

    await page.click('#edDayTabs .week-tab[data-d="0"]');
    await page.click("#edCreateDay");
    await expect(page.locator("#dyLabel")).toBeVisible();

    await page.fill("#dyLabel", "Force bas du corps");
    // Les exercices s'affichent en résumé lecture seule par défaut ;
    // il faut passer en mode édition pour ajouter une carte.
    await page.click("#edToggleExoEdit");
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

test.describe("Éditeur de programme — Coach", () => {
  test("le coach peut éditer sa propre catégorie (pré-sélectionnée) et publier", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript({
      categories: [{ id: 1, name: "U13", min_age: 11, max_age: 13 }],
      profiles: [{ id: "coach-1", email: "coach@test.dev", first_name: "Cathy", last_name: "Coach", role: "coach", assigned_category_id: 1 }],
      plans: [], days: [], exercises: [], validations: []
    }, "coach-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");

    // Le coach atterrit sur Entraînement par défaut ; navigue vers Programme.
    await page.click('#sectionNav [data-id="program"]');
    // Le sélecteur de catégorie est toujours affiché (lockCategory:false
    // depuis la restructuration en sections) ; pas de pastille "lecture
    // seule" puisque c'est sa propre catégorie qui est présélectionnée.
    await expect(page.locator("#edCategory")).toHaveCount(1);
    await expect(page.getByText("Lecture seule")).toHaveCount(0);

    await page.click("#edCreatePlan");
    await page.click('#edDayTabs .week-tab[data-d="0"]');
    await page.click("#edCreateDay");
    await page.fill("#dyLabel", "Cardio");
    await page.click("#edPublish");
    await expect(page.locator(".toast")).toContainText("publié");
  });

  test("le coach ne peut pas éditer une catégorie qui n'est pas la sienne", async ({ page }) => {
    await page.addInitScript(buildMockSupabaseInitScript({
      categories: [
        { id: 1, name: "U13", min_age: 11, max_age: 13 },
        { id: 2, name: "U15", min_age: 14, max_age: 15 }
      ],
      profiles: [{ id: "coach-1", email: "coach@test.dev", first_name: "Cathy", last_name: "Coach", role: "coach", assigned_category_id: 1 }],
      plans: [], days: [], exercises: [], validations: []
    }, "coach-1"));
    await installMockRoutes(page);
    await page.goto("/index.html");

    await page.click('#sectionNav [data-id="program"]');
    await page.selectOption("#edCategory", "2");

    await expect(page.getByText("Lecture seule")).toBeVisible();
    await expect(page.locator("#edCreatePlan")).toHaveCount(0);
  });
});
