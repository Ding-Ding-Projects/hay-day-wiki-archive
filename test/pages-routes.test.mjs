/* oxlint-disable typescript/no-floating-promises */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

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
  assert.match(media, /Open source record after consent/);
  assert.match(media, /verifiedProviderUrl/);
  assert.match(media, /sizeBytes/);
  assert.match(archive, /consentGatedVideos/);
  assert.match(archive, /unavailable-source\?video=/);
  assert.match(unavailable, /requested record is not present/);
  assert.match(unavailable, /Search the source/);
});

test('all frozen redirects resolve without namespace collisions', async () => {
  const source = await readFile(resolve(root, 'lib', 'archive.ts'), 'utf8');
  const moduleCode = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const archive = await import(
    `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`
  );
  const records = Object.values(
    JSON.parse(
      await readFile(
        resolve(root, 'content', 'final', 'articles.json'),
        'utf8',
      ),
    ),
  );
  const redirects = records.filter((item) => item.redirectTarget);
  assert.equal(redirects.length, 76);
  const results = redirects.map((item) =>
    archive.resolveRedirect(item, records),
  );
  assert.equal(results.filter((item) => item.status === 'resolved').length, 74);
  assert.deepEqual(
    results
      .filter((item) => item.status === 'missing-target')
      .map((item) => item.chain.at(-1)),
    ['Special:Community', 'Special:Community'],
  );
  const buildings = redirects.find(
    (item) => item.title === 'Production buildings',
  );
  const machines = redirects.find(
    (item) => item.title === 'Production Machines',
  );
  assert.equal(
    archive.resolveRedirect(buildings, records).record?.title,
    'Production Buildings',
  );
  assert.equal(
    archive.resolveRedirect(machines, records).record?.title,
    'Production Buildings',
  );
  assert.equal(
    archive.categoryMemberRoute(
      { title: 'Slash member', route: '/wiki/category%2Fitem-10' },
      [],
    ),
    '/wiki/category~2Fitem-10',
  );
  const loopA = { title: 'Loop A', redirectTarget: 'Loop B' };
  const loopB = { title: 'Loop B', redirectTarget: 'Loop A' };
  assert.equal(archive.resolveRedirect(loopA, [loopA, loopB]).status, 'loop');
  assert.equal(
    archive.resolveRedirect(
      { title: 'Missing', redirectTarget: 'No such page' },
      [{ title: 'Missing', redirectTarget: 'No such page' }],
    ).status,
    'missing-target',
  );
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
