import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '..');
const vendor = path.join(web, 'public', 'vendor');
fs.mkdirSync(vendor, { recursive: true });

const rubyCandidates = [
  path.join(web, 'node_modules', '@ruby', '4.0-wasm-wasi', 'dist', 'ruby+stdlib.wasm'),
  path.join(web, 'node_modules', '@ruby', '4.0-wasm-wasi', 'dist', 'ruby.wasm'),
];
const rubySource = rubyCandidates.find((candidate) => fs.existsSync(candidate));
if (!rubySource) throw new Error(`Ruby WASM not found. Checked:\n${rubyCandidates.join('\n')}`);
const rubyDest = path.join(vendor, 'ruby+stdlib.wasm');
fs.copyFileSync(rubySource, rubyDest);
console.log(`ruby.wasm: ${rubySource} -> ${rubyDest}`);