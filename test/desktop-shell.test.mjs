/* oxlint-disable typescript/no-floating-promises */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createArchiveServer } = require('../desktop/server.cjs');

test('archive server requires a session cookie and serves internal route indexes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hay-day-desktop-'));
  await mkdir(join(root, 'wiki', 'hay-day-1'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<h1>home</h1>');
  await writeFile(join(root, 'wiki', 'hay-day-1', 'index.html'), '<h1>article</h1>');
  const archive = await createArchiveServer({ root });
  try {
    const first = await fetch(archive.url, { redirect: 'manual' });
    assert.equal(first.status, 302);
    const cookie = first.headers.get('set-cookie');
    assert.ok(cookie?.includes('HttpOnly'));
    const home = await fetch(`http://127.0.0.1:${archive.port}/hay-day-wiki-archive/index.html`, { headers: { Cookie: cookie.split(';')[0] } });
    assert.equal(home.status, 200);
    assert.equal(await home.text(), '<h1>home</h1>');
    assert.match(home.headers.get('content-security-policy') || '', /default-src 'self'/);
    const route = await fetch(`http://127.0.0.1:${archive.port}/hay-day-wiki-archive/wiki/hay-day-1`, { headers: { Cookie: cookie.split(';')[0] } });
    assert.equal(route.status, 200);
    assert.equal(await route.text(), '<h1>article</h1>');
    const wrongToken = await fetch(`http://127.0.0.1:${archive.port}/hay-day-wiki-archive/index.html`);
    assert.equal(wrongToken.status, 404);
    const traversal = await fetch(`http://127.0.0.1:${archive.port}/hay-day-wiki-archive/%2e%2e/%2e%2e/etc/passwd`, { headers: { Cookie: cookie.split(';')[0] } });
    assert.equal(traversal.status, 404);
  } finally {
    await archive.close();
  }
});

test('desktop shell keeps navigation policy and signing controls explicit', async () => {
  const main = await readFile(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
  const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
  assert.match(main, /contextIsolation: true/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /shell\.openExternal/);
  assert.match(packageJson, /"forceCodeSigning": false/);
  assert.match(packageJson, /"target": \[\{ "target": "squirrel"/);
});
