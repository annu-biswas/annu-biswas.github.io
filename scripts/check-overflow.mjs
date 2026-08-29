/**
 * Horizontal-overflow regression guard.
 *
 * The Wix site this design was ported from has a permanent horizontal
 * scrollbar. Removing it was an explicit requirement, so this check fails the
 * build if any page ever scrolls sideways again - and names the offending
 * elements so the cause is obvious.
 *
 * Serves `dist/` itself, so it needs nothing running beforehand:
 *   npm run build && npm run check:overflow
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const DIST = resolve('dist');
const WIDTHS = [320, 360, 375, 414, 768, 834, 1024, 1280, 1440, 1920];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

if (!existsSync(DIST)) {
  console.error('No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}

/** Every route in the built output, derived from the emitted HTML files. */
function routes(dir = DIST) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      found.push(...routes(full));
    } else if (name === 'index.html') {
      const rel = relative(DIST, full).split(sep).slice(0, -1).join('/');
      found.push(`/${rel}`);
    } else if (name === '404.html') {
      found.push('/404.html');
    }
  }
  return [...new Set(found)].sort();
}

// /admin is the third-party DecapCMS single-page app, not our layout.
const EXCLUDE = [/^\/admin(\/|$)/];

const pages = routes().filter((route) => !EXCLUDE.some((pattern) => pattern.test(route)));
if (pages.length === 0) {
  console.error('No built pages found in dist/.');
  process.exit(1);
}

/** Minimal static file server for the built output. */
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const candidates = [join(DIST, url), join(DIST, url, 'index.html')];
  const file = candidates.find((path) => existsSync(path) && statSync(path).isFile());

  if (!file || !resolve(file).startsWith(DIST)) {
    res.writeHead(404).end('Not found');
    return;
  }

  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const failures = [];
let checked = 0;

try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    for (const route of pages) {
      await page.goto(`${base}${route}`, { waitUntil: 'load' });

      const measure = () =>
        page.evaluate(() => {
          const root = document.documentElement;
          const client = root.clientWidth;
          if (root.scrollWidth <= client + 1) return null;

          const culprits = [...document.querySelectorAll('*')]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && (rect.right > client + 1 || rect.left < -1);
            })
            .slice(0, 5)
            .map((el) => {
              const rect = el.getBoundingClientRect();
              const cls = typeof el.className === 'string' ? el.className.slice(0, 70) : '';
              return `<${el.tagName.toLowerCase()} class="${cls}"> [${Math.round(rect.left)} → ${Math.round(rect.right)}]`;
            });

          return { scrollWidth: root.scrollWidth, clientWidth: client, culprits };
        });

      const closed = await measure();
      checked += 1;
      if (closed) failures.push({ width, route, state: 'default', ...closed });

      // Below the desktop breakpoint the mobile panel slides in from the right.
      // It sits off-screen when closed, so both states have to be checked.
      if (width < 1024) {
        const opened = await page.evaluate(async () => {
          const button = document.getElementById('nav-open');
          const shell = document.getElementById('mobile-nav');
          if (!button || !shell) return false;
          button.click();
          await new Promise((done) => setTimeout(done, 450));
          // Confirm it really opened, so a broken toggle cannot pass silently.
          return shell.dataset.open === 'true';
        });

        if (opened) {
          checked += 1;
          const open = await measure();
          if (open) failures.push({ width, route, state: 'nav open', ...open });
        }
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error(`\nHorizontal overflow on ${failures.length} of ${checked} page/width combinations:\n`);
  for (const f of failures) {
    console.error(
      `  ${f.route} @ ${f.width}px (${f.state}) - scrollWidth ${f.scrollWidth} > clientWidth ${f.clientWidth}`
    );
    for (const c of f.culprits) console.error(`      ${c}`);
  }
  console.error('');
  process.exit(1);
}

console.log(
  `No horizontal overflow: ${checked} checks passed ` +
    `(${pages.length} pages x ${WIDTHS.length} widths, plus the mobile nav panel open).`
);
