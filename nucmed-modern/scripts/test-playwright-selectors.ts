import { chromium } from 'playwright';

async function testJAVMA() {
  console.log('\n=== JAVMA NEWS ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  try {
    await page.goto('https://www.avma.org/javma-news', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log('Page title:', title);

    // Try common article list selectors
    for (const sel of ['article', '.views-row', '.node--type-article', '.view-content .item-list li', 'h3 a', '.field-content a', '.card', '.news-item', '.article-teaser', 'a[href*="/javma-news/"]']) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        console.log(`Selector "${sel}": ${count} elements`);
        const first = page.locator(sel).first();
        const tag = await first.evaluate(el => el.tagName);
        const text = (await first.textContent())?.trim().substring(0, 100);
        const href = await first.getAttribute('href');
        console.log(`  tag=${tag}, text="${text}", href=${href}`);
      }
    }

    // Dump outer HTML of first few links
    const links = await page.locator('a[href*="/javma-news/"]').all();
    console.log(`\nLinks with /javma-news/: ${links.length}`);
    for (let i = 0; i < Math.min(3, links.length); i++) {
      const href = await links[i].getAttribute('href');
      const text = (await links[i].textContent())?.trim().substring(0, 80);
      console.log(`  [${i}] href=${href} text="${text}"`);
    }
  } catch (e: any) {
    console.error('JAVMA error:', e.message);
  }

  await browser.close();
}

async function testVetTimes() {
  console.log('\n=== VET TIMES ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  try {
    await page.goto('https://www.vettimes.co.uk/news/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log('Page title:', title);

    for (const sel of ['article', '.article-card', '.card-main', 'a[href*="/news/"]', '.news-item', 'h4.title', 'h3.title', '.card-main a']) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        console.log(`Selector "${sel}": ${count} elements`);
        const first = page.locator(sel).first();
        const tag = await first.evaluate(el => el.tagName);
        const text = (await first.textContent())?.trim().substring(0, 100);
        const href = await first.getAttribute('href');
        console.log(`  tag=${tag}, text="${text}", href=${href}`);
      }
    }

    // All news links
    const links = await page.locator('.card-main a').all();
    console.log(`\ncard-main links: ${links.length}`);
    for (let i = 0; i < Math.min(5, links.length); i++) {
      const href = await links[i].getAttribute('href');
      const text = (await links[i].textContent())?.trim().substring(0, 80);
      console.log(`  [${i}] href=${href} text="${text}"`);
    }
  } catch (e: any) {
    console.error('Vet Times error:', e.message);
  }

  await browser.close();
}

async function main() {
  await testJAVMA();
  await testVetTimes();
}

main().catch(console.error);
