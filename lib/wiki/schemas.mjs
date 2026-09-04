import { createHash } from 'node:crypto';

export const SCHEMA_VERSION = 2;
export const CATEGORY_INDEX_SCHEMA_VERSION = 1;
export const INCLUDED_NAMESPACES = Object.freeze([0, 4, 12, 14]);
export const MEDIA_NAMESPACE = 6;
export const MEDIA_SCOPES = Object.freeze([
  'file-page-and-referenced',
  'file-page',
  'referenced-only',
  'downloadable-only',
]);
export const TERMINAL_MEDIA_VERDICTS = Object.freeze([
  'copied',
  'external-embed',
  'source-link-only',
  'missing-upstream',
]);

export function sha256(value) {
  const hash = createHash('sha256');
  hash.update(
    typeof value === 'string' || Buffer.isBuffer(value)
      ? value
      : stableJson(value),
  );
  return hash.digest('hex');
}

export function stableJson(value) {
  return JSON.stringify(value, stableStringifyReplacer, 2) + '\n';
}

function stableStringifyReplacer(_key, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, value[key]]),
  );
}

export function slugifyTitle(title) {
  const normalized = String(title)
    .normalize('NFKC')
    .trim()
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 0x1f && code !== 0x7f;
    })
    .join('')
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}._~-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return normalized || 'untitled';
}

export function canonicalRoute(title, namespace = 0, pageId) {
  const base =
    namespace === 0
      ? slugifyTitle(title)
      : `${slugifyTitle(namespaceName(namespace))}/${slugifyTitle(title)}`;
  return `/wiki/${encodeURIComponent(base)}${pageId === undefined ? '' : `-${String(pageId)}`}`;
}

export function namespaceName(namespace) {
  return (
    { 0: 'wiki', 4: 'hay-day-wiki', 12: 'help', 14: 'category' }[namespace] ??
    `ns-${namespace}`
  );
}

export function assertSchemaVersion(record, expected) {
  expected ??= SCHEMA_VERSION;
  if (!record || record.schemaVersion !== expected) {
    throw new Error(
      `Unsupported schema version: ${String(record?.schemaVersion ?? 'missing')}`,
    );
  }
}

export function validateArticleRecord(record) {
  assertSchemaVersion(record);
  for (const field of [
    'pageId',
    'title',
    'namespace',
    'revisionId',
    'sourceUrl',
    'route',
    'htmlHash',
  ]) {
    if (
      record[field] === undefined ||
      record[field] === null ||
      record[field] === ''
    )
      throw new Error(`ArticleRecordV1 missing ${field}`);
  }
  if (!INCLUDED_NAMESPACES.includes(record.namespace))
    throw new Error(`ArticleRecordV1 namespace excluded: ${record.namespace}`);
  if (!Array.isArray(record.referencedMediaIds))
    throw new Error('ArticleRecordV1 referencedMediaIds must be an array');
  if (!record.categoryMembership || record.categoryMembership.schemaVersion !== CATEGORY_INDEX_SCHEMA_VERSION)
    throw new Error('ArticleRecordV2 categoryMembership must be versioned');
  if (!Array.isArray(record.categoryMembership.titles))
    throw new Error('ArticleRecordV2 categoryMembership titles must be an array');
  if (typeof record.wikitext !== 'string')
    throw new Error('ArticleRecordV2 wikitext must be retained as a string');
  return record;
}

export function validateMediaRecord(record) {
  assertSchemaVersion(record);
  for (const field of ['mediaId', 'title', 'route', 'descriptionUrl', 'verdict']) {
    if (
      record[field] === undefined ||
      record[field] === null ||
      record[field] === ''
    )
      throw new Error(`MediaRecordV1 missing ${field}`);
  }
  if (!TERMINAL_MEDIA_VERDICTS.includes(record.verdict))
    throw new Error(`Unknown media verdict: ${record.verdict}`);
  if (!MEDIA_SCOPES.includes(record.scope))
    throw new Error(`Unknown media scope: ${record.scope}`);
  if (!Number.isInteger(record.referenceCount) || record.referenceCount < 0)
    throw new Error('MediaRecordV2 referenceCount must be a non-negative integer');
  if (record.filePageId !== null && !Number.isInteger(record.filePageId))
    throw new Error('MediaRecordV2 filePageId must be an integer or null');
  if (record.filePageId !== null && typeof record.filePageWikitext !== 'string')
    throw new Error('MediaRecordV2 filePageWikitext must be retained for File pages');
  if (record.verdict !== 'missing-upstream' && !record.sourceUrl)
    throw new Error('MediaRecordV1 missing sourceUrl');
  return record;
}

export function validateManifest(manifest) {
  assertSchemaVersion(manifest);
  for (const field of [
    'source',
    'snapshot',
    'pages',
    'media',
    'completeness',
    'categoryIndex',
    'mediaCatalog',
  ]) {
    if (manifest[field] === undefined)
      throw new Error(`SnapshotManifestV1 missing ${field}`);
  }
  if (!Array.isArray(manifest.pages) || !Array.isArray(manifest.media))
    throw new Error('SnapshotManifestV1 pages and media must be arrays');
  validateCategoryIndex(manifest.categoryIndex);
  if (manifest.snapshot.importerVersion !== '2.0.0')
    throw new Error(`SnapshotManifestV2 importer version mismatch: ${String(manifest.snapshot.importerVersion ?? 'missing')}`);
  if (!manifest.snapshot.refresh || manifest.snapshot.refresh.schemaVersion !== 1)
    throw new Error('SnapshotManifestV2 refresh summary is missing');
  return manifest;
}

export function validateCategoryIndex(index) {
  if (!index || index.schemaVersion !== CATEGORY_INDEX_SCHEMA_VERSION)
    throw new Error('CategoryIndexV1 has an unsupported schema version');
  if (!index.categories || typeof index.categories !== 'object' || Array.isArray(index.categories))
    throw new Error('CategoryIndexV1 categories must be an object');
  for (const [title, members] of Object.entries(index.categories)) {
    if (!title || !Array.isArray(members) || members.some((member) =>
      !member || !Number.isInteger(member.pageId) || typeof member.title !== 'string' ||
      !['included', 'out-of-scope'].includes(member.scope)))
      throw new Error('CategoryIndexV1 contains an invalid membership list');
  }
  return index;
}
