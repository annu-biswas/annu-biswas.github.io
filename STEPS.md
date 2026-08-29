# Handover & Setup Steps

How to transfer this site to a buyer and get it live. Two audiences: the
**seller** (Bishal) and the **buyer** (whoever takes it over).

Read [README.md](README.md) first for what the project actually is. This file is
only about handing it over.

---

## 0. What is being sold

**Included**

- Full Astro source, MIT-style unrestricted use by the buyer
- 8 page types: Home, About, Blog (paginated), Books, Publications, Events,
  Contact, Legal
- DecapCMS admin where every visible string, image, nav link, footer link, logo
  and favicon is editable — no code needed for day-to-day changes
- GitHub Actions pipeline: type check → build → horizontal-overflow test → deploy
- SEO: per-page meta, Open Graph, Twitter cards, canonical URLs, JSON-LD `Person`
  and `Article`, sitemap, RSS feed, robots.txt
- Cross-document view transitions, full-screen mobile navigation, share buttons
- Documentation (README + this file)

**Not included — the buyer must handle these**

| Item | Why |
| --- | --- |
| Real photographs | Placeholders are Lorem Picsum. **Not licensed for commercial resale.** Every image must be replaced before launch. |
| Real copy | Biography, publications, books and events are invented sample content. |
| A working contact form | The form is deliberately non-functional. See step 9. |
| Legal page content | Privacy / Terms / Accessibility are reasonable drafts, not legal advice. Have them reviewed. |
| A real CV | `public/files/cv.pdf` is an empty placeholder. |
| Domain name | Optional. GitHub Pages gives a free `*.github.io` address. |

**Running costs after handover: zero.** GitHub Pages, GitHub Actions (public
repos), and a Vercel hobby project for CMS login are all free at this scale.

---

## 1. Seller: before handover

- [ ] `git init` and commit — the project is not yet a repository
- [ ] Push to a private GitHub repo you own (the "master copy")
- [ ] Run `npm run verify` — must be green (0 type errors, all overflow checks pass)
- [ ] Decide the OAuth arrangement (step 6) and tell the buyer which applies
- [ ] Agree in writing what happens if the buyer needs changes later, and for
      how long you will answer questions

---

## 2. Buyer: get the code

```bash
git clone <seller-repo-url> my-site
cd my-site
rm -rf .git && git init
npm install
npm run dev
```

Removing `.git` starts clean history under the buyer's ownership rather than
inheriting the seller's commits.

Requires **Node 22 or newer** (`node -v`). This is what CI uses.

---

## 3. Buyer: create the GitHub repository

**The repository name decides the site URL, and this is the single easiest thing
to get wrong.**

| Repo name | Site URL | Config needed |
| --- | --- | --- |
| `<username>.github.io` | `https://<username>.github.io` | `base: '/'` — the default |
| Anything else, e.g. `portfolio` | `https://<username>.github.io/portfolio` | `base: '/portfolio'` in `astro.config.mjs` |

The `<username>.github.io` form is strongly recommended — it avoids sub-path
issues entirely.

**The repository must be public** for GitHub Pages on a free account. Private
repos need GitHub Pro. Nothing sensitive lives in this repo; the OAuth secret
stays on Vercel.

```bash
git remote add origin https://github.com/<username>/<repo>.git
git branch -M main
```

---

## 4. Buyer: rebrand the six hardcoded lines

Everything else is CMS-editable. These are not, because the build needs them
before the CMS exists.

**`astro.config.mjs`**
```js
site: 'https://<username>.github.io',
base: '/',   // or '/<repo>' if not using the <username>.github.io form
```

**`public/robots.txt`**
```
Sitemap: https://<username>.github.io/sitemap-index.xml
```

**`public/admin/config.yml`**
```yaml
backend:
  repo: <username>/<repo>

site_url: https://<username>.github.io
display_url: https://<username>.github.io
logo_url: https://<username>.github.io/favicon.svg
```

Then confirm nothing was missed:

```bash
grep -rn "annu-biswas" astro.config.mjs public/robots.txt public/admin/config.yml
```

That should print nothing.

---

## 5. Buyer: first deploy

```bash
git add -A
git commit -m "Initial commit"
git push -u origin main
```

Then in the repository on GitHub: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

This is a one-time setting and the deploy will not publish without it. The first
push may fail at the deploy step for exactly this reason; push again (or re-run
the workflow) after switching the source.

Watch the run under the **Actions** tab. It type-checks, builds, runs the
overflow test, then publishes. Green tick means the site is live.

---

## 6. CMS login (OAuth)

GitHub Pages cannot exchange an OAuth code for a token, so Decap needs a small
external broker. **Pick one of these two.**

### Option A — buyer runs their own broker (recommended)

Fully independent. Nothing breaks if the seller disappears.

1. Fork or clone the `decap-oauth` project.
2. **Register a GitHub OAuth App** — github.com → Settings → Developer settings →
   OAuth Apps → New OAuth App.
   - Homepage URL: `https://<username>.github.io`
   - Callback URL: placeholder for now
   - Generate a client secret and copy it. **It is shown only once.**
3. **Deploy to Vercel.** Import the repo, framework preset **Other**, no build
   command, no output directory. Set these environment variables for all
   environments:

   | Name | Value |
   | --- | --- |
   | `GITHUB_CLIENT_ID` | from step 2 |
   | `GITHUB_CLIENT_SECRET` | from step 2 |
   | `ALLOWED_ORIGINS` | `https://<username>.github.io` |

   `ALLOWED_ORIGINS` is comma-separated and **must include the scheme**. A bare
   hostname causes `403 Origin not allowed` on every login.
