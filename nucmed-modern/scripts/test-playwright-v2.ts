import { chromium } from 'playwright';

async function testJAVMAStealth() {
  console.log('\n=== JAVMA NEWS (stealth) ===');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });

  // Remove webdriver flag
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await ctx.newPage();

  try {
    console.log('Navigating to JAVMA...');
    await page.goto('https://www.avma.org/javma-news', { waitUntil: 'networkidle', timeout: 45000 });
    
    const title = await page.title();
    console.log('Page title:', title);
    
    const bodyText = await page.locator('body').textContent();
    console.log('Body text (first 500):', bodyText?.trim().substring(0, 500));
    
    // Check for Imperva challenge
    const html = await page.content();
    if (html.includes('incapsula') || html.includes('_Incapsula_Resource')) {
      console.log('⚠️ Imperva challenge page detected');
    }
    
    // Check for articles anyway
    const links = await page.locator('a').all();
    console.log(`Total links: ${links.length}`);
    
    // Try to find news/article content
    for (const sel of ['.views-row', '.node--type-article', 'article', 'h2 a', 'h3 a']) {
      const count = await page.locator(sel).count();
      if (count > 0) console.log(`"${sel}": ${count} elements`);
    }
  } catch (e: any) {
    console.error('JAVMA error:', e.message?.substring(0, 200));
  }
  await browser.close();
}

async function testVetTimesArticle() {
  console.log('\n=== VET TIMES ARTICLE PAGE ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await ctx.newPage();

  try {
    await page.goto('https://www.vettimes.co.uk/news/business/practice-developments/building-work-to-transform-116-year-old-veterinary-practice', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log('Title:', title);

    for (const sel of ['h1', '.article-content', '.content', '.post-content', 'article', '.article-body', '.single-article', 'main article', '.entry-content', '.article-detail']) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const text = (await page.locator(sel).first().textContent())?.trim().substring(0, 150);
        console.log(`"${sel}": ${count} | "${text}"`);
      }
    }
    
    // Date selectors
    for (const sel of ['time', '.date', '.publish-date', '.article-date', '[datetime]', '.category-date']) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const text = (await page.locator(sel).first().textContent())?.trim();
        const datetime = await page.locator(sel).first().getAttribute('datetime');
        console.log(`Date "${sel}": "${text}" datetime=${datetime}`);
      }
    }

    // Author
    for (const sel of ['.author', '.byline', '[rel="author"]', '.article-author']) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const text = (await page.locator(sel).first().textContent())?.trim();
        console.log(`Author "${sel}": "${text}"`);
      }
    }

    // Images
    const imgs = await page.locator('article img, .article-content img, main img').all();
    console.log(`Images in article: ${imgs.length}`);
    for (let i = 0; i < Math.min(3, imgs.length); i++) {
      const src = await imgs[i].getAttribute('src');
      console.log(`  img[${i}] src=${src?.substring(0, 100)}`);
    }
  } catch (e: any) {
    console.error('Vet Times article error:', e.message);
  }
  await browser.close();
}

async function main() {
  await testJAVMAStealth();
  await testVetTimesArticle();
}

main().catch(console.error);
