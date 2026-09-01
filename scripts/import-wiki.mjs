#!/usr/bin/env node
import { resolve } from 'node:path';
import { MediaWikiClient } from '../lib/wiki/client.mjs';
import { WikiImporter } from '../lib/wiki/importer.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`Usage: npm run import -- [options]\n\nOptions:\n  --api <url>                MediaWiki API endpoint\n  --out <directory>          Generated content directory\n  --state <file>             Resumable private state file\n  --namespaces <ids>         Comma-separated namespace ids\n  --concurrency <1-8>        Bounded request concurrency\n  --max-pages <count>        Limit pages for a review import\n  --resume <true|false>      Resume the existing import state\n  --reusable-rights <names>  Explicit reusable media rights\n  --user-agent <value>       Importer user agent\n  --help                     Show this help without importing`);
  process.exit(0);
}
const outputDir = resolve(args.out ?? 'content/wiki');
const statePath = resolve(args.state ?? 'content/.import-state.json');
const namespaces = (args.namespaces ?? '0,4,12,14')
  .split(',')
  .map(Number)
  .filter(Number.isInteger);
const client = new MediaWikiClient({
  apiUrl: args.api ?? 'https://hayday.fandom.com/api.php',
  concurrency: Number(args.concurrency ?? 3),
  userAgent: args['user-agent'],
});
const importer = new WikiImporter({
  client,
  outputDir,
  statePath,
  explicitReusableRights: args['reusable-rights']
    ? args['reusable-rights'].split(',')
    : [],
  includeNamespaces: namespaces,
  pageConcurrency: Number(args.concurrency ?? 3),
  logger: (message) => console.error(message),
});
const manifest = await importer.run({
  resume: args.resume !== 'false',
  maxPages: args['max-pages'] ? Number(args['max-pages']) : Infinity,
});
console.log(
  JSON.stringify(
    {
      status: manifest.completeness.complete ? 'complete' : 'incomplete',
      pages: manifest.counts.pages,
      media: manifest.counts.media,
      externalVideos: manifest.counts.externalVideos,
      contentManifestDigest: manifest.contentManifestDigest,
      mediaManifestDigest: manifest.mediaManifestDigest,
    },
    null,
    2,
  ),
);

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) continue;
    const [key, inline] = value.slice(2).split('=', 2);
    if (inline !== undefined) result[key] = inline;
    else if (values[index + 1] && !values[index + 1].startsWith('--'))
      result[key] = values[++index];
    else result[key] = 'true';
  }
  return result;
}