4. **Set the OAuth App's callback URL** to
   `https://<project>.vercel.app/api/callback` — exactly, or GitHub rejects it.
5. **Point the site at it** in `public/admin/config.yml`:
   ```yaml
   base_url: https://<project>.vercel.app   # no trailing slash, no path
   auth_endpoint: api/auth                   # no leading slash
   ```
6. Commit, push, and open `https://<username>.github.io/admin/`.

### Option B — seller's shared broker

Faster, but the buyer depends on the seller's Vercel account indefinitely.

1. Buyer sends the seller their live URL.
2. Seller appends it to `ALLOWED_ORIGINS` on the existing Vercel project, scheme
   included, comma separated:
   ```
   https://bishal-biswas.github.io,https://<buyer>.github.io
   ```
3. Seller **redeploys** — Vercel environment changes do not apply to existing
   deployments.
4. `base_url` and `auth_endpoint` in `config.yml` already point at the shared
   broker, so the buyer changes nothing.

**Understand the trade-off before choosing B.** If the seller deletes the Vercel
project, rotates the secret, or the OAuth App is revoked, the buyer's CMS login
stops working with no obvious cause and no way to fix it themselves. Separately,
an OAuth App's `repo` scope grants the issued token access to *every* repository
on the authorizing account — so each site's editors are authorizing an app the
other party controls. Option B is fine for a trial; Option A is right for a
finished handover.

Whoever logs into the CMS needs **write access to the site's repository**. The
GitHub account that owns the OAuth App grants nothing by itself — the token is
issued for the person who authorises, with their permissions.

---

## 7. Buyer: replace the placeholder content

Log in at `https://<username>.github.io/admin/`. Each save commits to the repo
and triggers a rebuild; the live site updates in a minute or two.

- [ ] **Site Settings → General** — name, tagline, logo, favicon, theme colour,
      header links, footer links, social links, contact details, copyright
- [ ] **Home Page** — hero, portrait, and the three section blocks
- [ ] **About Page** — Bio / Education / Employment, portrait, CV file
- [ ] **Contact Page** — intro, image, contact details
- [ ] **Listing Page Headings** — headings and intros, plus posts per page
- [ ] **Blog / Books / Publications / Events / Media** — delete the samples,
      add real entries
- [ ] **Legal Pages** — review with a professional before launch

**Every placeholder image must be replaced.** They come from Lorem Picsum and
are not licensed for a commercial site.

To edit locally instead, run `npm run cms` in a second terminal alongside
`npm run dev`, then open `http://localhost:4321/admin/` — no login needed.

---

## 8. Buyer: optional custom domain

1. Add a file named `CNAME` in `public/` containing just the domain, e.g.
   `annubiswas.com`
2. At the DNS provider, point the domain at GitHub Pages (`A` records to
   GitHub's IPs for an apex domain, or a `CNAME` to `<username>.github.io` for a
   subdomain — GitHub's Pages docs list the current values)
3. Update `site:` in `astro.config.mjs`, the `Sitemap:` line in `robots.txt`,
   and `site_url` / `display_url` in `config.yml` to the new domain
4. Add the new origin to `ALLOWED_ORIGINS` on the broker and redeploy
5. In **Settings → Pages**, set the custom domain and enable **Enforce HTTPS**

---

## 9. Buyer: make the contact form work

The form currently renders, validates visually, and shows a notice on submit —
it does **not** send anything. This is intentional and documented.

To make it live, pick a form service that accepts a plain `POST` (Formspree,
Web3Forms, Basin — all have free tiers), then in `src/pages/contact.astro`:

1. Add `action="<endpoint>"` and `method="POST"` to the `<form>`
2. Delete the `<script>` block at the bottom that cancels submission
3. Update `formNotice` in the CMS, or remove it

A static host cannot process form submissions itself — some third-party endpoint
is required.

---

## 10. Verifying a change

```bash
npm run verify
```

Type check, build, then load every page at ten viewport widths — including with
the mobile menu open — and fail if anything scrolls sideways. CI runs the same
command, so a green local run means a green deploy.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Deploy succeeds, site 404s | **Settings → Pages → Source** is not set to GitHub Actions |
| Site loads but CSS and images are missing | `base` in `astro.config.mjs` does not match the repo name |
| `403 Origin not allowed` on CMS login | Origin missing from `ALLOWED_ORIGINS`, or saved without `https://`, or Vercel not redeployed after the change |
| CMS popup opens then closes, nothing happens | `base_url` or `auth_endpoint` typo — it is `api/auth`, no leading slash |
| GitHub rejects the login with a `redirect_uri` error | OAuth App callback URL does not exactly match `https://<project>.vercel.app/api/callback` |
| CMS loads but saving fails | The logged-in GitHub user lacks write access to the repo |
| Build fails on a content error | A CMS entry is missing a required field — the error names the file and field |
| Build fails on a duplicate route | A blog post is slugged as a number (e.g. `2`), colliding with a pagination page |

---

## Seller's shortest possible answer

If the buyer just wants the sequence:

1. Clone the repo, `npm install`
2. Create a **public** repo named `<username>.github.io`
3. Change the six hardcoded lines (step 4)
4. Push, then set **Settings → Pages → Source: GitHub Actions**
5. Set up OAuth (step 6) — either their own broker, or send the seller the live
   URL to allowlist
6. Log into `/admin/` and replace all placeholder content and images
