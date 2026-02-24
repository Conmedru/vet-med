import { chromium } from 'playwright';

async function testVetTimesArticle() {
  console.log('\n=== VET TIMES ARTICLE PAGE ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await ctx.newPage();

  try {
    // Use a known working article URL from the list page
    const url = 'https://www.vettimes.co.uk/news/vets/wellbeing-at-work/rcvs-announces-election-candidates';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log('Page title:', title);

    // Try h1
    const h1 = await page.locator('h1').first().textContent();
    console.log('h1:', h1?.trim().substring(0, 120));

    // Try various content selectors
    for (const sel of ['.article-content', '.content-area', '.post-content', '.entry-content', '.article-body', '.single-article', 'main .content', '.vet-single-article', '.article-detail', '.article-text', '.single-post', '.page-content', 'main']) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const text = (await page.locator(sel).first().textContent())?.trim().substring(0, 200);
        console.log(`"${sel}": ${count} | "${text}"`);
      }
    }

    // Try to find any large text blocks
    const allP = await page.locator('main p').count();
    console.log(`\nmain p tags: ${allP}`);
    
    // Get main article structure
    const mainHtml = await page.locator('main').first().innerHTML();
    // Extract class names of direct children
    const structure = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return 'no main';
      const children = Array.from(main.children).slice(0, 10);
      return children.map(c => `<${c.tagName.toLowerCase()} class="${c.className}">`).join('\n');
    });
    console.log('\nMain structure:\n' + structure);

    // Date and author
    for (const sel of ['time', '.date', '.publish-date', '.article-date', '[datetime]', '.category-date p']) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const text = (await page.locator(sel).first().textContent())?.trim();
        console.log(`Date "${sel}": "${text}"`);
      }
    }

    // Check images
    const imgs = await page.locator('main img').all();
    console.log(`\nMain images: ${imgs.length}`);
    for (let i = 0; i < Math.min(3, imgs.length); i++) {
      const src = await imgs[i].getAttribute('src');
      const alt = await imgs[i].getAttribute('alt');
      console.log(`  img[${i}] alt="${alt}" src=${src?.substring(0, 120)}`);
    }
  } catch (e: any) {
    console.error('Error:', e.message?.substring(0, 300));
  }
  await browser.close();
}

async function testJAVMAAlternative() {
  console.log('\n=== JAVMA - checking alternative RSS feeds ===');
  // Check if AVMA has an accessible Atom/RSS feed at different URLs
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await ctx.newPage();

  const urls = [
    'https://javma.org',
    'https://jav.ma',
    'https://avmajournals.avma.org/view/journals/javma/javma-overview.xml',
    'https://avmajournals.avma.org/rss/recent-javma',
  ];

  for (const url of urls) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = resp?.status();
      const title = await page.title();
      console.log(`${url} → ${status} | "${title?.substring(0, 60)}"`);
    } catch (e: any) {
      console.log(`${url} → ERROR: ${e.message?.substring(0, 100)}`);
    }
  }

  await browser.close();
}

async function main() {
  await testVetTimesArticle();
  await testJAVMAAlternative();
}

main().catch(console.error);
