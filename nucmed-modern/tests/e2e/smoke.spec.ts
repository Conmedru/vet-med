import { test, expect } from '@playwright/test';

test.describe('Neurology Site Smoke Tests', () => {

  test('Homepage loads with correct neurology branding', async ({ page }) => {
    await page.goto('/');

    // Wait for network idle
    await page.waitForLoadState('networkidle');

    // Check title
    await expect(page).toHaveTitle(/Неврология Сегодня/);

    // Check header logo text
    const header = page.locator('header');
    await expect(header).toContainText('Неврология Сегодня');

    // Check for neurology categories keyword in body
    await expect(page.locator('body')).toContainText(/Инсульт|Мозг|Эпилепсия|Неврология/i);

    // Ensure no "nuclear" remains
    const bodyContent = await page.textContent('body');
    expect(bodyContent?.toLowerCase()).not.toContain('nuclear.ru');
    expect(bodyContent?.toLowerCase()).not.toContain('нуклеар.ру');
    expect(bodyContent?.toLowerCase()).not.toContain('ядерной медицины');
  });

  test('Navigation to Category pages works', async ({ page }) => {
    // Test "Stroke" category
    const strokeSlug = 'stroke';
    await page.goto(`/category/${strokeSlug}`);

    // Check category header
    await expect(page.locator('h1')).toContainText(/Инсульт/i);
  });

  test('Article page loads correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for migration/hydration
    await page.waitForLoadState('networkidle');

    // Wait for articles and click the first one that is a news link
    const firstArticle = page.locator('a[href^="/news/"]').first();
    await expect(firstArticle).toBeVisible();

    await firstArticle.click();

    // Expect to be on an article page
    await expect(page).toHaveURL(/\/news\//);

    // Check for article title heading
    await expect(page.locator('h1')).toBeVisible();

    // Ensure no nuclear keywords
    const bodyContent = await page.textContent('body');
    expect(bodyContent?.toLowerCase()).not.toContain('nuclear.ru');
    expect(bodyContent?.toLowerCase()).not.toContain('нуклеар.ру');
  });

  test('Static pages load correctly', async ({ page }) => {
    const pages = [
      { path: '/about', text: 'О нас' },
      { path: '/contact', text: 'Контакты' },
      { path: '/privacy', text: 'Политика' }
    ];

    for (const p of pages) {
      await page.goto(p.path);
      await expect(page.locator('h1')).toBeVisible();

      const bodyContent = await page.textContent('body');
      expect(bodyContent?.toLowerCase()).not.toContain('nuclear.ru');
      expect(bodyContent?.toLowerCase()).not.toContain('нуклеар.ру');
      expect(bodyContent?.toLowerCase()).not.toContain('ядерной медицины');
    }
  });

  test('Admin Auth page loads', async ({ page }) => {
    await page.goto('/admin/auth');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('body')).toContainText('Неврология Сегодня');
  });

});
