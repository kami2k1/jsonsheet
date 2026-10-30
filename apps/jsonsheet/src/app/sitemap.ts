import type { MetadataRoute } from 'next';
import { tools } from '@/data/tools';

// Required for static export
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://jsonsheet.com';
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/tools/`, changeFrequency: 'weekly', priority: 0.9 },
    ...tools.map((t) => ({
      url: `${base}/tools/${t.slug}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
