/* oxlint-disable typescript/no-floating-promises */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('static exporter preserves encoded route segments', async () => {
  const source = await readFile(resolve(root, 'scripts', 'build-pages.mjs'), 'utf8');
  assert.ok(source.includes("route.replace(/\\/+/g, '/').replaceAll('%', '~')"));
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
