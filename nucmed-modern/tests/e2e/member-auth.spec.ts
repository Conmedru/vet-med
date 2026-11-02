import { expect, test } from '@playwright/test';

/**
 * Регистрация врача через форму, личный кабинет, выход и вход.
 * Только на локальном сервере с локальной БД и без ключа Unisender (иначе уйдёт письмо и подписка):
 *   UNISENDER_API_KEY= UNISENDER= npm run dev
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/member-auth.spec.ts
 */
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const email = `e2e-vet-${Date.now()}@example.test`;
const password = 'e2e-Test-pass-123';

test.describe.configure({ mode: 'serial' });

test('регистрация врача', async ({ page }) => {
  await page.goto(`${BASE}/register`);

  const textInputs = page.locator('main form input.input');
  await textInputs.nth(0).fill('Тестов');
  await textInputs.nth(1).fill('Тест');
  await textInputs.nth(2).fill('Тестович');

  // Специальность: список должен открываться и пункты — выбираться
  await page.getByRole('button', { name: 'Выберите специальность' }).click();
  await page.getByPlaceholder('Поиск специальности...').fill('Хирург');
  await page.getByRole('option', { name: 'Хирургия' }).click();
  await expect(page.getByRole('button', { name: 'Хирургия' })).toBeVisible();

  await page.locator('main form input[type="email"]').fill(email);
  await page.locator('main form input[type="tel"]').fill('+7 900 000-00-00');
  await page.getByPlaceholder('Начните вводить город').fill('Москва');
  await page.keyboard.press('Escape');
  await page.locator('main form input[type="password"]').fill(password);

  // Обязательные согласия (рассылку не отмечаем)
  for (const text of ['являюсь ветеринарным специалистом', '152-ФЗ', '156-ФЗ']) {
    await page.locator('label', { hasText: text }).getByRole('checkbox').click();
  }

  const response = page.waitForResponse((r) => r.url().includes('/api/member/register'));
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  expect((await response).status()).toBe(200);

  await page.waitForURL(/\/account/);
  await expect(page.getByText('Тест', { exact: false }).first()).toBeVisible();
});

test('повторная регистрация с тем же email отклоняется', async ({ request }) => {
  const res = await request.post(`${BASE}/api/member/register`, {
    data: {
      lastName: 'Тестов', firstName: 'Тест', middleName: 'Тестович', specialty: 'surgery', email, password,
      country: 'Россия', city: 'Москва', interests: [], consentHealthcare: true, consentPd152: true,
      consentPd156: true, consentMarketing: false,
    },
  });
  expect(res.status()).toBe(409);
});

test('вход: неверный пароль, затем верный', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.locator('main input[type="email"]').fill(email);
  await page.locator('main input[type="password"]').fill('wrong-password-1');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('main form')).toContainText(/невер|не найден|ошиб/i);

  await page.locator('main input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/account/);
  await expect(page.getByText(email).or(page.getByText('Тест').first())).toBeVisible();
});
