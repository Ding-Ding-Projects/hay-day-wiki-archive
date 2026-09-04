/* oxlint-disable typescript/no-require-imports */
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'], ['.xml', 'application/xml; charset=utf-8'],
]);

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function mapRequestPath(requestPath, basePath) {
  const parts = requestPath.split('/').filter(Boolean);
  const decoded = parts.map((part) => decodeURIComponent(part));
  if (decoded.some((part) => !part || part === '.' || part === '..' || part.includes('\\') || part.includes('\0'))) return null;
  let relative = decoded.join('/');
  const base = basePath.replace(/^\/+|\/+$/g, '');
  if (relative === base) relative = '';
  else if (relative.startsWith(`${base}/`)) relative = relative.slice(base.length + 1);
  return relative;
}

async function resolveFile(root, relative) {
  const normalized = path.normalize(relative || 'index.html');
  const candidate = path.resolve(root, normalized);
  if (!isWithin(root, candidate)) return null;
  const resolveExisting = async (value) => {
    if (!isWithin(root, value)) return null;
    if (root.includes(`.asar${path.sep}`)) {
      try { return (await fsp.stat(value)).isFile() ? value : null; } catch { return null; }
    }
    try {
      const canonicalRoot = await fsp.realpath(root);
      let cursor = root;
      for (const part of path.relative(root, value).split(path.sep).filter(Boolean)) {
        cursor = path.join(cursor, part);
        if ((await fsp.lstat(cursor)).isSymbolicLink()) return null;
      }
      const canonicalValue = await fsp.realpath(value);
      if (!isWithin(canonicalRoot, canonicalValue)) return null;
      return (await fsp.stat(canonicalValue)).isFile() ? canonicalValue : null;
    } catch { return null; }
  };
  const direct = await resolveExisting(candidate);
  if (direct) return direct;
  if (!path.extname(normalized)) {
    const routeIndex = path.resolve(root, normalized, 'index.html');
    const resolvedIndex = await resolveExisting(routeIndex);
    if (resolvedIndex) return resolvedIndex;
  }
  return null;
}

function parseCookies(header) {
  const cookies = new Map();
  try {
    for (const part of String(header || '').split(';')) {
      const separator = part.indexOf('=');
      if (separator <= 0) continue;
      cookies.set(decodeURIComponent(part.slice(0, separator).trim()), decodeURIComponent(part.slice(separator + 1).trim()));
    }
    return cookies;
  } catch { return null; }
}

async function createArchiveServer({ root, basePath = '/hay-day-wiki-archive/' } = {}) {
  const resolvedRoot = path.resolve(root || path.join(__dirname, '..', 'dist', 'pages'));
  const token = crypto.randomBytes(24).toString('hex');
  const cookieName = 'archive_access';
  const server = http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    let url;
    try { url = new URL(request.url || '/', 'http://127.0.0.1'); } catch { response.writeHead(400); response.end('Bad request'); return; }
    const cookies = parseCookies(request.headers.cookie);
    if (url.searchParams.get('access') === token) {
      url.searchParams.delete('access');
      response.writeHead(302, { Location: `${url.pathname}${url.search}${url.hash}`, 'Set-Cookie': `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/` });
      response.end();
      return;
    }
    if (!cookies || cookies.get(cookieName) !== token) { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); return; }
    let relative;
    try { relative = mapRequestPath(url.pathname, basePath); } catch { relative = null; }
    if (relative === null) { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); return; }
    const file = await resolveFile(resolvedRoot, relative);
    if (!file) { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); return; }
    const headers = { 'Content-Type': MIME_TYPES.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'" };
    if (request.method === 'HEAD') { response.writeHead(200, headers); response.end(); return; }
    response.writeHead(200, headers);
    fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
  });
  await new Promise((resolvePromise, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolvePromise(); }); });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  if (!port) throw new Error('loopback server did not expose a port');
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return { server, root: resolvedRoot, token, port, url: `http://127.0.0.1:${port}${prefix}index.html?access=${encodeURIComponent(token)}`, close: () => new Promise((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise())) };
}

module.exports = { createArchiveServer, isWithin, mapRequestPath, resolveFile };
