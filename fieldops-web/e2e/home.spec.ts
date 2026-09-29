import { expect, test } from '@playwright/test';
import { ApiClient, uid } from './support/api';
import { dialog, loginAs } from './support/ui';

test.describe('Accueil (tableau de bord)', () => {
  test('indicateurs, urgentes, activité, actions rapides et recherche globale', async ({ page }) => {
    const sup = await ApiClient.login('supervisor');
    const title = `E2E accueil ${uid()}`;
    // En retard de 3 jours : le tableau (8 lignes) montre d'abord les urgentes les plus anciennes,
    // elle y figure donc quel que soit le volume de données déjà présent.
    const task = await sup.createTask(title, { priority: 'URGENT', scheduledStart: new Date(Date.now() - 3 * 86_400_000).toISOString() });

    await loginAs(page, 'supervisor', '/accueil');
    for (const kpi of ['Total interventions', 'Nouvelles', 'En cours', 'Terminées']) {
      await expect(page.getByRole('main').getByText(kpi, { exact: true }).first()).toBeVisible();
    }

    // L'intervention urgente créée apparaît dans le tableau et dans l'activité récente.
    const urgent = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Interventions urgentes' }) });
    await expect(urgent.getByText(task.reference)).toBeVisible();
    await expect(urgent.getByText('Urgente').first()).toBeVisible();
    const activity = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Activité récente' }) });
    await expect(activity.getByText(task.reference)).toBeVisible();

    // Graphique : un point par jour, avec son équivalent tabulaire accessible.
    await expect(page.getByRole('img', { name: 'Interventions créées par jour sur 7 jours' })).toBeVisible();
    await expect(page.locator('table caption', { hasText: 'Interventions créées par jour' })).toHaveCount(1);

    // Ouverture depuis le tableau → panneau de détail du dispatch.
    await urgent.getByRole('link', { name: `Ouvrir ${task.reference}` }).click();
    await expect(page).toHaveURL(new RegExp(`/dispatch\\?taskId=${task.id}`));
    await expect(page.getByRole('dialog').getByRole('heading', { name: task.reference, exact: true })).toBeVisible();

    // Action rapide « Nouvelle intervention » → formulaire ouvert.
    await page.goto('/accueil');
    await page.getByRole('link', { name: 'Nouvelle intervention', exact: true }).click();
    await expect(dialog(page, 'Nouvelle intervention')).toBeVisible();

    // Recherche globale → vue tableau filtrée.
    await page.keyboard.press('Escape');
    await page.getByRole('textbox', { name: 'Recherche globale' }).fill(task.reference);
    await page.getByRole('textbox', { name: 'Recherche globale' }).press('Enter');
    await expect(page).toHaveURL(/\/dispatch\?view=table&search=/);
    await expect(page.locator('tbody tr').filter({ hasText: task.reference })).toHaveCount(1);
  });

  test('mode sombre mémorisé, barre latérale repliable, onglets mobiles', async ({ page }) => {
    await loginAs(page, 'supervisor', '/accueil');
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Basculer le mode sombre' }).click();
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(page.getByTestId('sidebar-user')).toBeVisible();
    await expect(html).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Basculer le mode sombre' }).click();
    await expect(html).not.toHaveClass(/dark/);

    // Repli : icônes seules (libellés en aria-label), puis dépli.
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByTestId('sidebar-user')).toHaveCount(0);
    await expect(page.locator('aside nav').getByRole('link', { name: 'Interventions' })).toBeVisible();
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByTestId('sidebar-user')).toBeVisible();

    // Mobile : barre latérale masquée, onglets en bas.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('aside')).toBeHidden();
    const tabs = page.getByRole('navigation', { name: 'Navigation principale' });
    // Le compteur de non-lues (« 9+ ») précède le libellé Notifications dans le texte du lien.
    await expect(tabs.getByRole('link')).toHaveText([/Accueil/, /Interventions/, /Carte/, /Notifications/, /Profil/]);
    await tabs.getByRole('link', { name: /^Profil/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
  });
});
