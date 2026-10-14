import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MASTERPLAN_PDF_ARTWORK_V3 as artwork } from '../masterplan-pdf-artwork-v3.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'tmp/pdfs/warley-embedded-image.jpg');
// This is the embedded Im0 image in Warley.pdf, NOT a generated/redrawn plan.
const sourceSha256 = '87859f6374f49fccb2a43d18df390626c602685b4a8f2d06f05cf514d8d9f7dd';
const crop = artwork.crop;
// Only the OUTSIDE perimeter is clipped. Never flood/remove green by color:
// the exterior lawn and genuine border parcels share the same texture.
// Coordinates are in the original 7087 x 8268 embedded PDF raster.
const perimeter = [
  [3130, 434], [3590, 600], [4215, 875], [4330, 983],
  [4372, 1040], [4666, 1362], [4954, 1680], [5240, 1998],
  [5522, 2316], [5812, 2636], [6102, 2954], [6390, 3276], [6592, 3524],
  [6374, 3750], [2986, 7096], [2770, 7380], [2754, 7455],
  [2754, 7565], [2810, 7703], [2203, 7308], [2250, 7305],
  [2310, 7270], [2360, 7220], [2385, 7160], [2375, 7105],
  [2340, 7060], [2270, 7020], [840, 6060], [2507, 4350],
  [2626, 4469], [2742, 4270], [2795, 4060], [2828, 3930],
  [2880, 3770], [2905, 3530], [2930, 3330], [2940, 3260],
  [3000, 3170], [2904, 3154], [2904, 3072], [2785, 3104],
  [2770, 3100], [2360, 2820], [2280, 2760], [2500, 2470],
  [2610, 2320], [2750, 2000],
];

export const registration = {
  legacyCanvas: { width: 2886, height: 3468 },
  sourceToLegacy: { scale: 0.512, x: -426.5, y: -242 },
  sourceCrop: crop,
};

const sourceBytes = await fs.readFile(source);
if (createHash('sha256').update(sourceBytes).digest('hex') !== sourceSha256) {
  throw new Error('The extracted artwork does not match the original Warley.pdf image.');
}
const { data, info } = await sharp(sourceBytes).extract(crop).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}"><polygon fill="white" points="${perimeter.map(([x,y]) => `${x-crop.left},${y-crop.top}`).join(' ')}"/></svg>`);
const mask = await sharp(svg).ensureAlpha().raw().toBuffer();
let opaquePixels = 0;
for (let index = 0; index < crop.width * crop.height; index++) {
  data[index * 4 + 3] = mask[index * 4 + 3];
  if (data[index * 4 + 3] === 255) opaquePixels++;
}
const target = path.join(root, 'assets/public/alianca-park-masterplan-lot-overlay-v3.webp');
await sharp(data, { raw: info }).webp({ lossless: true, effort: 4 }).toFile(target);
await fs.mkdir(path.join(root, 'output/map-pdf-original'), { recursive: true });
await sharp(target).resize({ width: 1200 }).flatten({ background: '#abb7bf' }).png()
  .toFile(path.join(root, 'output/map-pdf-original/recorte-original.png'));
await fs.writeFile(path.join(root, 'output/map-pdf-original/registration.json'), JSON.stringify({
  source: 'Warley.pdf / Im0.jpg', sourceSha256, registration, perimeter,
  opaquePixels, operation: 'original pixels with outside-perimeter alpha only; no green flood, no parcel redraw',
}, null, 2));
console.log(JSON.stringify({ target, width: info.width, height: info.height, opaquePixels,
  sizeMB: Number(((await fs.stat(target)).size / 1024 ** 2).toFixed(2)) }));
