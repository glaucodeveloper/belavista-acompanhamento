import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { MASTERPLAN_PDF_ARTWORK_V3 as a, masterplanPdfImageRectV3 } from '../masterplan-pdf-artwork-v3.mjs';

test('the PDF crop has no holes and retains exact original RGB, not redrawn fills', async () => {
  const report = JSON.parse(await fs.readFile(new URL('../output/map-pdf-original/registration.json', import.meta.url)));
  const { data: original } = await sharp(new URL('../tmp/pdfs/warley-embedded-image.jpg', import.meta.url).pathname.replace(/^\/(\w:)/,'$1'))
    .extract(a.crop).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const { data: overlay } = await sharp(new URL(`..${a.url}`, import.meta.url).pathname.replace(/^\/(\w:)/,'$1'))
    .ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${a.crop.width}" height="${a.crop.height}"><polygon fill="white" points="${report.perimeter.map(([x,y])=>`${x-a.crop.left},${y-a.crop.top}`).join(' ')}"/></svg>`);
  const mask = await sharp(svg).ensureAlpha().raw().toBuffer();
  let opaque = 0, holes = 0, changed = 0;
  for(let i=0;i<overlay.length;i+=4) {
    if(mask[i+3]===255) { opaque++; if(overlay[i+3]!==255) holes++; }
    if(overlay[i+3]===255 && (original[i]!==overlay[i] || original[i+1]!==overlay[i+1] || original[i+2]!==overlay[i+2])) changed++;
  }
  assert.ok(opaque > 17_000_000);
  assert.equal(holes,0,'opaque original interiors must never be removed');
  assert.equal(changed,0,'preserved original pixels must not be repainted');
});

test('the expanded source crop retains the old marker UV registration at every viewport size', () => {
  for(const [width,height] of [[600,723],[325,700],[1000,560]]) {
    const r = masterplanPdfImageRectV3(width,height);
    const s=Math.min(width/a.legacyWidth,height/a.legacyHeight);
    for(const [x,y] of [[3218,474],[4364,1052],[6580,3520],[2050,5100],[1100,5800]]) {
      const newX=r.left+(x-a.crop.left)/a.crop.width*r.width;
      const newY=r.top+(y-a.crop.top)/a.crop.height*r.height;
      assert.ok(Math.abs(newX-((width-a.legacyWidth*s)/2+(x*a.sourceScale+a.sourceOffsetX)*s))<1e-8);
      assert.ok(Math.abs(newY-((height-a.legacyHeight*s)/2+(y*a.sourceScale+a.sourceOffsetY)*s))<1e-8);
    }
  }
});
