import { readFile } from 'fs/promises';
import { expect, test } from '@playwright/test';
import { ApiClient, DEMO, uid } from './support/api';
import { choose, dialog, expectToast, loginAs, logout } from './support/ui';

test.describe('SLA', () => {
  test('l’administrateur crée, modifie et désactive une politique', async ({ page }) => {
    const name = `SLA E2E ${uid()}`;
    await loginAs(page, 'admin', '/sla');
    await page.getByRole('button', { name: 'Nouvelle politique' }).click();
    const form = dialog(page, 'Nouvelle politique SLA');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expect(form.getByText('Nom requis')).toBeVisible();

    await form.getByLabel('Nom').fill(name);
    await choose(page, form, 'Client', DEMO.clinique);
    await choose(page, form, 'Priorité', 'Urgente');
    await form.getByLabel('Prise en charge').fill('10');
    await form.getByLabel('Arrivée sur site').fill('30');
    await form.getByLabel('Clôture').fill('240');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expectToast(page, 'Politique SLA créée.');

    const row = page.locator('tbody tr').filter({ hasText: name });
    await expect(row).toContainText('Client spécifique · Urgente');
    await expect(row).toContainText('10 min');
    await expect(row).toContainText('30 min');
    await expect(row).toContainText('240 min');
    await expect(row).toContainText('Active');

    await row.getByRole('button').first().click(); // crayon
    const edit = dialog(page, 'Modifier la politique SLA');
    await expect(edit.getByLabel('Nom')).toHaveValue(name);
    await edit.getByLabel('Arrivée sur site').fill('20');
    await edit.getByRole('button', { name: 'Enregistrer' }).click();
    await expectToast(page, 'Politique SLA mise à jour.');
    await expect(row).toContainText('20 min');

    await row.getByRole('button', { name: 'Désactiver' }).click();
    await expect(row).toContainText('Inactive');
    await expect(row.getByRole('button', { name: 'Activer' })).toBeVisible();
  });

  test('le superviseur consulte les politiques et les interventions à risque sans pouvoir les modifier', async ({ page }) => {
    await loginAs(page, 'supervisor', '/sla');
    await expect(page.locator('tbody tr').filter({ hasText: 'SLA par défaut' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouvelle politique' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);

    await expect(page.getByRole('heading', { name: 'Interventions à risque' })).toBeVisible();
    await page.locator('main [data-slot="select-trigger"]').filter({ hasText: '1 heure' }).click();
    await page.getByRole('option', { name: '24 heures' }).click();
    await expect(page.locator('main [data-slot="select-trigger"]').filter({ hasText: '24 heures' })).toBeVisible();
  });
});

test.describe('Notifications', () => {
  test('un superviseur envoie une notification, la direction la reçoit et la lit', async ({ page }) => {
    const title = `Message E2E ${uid()}`;
    await loginAs(page, 'supervisor', '/notifications');
    await page.getByRole('button', { name: 'Nouvelle notification' }).click();
    const form = dialog(page, 'Nouvelle notification');
    await form.getByRole('button', { name: 'Envoyer' }).click();
    await expect(form.getByText('Titre requis')).toBeVisible();
    await expect(form.getByText('Message requis')).toBeVisible();

    await form.getByLabel('Titre').fill(title);
    await form.getByLabel('Message').fill('Point sécurité demain 8h.');
    await form.getByRole('button', { name: 'Envoyer' }).click();
    await expectToast(page, 'Sélectionnez au moins un destinataire.');

    await form.getByPlaceholder('Rechercher un utilisateur…').fill('direction');
    const recipient = form.locator('label').filter({ hasText: 'Direction' }).first();
    await recipient.getByRole('checkbox').click();
    await expect(form.getByText('1 sélectionné(s)')).toBeVisible();
    await form.getByRole('button', { name: 'Envoyer' }).click();
    await expectToast(page, 'Notification envoyée.');
    await expect(form).toBeHidden();

    await logout(page);
    await loginAs(page, 'direction');

    // Cloche : badge non lu et aperçu.
    const bell = page.locator('header').getByRole('button', { name: 'Notifications' });
    await expect(bell.locator('span.bg-destructive')).toBeVisible();
    await bell.click();
    await expect(page.getByRole('menuitem').filter({ hasText: title })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Voir toutes les notifications' }).click();
    await expect(page).toHaveURL(/\/notifications$/);

    const item = page.getByRole('button').filter({ hasText: title });
    await expect(item).toContainText('Point sécurité demain 8h.');
    await expect(item.locator('span.rounded-full.bg-primary')).toBeVisible(); // pastille non lue
    await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
    await expect(page.getByText(/, 0 non lue\(s\)/)).toBeVisible();
    await expect(item.locator('span.rounded-full.bg-primary')).toHaveCount(0);
  });
});

test.describe('Reporting', () => {
  test('la direction consulte les KPI et exporte les CSV', async ({ page }) => {
    await loginAs(page, 'direction', '/reports');
    for (const kpi of ['Interventions', 'Taux de complétion', 'Conformité SLA', 'Satisfaction', 'Réinterventions', 'Agents en service']) {
      await expect(page.getByRole('main').getByText(kpi, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('Conformité SLA par client')).toBeVisible();
    await expect(page.getByText('Conformité SLA par priorité')).toBeVisible();
    await expect(page.getByRole('main').getByText(DEMO.agent1).first()).toBeVisible();

    const exports = page.getByRole('button', { name: 'Exporter CSV' });
    await expect(exports).toHaveCount(3);
    for (const [index, report] of (['sla', 'agents', 'sites'] as const).entries()) {
      const [download] = await Promise.all([page.waitForEvent('download'), exports.nth(index).click()]);
      expect(download.suggestedFilename()).toMatch(new RegExp(`^rapport-${report}-\\d{4}-\\d{2}-\\d{2}\\.csv$`));
      const content = await readFile((await download.path())!, 'utf8');
      expect(content.split('\n').length, `${report}.csv vide`).toBeGreaterThan(1);
      expect(content).toContain(';');
    }
  });
});

test.describe('Agents', () => {
  test('liste des agents, trajet, validation puis suspension d’un nouvel agent', async ({ page }) => {
    const admin = await ApiClient.login('admin');
    const lastName = `E2E${uid()}`;
    await admin.post('/users', {
      email: `agent-${lastName.toLowerCase()}@demo.fieldops.io`, password: 'AgentE2e12345', firstName: 'Nouvel', lastName, role: 'AGENT',
    });

    await loginAs(page, 'supervisor', '/agents');
    await expect(page.getByText(/\d+ en service sur \d+/)).toBeVisible();
    for (const name of [DEMO.agent1, 'Julie Moreau', DEMO.agent3]) {
      await expect(page.getByRole('main').getByText(name, { exact: true }).first()).toBeVisible();
    }

    const karim = page.locator('div.rounded-lg.border').filter({ hasText: DEMO.agent1 }).first();
    await karim.getByRole('button', { name: 'Trajet' }).click();
    await expect(dialog(page, `Trajet — ${DEMO.agent1}`)).toBeVisible();
    await page.keyboard.press('Escape');

    const recruit = page.locator('div.rounded-lg.border').filter({ hasText: `Nouvel ${lastName}` });
    await expect(recruit).toContainText('En attente de validation');
    await recruit.getByRole('button', { name: 'Valider' }).click();
    await expectToast(page, 'Agent validé.');
    await expect(recruit).not.toContainText('En attente de validation');
    await recruit.getByRole('button', { name: 'Suspendre' }).click();
    await expectToast(page, 'Agent suspendu.');
    await expect(recruit).toContainText('Suspendu');
  });
});
