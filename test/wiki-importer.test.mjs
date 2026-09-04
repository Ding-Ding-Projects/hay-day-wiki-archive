/* oxlint-disable typescript/no-floating-promises */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sanitizeHtml } from '../lib/wiki/sanitize.mjs';
import { MediaWikiClient } from '../lib/wiki/client.mjs';
import { WikiImporter, rightsEvidence } from '../lib/wiki/importer.mjs';
import {
  canonicalRoute,
  CATEGORY_INDEX_SCHEMA_VERSION,
  SCHEMA_VERSION,
  sha256,
  validateArticleRecord,
  validateMediaRecord,
} from '../lib/wiki/schemas.mjs';

test('paginates the complete allimages catalog', async () => {
  let calls = 0;
  const client = new MediaWikiClient({
    fetchImpl: async (url) => {
      calls += 1;
      assert.equal(url.searchParams.get('list'), 'allimages');
      const body = calls === 1
        ? {
          query: { allimages: [{ title: 'File:A.png', url: 'https://cdn/a', descriptionurl: 'https://wiki/a', size: 1, width: 2, height: 3, mime: 'image/png', sha1: 'a' }] },
          continue: { aicontinue: 'B.png|1', continue: '||' },
        }
        : { query: { allimages: [{ title: 'File:B.png', url: 'https://cdn/b', descriptionurl: 'https://wiki/b', size: 4, width: 5, height: 6, mime: 'image/png', sha1: 'b' }] } };
      return new Response(JSON.stringify(body), { status: 200 });
    },
  });
  const images = await client.allImages();
  assert.deepEqual(images.map((image) => image.title), ['File:A.png', 'File:B.png']);
  assert.equal(images[0].imageinfo.width, 2);
  assert.equal(calls, 2);
});

test('uses the MediaWiki batch revision contract for selective refresh', async () => {
  let requested;
  const client = new MediaWikiClient({
    fetchImpl: async (url) => {
      requested = url;
      return new Response(JSON.stringify({ query: { pages: [
        { pageid: 1, ns: 0, title: 'A', revisions: [{ revid: 9, timestamp: '2026-01-01T00:00:00Z', sha1: 'x' }] },
      ] } }), { status: 200 });
    },
  });
  const revisions = await client.currentPageRevisions([1, 2]);
  assert.equal(revisions.get(1).revid, 9);
  assert.equal(new URL(requested).searchParams.has('rvlimit'), false);
});

test('selective refresh invalidates only changed, added, and removed page IDs', async () => {
  const importer = new WikiImporter({
    client: {
      async allPages(namespace) {
        return namespace === 0
          ? [
            { pageid: 1, title: 'Unchanged' },
            { pageid: 2, title: 'Changed' },
            { pageid: 3, title: 'Added' },
          ]
          : [];
      },
      async currentPageRevisions() {
        return new Map([
          [1, { revid: 10 }],
          [2, { revid: 22 }],
          [3, { revid: 30 }],
        ]);
      },
    },
    outputDir: 'unused',
    statePath: join(tmpdir(), `hay-day-category-state-${process.pid}.json`),
  });
  const working = {
    pageInventory: [
      { pageid: 1, title: 'Unchanged', namespace: 0, redirect: false },
      { pageid: 2, title: 'Changed', namespace: 0, redirect: false },
      { pageid: 4, title: 'Removed', namespace: 0, redirect: false },
    ],
    pages: {
      1: { pageId: 1, revisionId: 10 },
      2: { pageId: 2, revisionId: 20 },
      4: { pageId: 4, revisionId: 40 },
    },
    completedPageIds: [1, 2, 4],
  };
  await importer.refreshPageInventory(working);
  assert.deepEqual(working.refresh.invalidatedPageIds, [2, 3, 4]);
  assert.deepEqual(working.completedPageIds, [1]);
  assert.deepEqual(Object.keys(working.pages), ['1']);
});

