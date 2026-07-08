// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/* Config de test dev-only (voir package.json). Utilise le Chromium déjà
   installé de l'environnement plutôt que d'en télécharger un —
   fonctionne aussi bien en local qu'en CI si PLAYWRIGHT_BROWSERS_PATH
   n'y est pas déjà réglé de la même façon. */
module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8934",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "python3 -m http.server 8934",
    url: "http://localhost:8934/index.html",
    reuseExistingServer: true,
    timeout: 10000
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium"
        }
      }
    }
  ]
});
