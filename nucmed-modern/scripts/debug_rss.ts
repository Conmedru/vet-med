


async function main() {
    const url = 'https://medicalxpress.com/rss-feed/neurology-news/';
    console.log(`Fetching ${url}...`);

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!res.ok) {
        console.error(`Failed: ${res.status} ${res.statusText}`);
        return;
    }

    const text = await res.text();
    console.log('--- RSS CONTENT START ---');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
        if (i >= 39 && i <= 59) {
            console.log(`${i + 1}: ${line}`);
        }
    });
    console.log('--- RSS CONTENT END ---');
}

main().catch(console.error);
