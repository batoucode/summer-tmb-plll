// @ts-check
const { test, expect } = require("@playwright/test");
const { buildMockSupabaseInitScript, installMockRoutes } = require("./helpers/mock-supabase");

const db = {
  categories: [{ id: 1, name: "U13", min_age: 11, max_age: 13 }],
  profiles: [{ id: "player-1", email: "p@test.dev", first_name: "Léo", last_name: "Joueur", role: "player", assigned_category_id: 1 }],
  plans: [{ id: "plan-1", category_id: 1, week_number: 1, objective: "Obj S1", staff_quote: "Allez !" }],
  days: [
    { id: "day-0", plan_id: "plan-1", day_index: 0, label: "Force bas du corps", is_rest: false, warmup: "Footing 5min", rpe: "6/10" },
    { id: "day-1", plan_id: "plan-1", day_index: 1, label: "Cardio", is_rest: false, warmup: null, rpe: null },
    { id: "day-2", plan_id: "plan-1", day_index: 2, label: "Repos", is_rest: true, warmup: null, rpe: null }
  ],
  exercises: [
    { id: "ex-1", day_id: "day-0", name: "Squat", sets: 3, duration: null, intensity: 6, reps: "3 X 10", video_url: null, position: 0 },
    { id: "ex-2", day_id: "day-0", name: "Gainage", sets: 2, duration: 30, intensity: 5, reps: "2 X 30 sec", video_url: null, position: 1 },
    { id: "ex-3", day_id: "day-1", name: "Footing", sets: 1, duration: 1500, intensity: 6, reps: "25 min", video_url: null, position: 0 }
  ],
  validations: []
};

test("liste des jours affiche le bon statut, repos désactivé", async ({ page }) => {
  await page.addInitScript(buildMockSupabaseInitScript(db, "player-1"));
  await installMockRoutes(page);
  await page.goto("/index.html");

  await expect(page.locator(".day-card")).toHaveCount(3);
  await expect(page.locator('.day-card[data-d="2"]')).toBeDisabled();
  await expect(page.locator('.day-card[data-d="0"] .status-pill')).toHaveText("À faire");
});

test("valider un exercice individuellement puis toute la séance", async ({ page }) => {
  await page.addInitScript(buildMockSupabaseInitScript(db, "player-1"));
  await installMockRoutes(page);
  await page.goto("/index.html");

  await page.click('.day-card[data-d="0"]');
  await expect(page.locator(".player-exo-card")).toHaveCount(2);

  // Validation d'un seul exercice.
  await page.click(".pe-check >> nth=0");
  await expect(page.locator(".player-exo-card").first()).toHaveClass(/is-done/);

  // Validation groupée de toute la séance.
  await page.click("#bulkValidateBtn");
  await expect(page.locator(".player-exo-card.is-done")).toHaveCount(2);
  await expect(page.locator("#bulkValidateBtn")).toContainText("dé-valider");

  // Le statut se répercute sur la carte de jour au retour à la semaine.
  await page.click("#backToWeek");
  await expect(page.locator('.day-card[data-d="0"] .status-pill')).toHaveText("Fait");
});
