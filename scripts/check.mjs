// Site checks used by CI (GitHub Actions) and CD (Netlify runs this before every deploy).
// No dependencies: runs on plain Node 18+.
//   1. every .js file parses
//   2. every local file the page references (src/href) exists
//   3. basic page sanity: title, description, lang, alt text on images
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Local files that are referenced on purpose but not in the repo yet.
// Remove an entry here as soon as the file is added.
const PENDING = new Set([
]);

const errors = [];
const warnings = [];

// 1. JavaScript syntax
for (const file of readdirSync('.').filter((f) => f.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`JS syntax error in ${file}:\n${r.stderr.trim()}`);
}

// 2. referenced local files exist
const html = readFileSync('index.html', 'utf8');
const refs = new Set();
for (const [, , url] of html.matchAll(/\s(src|href)="([^"]+)"/g)) {
  if (/^(https?:|mailto:|tel:|data:|#)/.test(url)) continue;
  refs.add(decodeURI(url.split(/[?#]/)[0]));
}
for (const url of refs) {
  if (existsSync(url)) continue;
  if (PENDING.has(url)) warnings.push(`pending file (link is live but file not added yet): ${url}`);
  else errors.push(`missing file referenced by index.html: ${url}`);
}

// 3. page sanity
if (!/<html[^>]+lang="/.test(html)) errors.push('<html> is missing a lang attribute');
if (!/<title>[^<]+<\/title>/.test(html)) errors.push('page has no <title>');
if (!/<meta name="description" content="[^"]+"/.test(html)) errors.push('page has no meta description');
for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
  if (!/\salt="/.test(tag)) errors.push(`image without alt text: ${tag.slice(0, 80)}…`);
}

warnings.forEach((w) => console.warn(`⚠  ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`✖  ${e}`));
  console.error(`\n${errors.length} problem(s) found — fix them before deploying.`);
  process.exit(1);
}
console.log(`✔  ${refs.size} local files, all JS and page basics OK${warnings.length ? ` (${warnings.length} warning)` : ''}`);
