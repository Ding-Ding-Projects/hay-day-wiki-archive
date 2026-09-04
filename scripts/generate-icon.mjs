import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await fs.readFile(join(root, 'desktop', 'icon.svg'));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()));
await fs.writeFile(join(root, 'desktop', 'icon.ico'), await pngToIco(pngs));
console.log(`Generated desktop/icon.ico with ${sizes.length} resolutions from the checked-in SVG source.`);


