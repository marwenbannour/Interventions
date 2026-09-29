import { defineConfig, devices } from '@playwright/test';

/**
 * Tests end-to-end de la console (Playwright).
 * Prérequis : API démarrée et seedée (docker compose) avec AUTH_THROTTLE_LIMIT relevé — cf. e2e/README.md.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Les scénarios partagent la même base de démo : exécution séquentielle, sans interférence.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  // Build de production : pages précompilées (≈ 5 ms) au lieu de la compilation à la volée du mode dev
  // (jusqu'à une minute par page au premier accès), source de lenteurs et de tests instables.
  // Un serveur déjà lancé sur le port (dev ou prod) est réutilisé tel quel.
  webServer: {
    command: 'npm run build && npx next start -p 3001',
    url: `${BASE_URL}/login`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
