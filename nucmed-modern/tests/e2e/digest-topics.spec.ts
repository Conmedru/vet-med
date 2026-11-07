import { expect, test } from '@playwright/test';

/**
 * Темы во вкладке «Еженедельный дайджест» — те же рубрики, что у «Ленты новостей».
 * Только локально, без ключа Unisender (см. member-auth.spec.ts).
 */
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

test('темы в дайджесте сохраняются в рубриках кабинета', async ({ page }) => {
  const email = `e2e-topics-${Date.now()}@example.test`;
  const reg = await page.request.post(`${BASE}/api/member/register`, {
    data: {
      lastName: 'Тестов', firstName: 'Тест', middleName: 'Тестович', specialty: 'other', specialtyOther: 'тест', email,
      password: 'e2e-Test-pass-123', country: 'Россия', city: 'Москва', interests: [], consentHealthcare: true,
      consentPd152: true, consentPd156: true, consentMarketing: true,
    },
  });
  expect(reg.status()).toBe(200);

  await page.goto(`${BASE}/account`);
  await page.getByRole('tab', { name: 'Еженедельный дайджест' }).click();
  await expect(page.getByText('Интересующие темы')).toBeVisible();

  const before = (await (await page.request.get(`${BASE}/api/member/profile`)).json()).member.rubrics as string[];
  await page.getByRole('button', { name: 'Кошки', exact: true }).click();
  await expect.poll(async () => (await (await page.request.get(`${BASE}/api/member/profile`)).json()).member.rubrics.length).toBe(before.length + 1);
});
