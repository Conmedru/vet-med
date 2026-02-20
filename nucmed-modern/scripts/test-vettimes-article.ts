import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await ctx.newPage();

  // First load the list page
  await page.goto('https://www.vettimes.co.uk/news/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Get first article link
  const firstLink = await page.locator('.card-main a').first();
  const href = await firstLink.getAttribute('href');
  console.log('First article href:', href);
  
  // Try navigating to full URL with networkidle
  const fullUrl = `https://www.vettimes.co.uk${href}`;
  console.log('Navigating to:', fullUrl);
  
  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const title = await page.title();
  console.log('Page title:', title);
  
  const h1 = await page.locator('h1').first().textContent();
  console.log('h1:', h1?.trim());

  // Check all possible content selectors
  for (const sel of ['article', '.article-content', '.content', '.post-content', '.entry-content', '.single-article', 'main .container', '.article-body', '.vet-article', '.detail-content', '.single-post-content']) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      const text = (await page.locator(sel).first().textContent())?.trim().substring(0, 200);
      console.log(`"${sel}": ${count} | "${text}"`);
    }
  }

  // Dump main children structure
  const structure = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 'no main';
    return main.innerHTML.substring(0, 2000);
  });
  console.log('\n=== MAIN HTML (first 2000 chars) ===');
  console.log(structure);

  await browser.close();
}

main().catch(console.error);
