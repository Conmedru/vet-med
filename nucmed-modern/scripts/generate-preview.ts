import { generateDigestHtml, generateNotificationHtml } from '../lib/newsletter/templates';
import fs from 'fs';
import path from 'path';

const MOCK_DIGEST = {
    id: 'digest-preview',
    subject: 'Дайджест за неделю',
    preheader: 'Главные новости ветеринарной медицины',
    dateRange: {
        start: new Date(),
        end: new Date()
    },
    articles: [
        {
            id: '1',
            title: 'Росатом начал строительство нового завода радиофармпрепаратов',
            excerpt: 'Крупнейшее в Европе производство обеспечит потребности российской медицины в диагностических и терапевтических препаратах.',
            category: 'Индустрия',
            publishedAt: new Date(),
            url: 'https://nuclear.ru/news/rosatom-new-plant',
            imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop'
        },
        {
            id: '2',
            title: 'Новый метод ПЭТ/КТ диагностики',
            excerpt: 'Ученые представили революционный подход к раннему выявлению заболеваний.',
            category: 'Наука',
            publishedAt: new Date(),
            url: 'https://nuclear.ru/news/new-pet-ct',
            imageUrl: null
        }
    ],
    stats: {
        totalArticles: 15,
        byCategory: { 'Индустрия': 1, 'Наука': 1 }
    },
    html: '',
    plainText: '',
    createdAt: new Date()
};

async function main() {
    console.log('Generating preview...');
    
    const digestHtml = generateDigestHtml(MOCK_DIGEST);
    const notificationHtml = generateNotificationHtml(MOCK_DIGEST.articles[0]);

    const publicDir = path.join(process.cwd(), 'public');
    
    fs.writeFileSync(path.join(publicDir, 'email-digest-preview.html'), digestHtml);
    fs.writeFileSync(path.join(publicDir, 'email-notification-preview.html'), notificationHtml);

    console.log('Previews generated in public/ folder');
}

main().catch(console.error);
