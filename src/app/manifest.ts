import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Marginal — Show up. Speak up.',
    short_name: 'Marginal',
    description: 'Daily AI-powered English writing and speaking practice.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#F5F3FF',
    theme_color: '#7C3AED',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}