import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sanitizeHtml } from '../lib/wiki/sanitize.mjs';
import { WikiImporter } from '../lib/wiki/importer.mjs';
import {
  canonicalRoute,
  validateArticleRecord,
  validateMediaRecord,
} from '../lib/wiki/schemas.mjs';

test('sanitizes executable markup and rewrites known page and media links', () => {
  const pages = new Map([
    ['Crops', { pageid: 10, title: 'Crops', namespace: 0 }],
  ]);
  const media = new Map([
    ['File:Wheat.png', { mediaId: 'File:Wheat.png', title: 'File:Wheat.png' }],
  ]);
  const result = sanitizeHtml(
    '<script>alert(1)</script><p><a href="/wiki/Crops">Crops</a><img src="/wiki/File:Wheat.png" onerror="x" /><a href="javascript:bad">bad</a></p>',
    {
      sourceBaseUrl: 'https://hayday.fandom.com/wiki/',
      pagesByTitle: pages,
      mediaByTitle: media,
    },
  );
  assert.equal(result.html.includes('script'), false);
  assert.equal(result.html.includes('onerror'), false);
  assert.match(result.html, /href="\/wiki\/crops-10"/);
  assert.match(result.html, /src="\/media\/File%3AWheat.png"/);
  assert.equal(result.referencedMediaIds[0], 'File:Wheat.png');
});

test('records external video as an embed verdict without copying bytes', () => {
  const result = sanitizeHtml(
    '<p><a href="https://youtu.be/abc">watch</a></p>',
    {
      sourceBaseUrl: 'https://hayday.fandom.com/wiki/',
      pagesByTitle: new Map(),
      mediaByTitle: new Map(),
    },
  );
  assert.deepEqual(result.externalVideos, [
    {
      provider: 'youtube',
      url: 'https://youtu.be/abc',
      verdict: 'external-embed',
      consentRequired: true,
      embedMode: 'consent-gated',
    },
  ]);
});

test('import resumes and produces exact revision and media manifests', async () => {
  const out = await mkdtemp(join(tmpdir(), 'hay-day-import-'));
  const statePath = join(out, 'state.json');
  const pages = [{ pageid: 1, title: 'Hay Day', ns: 0 }];
  const revisions = new Map([
    [
      1,
      {
        pageid: 1,
        ns: 0,
        title: 'Hay Day',
        fullurl: 'https://hayday.fandom.com/wiki/Hay_Day',
        revision: {
          revid: 55,
          timestamp: '2026-01-01T00:00:00Z',
          sha1: 'abc',
          slots: { main: { content: 'text' } },
        },
        wikitext: 'text',
        images: [{ title: 'File:Unknown.png' }],
      },
    ],
  ]);
  let revisionCalls = 0;
  const client = {
    apiUrl: 'https://hayday.fandom.com/api.php',
    async siteInfo() {
      return {
        query: { general: { wikiid: 'haydaywiki', sitename: 'Hay Day Wiki' } },
      };
    },
    async allPages(namespace) {
      return namespace === 0 ? pages : [];
    },
    async pageRevision(id) {
      revisionCalls += 1;
      return revisions.get(id);
    },
    async parsedPage() {
      return {
        text: '<p>content</p>',
        sections: [],
        categories: [],
        links: [],
        images: [],
      };
    },
    async imageInfo() {
      return [];
    },
  };
  const importer = new WikiImporter({
    client,
    outputDir: join(out, 'content'),
    statePath,
    now: (() => {
      let n = 0;
      return () => `2026-01-01T00:00:0${n++}Z`;
    })(),
  });
  const first = await importer.run();
  assert.equal(first.completeness.complete, true);
  assert.equal(first.pages[0].revisionId, 55);
  assert.equal(first.media[0].verdict, 'missing-upstream');
  await importer.run();
  assert.equal(revisionCalls, 1);
  const diskManifest = JSON.parse(
    await readFile(join(out, 'content', 'snapshot-manifest.json'), 'utf8'),
  );
  assert.equal(diskManifest.contentManifestDigest, first.contentManifestDigest);
  await rm(out, { recursive: true, force: true });
});

test('schema completeness regression turns red when a required field is removed, then green when restored', () => {
  const record = {
    schemaVersion: 1,
    pageId: 3,
    title: 'Crops',
    namespace: 0,
    revisionId: 9,
    sourceUrl: 'https://example.test',
    route: canonicalRoute('Crops', 0, 3),
    htmlHash: 'hash',
    referencedMediaIds: [],
  };
  validateArticleRecord(record);
  const broken = { ...record };
  delete broken.revisionId;
  assert.throws(() => validateArticleRecord(broken), /revisionId/);
  validateArticleRecord(record);
  assert.throws(
    () =>
      validateMediaRecord({
        schemaVersion: 1,
        mediaId: 'File:X',
        title: 'File:X',
        sourceUrl: 'x',
        descriptionUrl: 'x',
        verdict: 'not-a-verdict',
      }),
    /Unknown media verdict/,
  );
});
