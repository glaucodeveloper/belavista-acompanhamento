import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [,, output = 'tmp/dwg-satellite-mosaic.png'] = process.argv;
const lat = -13.00044486;
const lon = -39.62315439;
const zoom = 18;
const radius = 4;
const tileSize = 256;
const n = 2 ** zoom;
const rad = Math.PI / 180;
const centerX = (lon + 180) / 360 * n;
const centerY = (1 - Math.asinh(Math.tan(lat * rad)) / Math.PI) / 2 * n;
const x0 = Math.floor(centerX) - radius;
const y0 = Math.floor(centerY) - radius;
const width = (radius * 2 + 1) * tileSize;
const height = width;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.resolve(root, output);

const tiles = [];
for (let row = 0; row < radius * 2 + 1; row++) {
  for (let col = 0; col < radius * 2 + 1; col++) {
    const x = ((x0 + col) % n + n) % n;
    const y = y0 + row;
    const url = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`tile ${response.status}: ${url}`);
    tiles.push({
      input: Buffer.from(await response.arrayBuffer()),
      left: col * tileSize,
      top: row * tileSize
    });
  }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await sharp({ create: { width, height, channels: 3, background: '#17251d' } })
  .composite(tiles)
  .png({ compressionLevel: 6 })
  .toFile(outputPath);

console.log(JSON.stringify({ output, center: [lat, lon], zoom, bounds: { x0, y0, x1: x0 + radius * 2, y1: y0 + radius * 2 }, width, height }));
