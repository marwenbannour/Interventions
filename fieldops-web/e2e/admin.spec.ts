import { expect, test } from '@playwright/test';
import { DEMO, uid } from './support/api';
import { choose, dialog, expectToast, loginAs } from './support/ui';

test.describe('Administration', () => {
  test('comptes : validation, création d’un compte client, suspension', async ({ page }) => {
    const id = uid().toLowerCase();
    const email = `client-${id}@exemple.fr`;
    await loginAs(page, 'admin', '/admin/users');

    await page.getByRole('button', { name: 'Nouveau compte' }).click();
    const form = dialog(page, 'Nouveau compte');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expect(form.getByText('Prénom requis')).toBeVisible();
    await expect(form.getByText('Nom requis', { exact: true })).toBeVisible();
    await expect(form.getByText('E-mail invalide')).toBeVisible();

    await form.getByLabel('Prénom').fill('Claire');
    await form.getByLabel('Nom', { exact: true }).fill(`Client${id}`);
    await form.getByLabel('E-mail').fill(email);
    await form.getByLabel('Mot de passe').fill('faible');
    await choose(page, form, 'Rôle', 'Client');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expect(form.getByText(/Mot de passe : 10 caractères minimum/)).toBeVisible();
    await expect(form.getByText('Client requis')).toBeVisible();

    await form.getByLabel('Mot de passe').fill('ClientE2e1234');
    await choose(page, form, 'Client rattaché', DEMO.hotel);
    await form.getByRole('button', { name: 'Créer' }).click();
    await expectToast(page, 'Compte créé.');

    await page.getByPlaceholder('Rechercher…').fill(email);
    const account = page.getByRole('button').filter({ hasText: email });
    await expect(account).toContainText('Client');
    await expect(account).toContainText('Actif');

    await account.click();
    const edit = dialog(page, 'Modifier le compte');
    await expect(edit.getByLabel('E-mail')).toHaveCount(0); // e-mail non modifiable
    await choose(page, edit, 'Statut', 'Suspendu');
    await edit.getByRole('button', { name: 'Enregistrer' }).click();
    await expectToast(page, 'Compte mis à jour.');
    await expect(account).toContainText('Suspendu');

    // Un compte suspendu ne peut plus se connecter.
    const res = await page.request.post('/api/auth/login', { data: { email, password: 'ClientE2e1234' } });
    expect(res.ok()).toBe(false);
  });

  test('organisation : créer, modifier et supprimer une zone', async ({ page }) => {
    const code = `Z${uid()}`.slice(0, 12);
    await loginAs(page, 'admin', '/admin/organization');
    await expect(page.getByText('Paris Nord')).toBeVisible();

    await page.getByRole('button', { name: 'Zone', exact: true }).click();
    const form = dialog(page, 'Nouvelle zone');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expect(form.getByText('Nom requis')).toBeVisible();
    await form.getByLabel('Nom').fill(`Zone ${code}`);
    await form.getByLabel('Code').fill(code);
    await form.getByLabel('Description').fill('Créée par le test E2E');
    await form.getByRole('button', { name: 'Créer' }).click();
    await expectToast(page, 'Zone créée.');

    const zone = page.locator('div.rounded-lg.border').filter({ hasText: `Zone ${code}` });
    await expect(zone).toContainText(`(${code})`);
    await zone.getByRole('button').first().click();
    const edit = dialog(page, 'Modifier la zone');
    await edit.getByLabel('Nom').fill(`Zone ${code} renommée`);
    await edit.getByRole('button', { name: 'Enregistrer' }).click();
    await expectToast(page, 'Zone mise à jour.');
    await expect(zone).toContainText('renommée');

    await zone.getByRole('button').last().click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText(`Supprimer Zone ${code} renommée ?`);
    await confirm.getByRole('button', { name: 'Supprimer' }).click();
    await expectToast(page, 'Zone supprimée.');
    await expect(zone).toHaveCount(0);
  });

  test('workflows : consultation des états et transitions', async ({ page }) => {
    await loginAs(page, 'admin', '/admin/workflows');
    const standard = page.getByRole('button').filter({ hasText: 'Intervention standard (maintenance)' });
    await expect(standard).toContainText('STANDARD');
    await standard.click();
    const sheet = dialog(page, 'Intervention standard (maintenance)');
    await expect(sheet.getByText(/États \(\d+\)/)).toBeVisible();
    await expect(sheet.getByText(/Transitions \(\d+\)/)).toBeVisible();
    await expect(sheet.getByText('Clôturer').first()).toBeVisible();
  });

  test('intégrations : clé d’API et webhook (secret affiché une seule fois), révocation', async ({ page }) => {
    const id = uid();
    await loginAs(page, 'admin', '/admin/integrations');
    page.on('dialog', (d) => d.accept()); // confirmations natives (révocation, suppression)

    // Clé d'API.
    await page.getByRole('button', { name: 'Clé', exact: true }).click();
    const keyForm = dialog(page, "Nouvelle clé d'API");
    await keyForm.getByLabel('Nom').fill(`ERP ${id}`);
    await keyForm.getByRole('button', { name: 'Créer la clé' }).click();
    const reveal = dialog(page, "Clé d'API créée");
    await expect(reveal.locator('code')).toHaveText(/^fo_[a-z0-9]+_/i);
    await reveal.getByRole('button', { name: "J'ai copié la valeur" }).click();
    await expect(reveal).toBeHidden();

    const key = page.locator('div.py-2').filter({ hasText: `ERP ${id}` });
    await expect(key).toContainText('Active');
    await expect(key).toContainText('2 scope(s)');
    await key.getByRole('button', { name: 'Révoquer' }).click();
    await expect(key).toContainText('Révoquée');

    // Webhook.
    await page.getByRole('button', { name: 'Abonnement' }).click();
    const hookForm = dialog(page, 'Nouvel abonnement webhook');
    await hookForm.getByLabel('Nom').fill(`GMAO ${id}`);
    await hookForm.getByLabel('URL de réception').fill('https://example.com/fieldops-hook');
    await hookForm.getByLabel('Intervention créée').check();
    await hookForm.getByRole('button', { name: 'Créer' }).click();
    const secret = dialog(page, 'Secret de signature');
    await expect(secret.locator('code')).toHaveText(/^whsec_/);
    await secret.getByRole('button', { name: "J'ai copié la valeur" }).click();

    const hook = page.locator('div.py-2').filter({ hasText: `GMAO ${id}` });
    await expect(hook).toContainText('https://example.com/fieldops-hook');
    await expect(hook).toContainText('Changement de statut, Intervention créée');
    await hook.getByRole('button', { name: 'Suspendre' }).click();
    await expect(hook).toContainText('Suspendu');
    await hook.getByRole('button', { name: 'Livraisons' }).click();
    await expect(dialog(page, `Livraisons — GMAO ${id}`)).toBeVisible();
    await page.keyboard.press('Escape');
    await hook.getByRole('button').last().click(); // corbeille
    await expect(hook).toHaveCount(0);
  });

  test('audit : les actions d’administration sont journalisées et filtrables', async ({ page }) => {
    await loginAs(page, 'admin', '/admin/audit');
    await expect(page.getByText(/\d+ entrées?/).first()).toBeVisible();
    await page.getByLabel('Action').fill('user.create');
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toContainText('user.create');
    for (const r of await rows.all()) await expect(r).toContainText('user.create');
  });
});
