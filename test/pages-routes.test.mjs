/* oxlint-disable typescript/no-floating-promises */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('static exporter preserves encoded route segments', async () => {
  const source = await readFile(
    resolve(root, 'scripts', 'build-pages.mjs'),
    'utf8',
  );
  assert.ok(
    source.includes("route.replace(/\\/+/g, '/').replaceAll('%', '~')"),
  );
});

test('404 recovery checks the article index before direct path recovery', async () => {
  const source = await readFile(resolve(root, 'public', '404.html'), 'utf8');
  assert.match(source, /archive\/articles\.json/);
  assert.match(source, /Object\.values\(articles\)/);
  assert.match(source, /article\.route/);
  assert.match(source, /publishedRoute/);
  assert.match(source, /decodeURIComponent\(candidate\)/);
  assert.match(source, /window\.location\.replace\(target\)/);
});

test('reader completeness routes preserve redirect, category, media, and unavailable recovery', async () => {
  const archive = await readFile(resolve(root, 'lib', 'archive.ts'), 'utf8');
  const article = await readFile(
    resolve(root, 'app', 'wiki', '[...slug]', 'page.tsx'),
    'utf8',
  );
  const category = await readFile(
    resolve(root, 'app', 'category', '[...slug]', 'page.tsx'),
    'utf8',
  );
  const media = await readFile(
    resolve(root, 'app', 'media', '[...slug]', 'page.tsx'),
    'utf8',
  );
  const unavailable = await readFile(
    resolve(root, 'app', 'unavailable-source', 'page.tsx'),
    'utf8',
  );
  assert.match(archive, /resolveRedirect/);
  assert.match(
    archive,
    /status: 'direct' \| 'resolved' \| 'missing-target' \| 'loop'/,
  );
  assert.match(archive, /categoryMembersFor/);
  assert.match(article, /Preserved redirect/);
  assert.match(article, /Redirect chain/);
  assert.match(category, /Search category members/);
  assert.match(category, /categoryMembersFor/);
  assert.match(category, /category-index\.json/);
  assert.match(media, /No media bytes are fetched automatically/);
  assert.match(media, /Load source preview/);
  assert.match(media, /consent-gated/);
  assert.match(media, /sizeBytes/);
  assert.match(archive, /consentGatedVideos/);
  assert.match(archive, /unavailable-source\?video=/);
  assert.match(unavailable, /requested record is not present/);
  assert.match(unavailable, /Search the source/);
});

test('static build and desktop server keep bounded third-party media preview policy', async () => {
  const build = await readFile(
    resolve(root, 'scripts', 'build-pages.mjs'),
    'utf8',
  );
  const server = await readFile(resolve(root, 'desktop', 'server.cjs'), 'utf8');
  const notFound = await readFile(resolve(root, 'public', '404.html'), 'utf8');
  assert.match(build, /publishedCategoryRoute/);
  assert.match(build, /archive-candidate-recovery-v2/);
  assert.match(build, /media-manifest\.json/);
  assert.match(
    server,
    /img-src 'self' data: https:\/\/static\.wikia\.nocookie\.net/,
  );
  assert.match(
    server,
    /media-src 'self' https:\/\/static\.wikia\.nocookie\.net/,
  );
  assert.doesNotMatch(server, /img-src[^;]*\*/);
  assert.match(notFound, /decodeURIComponent\(candidate\)/);
});
