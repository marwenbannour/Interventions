import { expect, test } from '@playwright/test';
import { uid } from './support/api';
import { dialog, expectToast, loginAs } from './support/ui';

const row = (panel: import('@playwright/test').Locator, label: string) =>
  panel.getByText(label, { exact: true }).locator('xpath=following-sibling::span[1]');

test.describe('Clients et sites', () => {
  test('créer un client, lui ajouter un site, le modifier puis le désactiver', async ({ page }) => {
    const id = uid();
    const name = `E2E Client ${id}`;
    await loginAs(page, 'supervisor', '/clients');

    // Création avec validation.
    await page.getByRole('button', { name: 'Nouveau client' }).click();
    const create = dialog(page, 'Nouveau client');
    await create.getByRole('button', { name: 'Créer' }).click();
    await expect(create.getByText('Nom requis')).toBeVisible();
    await expect(create.getByText('Code requis')).toBeVisible();
    await create.getByLabel('Nom', { exact: true }).fill(name);
    await create.getByLabel('Code', { exact: true }).fill(`E2E${id}`.slice(0, 20));
    await create.getByLabel('E-mail').fill(`contact-${id.toLowerCase()}@exemple.fr`);
    await create.getByLabel('Référence contrat').fill(`CT-${id}`);
    await create.getByRole('button', { name: 'Créer' }).click();
    await expectToast(page, 'Client créé.');
    await expect(create).toBeHidden();

    // Recherche.
    await page.getByPlaceholder('Rechercher un client…').fill(id);
    const card = page.getByRole('button').filter({ hasText: name });
    await expect(card).toHaveCount(1);
    await card.click();

    const detail = dialog(page, name);
    await expect(row(detail, 'Référence contrat')).toHaveText(`CT-${id}`);
    await expect(detail.getByText('Sites (0)')).toBeVisible();
    await expect(detail.getByText('Aucun site.')).toBeVisible();

    // Nouveau site.
    await detail.getByRole('button', { name: 'Site', exact: true }).click();
    const siteForm = dialog(page, 'Nouveau site');
    await siteForm.getByRole('button', { name: 'Créer' }).click();
    await expect(siteForm.getByText('Nom requis')).toBeVisible();
    await expect(siteForm.getByText('Adresse requise')).toBeVisible();
    await siteForm.getByLabel('Nom', { exact: true }).fill('Siège E2E');
    await siteForm.getByLabel('Adresse', { exact: true }).fill('10 rue de Rivoli');
    await siteForm.getByLabel('Code postal').fill('75004');
    await siteForm.getByLabel('Ville').fill('Paris');
    await siteForm.getByLabel('Contact sur site').fill('Mme Durand');
    await siteForm.getByLabel('Téléphone contact').fill('0102030405');
    await siteForm.getByRole('button', { name: 'Créer' }).click();
    await expectToast(page, 'Site créé.');
    await expect(detail.getByText('Sites (1)')).toBeVisible();
    const site = detail.locator('div.rounded-lg.border').filter({ hasText: 'Siège E2E' });
    await expect(site).toContainText('10 rue de Rivoli');
    await expect(site).toContainText('Mme Durand · 0102030405');

    // Désactivation / réactivation du site.
    await site.getByRole('button', { name: 'Désactiver' }).click();
    await expectToast(page, 'Site désactivé.');
    await expect(site.getByText('Inactif')).toBeVisible();
    await site.getByRole('button', { name: 'Réactiver' }).click();
    await expectToast(page, 'Site réactivé.');

    // Modification du client.
    await detail.getByRole('button', { name: 'Modifier' }).first().click();
    const edit = dialog(page, 'Modifier le client');
    await expect(edit.getByLabel('Nom', { exact: true })).toHaveValue(name);
    await edit.getByLabel('Téléphone').fill('0199887766');
    await edit.getByRole('button', { name: 'Enregistrer' }).click();
    await expectToast(page, 'Client mis à jour.');
    await expect(row(detail, 'Téléphone')).toHaveText('0199887766');

    // Désactivation du client (ses boutons précèdent ceux des sites dans le panneau).
    await detail.getByRole('button', { name: 'Désactiver' }).first().click();
    await expectToast(page, 'Client désactivé.');
    await expect(detail.getByText('Inactif').first()).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Réactiver' }).first()).toBeVisible();
    await expect(site.getByRole('button', { name: 'Désactiver' })).toBeVisible(); // le site, lui, reste actif
  });

  test('un code client déjà utilisé est refusé', async ({ page }) => {
    await loginAs(page, 'supervisor', '/clients');
    await page.getByRole('button', { name: 'Nouveau client' }).click();
    const create = dialog(page, 'Nouveau client');
    await create.getByLabel('Nom', { exact: true }).fill(`Doublon ${uid()}`);
    await create.getByLabel('Code', { exact: true }).fill('CSM'); // code de la Clinique Saint-Martin
    await create.getByRole('button', { name: 'Créer' }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible();
    await expect(create).toBeVisible();
  });
});
