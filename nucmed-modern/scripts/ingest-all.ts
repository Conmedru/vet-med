import { prisma } from '../lib/prisma';
import { ingestSource } from '../lib/scraper/index';

async function main() {
  const sources = await prisma.source.findMany({ 
    where: { isActive: true }, 
    select: { id: true, name: true, slug: true } 
  });
  
  const results = [];
  for (const s of sources) {
    console.log(`\n[${s.name}] Starting...`);
    const r = await ingestSource(s.id, { autoProcess: false });
    results.push(r);
    console.log(`[${s.name}] Fetched: ${r.totalFetched}, New: ${r.newArticles}, Dups: ${r.duplicates}, Errors: ${r.errors.length}`);
    if (r.errors.length > 0) {
      console.log(`  First error: ${r.errors[0].substring(0, 200)}`);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Sources: ${results.length}`);
  console.log(`Total fetched: ${results.reduce((a, b) => a + b.totalFetched, 0)}`);
  console.log(`Total new: ${results.reduce((a, b) => a + b.newArticles, 0)}`);
  console.log(`Total duplicates: ${results.reduce((a, b) => a + b.duplicates, 0)}`);
  console.log(`Total errors: ${results.reduce((a, b) => a + b.errors.length, 0)}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
