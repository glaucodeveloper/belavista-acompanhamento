import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('mapa aéreo usa uma única base e separa elementos 3D das áreas selecionáveis',()=>{
  const components=read('components.js');
  const styles=read('styles.css');
  assert.equal(fs.existsSync(path.join(root,'assets/public/alianca-park-aerial-reference-v1.png')),true);
  assert.match(components,/semantic-elements-only-v1|semantic-elements-only-v2/);
  assert.match(components,/lotes e ruas como áreas selecionáveis/);
  assert.match(components,/only trees \+ structures \+ cars/);
  assert.match(components,/mapSelectionKind='lot'/);
  assert.match(components,/mapSelectionKind='street'/);
  assert.match(styles,/alianca-park-aerial-realistic-preview-v2\.jpg\?v=admin-reference-aerial-realistic-preview-v2/);
  assert.doesNotMatch(styles,/map-3d-loading-backdrop-page\{[^}]*aspect-ratio:1800\/2098/);
});
