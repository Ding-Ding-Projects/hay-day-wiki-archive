#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sha256 } from '../lib/wiki/schemas.mjs';
import { validateManifest, validateArticleRecord, validateMediaRecord } from '../lib/wiki/schemas.mjs';

const root = resolve(process.argv[2] ?? 'content/wiki');
const manifest = JSON.parse(await readFile(resolve(root, 'snapshot-manifest.json'), 'utf8'));
validateManifest(manifest);
for (const record of manifest.pages) validateArticleRecord(record);
for (const record of manifest.media) validateMediaRecord(record);

const verdicts = Object.fromEntries(
  Object.entries(Object.groupBy(manifest.media, (record) => record.verdict))
    .map(([key, records]) => [key, records.length]),
);
const referenced = new Set(manifest.pages.flatMap((page) => page.referencedMediaIds));
const invalidReferenceScopeMedia = manifest.media.filter(
  (record) => !referenced.has(record.mediaId) &&
    !['file-page', 'file-page-and-referenced', 'downloadable-only'].includes(record.scope),
);
const missingReferenced = [...referenced].filter(
  (mediaId) => !manifest.media.some((record) => record.mediaId === mediaId),
);
const articleFiles = await readdir(resolve(root, 'articles'));
const mediaFiles = await readdir(resolve(root, 'media'));
const sampleMissingMedia = manifest.media
  .filter((record) => record.verdict === 'missing-upstream')
  .slice(0, 30)
  .map((record) => record.title);
const actualScopes = Object.fromEntries(
  Object.entries(Object.groupBy(manifest.media, (record) => record.scope))
    .map(([key, records]) => [key, records.length]),
);
const scopesEqual = Object.keys({ ...actualScopes, ...manifest.mediaCatalog.scopeCounts })
  .sort()
  .every((key) => Number(actualScopes[key] ?? 0) === Number(manifest.mediaCatalog.scopeCounts[key] ?? 0));
const duplicateMediaIds = manifest.media.length - new Set(manifest.media.map((record) => record.mediaId)).size;
const filePageRecords = manifest.media.filter((record) => record.filePageId !== null);
const filePageIds = new Set(filePageRecords.map((record) => record.filePageId));
const missingFilePageRecords = (manifest.mediaPageInventory ?? []).filter((page) => {
  const matches = manifest.media.filter((record) => record.title === page.title);
  return matches.length !== 1 || matches[0].filePageId !== page.pageid || typeof matches[0].filePageWikitext !== 'string';
});
const wikitextHashMismatches = manifest.pages.filter(
  (record) => sha256(record.wikitext) !== record.wikitextHash,
).length;
const fileWikitextHashMismatches = filePageRecords.filter(
  (record) => sha256(record.filePageWikitext) !== record.filePageWikitextHash,
).length;
const recomputedContentManifestDigest = sha256(
  manifest.pages.map((page) => ({
    pageId: page.pageId,
    revisionId: page.revisionId,
    wikitextHash: page.wikitextHash,
    htmlHash: page.htmlHash,
  })),
);
const recomputedMediaManifestDigest = sha256(
  manifest.media.map((record) => ({
    mediaId: record.mediaId,
    sourceSha1: record.sourceSha1,
    verdict: record.verdict,
    filePageId: record.filePageId,
    filePageRevisionId: record.filePageRevisionId,
    filePageWikitextHash: record.filePageWikitextHash,
    rightsEvidence: record.rightsEvidence?.verdict ?? null,
    scope: record.scope,
    referenceCount: record.referenceCount,
  })),
);
const retainedCategoryTitles = manifest.pages
  .filter((page) => Number(page.namespace) === 14)
  .map((page) => page.title);
const categoryKeys = Object.keys(manifest.categoryIndex.categories);
const categoryKeyCounts = new Map();
for (const title of retainedCategoryTitles)
  categoryKeyCounts.set(title, (categoryKeyCounts.get(title) ?? 0) + 1);
const categoryTitleMismatches = retainedCategoryTitles.filter(
  (title) => !Object.hasOwn(manifest.categoryIndex.categories, title) || categoryKeyCounts.get(title) !== 1,
).length + categoryKeys.filter((title) => !retainedCategoryTitles.includes(title)).length;
const categoryMembers = Object.values(manifest.categoryIndex.categories).flat();
const categoryEdges = categoryMembers.length;
const invalidCategoryMembers = categoryMembers.filter((member) =>
  !Number.isInteger(member.pageId) || typeof member.title !== 'string' ||
  !Number.isInteger(member.namespace) || typeof member.type !== 'string' ||
  !['included', 'out-of-scope'].includes(member.scope) ||
  (member.scope === 'included' && typeof member.route !== 'string') ||
  (member.scope === 'out-of-scope' && member.route !== null),
).length;
const categoryCountMismatch = manifest.categoryIndex.counts.categories !== retainedCategoryTitles.length ||
  manifest.categoryIndex.counts.edges !== categoryEdges ||
  manifest.categoryIndex.counts.emptyCategories !== Object.values(manifest.categoryIndex.categories).filter((members) => members.length === 0).length;

console.log(JSON.stringify({
  status: manifest.completeness.complete ? 'complete' : 'incomplete',
  inventory: manifest.counts.inventory,
  pages: manifest.pages.length,
  media: manifest.media.length,
  uniqueReferencedMedia: referenced.size,
  externalVideosInArticles: manifest.externalVideos.length,
  verdicts,
  unreferencedCatalogMedia: manifest.media.filter((record) => !referenced.has(record.mediaId)).length,
  invalidReferenceScopeMedia: invalidReferenceScopeMedia.length,
  filePageRecords: filePageRecords.length,
  filePageIds: filePageIds.size,
  missingFilePageRecords: missingFilePageRecords.length,
  actualScopes,
  duplicateMediaIds,
  scopeCountMismatch: !scopesEqual,
  wikitextHashMismatches,
  fileWikitextHashMismatches,
  retainedCategories: retainedCategoryTitles.length,
  categoryTitleMismatches,
  categoryEdges,
  invalidCategoryMembers,
  categoryCountMismatch,
  contentDigestMatches: recomputedContentManifestDigest === manifest.contentManifestDigest,
  mediaDigestMatches: recomputedMediaManifestDigest === manifest.mediaManifestDigest,
  recomputedContentManifestDigest,
  recomputedMediaManifestDigest,
  missingReferencedMedia: missingReferenced.length,
  articleFiles: articleFiles.length,
  mediaFiles: mediaFiles.length,
  sampleMissingMedia,
  contentManifestDigest: manifest.contentManifestDigest,
  mediaManifestDigest: manifest.mediaManifestDigest,
}, null, 2));

if (!manifest.completeness.complete) process.exitCode = 1;
if (invalidReferenceScopeMedia.length || missingReferenced.length) process.exitCode = 1;
if (articleFiles.length !== manifest.pages.length) process.exitCode = 1;
if (mediaFiles.length !== manifest.media.length) process.exitCode = 1;
if (duplicateMediaIds || missingFilePageRecords.length || filePageIds.size !== manifest.mediaCatalog.filePageCount) process.exitCode = 1;
if (!scopesEqual) process.exitCode = 1;
if (wikitextHashMismatches || fileWikitextHashMismatches) process.exitCode = 1;
if (categoryTitleMismatches || invalidCategoryMembers || categoryCountMismatch) process.exitCode = 1;
if (recomputedContentManifestDigest !== manifest.contentManifestDigest || recomputedMediaManifestDigest !== manifest.mediaManifestDigest)
  process.exitCode = 1;
