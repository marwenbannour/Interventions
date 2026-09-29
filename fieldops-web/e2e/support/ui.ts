import { expect, type Locator, type Page } from '@playwright/test';
import { ACCOUNTS, type AccountKey } from './api';

/**
 * Connexion rapide : passe par la route BFF /api/auth/login (comme le formulaire), qui pose le
 * cookie de refresh httpOnly dans le contexte du navigateur. Le parcours du formulaire lui-même
 * est couvert par auth.spec.ts.
 */
export async function loginAs(page: Page, account: AccountKey, path = '/dispatch') {
  const { email, password, name: roleLabel } = ACCOUNTS[account];
  const res = await page.request.post('/api/auth/login', { data: { email, password } });
  expect(res.ok(), `connexion ${email} : HTTP ${res.status()}`).toBeTruthy();
  await page.goto(path);
  // Le shell n'est rendu qu'une fois la session reconstituée depuis le cookie (silent refresh) ;
  // la carte utilisateur de la barre latérale affiche alors le rôle.
  await expect(page.getByTestId('sidebar-user')).toContainText(roleLabel);
}

export async function loginViaForm(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

export const sidebar = (page: Page) => page.locator('aside nav');

/** Navigation côté client (sans rechargement, donc sans nouvel appel de refresh). */
export async function navigate(page: Page, label: string, expectedPath: string | RegExp) {
  // Préfixe : le lien Notifications inclut le compteur de non-lues dans son nom accessible.
  await sidebar(page).getByRole('link', { name: new RegExp(`^${label}`) }).click();
  await expect(page).toHaveURL(expectedPath);
}

export const dialog = (page: Page, title: string | RegExp) =>
  page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: title }) });

/** Panneau latéral (Sheet) identifié par son titre. */
export const sheet = dialog;

/** Sélection Base UI : le libellé visible précède le déclencheur dans le même bloc. */
export async function choose(page: Page, scope: Locator, label: string, option: string | RegExp) {
  const trigger = scope.getByText(label, { exact: true }).locator('xpath=..').locator('[data-slot="select-trigger"]');
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}

export async function logout(page: Page) {
  // Les toasts s'affichent en haut à droite, par-dessus le menu du compte, et restent ouverts tant
  // qu'ils sont survolés : on éloigne la souris et on attend qu'ils disparaissent.
  await page.mouse.move(10, 450);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15_000 });
  await page.locator('header').getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
