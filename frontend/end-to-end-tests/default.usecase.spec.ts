import { test, expect } from '@playwright/test';

async function createNewUniqueAccountAndLogin(page: any) {
  const username = `e2e-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'start1234';

  await page.goto('/register');
  await page.locator('#firstName').fill('Playwright');
  await page.locator('#lastName').fill('User');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/login$/);

  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/home$/);

  return { username, password };
}

test('can create category create receipt and delete user account', async ({ page }) => {
  await createNewUniqueAccountAndLogin(page);

  const categoryName = `E2E Category ${Date.now()}`;

  const categoryButton = page.locator('a[href="/categories"]:visible').first();
  await expect(categoryButton).toBeVisible();
  await categoryButton.click();

  await expect(page).toHaveURL(/\/categories$/);

  await page.locator('#category-name').fill(categoryName);
  await page.locator('button.btn.btn-primary.create').click();

  await expect(page.locator('.category-row .item-left strong', { hasText: categoryName })).toBeVisible();

  await page.goto('/receipts/editor');
  await expect(page).toHaveURL(/\/receipts\/editor$/);

  await page.locator('input[formControlName="merchant"]').fill('E2E Market');

  await page.locator('div[formarrayname="items"] div.item-row').first().locator('input[formcontrolname="name"]').fill('Milk');
  await page.locator('div[formarrayname="items"] div.item-row').first().locator('input[formcontrolname="quantity"]').fill('2');
  await page.locator('div[formarrayname="items"] div.item-row').first().locator('input[formcontrolname="unitPrice"]').fill('2.50');

  await page.locator('.category-dropdown .language-trigger').click();
  await expect(page.locator('.category-dropdown .language-option', { hasText: categoryName })).toBeVisible();
  await page.locator('.category-dropdown .language-option', { hasText: categoryName }).click();
  await expect(page.locator('.category-dropdown .language-current')).toContainText(categoryName);

  

  await page.locator('form.editor-shell button[type="submit"]').click();
  await expect(page).toHaveURL(/\/receipts\/list$/);
  await expect(page.locator('.receipts-list .receipt-row')).toHaveCount(1);

  const accountButton = page.locator('a[href="/account"]:visible').first();
  await expect(accountButton).toBeVisible();
  await accountButton.click();

  await expect(page).toHaveURL(/\/account$/);

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.locator('.account-page .danger-zone button.btn.btn-danger').click();
  await expect(page).toHaveURL(/\/login$/);
});