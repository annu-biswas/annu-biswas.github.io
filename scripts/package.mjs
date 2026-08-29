/**
 * Builds the distributable ZIP that buyers receive.
 *
 *   npm run package            → dist-zip/<name>-v<version>.zip
 *
 * Uses `git archive`, so the ZIP contains exactly the files tracked by git —
 * never node_modules, dist, .astro, .env or anything untracked and forgotten.
 * Files marked `export-ignore` in .gitattributes are left out.
 *
 * Before writing the ZIP it refuses to package anything that would embarrass
 * you in front of a paying customer: uncommitted changes, or leftover
 * client-specific values in the files a buyer has to edit.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'dist-zip';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Values that must not ship to a buyer. Add client names here as you sell. */
const FORBIDDEN = [
  { pattern: /annu-biswas/i, why: 'client-specific GitHub account' },
  { pattern: /decap-oauth-bishal/i, why: "the seller's OAuth broker" },
];

const FILES_TO_SCAN = [
  'astro.config.mjs',
  'public/robots.txt',
  'public/admin/config.yml',
  'README.md',
];

function fail(message, details = []) {
  console.error(`\n✗ ${message}\n`);
  for (const line of details) console.error(`    ${line}`);
  console.error('');
  process.exit(1);
}

// ---------------------------------------------------------------------------

let version;
try {
  version = JSON.parse(readFileSync('package.json', 'utf8')).version;
} catch {
  fail('Could not read version from package.json');
}

try {
  git('rev-parse', '--is-inside-work-tree');
} catch {
  fail('Not a git repository. Run `git init`, commit, then try again.', [
    'The ZIP is built from tracked files, so the project must be committed first.',
  ]);
}

const dirty = git('status', '--porcelain');
if (dirty) {
  fail('Working tree has uncommitted changes.', [
    'The ZIP is built from committed files, so these would be silently excluded:',
    '',
    ...dirty.split('\n').slice(0, 20),
  ]);
}

// Catch client-specific leftovers before a buyer finds them.
const leaks = [];
for (const file of FILES_TO_SCAN) {
  let contents;
  try {
    contents = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const { pattern, why } of FORBIDDEN) {
    if (pattern.test(contents)) leaks.push(`${file} — contains ${why} (${pattern.source})`);
  }
}

if (leaks.length > 0) {
  fail('Client-specific values found in files the buyer configures.', [
    ...leaks,
    '',
    'Replace them with neutral placeholders before packaging.',
  ]);
}

// ---------------------------------------------------------------------------

const name = `professor-portfolio-v${version}`;
mkdirSync(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, `${name}.zip`);

git('archive', '--format=zip', `--prefix=${name}/`, '-o', outFile, 'HEAD');

const bytes = statSync(outFile).size;
const tracked = git('ls-files').split('\n').filter(Boolean).length;

console.log(`\n✓ ${outFile}`);
console.log(`  ${tracked} tracked files (minus any marked export-ignore)`);
console.log(`  ${(bytes / 1024 / 1024).toFixed(2)} MB · commit ${git('rev-parse', '--short', 'HEAD')}\n`);
