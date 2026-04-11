import test, { expect } from "@playwright/test";

test('can login with seeded owner account', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#username').fill('Owner');
  await page.locator('#password').fill('startowner');
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('section.app-page.home h1')).toBeVisible();
  await expect(page.locator('a[href="/admin"]:visible').first()).toBeVisible(); // Admin Panel should be visible for Owner
  
  await page.locator('a[href="/account"]:visible').first().click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.locator('.account-page .danger-zone button.btn.btn-danger')).toBeDisabled();
});