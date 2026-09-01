import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_PATH = '/hay-day-wiki-archive/';
const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024 - 1;
const outputArg = process.argv.find((value) => value.startsWith('--output='));
const outputDir = resolve(ROOT, outputArg ? outputArg.slice('--output='.length) : 'dist/pages');
const port = Number(process.env.PAGES_PRERENDER_PORT || 43000 + (process.pid % 10000));
const host = '127.0.0.1';

const textExtensions = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.json', '.svg', '.map', '.txt', '.xml']);

function fail(message) {
  console.error(`Pages build failed: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  if (!(await exists(directory))) return [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function routeFromValue(value, key, parentKey) {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (key === 'route' || key === 'path' || key === 'href') {
    if (!value.startsWith('/') || value.startsWith('//')) return null;
    return value.split('#')[0].split('?')[0] || '/';
  }
  if (key === 'slug' && (parentKey === 'article' || parentKey === 'articles')) return `/wiki/${value}`;
  if (key === 'slug' && (parentKey === 'category' || parentKey === 'categories')) return `/category/${value}`;
  if (key === 'slug' && (parentKey === 'media' || parentKey === 'files')) return `/media/${value}`;
  return null;
}

function collectRoutes(value, routes, key = '') {
  if (Array.isArray(value)) {
    for (const item of value) collectRoutes(item, routes, key);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [childKey, childValue] of Object.entries(value)) {
    const route = routeFromValue(childValue, childKey, key);
    if (route) routes.add(route);
    collectRoutes(childValue, routes, childKey);
  }
}

async function discoverRoutes() {
  const routes = new Set(['/']);
  const appFiles = await walk(join(ROOT, 'app'));
  for (const path of appFiles) {
    if (!path.endsWith(`${sep}page.tsx`) && !path.endsWith(`${sep}page.ts`) && !path.endsWith(`${sep}page.jsx`) && !path.endsWith(`${sep}page.js`)) continue;
    const relativeRoute = relative(join(ROOT, 'app'), dirname(path)).replaceAll(sep, '/');
    if (!relativeRoute || relativeRoute.split('/').some((segment) => segment.startsWith('[') || segment.startsWith('(') || segment === 'api')) continue;
    routes.add(`/${relativeRoute}`);
  }
  const manifestCandidates = [
    join(ROOT, 'content', 'final', 'snapshot-manifest.json'),
    join(ROOT, 'content-manifest.json'),
    join(ROOT, 'content', 'manifest.json'),
    join(ROOT, 'content', 'manifests', 'content.json'),
    join(ROOT, 'public', 'content-manifest.json'),
    join(ROOT, 'public', 'manifest.json'),
  ];
  for (const path of manifestCandidates) {
    if (!(await exists(path))) continue;
    try {
      collectRoutes(JSON.parse(await fs.readFile(path, 'utf8')), routes);
    } catch (error) {
      fail(`cannot parse route manifest ${relative(ROOT, path)}: ${error.message}`);
    }
  }

  const contentFiles = await walk(join(ROOT, 'content'));
  for (const path of contentFiles) {
    const rel = relative(join(ROOT, 'content'), path).replaceAll(sep, '/');
    if (!['.json', '.md', '.mdx', '.html'].some((extension) => rel.endsWith(extension))) continue;
    const segments = rel.split('/');
    const collection = segments[0];
    if (!['articles', 'categories', 'media', 'files'].includes(collection)) continue;
    const slug = rel.slice(collection.length + 1).replace(/\.json$/, '').replaceAll('\\', '/');
    if (slug && !slug.endsWith('manifest')) routes.add(`/${collection === 'articles' ? 'wiki' : collection === 'files' ? 'media' : collection}/${slug}`);
  }
  return [...routes].map((route) => route.replace(/\/+/g, '/')).sort((a, b) => a.localeCompare(b));
}

function rewriteAssetReferences(text) {
  let result = text;
  result = result.replace(/(["'=(])\/_next\//g, `$1${BASE_PATH}_next/`);
  result = result.replace(/((?:href|src|action|poster|content)=['"])\/(?!\/|hay-day-wiki-archive\/)/g, (_, prefix) => `${prefix}${BASE_PATH.slice(0, -1)}/`);
  result = result.replace(/url\(\s*\/(?!\/)/g, `url(${BASE_PATH}`);
  result = result.replace(/(https?:\/\/[^"'<>\s]+)\/hay-day-wiki-archive\/hay-day-wiki-archive\//g, '$1/hay-day-wiki-archive/');
  return result;
}

async function copyTree(source, destination) {
  if (!(await exists(source))) return;
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (entry.name === '.vite') continue;
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await fs.copyFile(from, to);
  }
}

async function fetchText(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) fail(`vinext production server exited with code ${child.exitCode}`);
    try {
      const result = await fetchText(url, 2000);
      if (result.response.status >= 200 && result.response.status < 500) return;
    } catch {
      // The server is still starting. The deadline makes this bounded.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  fail(`vinext production server did not answer ${url} within 60 seconds`);
}

async function renderRoutes(routes) {
  const cli = join(ROOT, 'node_modules', 'vinext', 'dist', 'cli.js');
  if (!(await exists(cli))) fail('the Vinext CLI is missing from node_modules after dependency installation');
  const child = spawn(process.execPath, [cli, 'start', '--hostname', host, '--port', String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, NODE_ENV: 'production' },
    windowsHide: true,
  });
  child.exitCode = null;
  const stop = () => {
    if (child.exitCode === null) child.kill('SIGTERM');
  };
  const waitForExit = async () => {
    if (child.exitCode !== null) return;
    await Promise.race([
      new Promise((resolvePromise) => child.once('exit', resolvePromise)),
      new Promise((resolvePromise) => setTimeout(resolvePromise, 5000)),
    ]);
    if (child.exitCode === null) child.kill('SIGKILL');
  };
  process.once('exit', stop);
  try {
    await waitForServer(`http://${host}:${port}/`, child);
    const templates = new Map();
    for (const route of routes) {
      const url = `http://${host}:${port}${route}`;
      const templateKey = route.startsWith('/wiki/') ? 'wiki' : route.startsWith('/media/') && route !== '/media' ? 'media' : route;
      let body = templates.get(templateKey);
      if (!body) {
        const result = await fetchText(url);
        if (result.response.status < 200 || result.response.status >= 300) fail(`route ${route} returned HTTP ${result.response.status}`);
        const contentType = result.response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) fail(`route ${route} returned ${contentType}, not HTML`);
        body = result.body;
        templates.set(templateKey, body);
      }
      const target = route === '/' ? join(outputDir, 'index.html') : join(outputDir, route.replace(/^\/+/, ''), 'index.html');
      await fs.mkdir(dirname(target), { recursive: true });
      await fs.writeFile(target, rewriteAssetReferences(body), 'utf8');
    }
  } finally {
    process.removeListener('exit', stop);
    stop();
    await waitForExit();
  }
}

