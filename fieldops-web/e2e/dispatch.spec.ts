import { expect, test } from '@playwright/test';
import { ApiClient, DEMO, uid } from './support/api';
import { history, infoValue, openTask, taskPanel } from './support/task-panel';
import { choose, dialog, expectToast, loginAs } from './support/ui';

test.describe('Dispatch', () => {
  test('créer une intervention depuis la console (validation puis succès)', async ({ page }) => {
    const title = `E2E création ${uid()}`;
    await loginAs(page, 'supervisor');
    await page.getByRole('button', { name: 'Nouvelle intervention' }).click();
    const form = dialog(page, 'Nouvelle intervention');
    await expect(form).toBeVisible();

    // Champs obligatoires.
    await form.getByRole('button', { name: 'Créer' }).click();
    await expect(form.getByText('Titre requis')).toBeVisible();
    await expect(form.getByText('Site requis')).toBeVisible();

    // Cascade client → site (le site est désactivé tant qu'aucun client n'est choisi).
    await expect(form.getByText('Site *', { exact: true }).locator('xpath=..').locator('[data-slot="select-trigger"]')).toBeDisabled();
    await choose(page, form, 'Client', DEMO.clinique);
    await choose(page, form, 'Site *', DEMO.siteA);
    await choose(page, form, 'Priorité', 'Haute');
    await choose(page, form, 'Type', 'REPAIR');
    await form.getByLabel('Titre *').fill(title);
    await form.getByLabel('Compétences requises').fill('plomberie');
    await form.getByLabel('Description').fill('Créée par le test E2E');
    await form.getByLabel('Checklist (un point par ligne)').fill('Couper l’eau\nRemplacer le joint');
    await form.getByRole('button', { name: 'Créer' }).click();

    // « … créée — réintervention détectée. » si une intervention récente existe déjà sur ce site.
    await expectToast(page, /INT-\d{4}-\d{6} créée( — réintervention détectée)?\./);
    await expect(form).toBeHidden();
    await expect(page).toHaveURL(/\/dispatch\?taskId=/);

    const panel = page.getByRole('dialog').filter({ hasText: title });
    await expect(panel.getByRole('heading', { name: /^INT-\d{4}-\d{6}$/ })).toBeVisible();
    await expect(infoValue(panel, 'Statut')).toHaveText('Créée');
    await expect(infoValue(panel, 'Type')).toHaveText('REPAIR');
    await expect(infoValue(panel, 'Site')).toHaveText(DEMO.siteA);
    await expect(infoValue(panel, 'Client')).toHaveText(DEMO.clinique);
    await expect(infoValue(panel, 'Agent')).toHaveText('Non affectée');
    await expect(panel.getByText('Saisie opérateur')).toBeVisible();
    await expect(panel.getByText('Couper l’eau *')).toBeVisible();
    await expect(panel.getByText('Remplacer le joint *')).toBeVisible();
    await expect(history(panel)).toContainText('Intervention créée');

    // L'affectation est une condition de la transition « Assigner ».
    await expect(panel.getByText('Conditions manquantes : Aucun agent affecté')).toBeVisible();
  });

  test('affecter via les suggestions, ajouter une note, désaffecter', async ({ page }) => {
    const sup = await ApiClient.login('supervisor');
    const task = await sup.createTask(`E2E affectation ${uid()}`, { requiredSkills: ['ELECTRICITE'] });

    await loginAs(page, 'supervisor', `/dispatch?taskId=${task.id}`);
    const panel = taskPanel(page, task.reference);
    await expect(panel).toBeVisible();

    await panel.getByRole('button', { name: 'Affecter' }).click();
    const assign = dialog(page, 'Affecter un agent');
    const karim = assign.locator('div.rounded-lg').filter({ hasText: DEMO.agent1 });
    await expect(karim).toBeVisible();
    // Julie Moreau n'a pas la compétence ELECTRICITE : elle n'est pas proposée.
    await expect(assign.getByText('Julie Moreau')).toHaveCount(0);
    await karim.getByRole('button', { name: 'Choisir' }).click();
    await expectToast(page, 'Intervention affectée.');
    await expect(infoValue(panel, 'Agent')).toHaveText(DEMO.agent1);
    await expect(infoValue(panel, 'Statut')).toHaveText('Affectée');
    await expect(panel.getByRole('button', { name: 'Réaffecter' })).toBeVisible();

    const note = `Accès par le parking ${uid()}`;
    const noteInput = panel.getByPlaceholder('Ajouter une note…');
    await expect(panel.getByRole('button', { name: 'Ajouter', exact: true })).toBeDisabled();
    await noteInput.fill(note);
    await noteInput.press('Enter');
    await expect(noteInput).toHaveValue('');
    await expect(history(panel)).toContainText(note);

    await panel.getByRole('button', { name: 'Désaffecter' }).click();
    await expectToast(page, 'Intervention désaffectée.');
    await expect(infoValue(panel, 'Agent')).toHaveText('Non affectée');
    await expect(history(panel)).toContainText('Désaffectée');
  });

  test('annuler une intervention exige un motif', async ({ page }) => {
    const sup = await ApiClient.login('supervisor');
    const task = await sup.createTask(`E2E annulation ${uid()}`);
    await loginAs(page, 'supervisor', `/dispatch?taskId=${task.id}`);
    const panel = taskPanel(page, task.reference);

    await panel.getByRole('button', { name: 'Annuler', exact: true }).click();
    const confirm = panel.getByRole('button', { name: 'Confirmer' });
    await expect(confirm).toBeDisabled();
    await panel.getByPlaceholder('Commentaire (requis)').fill('Doublon — test E2E');
    await confirm.click();
    await expectToast(page, 'Intervention passée à « Annuler ».');
    await expect(infoValue(panel, 'Statut')).toHaveText('Annulée');
    await expect(history(panel)).toContainText('Créée → Annulée');
  });

  test('kanban : colonne de l’agent et ouverture du détail', async ({ page }) => {
    const sup = await ApiClient.login('supervisor');
    const title = `E2E kanban ${uid()}`;
    const task = await sup.createTask(title, { scheduledStart: new Date(Date.now() + 3_600_000).toISOString() });
    await sup.post(`/tasks/${task.id}/assign`, { agentId: await sup.agentUserId(DEMO.agent3) });

    await loginAs(page, 'supervisor');
    await expect(page.getByText('Non affectées', { exact: true })).toBeVisible();
    const card = page.getByRole('button').filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card).toContainText(task.reference);
    await card.click();
    const panel = taskPanel(page, task.reference);
    await expect(panel).toBeVisible();
    await expect(infoValue(panel, 'Agent')).toHaveText(DEMO.agent3);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('vue tableau : recherche, filtres et lien direct', async ({ page }) => {
    const sup = await ApiClient.login('supervisor');
    const title = `E2E tableau ${uid()}`;
    const task = await sup.createTask(title, { priority: 'URGENT' });

    await loginAs(page, 'supervisor');
    await page.getByRole('button', { name: 'Tableau', exact: true }).click();
    await expect(page.getByText(/\d+ interventions?/).first()).toBeVisible();

    await page.getByPlaceholder('Référence, titre, site…').fill(task.reference);
    const row = page.locator('tbody tr').filter({ hasText: task.reference });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(title);
    await expect(row).toContainText('Urgente');
    await expect(row).toContainText('Non affectée');

    // Filtre incompatible → plus de résultat ; filtre compatible → la ligne revient.
    const filters = page.locator('main');
    await choose(page, filters, 'Priorité', 'Basse');
    await expect(page.getByText('Aucune intervention pour ces filtres.')).toBeVisible();
    await choose(page, filters, 'Priorité', 'Urgente');
    await choose(page, filters, 'Statut', 'Créée');
    await expect(row).toHaveCount(1);

    await row.click();
    await expect(taskPanel(page, task.reference)).toBeVisible();

    // Lien direct (ex. depuis une notification) puis fermeture → retour à /dispatch.
    const panel = await openTask(page, task.id, task.reference);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(/\/dispatch$/);
  });
});
