import { expect, test } from '@playwright/test';
import { agentDoesFieldWork, ApiClient, DEMO, uid } from './support/api';
import { history, infoValue, taskPanel } from './support/task-panel';
import { expectToast, loginAs, navigate } from './support/ui';

/**
 * Parcours complet : création (superviseur) → travail terrain (app mobile, via l'API) → contrôle des
 * preuves et clôture (console) → rapport PDF → évaluation client → écran Qualité.
 */
test.describe('Cycle de vie complet d’une intervention', () => {
  test('contrôle des photos, clôture, rapport PDF et évaluation client', async ({ page }) => {
    const sup = await ApiClient.login('supervisor');
    const agent = await ApiClient.login('agent');
    const title = `E2E cycle complet ${uid()}`;
    const task = await sup.createTask(title);
    await sup.post(`/tasks/${task.id}/assign`, { agentId: agent.user.id });
    await agentDoesFieldWork(agent, task.id);

    await loginAs(page, 'supervisor', `/dispatch?taskId=${task.id}`);
    const panel = taskPanel(page, task.reference);
    await expect(infoValue(panel, 'Statut')).toHaveText('Contrôle');
    await expect(infoValue(panel, 'Agent')).toHaveText(DEMO.agent1);
    await expect(history(panel)).toContainText('En cours → Contrôle');
    await expect(history(panel)).toContainText('Photo ajoutée');

    // Preuves photo : servies par des URL signées accessibles depuis le navigateur.
    await expect(panel.getByText('Photos (2)')).toBeVisible();
    const cards = panel.locator('div.rounded-lg.border').filter({ has: page.locator('img') });
    await expect(cards).toHaveCount(2);
    for (const img of await panel.locator('img').all()) {
      await expect(img).toHaveJSProperty('complete', true);
      expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth), 'photo non chargée').toBeGreaterThan(0);
    }

    const before = cards.filter({ hasText: 'Avant' });
    const after = cards.filter({ hasText: 'Après' });
    await before.getByRole('button').first().click();
    await expectToast(page, 'Photo validée.');
    await expect(before.getByText('Validée')).toBeVisible();

    await after.getByRole('button').nth(1).click();
    const reject = after.getByRole('button', { name: 'Rejeter' });
    await expect(reject).toBeDisabled();
    await after.getByPlaceholder('Motif du rejet (requis)').fill('Photo floue');
    await reject.click();
    await expectToast(page, 'Photo rejetée.');
    await expect(after.getByText('Rejetée')).toBeVisible();
    await expect(after.getByText('Photo floue')).toBeVisible();

    await panel.getByRole('button', { name: 'Clôturer' }).click();
    await expectToast(page, 'Intervention passée à « Clôturer ».');
    await expect(infoValue(panel, 'Statut')).toHaveText('Terminée');

    // Rapport PDF généré en tâche de fond après la clôture : on attend qu'il existe, puis on recharge.
    await expect
      .poll(async () => (await sup.get<{ hasReport: boolean }>(`/tasks/${task.id}`)).hasReport, { timeout: 30_000 })
      .toBe(true);
    await page.reload();
    const reportPanel = taskPanel(page, task.reference);
    await expect(reportPanel.getByText(/Généré le .* SHA-256/)).toBeVisible();
    const [pdfTab, linkResponse] = await Promise.all([
      page.waitForEvent('popup'),
      page.waitForResponse((r) => r.url().endsWith(`/tasks/${task.id}/report`) && r.request().method() === 'GET'),
      reportPanel.getByRole('button', { name: 'Télécharger le PDF' }).click(),
    ]);
    const pdfUrl: string = (await linkResponse.json()).url;
    // L'URL ouverte dans l'onglet doit être joignable depuis le navigateur (hôte public, pas « minio »).
    expect(pdfUrl, 'URL signée publique').toMatch(/^http:\/\/localhost:9000\//);
    const pdf = await page.request.get(pdfUrl);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
    await pdfTab.close();

    // Évaluation du client (portail / app) → statut « Évaluée » et visible dans Qualité.
    const client = await ApiClient.login('client');
    const comment = `Travail soigné ${uid()}`;
    await client.post('/evaluations', { taskId: task.id, rating: 4, comment });
    await page.reload();
    await expect(infoValue(taskPanel(page, task.reference), 'Statut')).toHaveText('Évaluée');

    await page.keyboard.press('Escape');
    await navigate(page, 'Qualité', /\/quality$/);
    const evaluation = page.locator('div.rounded-lg.border').filter({ hasText: comment });
    await expect(evaluation).toBeVisible();
    await expect(evaluation).toContainText(title);
    await expect(evaluation).toContainText(task.reference);
    await expect(evaluation).toContainText(DEMO.agent1);
  });

  test('contrôle non conforme : retour en intervention avec motif', async ({ page }) => {
    const sup = await ApiClient.login('supervisor');
    const agent = await ApiClient.login('agent');
    const task = await sup.createTask(`E2E non conforme ${uid()}`);
    await sup.post(`/tasks/${task.id}/assign`, { agentId: agent.user.id });
    await agentDoesFieldWork(agent, task.id);

    await loginAs(page, 'supervisor', `/dispatch?taskId=${task.id}`);
    const panel = taskPanel(page, task.reference);
    await panel.getByRole('button', { name: 'Reprendre (non conforme)' }).click();
    await panel.getByPlaceholder('Commentaire (requis)').fill('Joint mal posé');
    await panel.getByRole('button', { name: 'Confirmer' }).click();
    await expectToast(page, 'Intervention passée à « Reprendre (non conforme) ».');
    await expect(infoValue(panel, 'Statut')).toHaveText('En cours');
    await expect(history(panel)).toContainText('Contrôle → En cours');
    // Plus de transition superviseur « Clôturer » depuis « En cours ».
    await expect(panel.getByRole('button', { name: 'Clôturer' })).toHaveCount(0);
  });
});
