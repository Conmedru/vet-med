import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CON-VET.ru',
    short_name: 'CON-VET.ru',
    description: 'Новости, исследования и практика ветеринарной медицины',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0891B2',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
