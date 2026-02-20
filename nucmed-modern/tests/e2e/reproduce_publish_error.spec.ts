import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('reproduce article publication error', async ({ page, context }) => {
    test.setTimeout(90000);

    const BASE_URL = 'http://localhost:3001';
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    page.on('console', msg => {
        console.log(`PAGE ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    // 1. Login
    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/admin/auth`, { waitUntil: 'load' });

    await page.fill('input[type="email"]', 'superadmin@neurology.today');
    await page.fill('input[type="password"]', 'super-neurology-2026');
    await page.click('button[type="submit"]');

    // Wait for ANY redirect away from auth
    console.log('Waiting for login redirect...');
    await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 20000 });
    console.log('Logged in. Current URL:', page.url());

    // 2. Go to specific article
    const articleId = 'cml3jcdaz001fn96kknzpqsr7';
    console.log(`Navigating to article ${articleId}...`);
    await page.goto(`${BASE_URL}/admin/articles/${articleId}`, { waitUntil: 'load' });

    // 3. Ensure Category & Save if needed
    console.log('Ensuring category is set...');
    const categorySelect = page.locator('select').first();
    await categorySelect.waitFor({ state: 'visible', timeout: 10000 });

    const currentCategory = await categorySelect.inputValue();
    if (!currentCategory) {
        console.log('Setting category to index 1...');
        await categorySelect.selectOption({ index: 1 });
        console.log('Saving category...');
        await page.click('button:has-text("Сохранить")');
        // Wait for the success div
        await page.waitForSelector('text=Изменения сохранены', { timeout: 10000 });
        console.log('Category saved.');
    } else {
        console.log('Category already set:', currentCategory);
    }

    // 4. Publish
    console.log('Preparing to publish...');
    page.on('dialog', async dialog => {
        console.log('Confirm Dialog:', dialog.message());
        await dialog.accept();
    });

    const publishButton = page.locator('button:has-text("Опубликовать")').first();
    await publishButton.waitFor({ state: 'visible' });

    console.log('Clicking "Опубликовать"...');

    // Listen for the specific PATCH request
    const patchPromise = page.waitForResponse(res =>
        res.url().includes(`/api/articles/${articleId}`) &&
        res.request().method() === 'PATCH' &&
        res.request().postDataJSON()?.status === 'PUBLISHED',
        { timeout: 30000 }
    ).catch(e => {
        console.log('Timeout or error waiting for PATCH response:', e.message);
        return null;
    });

    await publishButton.click();

    const response = await patchPromise;
    if (response) {
        console.log(`Publish response status: ${response.status()}`);
        const responseBody = await response.json().catch(() => ({}));
        console.log('Publish response body:', JSON.stringify(responseBody, null, 2));
    } else {
        console.log('No PATCH response captured (timeout)');
    }

    // Check for any toast messages (sonner is used for publish toasts)
    await page.waitForTimeout(3000);
    const toasts = page.locator('[data-sonner-toast]');
    const toastCount = await toasts.count();
    console.log(`Found ${toastCount} sonner toasts.`);
    for (let i = 0; i < toastCount; i++) {
        console.log(`Toast ${i}:`, await toasts.nth(i).innerText());
    }

    await page.screenshot({ path: path.join(screenshotsDir, 'final_result_v4.png') });
});