async function copyStaticFiles() {
  await copyTree(join(ROOT, 'dist', 'client'), outputDir);
  await copyTree(join(ROOT, 'public'), outputDir);
  await copyTree(join(ROOT, 'content', 'final'), join(outputDir, 'archive'));
  await fs.writeFile(join(outputDir, '.nojekyll'), '', 'utf8');
}

async function byteSize(directory) {
  let total = 0;
  for (const path of await walk(directory)) total += (await fs.stat(path)).size;
  return total;
}

async function rewriteTextAssets() {
  for (const path of await walk(outputDir)) {
    if (!textExtensions.has(extname(path).toLowerCase())) continue;
    const source = await fs.readFile(path, 'utf8');
    const rewritten = rewriteAssetReferences(source);
    if (rewritten !== source) await fs.writeFile(path, rewritten, 'utf8');
  }
}

async function main() {
  if (!(await exists(join(ROOT, 'dist', 'server')))) fail('dist/server is missing. Run npm run build first.');
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const routes = await discoverRoutes();
  console.log(`Prerendering ${routes.length} route${routes.length === 1 ? '' : 's'} through the Vinext production server`);
  await renderRoutes(routes);
  await copyStaticFiles();
  await rewriteTextAssets();
  const commit = process.env.GITHUB_SHA || (spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout || '').trim() || null;
  const epoch = process.env.SOURCE_DATE_EPOCH ? Number(process.env.SOURCE_DATE_EPOCH) : null;
  const manifest = {
    schemaVersion: 1,
    basePath: BASE_PATH,
    sourceCommit: commit,
    generatedAt: Number.isFinite(epoch) ? new Date(epoch * 1000).toISOString() : null,
    routes,
    outputLimitBytes: MAX_OUTPUT_BYTES,
  };
  await fs.writeFile(join(outputDir, 'pages-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const size = await byteSize(outputDir);
  if (size > MAX_OUTPUT_BYTES) fail(`output is ${size} bytes, above the ${MAX_OUTPUT_BYTES}-byte limit`);
  console.log(`Pages output ready at ${relative(ROOT, outputDir)} (${size} bytes)`);
}

main().catch((error) => {
  if (!process.exitCode) process.exitCode = 1;
  console.error(error.stack || error.message);
});
