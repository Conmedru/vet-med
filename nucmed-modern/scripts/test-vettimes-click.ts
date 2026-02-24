import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await ctx.newPage();

  // Load list page first (sets cookies etc)
  await page.goto('https://www.vettimes.co.uk/news/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Click first article link (client-side navigation)
  const link = page.locator('.card-main a').first();
  const href = await link.getAttribute('href');
  console.log('Clicking article:', href);
  
  await link.click();
  await page.waitForTimeout(3000);
  
  const url = page.url();
  console.log('Current URL:', url);
  
  const title = await page.title();
  console.log('Page title:', title);
  
  const h1 = await page.locator('h1').first().textContent();
  console.log('h1:', h1?.trim().substring(0, 120));

  // Check body for article content
  const bodyText = (await page.locator('body').textContent())?.trim().substring(0, 500);
  console.log('Body text:', bodyText);

  // Also test: just get metadata from list page (fallback approach)
  console.log('\n=== LIST PAGE METADATA APPROACH ===');
  await page.goto('https://www.vettimes.co.uk/news/', { waitUntil: 'networkidle', timeout: 30000 });
  
  const cards = await page.locator('.card-main').all();
  console.log(`Total cards: ${cards.length}`);
  
  for (let i = 0; i < Math.min(5, cards.length); i++) {
    const card = cards[i];
    const cardLink = await card.locator('a').first().getAttribute('href');
    const cardTitle = await card.locator('h4.title').textContent();
    const cardDate = await card.locator('.category-date p:last-child').textContent();
    const cardCategory = await card.locator('.article-badge').textContent();
    console.log(`[${i}] "${cardTitle?.trim()}" | ${cardCategory?.trim()} | ${cardDate?.trim()} | ${cardLink}`);
  }

  await browser.close();
}

main().catch(console.error);
