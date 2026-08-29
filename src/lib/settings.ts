import { getCollection } from 'astro:content';

type SettingsCollection = 'siteSettings' | 'homePage' | 'aboutPage' | 'contactPage' | 'pageIntros';
type ContentCollection = 'blog' | 'books' | 'publications' | 'events' | 'media' | 'legal';

/** Loads a settings singleton, failing loudly if the CMS removed the file. */
async function singleton<C extends SettingsCollection>(collection: C, id: string) {
  const entry = (await getCollection(collection)).find((item) => item.id === id);
  if (!entry) {
    throw new Error(
      `Missing settings file src/content/settings/${id}.json - it is required to build the site.`
    );
  }
  return entry;
}

export const getSite = async () => (await singleton('siteSettings', 'site')).data;
export const getHome = async () => (await singleton('homePage', 'home')).data;
export const getAbout = async () => (await singleton('aboutPage', 'about')).data;
export const getContact = async () => (await singleton('contactPage', 'contact')).data;

/** Heading + intro + SEO copy for a listing page, by key. */
export async function getPageIntro(key: string) {
  const { pages } = (await singleton('pageIntros', 'pages')).data;
  const page = pages.find((p) => p.key === key);
  if (!page) {
    throw new Error(`No entry with key "${key}" in src/content/settings/pages.json`);
  }
  return page;
}

/** Drafts are hidden from production builds but stay visible while developing. */
export async function getPublished<C extends ContentCollection>(collection: C) {
  const entries = await getCollection(collection);
  return entries.filter(
    (entry) => import.meta.env.DEV || !(entry.data as { draft?: boolean }).draft
  );
}

export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...opts,
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** True when a href points somewhere off this site. */
export function isExternal(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}
