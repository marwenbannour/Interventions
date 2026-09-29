import { expect, test } from '@playwright/test';
import { DEMO, uid } from './support/api';
import { choose, dialog, expectToast, loginAs } from './support/ui';

test.describe('Équipements', () => {
  test('créer un équipement (code auto), consulter sa fiche QR, le passer hors service', async ({ page }) => {
    const name = `Pompe E2E ${uid()}`;
    await loginAs(page, 'supervisor', '/assets');

    await page.getByRole('button', { name: 'Nouvel équipement' }).click();
    const form = dialog(page, 'Nouvel équipement');
    await form.getByLabel('Code').fill('code invalide!');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expect(form.getByText('Nom requis')).toBeVisible();
    await expect(form.getByText('Site requis')).toBeVisible();
    await expect(form.getByText('Lettres, chiffres, . _ - uniquement')).toBeVisible();

    await form.getByLabel('Code').fill(''); // code attribué automatiquement
    await choose(page, form, 'Client', DEMO.clinique);
    await choose(page, form, 'Site *', DEMO.siteA);
    await form.getByLabel('Nom *').fill(name);
    await form.getByLabel('Catégorie').fill('PLOMBERIE');
    await form.getByLabel('Emplacement').fill('Sous-sol, local technique');
    await form.getByLabel('Marque').fill('Grundfos');
    await form.getByLabel('Modèle').fill('CR 5-10');
    await form.getByRole('button', { name: 'Créer' }).click();

    const toast = page.locator('[data-sonner-toast]').filter({ hasText: /Équipement EQ-\d{6} créé\./ });
    await expect(toast).toBeVisible();
    const code = /EQ-\d{6}/.exec((await toast.textContent()) ?? '')![0];

    await page.getByPlaceholder('Code, nom, n° de série…').fill(code);
    const row = page.locator('tbody tr').filter({ hasText: code });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(name);
    await expect(row).toContainText('Grundfos · CR 5-10');
    await expect(row).toContainText('En service');
    await row.click();

    const sheet = dialog(page, `${code} — ${name}`);
    const qr = sheet.getByRole('img', { name: `QR ${code}` });
    await expect(qr).toBeVisible();
    expect(await qr.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await expect(sheet.getByRole('button', { name: "Imprimer l'étiquette" })).toBeEnabled();
    await expect(sheet.getByText('Aucune intervention.')).toBeVisible();

    await sheet.getByRole('button', { name: 'Modifier' }).click();
    const edit = dialog(page, `Modifier ${code}`);
    await expect(edit.getByLabel('Code')).toBeDisabled();
    await choose(page, edit, 'Statut', 'Hors service');
    await edit.getByRole('button', { name: 'Enregistrer' }).click();
    await expectToast(page, 'Équipement mis à jour.');

    await page.keyboard.press('Escape');
    await expect(row).toContainText('Hors service');
    // Filtre de statut (sans libellé : on passe par son déclencheur).
    await page.locator('main [data-slot="select-trigger"]').filter({ hasText: 'Tous statuts' }).click();
    await page.getByRole('option', { name: 'En service' }).click();
    await expect(page.getByText('Aucun équipement.')).toBeVisible();
    await page.locator('main [data-slot="select-trigger"]').filter({ hasText: 'En service' }).click();
    await page.getByRole('option', { name: 'Hors service' }).click();
    await expect(row).toHaveCount(1);
  });

  test('un code d’équipement déjà attribué est refusé', async ({ page }) => {
    await loginAs(page, 'supervisor', '/assets');
    await page.getByRole('button', { name: 'Nouvel équipement' }).click();
    const form = dialog(page, 'Nouvel équipement');
    await choose(page, form, 'Client', DEMO.clinique);
    await choose(page, form, 'Site *', DEMO.siteA);
    await form.getByLabel('Nom *').fill('Doublon');
    await form.getByLabel('Code').fill('EQ-000001');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible();
    await expect(form).toBeVisible();
  });
});

test.describe('Maintenance préventive', () => {
  test('créer un plan, générer l’intervention, suspendre, modifier', async ({ page }) => {
    const name = `Plan E2E ${uid()}`;
    await loginAs(page, 'supervisor', '/maintenance');

    await page.getByRole('button', { name: 'Nouveau plan' }).click();
    const form = dialog(page, 'Nouveau plan de maintenance préventive');
    await form.getByRole('button', { name: 'Créer le plan' }).click();
    await expect(form.getByText('Nom du plan et titre de l’intervention requis.')).toBeVisible();

    await form.getByLabel('Nom du plan *').fill(name);
    await form.getByLabel('Titre *').fill('Contrôle pompe de relevage');
    await form.getByRole('button', { name: 'Créer le plan' }).click();
    await expect(form.getByText('Site requis.')).toBeVisible();

    await choose(page, form, 'Client', DEMO.clinique);
    await choose(page, form, 'Site *', DEMO.siteA);
    await choose(page, form, 'Fréquence', 'Hebdomadaire');
    await form.getByLabel('Intervalle').fill('2');
    // Délai de préparation hors bornes : refusé par la validation native (max=90), rien n'est créé.
    const lead = form.getByLabel("Créer l'intervention (jours avant)");
    await lead.fill('120');
    await form.getByRole('button', { name: 'Créer le plan' }).click();
    expect(await lead.evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
    await expect(form).toBeVisible();
    await lead.fill('3');
    await expect(form.getByText('Tous les 2 semaines — intervention créée 3 jour(s) avant chaque échéance.')).toBeVisible();
    await form.getByLabel('Compétences').fill('plomberie');
    await form.getByLabel('Checklist (un point par ligne)').fill('Test de démarrage\nNettoyage crépine');
    await form.getByRole('button', { name: 'Créer le plan' }).click();
    await expectToast(page, 'Plan de maintenance créé.');

    const row = page.locator('tbody tr').filter({ hasText: name });
    await expect(row).toContainText('Contrôle pompe de relevage · 2 point(s) de contrôle');
    await expect(row).toContainText('Tous les 2 semaines');
    await expect(row).toContainText('préparation J-3');
    await expect(row).toContainText('Actif');

    // Aperçu des prochaines échéances.
    await row.locator('td').nth(3).getByRole('button').click();
    await expect(row.locator('td').nth(3).locator('span.rounded')).not.toHaveCount(0);

    // Génération manuelle de l'échéance.
    await row.getByRole('button', { name: 'Générer' }).click();
    await expectToast(page, /Intervention INT-\d{4}-\d{6} créée|Cette échéance a déjà été générée/);
    await expect(row.locator('td').nth(4)).not.toHaveText(/^0/);

    await row.getByRole('button', { name: 'Suspendre' }).click();
    await expect(row).toContainText('Suspendu');
    await row.getByRole('button', { name: 'Réactiver' }).click();
    await expect(row).toContainText('Actif');

    await row.getByRole('button').last().click();
    const edit = dialog(page, 'Modifier le plan');
    await expect(edit.getByLabel('Nom du plan *')).toHaveValue(name);
    await edit.getByLabel('Titre *').fill('Contrôle pompe (révisé)');
    await edit.getByRole('button', { name: 'Enregistrer' }).click();
    await expectToast(page, 'Plan mis à jour.');
    await expect(row).toContainText('Contrôle pompe (révisé)');
  });
});