test('collects versioned category membership records', async () => {
  const importer = new WikiImporter({
    client: {
      async categoryMembers() {
        return new Map([[
          'Category:Pets',
          [
            { pageId: 1, title: 'Hedgehog', namespace: 0, type: 'page' },
            { pageId: 999, title: 'User talk:Someone', namespace: 3, type: 'page' },
          ],
        ]]);
      },
    },
    outputDir: 'unused',
    statePath: join(tmpdir(), `hay-day-selective-state-${process.pid}.json`),
  });
  const working = {
    pageInventory: [
      { pageid: 1, title: 'Hedgehog', namespace: 0 },
      { pageid: 14, title: 'Category:Pets', namespace: 14 },
    ],
    pages: {
      1: {
        pageId: 1,
        title: 'Hedgehog',
        namespace: 0,
        categories: ['Category:Pets'],
        categoryMembership: { schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION, titles: ['Category:Pets'] },
      },
    },
  };
  await importer.refreshCategoryMembership(working);
  assert.equal(working.categoryIndex.schemaVersion, CATEGORY_INDEX_SCHEMA_VERSION);
  assert.deepEqual(working.categoryIndex.categories['Category:Pets'].map((member) => member.scope), ['included', 'out-of-scope']);
  assert.equal(working.categoryIndex.counts.edges, 2);
});

test('classifies rights only from explicit file-page evidence', () => {
  assert.equal(rightsEvidence('{{License SC}}').verdict, 'conditional-supercell-policy');
  assert.equal(rightsEvidence('{{Fairuse}}').verdict, 'fair-use');
  assert.equal(rightsEvidence('{{Permission}}').verdict, 'permission-unverified');
  assert.equal(rightsEvidence('{{Self}}').verdict, 'self-authored-unlicensed');
  assert.equal(rightsEvidence('{{Creative Commons BY-SA}}').verdict, 'standard-license-pending-provenance');
  assert.equal(rightsEvidence('plain prose without a rights template').verdict, 'no-file-page-evidence');
  assert.equal(rightsEvidence('words mentioning youtube are not provider evidence').verdict, 'no-file-page-evidence');
  assert.equal(rightsEvidence('', true).verdict, 'external-provider');
});

test('manifest digest projections turn red when retained source data changes', () => {
  const pages = [{ pageId: 1, revisionId: 10, wikitextHash: sha256('source'), htmlHash: 'html' }];
  const original = sha256(pages);
  const changed = sha256([{ ...pages[0], wikitextHash: sha256('changed source') }]);
  assert.notEqual(changed, original);
  const media = [{
    mediaId: 'File:A.png',
    sourceSha1: 'a',
    verdict: 'source-link-only',
    filePageId: 2,
    filePageRevisionId: 3,
    filePageWikitextHash: sha256('{{Self}}'),
    rightsEvidence: { verdict: 'self-authored-unlicensed' },
    scope: 'file-page',
    referenceCount: 0,
  }];
  const mediaOriginal = sha256(media);
  const mediaChanged = sha256([{ ...media[0], referenceCount: 1 }]);
  assert.notEqual(mediaChanged, mediaOriginal);
});

