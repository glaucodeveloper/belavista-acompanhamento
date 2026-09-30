import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const source=()=>fs.readFileSync(path.join(root,'components.js'),'utf8');

test('área verde social recebe elevação visual parametrizada',()=>{
  const code=source();
  assert.match(code,/PUBLIC_SOCIAL_GREEN_LIFT_V1=\.14/);
  assert.match(code,/const isSocialGreenArea=area=>/);
  assert.match(code,/node\.position\.z\+=PUBLIC_SOCIAL_GREEN_LIFT_V1/);
  assert.match(code,/node\.userData\.publicGrassSurfaceLift=PUBLIC_SOCIAL_GREEN_LIFT_V1/);
  assert.match(code,/const verticalLift=isSocial\?PUBLIC_SOCIAL_GREEN_LIFT_V1:0/);
  assert.match(code,/mound\.position\.set\(cx,cy,baseZ\+verticalLift\)/);
  assert.match(code,/grassBaseZ=Math\.max\(groundZ,box\.max\.z\)\+\.06\+\(isSocialArea\?PUBLIC_SOCIAL_GREEN_LIFT_V1:0\)/);
});

test('elevação social não é perdida quando o heightmap reposiciona as árvores',()=>{
  const code=source();
  assert.match(code,/prepareTree=\(x,y,baseZ,targetHeight,index,verticalLift=0\)/);
  assert.match(code,/sampleZ:treeBaseZ,verticalLift:terrainLift/);
  assert.match(code,/Number\(anchor\.verticalLift\|\|0\)/);
});
