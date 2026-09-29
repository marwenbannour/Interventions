import { expect, type Locator, type Page } from '@playwright/test';

/** Panneau de détail d'une intervention (titre = référence). */
export function taskPanel(page: Page, reference: string): Locator {
  return page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: reference, exact: true }) });
}

/** Valeur d'une ligne « libellé : valeur » du panneau. */
export function infoValue(panel: Locator, label: string): Locator {
  return panel.getByText(label, { exact: true }).locator('xpath=following-sibling::span[1]');
}

export async function openTask(page: Page, taskId: string, reference: string): Promise<Locator> {
  await page.goto(`/dispatch?taskId=${taskId}`);
  const panel = taskPanel(page, reference);
  await expect(panel).toBeVisible();
  return panel;
}

export const history = (panel: Locator) =>
  panel.getByText('Historique', { exact: true }).locator('xpath=following-sibling::ul[1]');
