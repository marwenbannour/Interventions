import { expect, test } from '@playwright/test';
import { ACCOUNTS, ApiClient, readOtpFromMailpit, uid } from './support/api';
import { loginViaForm, logout } from './support/ui';

test.describe('Authentification', () => {
  test('une page protégée redirige vers la connexion sans session', async ({ page }) => {
    await page.goto('/dispatch');
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('validation du formulaire avant envoi', async ({ page }) => {
    await page.goto('/login');
    // Formulaire vide : messages de validation de l'application.
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Adresse e-mail invalide')).toBeVisible();
    await expect(page.getByText('Mot de passe requis')).toBeVisible();

    // Adresse mal formée : bloquée dès la validation native du navigateur (input type=email).
    const email = page.getByLabel('Adresse e-mail');
    await email.fill('pas-un-email');
    await page.getByLabel('Mot de passe').fill('x');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('mauvais mot de passe : message d’erreur, pas de session', async ({ page }) => {
    await loginViaForm(page, ACCOUNTS.supervisor.email, 'mauvais-mot-de-passe');
    await expect(page.locator('form p.text-destructive')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/dispatch');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('connexion, session conservée au rechargement, puis déconnexion', async ({ page }) => {
    await loginViaForm(page, ACCOUNTS.supervisor.email, ACCOUNTS.supervisor.password);
    // Page d'accueil : tableau de bord.
    await expect(page).toHaveURL(/\/accueil$/);
    await expect(page.getByTestId('sidebar-user')).toContainText('Superviseur');
    await expect(page.getByRole('heading', { name: 'Interventions urgentes' })).toBeVisible();

    // Rechargement : la session est reconstituée depuis le cookie httpOnly (silent refresh).
    await page.reload();
    await expect(page.getByTestId('sidebar-user')).toContainText('Superviseur');
    await expect(page.getByRole('heading', { name: 'Interventions urgentes' })).toBeVisible();

    // Déjà connecté : /login renvoie vers l'accueil.
    await page.goto('/login');
    await expect(page).toHaveURL(/\/accueil$/);

    await logout(page);
    await page.goto('/dispatch');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('double authentification par e-mail (OTP)', async ({ page }) => {
    const admin = await ApiClient.login('admin');
    const email = `e2e-mfa-${uid().toLowerCase()}@demo.fieldops.io`;
    const password = 'E2eMotDePasse1';
    await admin.post('/users', {
      email, password, firstName: 'Mfa', lastName: 'E2E', role: 'SUPERVISOR', mfaEnabled: true, mfaChannel: 'EMAIL',
    });

    const sentAfter = new Date(Date.now() - 1000);
    await loginViaForm(page, email, password);
    await expect(page).toHaveURL(/\/otp\?/);
    await expect(page.getByText('Un code de vérification vous a été envoyé par e-mail.')).toBeVisible();

    // Code mal formé puis code erroné.
    await page.getByLabel('Code de vérification').fill('12');
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page.getByText('Le code doit comporter 6 chiffres')).toBeVisible();

    const code = await readOtpFromMailpit(email, sentAfter);
    const wrong = code === '000000' ? '111111' : '000000';
    await page.getByLabel('Code de vérification').fill(wrong);
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page.locator('form p.text-destructive')).toBeVisible();

    await page.getByLabel('Code de vérification').fill(code);
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page).toHaveURL(/\/accueil$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Mfa');
    await expect(page.locator('aside')).toContainText('Mfa E2E');
  });
});
