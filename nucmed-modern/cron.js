const CRON_SECRET = process.env.CRON_SECRET;
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

if (!CRON_SECRET) {
  console.error('[Internal Cron] CRON_SECRET is missing! Cron will fail to authenticate.');
}

console.log(`[Internal Cron] Starting scheduler for ${BASE_URL}`);

async function runTask(name, path) {
  console.log(`[Internal Cron] Triggering ${name} (${path})...`);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'Internal-Cron/1.0'
      }
    });
    
    if (res.ok) {
      console.log(`[Internal Cron] ${name} SUCCESS: ${res.status}`);
      try {
        const json = await res.json();
        if (json.summary) console.log(`[Internal Cron] ${name} Summary:`, JSON.stringify(json.summary));
      } catch (e) {}
    } else {
      console.error(`[Internal Cron] ${name} FAILED: ${res.status} ${res.statusText}`);
      const text = await res.text().catch(() => '');
      console.error(`[Internal Cron] Response: ${text.slice(0, 200)}`);
    }
  } catch (error) {
    console.error(`[Internal Cron] ${name} NETWORK ERROR:`, error.message);
  }
}

// --- SCHEDULES ---

// 1. Process Articles & Publish: Every 5 minutes
setInterval(() => {
  runTask('Process Articles', '/api/cron/process');
  runTask('Publish Scheduled', '/api/cron/publish');
}, 5 * 60 * 1000);

// 2. Newsletter Digest: Every hour
setInterval(() => {
  runTask('Newsletter Digest', '/api/cron/digest');
}, 60 * 60 * 1000);

// 3. Scrape Sources: Every 2 hours
setInterval(() => {
  runTask('Scrape Sources', '/api/cron/scrape');
}, 2 * 60 * 60 * 1000);

// --- INITIAL RUN ---
// Wait 30 seconds for Next.js to start, then run initial checks
setTimeout(() => {
  console.log('[Internal Cron] Performing initial startup checks...');
  runTask('Initial Publish Check', '/api/cron/publish');
}, 30 * 1000);