test('parses an exact old revision without sending an invalid pageid pair', async () => {
  let requested;
  const client = new MediaWikiClient({
    fetchImpl: async (url) => {
      requested = new URL(url);
      return new Response(JSON.stringify({ parse: { pageid: 42, title: 'Crops', text: '<p>ok</p>' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  const parsed = await client.parsedPage(42, 9001);
  assert.equal(parsed.pageid, 42);
  assert.equal(requested.searchParams.get('oldid'), '9001');
  assert.equal(requested.searchParams.has('pageid'), false);
});

test('rejects a request that never settles within the configured deadline', async () => {
  const client = new MediaWikiClient({
    requestTimeoutMs: 1_000,
    maxRetries: 0,
    fetchImpl: async (_url, { signal }) =>
      await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  });
  await assert.rejects(() => client.siteInfo(), /failed after 1 attempts/);
});

test('collects page image properties across MediaWiki continuations', async () => {
  let calls = 0;
  const client = new MediaWikiClient({
    fetchImpl: async () => {
      calls += 1;
      const body = calls === 1
        ? { query: { pages: [{ pageid: 1, images: [{ title: 'File:A.png' }] }] }, continue: { imcontinue: '1|B', continue: '||' } }
        : { query: { pages: [{ pageid: 1, images: [{ title: 'File:B.png' }] }] } };
      return new Response(JSON.stringify(body), { status: 200 });
    },
  });
  const mapping = await client.pageImages([1]);
  assert.deepEqual(mapping.get(1), ['File:A.png', 'File:B.png']);
  assert.equal(calls, 2);
});

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
    '<p><iframe src="https://youtu.be/abc"></iframe></p>',
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
        query: {
          general: { wikiid: 'haydaywiki', sitename: 'Hay Day Wiki' },
          rightsinfo: { text: 'CC-BY-SA', url: 'https://www.fandom.com/licensing' },
        },
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
        images: ['Unknown.png'],
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
  assert.deepEqual(first.pages[0].attribution.textLicense, {
    label: 'CC-BY-SA',
    url: 'https://www.fandom.com/licensing',
    version: null,
  });
  assert.equal(
    first.pages[0].attribution.sourcePermalink,
    'https://hayday.fandom.com/wiki/Hay_Day?oldid=55',
  );
  assert.equal(first.media[0].verdict, 'missing-upstream');
  assert.equal(first.media.length, 1);
  assert.equal(first.media[0].mediaId, 'File:Unknown.png');
  assert.deepEqual(await readdir(join(out, 'content', 'media')), [
    `${sha256('File:Unknown.png')}.json`,
  ]);
  await importer.run();
  assert.equal(revisionCalls, 1);
  const diskManifest = JSON.parse(
    await readFile(join(out, 'content', 'snapshot-manifest.json'), 'utf8'),
  );
  assert.equal(diskManifest.contentManifestDigest, first.contentManifestDigest);
  await rm(out, { recursive: true, force: true });
});

test('classifies source video pointers as consent-gated external media', () => {
  const importer = new WikiImporter({
    client: {},
    outputDir: 'unused',
    statePath: 'unused',
  });
  const record = importer.mediaRecord({
    title: 'File:Video',
    imageinfo: {
      url: 'https://www.youtube.com/watch?v=abc',
      descriptionurl: 'https://hayday.fandom.com/wiki/File:Video',
      mime: 'video/youtube',
      mediatype: 'VIDEO',
      extmetadata: {},
    },
  });
  assert.equal(record.verdict, 'external-embed');
  assert.equal(record.route, '/media/File%3AVideo');
  assert.equal(record.consentRequired, true);
});

test('uses the authoritative page image property instead of parsed display aliases', async () => {
  let queriedTitles;
  const importer = new WikiImporter({
    client: {
      async pageRevision() {
        return { revision: { revid: 7 }, images: [] };
      },
      async parsedPage() {
        return { images: ['Old_Display_Name.png'] };
      },
      async imageInfo(titles) {
        queriedTitles = titles;
        return [];
      },
    },
    outputDir: 'unused',
    statePath: 'unused',
  });
  const result = await importer.fetchPage(
    { pageid: 1, title: 'Article' },
    { media: {} },
  );
  assert.deepEqual(result.mediaTitles, []);
  assert.deepEqual(queriedTitles, []);
});

test('schema completeness regression turns red when a required field is removed, then green when restored', () => {
  const record = {
    schemaVersion: SCHEMA_VERSION,
    pageId: 3,
    title: 'Crops',
    namespace: 0,
    revisionId: 9,
    sourceUrl: 'https://example.test',
    route: canonicalRoute('Crops', 0, 3),
    htmlHash: 'hash',
    wikitext: 'text',
    categoryMembership: { schemaVersion: CATEGORY_INDEX_SCHEMA_VERSION, titles: [] },
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
        schemaVersion: SCHEMA_VERSION,
        mediaId: 'File:X',
        title: 'File:X',
        route: '/media/File%3AX',
        sourceUrl: 'x',
        descriptionUrl: 'x',
        verdict: 'not-a-verdict',
        scope: 'referenced-only',
        referenceCount: 0,
        filePageId: null,
      }),
    /Unknown media verdict/,
  );
});
