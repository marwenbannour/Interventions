import { expect, test } from '@playwright/test';
import type { AccountKey } from './support/api';
import { loginAs, navigate, sidebar } from './support/ui';

/** Libellé du menu → URL et titre de la page. */
const PAGES: Record<string, { path: RegExp; heading: string | RegExp }> = {
  Accueil: { path: /\/accueil$/, heading: /^Bonjour, / },
  Interventions: { path: /\/dispatch$/, heading: 'Interventions' },
  Carte: { path: /\/agents$/, heading: 'Carte des agents' },
  Clients: { path: /\/clients$/, heading: 'Clients' },
  Équipements: { path: /\/assets$/, heading: 'Équipements' },
  Maintenance: { path: /\/maintenance$/, heading: 'Maintenance préventive' },
  Reporting: { path: /\/reports$/, heading: 'Reporting' },
  Qualité: { path: /\/quality$/, heading: 'Qualité' },
  Notifications: { path: /\/notifications$/, heading: 'Notifications' },
  SLA: { path: /\/sla$/, heading: 'SLA' },
  Profil: { path: /\/profil$/, heading: 'Profil' },
  Paramètres: { path: /\/admin\/organization$/, heading: 'Organisation' },
};

const COMMON = ['Accueil', 'Interventions', 'Carte', 'Clients'];
const MENU: Record<Exclude<AccountKey, 'client'>, string[]> = {
  admin: [...COMMON, 'Équipements', 'Maintenance', 'Reporting', 'Qualité', 'Notifications', 'SLA', 'Profil', 'Paramètres'],
  supervisor: [...COMMON, 'Équipements', 'Maintenance', 'Reporting', 'Qualité', 'Notifications', 'SLA', 'Profil'],
  direction: [...COMMON, 'Équipements', 'Maintenance', 'Reporting', 'Qualité', 'Notifications', 'SLA', 'Profil'],
  agent: [...COMMON, 'Reporting', 'Qualité', 'Notifications', 'Profil'],
};

// Le lien Notifications porte le compteur de non-lues (« Notifications 9+ ») : on compare le début du libellé.
const startsWith = (label: string) => new RegExp(`^${label}`);

test.describe('Navigation et droits par rôle', () => {
  for (const [role, items] of Object.entries(MENU) as [keyof typeof MENU, string[]][]) {
    test(`${role} : menu attendu et chaque page s’affiche`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await loginAs(page, role);
      await expect(sidebar(page).getByRole('link')).toHaveText(items.map(startsWith));

      for (const label of items) {
        await navigate(page, label, PAGES[label].path);
        const { heading } = PAGES[label];
        await expect(page.getByRole('heading', { level: 1, name: heading, exact: typeof heading === 'string' })).toBeVisible();
      }
      expect(errors, 'erreurs JavaScript non gérées').toEqual([]);
    });
  }

  test('les actions de gestion sont masquées pour la direction', async ({ page }) => {
    await loginAs(page, 'direction');
    await expect(page.getByRole('button', { name: 'Nouvelle intervention' })).toHaveCount(0);
    await navigate(page, 'Clients', /\/clients$/);
    await expect(page.getByRole('button', { name: 'Nouveau client' })).toHaveCount(0);
    await navigate(page, 'Équipements', /\/assets$/);
    await expect(page.getByRole('button', { name: 'Nouvel équipement' })).toHaveCount(0);
    await navigate(page, 'Maintenance', /\/maintenance$/);
    await expect(page.getByRole('button', { name: 'Nouveau plan' })).toHaveCount(0);
    await navigate(page, 'SLA', /\/sla$/);
    await expect(page.getByRole('button', { name: 'Nouvelle politique' })).toHaveCount(0);
    await navigate(page, 'Notifications', /\/notifications$/);
    await expect(page.getByRole('button', { name: 'Nouvelle notification' })).toHaveCount(0);
  });

  test('l’administration est refusée aux non-administrateurs (accès direct par URL)', async ({ page }) => {
    await loginAs(page, 'supervisor', '/admin/users');
    await expect(page.getByText('Accès réservé aux administrateurs')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouveau compte' })).toHaveCount(0);
  });

  test('/admin redirige vers l’onglet Organisation et les onglets fonctionnent', async ({ page }) => {
    await loginAs(page, 'admin', '/admin');
    await expect(page).toHaveURL(/\/admin\/organization$/);
    const tabs: [string, RegExp, string][] = [
      ['Comptes', /\/admin\/users$/, 'Comptes'],
      ['Workflows', /\/admin\/workflows$/, 'Workflows'],
      ['Audit', /\/admin\/audit$/, 'Audit'],
      ['Organisation', /\/admin\/organization$/, 'Organisation'],
    ];
    for (const [tab, url, heading] of tabs) {
      await page.getByRole('main').getByRole('link', { name: tab, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
    await page.getByRole('main').getByRole('link', { name: 'Intégrations', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/integrations$/);
    await expect(page.getByText('Webhooks', { exact: true })).toBeVisible();
  });
});
