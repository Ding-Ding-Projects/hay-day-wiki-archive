import { promises as fs } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv.find((value) => value.startsWith('--output='));
const outputDir = resolve(ROOT, outputArg ? outputArg.slice('--output='.length) : 'dist/pages');
const BASE_PATH = '/hay-day-wiki-archive/';
const MAX_BYTES = 1024 * 1024 * 1024 - 1;

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function main() {
  const manifestPath = join(outputDir, 'pages-manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1) throw new Error('unsupported pages manifest schema');
  if (manifest.basePath !== BASE_PATH) throw new Error(`manifest base path is ${manifest.basePath}, expected ${BASE_PATH}`);
  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0 || !manifest.routes.includes('/')) throw new Error('manifest has no root route');
  for (const route of manifest.routes) {
    if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || route.includes('..')) throw new Error(`unsafe route in manifest: ${route}`);
    const path = route === '/' ? join(outputDir, 'index.html') : join(outputDir, route.slice(1), 'index.html');
    await fs.access(path);
    const html = await fs.readFile(path, 'utf8');
    if (!html.includes(BASE_PATH)) throw new Error(`route ${route} has no ${BASE_PATH} asset prefix`);
    if (html.match(/(?:href|src)=['"]\/(?!\/|hay-day-wiki-archive\/)/)) throw new Error(`route ${route} contains an unprefixed root asset reference`);
  }
  const notFound = join(outputDir, '404.html');
  await fs.access(notFound);
  const notFoundHtml = await fs.readFile(notFound, 'utf8');
  if (!notFoundHtml.includes('path-recovery') || !notFoundHtml.includes(BASE_PATH)) throw new Error('404.html is missing path recovery and base path metadata');
  const files = await walk(outputDir);
  let bytes = 0;
  for (const path of files) bytes += (await fs.stat(path)).size;
  if (bytes > MAX_BYTES) throw new Error(`output is ${bytes} bytes, above the ${MAX_BYTES}-byte limit`);
  console.log(`Pages output check passed: ${manifest.routes.length} routes, ${files.length} files, ${bytes} bytes`);
}

main().catch((error) => {
  console.error(`Pages output check failed: ${error.message}`);
  process.exitCode = 1;
});
