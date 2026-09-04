import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractFile, listPackage } = require('@electron/asar');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, process.env.DESKTOP_INSTALLER_DIR || 'dist/installer/squirrel-windows');

async function files() {
  return (await fs.readdir(output, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
}

function hasAuthenticodeCertificate(bytes) {
  if (bytes.length < 256 || bytes.readUInt16LE(0) !== 0x5a4d) throw new Error('Setup executable has no MZ header');
  const peOffset = bytes.readUInt32LE(0x3c);
  if (peOffset + 160 > bytes.length || bytes.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') throw new Error('Setup executable has no PE header');
  const optionalOffset = peOffset + 24;
  const magic = bytes.readUInt16LE(optionalOffset);
  const directoryOffset = optionalOffset + (magic === 0x20b ? 112 : magic === 0x10b ? 96 : 0);
  if (directoryOffset === optionalOffset) throw new Error(`Unsupported PE optional header: ${magic.toString(16)}`);
  const certificateOffset = bytes.readUInt32LE(directoryOffset + 32);
  const certificateSize = bytes.readUInt32LE(directoryOffset + 36);
  return certificateOffset !== 0 || certificateSize !== 0;
}

async function main() {
  const entries = await files();
  const setup = entries.find((name) => /-Setup\.exe$/i.test(name));
  const releases = entries.find((name) => name.toUpperCase() === 'RELEASES');
  const packages = entries.filter((name) => /\.nupkg$/i.test(name));
  if (!setup || !releases || packages.length === 0) throw new Error(`Squirrel output is incomplete: setup=${Boolean(setup)} RELEASES=${Boolean(releases)} nupkg=${packages.length}`);
  const releaseText = await fs.readFile(join(output, releases), 'utf8');
  const rows = releaseText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length === 0) throw new Error('RELEASES contains no package rows');
  for (const row of rows) {
    const [sha1, fileName, sizeText] = row.split(/\s+/);
    if (!/^[a-f0-9]{40}$/i.test(sha1) || !/^\d+$/.test(sizeText) || !fileName || !packages.includes(fileName)) throw new Error(`RELEASES row does not reference a local full package: ${row}`);
    const bytes = await fs.readFile(join(output, fileName));
    const digest = crypto.createHash('sha1').update(bytes).digest('hex');
    if (digest.toLowerCase() !== sha1.toLowerCase() || bytes.length !== Number(sizeText)) throw new Error(`RELEASES integrity mismatch for ${fileName}`);
  }
  const setupBytes = await fs.readFile(join(output, setup));
  if (hasAuthenticodeCertificate(setupBytes)) throw new Error('Squirrel setup contains an Authenticode certificate table, expected unsigned output');
  const asarPath = resolve(output, '..', 'win-unpacked', 'resources', 'app.asar');
  const packagedFiles = listPackage(asarPath);
  for (const required of ['\\dist\\pages\\index.html', '\\dist\\pages\\archive\\snapshot-manifest.json']) {
    if (!packagedFiles.includes(required)) throw new Error(`Packaged application is missing ${required}`);
  }
  const packagedMain = extractFile(asarPath, 'desktop/main.cjs').toString('utf8');
  if (!packagedMain.includes("path.join(app.getAppPath(), 'dist', 'pages')")) throw new Error('Packaged main process does not resolve the archive from app.asar/dist/pages');
  const digest = crypto.createHash('sha256').update(setupBytes).digest('hex');
  console.log(JSON.stringify({ output, setup, releases, fullPackages: packages, packagedArchiveFiles: 2, setupBytes: setupBytes.length, setupSha256: digest, signing: 'NotSigned' }, null, 2));
}

main().catch((error) => { console.error(`Desktop package verification failed: ${error.message}`); process.exitCode = 1; });
