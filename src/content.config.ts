import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Images are stored as public-relative paths (e.g. `/images/hero.jpg`) rather
 * than `image()` references. Decap writes uploads into `public/images`, so this
 * keeps every image swappable from the CMS without a rebuild-time import graph.
 */
const imagePath = z.string();

/**
 * Strict hex so a CMS value can never break out of the <style> block that
 * applies it. A malformed colour fails the build instead of shipping.
 */
const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour such as #0b322b');

/** Matches the tokens declared in src/styles/global.css. */
const DEFAULT_THEME = {
  forest: '#0b322b',
  forestSoft: '#14453c',
  olive: '#27331b',
  cream: '#e9e6df',
  sand: '#f5f3ee',
  clay: '#be6d54',
  clayDark: '#a45940',
  ink: '#1c1c1a',
  muted: '#5f6360',
} as const;

const link = z.object({
  label: z.string(),
  href: z.string(),
  external: z.boolean().optional().default(false),
});

const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: imagePath.optional(),
    noindex: z.boolean().optional().default(false),
  })
  .optional();

const ctaSchema = z
  .object({
    label: z.string(),
    href: z.string(),
  })
  .optional();

/* ------------------------------------------------------------------ */
/* Settings - site-wide singletons, each its own collection for clean types */
/* ------------------------------------------------------------------ */
const single = (file: string) =>
  glob({ pattern: file, base: './src/content/settings' });

const siteSettings = defineCollection({
  loader: single('site.json'),
  schema: z.object({
    siteName: z.string(),
    shortName: z.string(),
    tagline: z.string(),
    defaultDescription: z.string(),
    defaultShareImage: imagePath,
    logoText: z.string(),
    logoImage: imagePath.optional(),
    favicon: imagePath,
    themeColor: hexColor,
    /** Overrides the Tailwind palette at runtime. See BaseLayout. */
    theme: z
      .object({
        forest: hexColor.default(DEFAULT_THEME.forest),
        forestSoft: hexColor.default(DEFAULT_THEME.forestSoft),
        olive: hexColor.default(DEFAULT_THEME.olive),
        cream: hexColor.default(DEFAULT_THEME.cream),
        sand: hexColor.default(DEFAULT_THEME.sand),
        clay: hexColor.default(DEFAULT_THEME.clay),
        clayDark: hexColor.default(DEFAULT_THEME.clayDark),
        ink: hexColor.default(DEFAULT_THEME.ink),
        muted: hexColor.default(DEFAULT_THEME.muted),
      })
      .default(DEFAULT_THEME),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    social: z.array(link).default([]),
    headerLinks: z.array(link).default([]),
    footerLinks: z.array(link).default([]),
    footerNote: z.string(),
    copyright: z.string(),
  }),
});

const homePage = defineCollection({
  loader: single('home.json'),
  schema: z.object({
    hero: z.object({
      name: z.string(),
      role: z.string(),
      intro: z.string(),
      portrait: imagePath,
      portraitAlt: z.string(),
      cta: ctaSchema,
    }),
    publications: z.object({
      heading: z.string(),
      body: z.string(),
      image: imagePath,
      imageAlt: z.string(),
      cta: ctaSchema,
    }),
    media: z.object({
      heading: z.string(),
      body: z.string(),
      cta: ctaSchema,
    }),
    posts: z.object({
      heading: z.string(),
      body: z.string(),
      cta: ctaSchema,
    }),
    seo,
  }),
});

const aboutPage = defineCollection({
  loader: single('about.json'),
  schema: z.object({
    title: z.string(),
    portrait: imagePath,
    portraitAlt: z.string(),
    cvLabel: z.string().optional(),
    cvFile: z.string().optional(),
    sections: z.array(z.object({ heading: z.string(), body: z.string() })),
    seo,
  }),
});

const contactPage = defineCollection({
  loader: single('contact.json'),
  schema: z.object({
    title: z.string(),
    intro: z.string(),
    image: imagePath.optional(),
    imageAlt: z.string().optional(),
    formNotice: z.string(),
    details: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    seo,
  }),
});

/** Headings, intros and SEO for the listing pages (blog, books, ...). */
const pageIntros = defineCollection({
  loader: single('pages.json'),
  schema: z.object({
    pages: z.array(
      z.object({
        key: z.string(),
        title: z.string(),
        intro: z.string(),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        /** Items per page on paginated listings. Ignored where unused. */
        perPage: z.number().int().min(1).max(60).optional(),
      })
    ),
  }),
});

/* ------------------------------------------------------------------ */
/* Content collections                                                  */
/* ------------------------------------------------------------------ */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cover: imagePath,
    coverAlt: z.string().default(''),
    category: z.string().default('Article'),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    seo,
  }),
});

const books = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/books' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    cover: imagePath,
    coverAlt: z.string().default(''),
    publisher: z.string().optional(),
    year: z.number().optional(),
    isbn: z.string().optional(),
    blurb: z.string(),
    buyLinks: z.array(link).default([]),
    order: z.number().default(0),
    draft: z.boolean().default(false),
    seo,
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    authors: z.string(),
    venue: z.string(),
    year: z.number(),
    type: z
      .enum(['Journal Article', 'Book Chapter', 'Conference Paper', 'Review', 'Report'])
      .default('Journal Article'),
    doi: z.string().optional(),
    url: z.string().optional(),
    abstract: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    location: z.string(),
    kind: z.string().default('Lecture'),
    cover: imagePath.optional(),
    coverAlt: z.string().default(''),
    summary: z.string(),
    registerUrl: z.string().optional(),
    draft: z.boolean().default(false),
    seo,
  }),
});

const media = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/media' }),
  schema: z.object({
    title: z.string(),
    outlet: z.string(),
    date: z.coerce.date(),
    thumbnail: imagePath,
    thumbnailAlt: z.string().default(''),
    watchUrl: z.string(),
    summary: z.string().default(''),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    updated: z.coerce.date(),
    order: z.number().default(0),
    showInFooter: z.boolean().default(true),
    seo,
  }),
});

export const collections = {
  siteSettings,
  homePage,
  aboutPage,
  contactPage,
  pageIntros,
  blog, books, publications, events, media, legal };
