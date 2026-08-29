import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPublished, getSite } from '@/lib/settings';

export const GET: APIRoute = async (context) => {
  const site = await getSite();
  const posts = (await getPublished('blog')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: `${site.siteName} - Posts & Articles`,
    description: site.defaultDescription,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}`,
      categories: post.data.tags,
    })),
  });
};
