import { createHash } from 'node:crypto';

export const SCHEMA_VERSION = 1;
export const INCLUDED_NAMESPACES = Object.freeze([0, 4, 12, 14]);
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
  ]) {
    if (manifest[field] === undefined)
      throw new Error(`SnapshotManifestV1 missing ${field}`);
  }
  if (!Array.isArray(manifest.pages) || !Array.isArray(manifest.media))
    throw new Error('SnapshotManifestV1 pages and media must be arrays');
  return manifest;
}
