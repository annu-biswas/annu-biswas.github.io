# Professor Portfolio

An Astro Site for Professor Portfolio. Compatible with GitHub Pages and edited through DecapCMS. 

- **Live site:** https://your-github.github.io
- **Content manager:** https://your-github.github.io/admin/index.html
- **Stack:** Astro 7 · Tailwind CSS 4 · Astro Content Collections · astro-seo · @astrojs/sitemap · DecapCMS

---

## Getting started

```bash
npm install
npm run dev
```

The site runs at http://localhost:4321.

### Editing content locally

Run the CMS proxy in a second terminal, then open http://localhost:4321/admin/. No login is required locally - edits are written straight to the files in `src/content`.

```bash
npm run cms
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run check` | Astro + TypeScript type check |
| `npm run cms` | Local DecapCMS backend proxy |
| `npm run check:overflow` | Fails if any page scrolls horizontally (serves `dist/` itself) |
| `npm run verify` | Type check, build, then run the overflow check end to end |

---

## The horizontal scrollbar

The reference Wix site scrolls sideways at every viewport width. The cause is its navigation component: Wix renders a **hidden duplicate of the full menu off-canvas** to measure which items should collapse into "More", and never clips the document root. At a 1280px viewport the document was 1866px wide, with 68 elements sitting outside the viewport.

This rebuild avoids it structurally rather than patching it:

- the responsive navigation is CSS-only, so there is no off-canvas measuring copy;
- `overflow-x: clip` is set on `html` and `body` in `src/styles/global.css`;
- media, tables and code blocks scroll inside their own containers instead of widening the page;
- `scripts/check-overflow.mjs` loads every built page at ten viewport widths - and, below the desktop breakpoint, again with the mobile nav panel open - failing CI if `scrollWidth` ever exceeds `clientWidth`, printing the offending elements.

---

## Motion

### Cross-document view transitions

Every page opts in with a single CSS rule - `@view-transition { navigation: auto; }` in `src/styles/global.css`. There is no client-side router and no JavaScript involved: navigation stays a normal document load, and browsers without support simply navigate instantly.

Named regions control what animates:

| Region | `view-transition-name` | Behaviour |
| --- | --- | --- |
| Header | `site-header` | Quick cross-fade, so the chrome reads as fixed |
| Footer | `site-footer` | Quick cross-fade |
| `<main>` | `page-content` | Old content sinks and fades, new content rises in |
| Blog covers | `post-cover-<slug>` | The card image morphs into the post header image |

Blog covers also carry `view-transition-class: post-cover`, so one rule tunes every cover regardless of how many posts exist. All animations are disabled under `prefers-reduced-motion: reduce`.

Note that browsers skip view transitions entirely while a document is hidden - this is expected, and is why they cannot be observed in a background tab.

### Mobile navigation

Below `1024px` the menu is a full-screen panel that slides in from the right over 320ms, with the links staggering in behind it. It includes a close button, the social links, focus is moved into the panel and trapped while it is open, `Escape` closes it, and the page behind it is scroll-locked via `body:has(...)`.

Tapping a link closes the panel first and navigates once it has slid out, so the view transition snapshots a closed menu rather than an open one. Modifier-clicks and `target="_blank"` links are left alone.

The panel lives inside a shell that is exactly the viewport and clips its overflow, so the off-screen panel can never widen the document - and `npm run check:overflow` verifies both the closed and open states.

### Share buttons

Blog posts end with a share row ([`src/components/ShareButtons.astro`](src/components/ShareButtons.astro)): X, LinkedIn, Facebook, WhatsApp, email, and copy-link. Targets are plain `<a>` intent URLs built from `Astro.site`, so they carry the canonical production URL even when clicked from a local dev server.

Two progressive enhancements sit on top: a "More" button appears only where `navigator.share` exists, opening the device's native share sheet; and copy-link tries the async Clipboard API first, falls back to a throwaway selection, and finally tells the visitor to press Ctrl/Cmd + C. Results are announced through a `role="status"` region. Every control is a 44x44 target.

The component takes `title`, `path` and `summary`, so it can be dropped onto any page, not just blog posts.

---

## Content model

Everything on the site is editable from the CMS. Content lives in `src/content` and is validated by the Zod schemas in `src/content.config.ts`, so a malformed entry fails the build rather than shipping broken.

