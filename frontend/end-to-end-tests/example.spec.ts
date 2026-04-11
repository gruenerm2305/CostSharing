import { test, expect } from '@playwright/test';

test('shows login page', async ({ page }) => {
  await page.goto('/login');

  await expect(page).toHaveTitle(/Cost Sharing/);
  await expect(page.locator('h1')).toContainText('Cost Sharing');
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await expect(page.locator('a[href="/register"]')).toBeVisible();
});

test('shows register page', async ({ page }) => {
  await page.goto('/register');

  await expect(page).toHaveTitle(/Cost Sharing/);
  await expect(page.locator('h1')).toContainText('Cost Sharing');
  await expect(page.locator('#firstName')).toBeVisible();
  await expect(page.locator('#lastName')).toBeVisible();
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await expect(page.locator('a[href="/login"]')).toBeVisible();
});

test('can register a user and login to home', async ({ page }) => {
  const username = `e2e-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'start1234';

  await page.goto('/login');
  await page.locator('a[href="/register"]').click();

  await expect(page).toHaveURL(/\/register$/);
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
  await expect(page.locator('section.app-page.home h1')).toBeVisible();
});

test('can login with seeded owner account', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#username').fill('Owner');
  await page.locator('#password').fill('startowner');
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('section.app-page.home h1')).toBeVisible();
});
