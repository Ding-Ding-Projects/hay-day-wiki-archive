#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
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
const unreferenced = manifest.media.filter((record) => !referenced.has(record.mediaId));
const missingReferenced = [...referenced].filter(
  (mediaId) => !manifest.media.some((record) => record.mediaId === mediaId),
);
const articleFiles = await readdir(resolve(root, 'articles'));
const mediaFiles = await readdir(resolve(root, 'media'));
const sampleMissing = manifest.media
  .filter((record) => record.verdict === 'missing-upstream')
  .slice(0, 30)
  .map((record) => record.title);

console.log(JSON.stringify({
  status: manifest.completeness.complete ? 'complete' : 'incomplete',
  inventory: manifest.counts.inventory,
  pages: manifest.pages.length,
  media: manifest.media.length,
  uniqueReferencedMedia: referenced.size,
  externalVideosInArticles: manifest.externalVideos.length,
  verdicts,
  unreferencedMedia: unreferenced.length,
  missingReferencedMedia: missingReferenced.length,
  articleFiles: articleFiles.length,
  mediaFiles: mediaFiles.length,
  sampleMissing,
  contentManifestDigest: manifest.contentManifestDigest,
  mediaManifestDigest: manifest.mediaManifestDigest,
}, null, 2));

if (!manifest.completeness.complete) process.exitCode = 1;
if (unreferenced.length || missingReferenced.length) process.exitCode = 1;
if (articleFiles.length !== manifest.pages.length) process.exitCode = 1;
if (mediaFiles.length !== manifest.media.length) process.exitCode = 1;