### Site settings (`src/content/settings/`)

| File | Controls |
| --- | --- |
| `site.json` | Site name, tagline, logo text or image, favicon, theme colour, header links, footer links, social links, contact details, copyright |
| `home.json` | Every heading, paragraph, image and button on the home page |
| `about.json` | About page sections, portrait, CV file |
| `contact.json` | Contact page copy, image, form notice, contact details |
| `pages.json` | Headings, intros and SEO copy for the Blog, Books, Publications, Events and Media listings |

### Collections

| Folder | Collection |
| --- | --- |
| `src/content/blog/` | Blog posts (Markdown body, cover image, tags, draft flag) — paginated, see below |
| `src/content/books/` | Books, with cover, publisher, ISBN and external buy links |
| `src/content/publications/` | Publications, grouped by year on the page, with DOI and link |
| `src/content/events/` | Events, split into upcoming and past automatically by date |
| `src/content/media/` | Media appearances shown on the home page and Events page |
| `src/content/legal/` | Legal pages - Privacy Policy, Terms of Use, Accessibility |

Any entry can be hidden with `draft: true`. Drafts still render in `npm run dev` so they can be previewed, and are excluded from production builds.

Images upload to `public/images` and are referenced by public path (`/images/…`). Legal pages appear in the footer automatically when `showInFooter` is true, ordered by `order`.

### Blog pagination

`/blog` is paginated by [`src/pages/blog/[...page].astro`](src/pages/blog/%5B...page%5D.astro): page 1 sits at `/blog`, later pages at `/blog/2`, `/blog/3` and so on. The page size comes from `perPage` on the blog entry in `pages.json` (default 9), editable in the CMS under **Listing Page Headings**.

Later pages get a distinct `<title>` and `rel="prev"`/`rel="next"` links, and stay indexable — each post also has its own canonical page and sitemap entry. [`Pagination.astro`](src/components/Pagination.astro) takes a `base` prop, so it can be reused for any listing; it collapses long runs to an ellipsis so the control keeps a fixed width.

One thing to know: post slugs and page numbers share the `/blog/*` namespace, so a post slugged `2` would collide with page 2. Astro fails the build loudly on a duplicate route rather than shipping something broken.

---

## Design tokens

Extracted from the reference site and defined in `src/styles/global.css` as Tailwind theme variables.

| Token | Value | Used for |
| --- | --- | --- |
| `forest` | `#0b322b` | Primary dark band, footer |
| `olive` | `#27331b` | Alternate dark band (media) |
| `cream` | `#e9e6df` | Page background |
| `sand` | `#f5f3ee` | Cards, light text on dark |
| `clay` | `#be6d54` | Headings, accents, buttons |

Headings use Georgia/Palatino serif, body copy Helvetica Neue/Arial - matching the reference. The display scale is fluid via `clamp()`, topping out at the reference's desktop sizes (75px / 57px / 32px).

---

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which type-checks, builds, runs the overflow check and publishes `dist/` to GitHub Pages.

One-time setup: in the repository, **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### DecapCMS authentication in production

GitHub Pages is a static host and cannot run the OAuth handshake DecapCMS needs, so the GitHub backend requires a small external broker.

1. Register a GitHub OAuth app (**Settings → Developer settings → OAuth Apps**). Set the callback URL to your broker's `/callback` endpoint.
2. Deploy an OAuth broker - a Cloudflare Worker or Netlify site running one of the community `decap-cms-github-oauth-provider` implementations - with the app's client ID and secret as environment variables.
3. Put the broker's origin into `base_url` in `public/admin/config.yml` (currently a placeholder: `https://decap-oauth.example.workers.dev`).

Until that is done, the CMS works locally via `npm run cms` and commits are made by hand.

---

## Known placeholders

These are intentional and marked for replacement:

- **Images** - all stock placeholders from Lorem Picsum in `public/images`. Replace via the CMS.
- **Copy** - biography, publications, books and events are plausible sample content, not real records.
- **Contact form** - renders and validates visually but does not send. Submission is cancelled in the browser and the notice from `contact.json` is shown. To make it live, point the `<form>` at a service such as Formspree and remove the submit handler in `src/pages/contact.astro`.
- **CV** - `public/files/cv.pdf` is an empty placeholder.
- **OAuth broker** - `base_url` in the CMS config needs a real deployment.
