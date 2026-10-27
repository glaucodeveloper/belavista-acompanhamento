import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=join(root,'knowledge','stages');
const output=join(root,'frontend','src','data','stage-descriptions.json');
const files=(await readdir(source)).filter(name=>name.endsWith('.md')).sort();
const descriptions={};
for(const file of files){
  const text=await readFile(join(source,file),'utf8');
  const match=text.match(/^---\r?\ntype: stage-description\r?\nkey: ([a-z0-9-]+)\r?\ntitle: (.+)\r?\n---\r?\n\r?\n?([\s\S]+?)\s*$/);
  if(!match)throw new Error(`Invalid OKF stage document: ${file}`);
  const [,key,,description]=match;
  if(descriptions[key])throw new Error(`Duplicate stage description key: ${key}`);
  descriptions[key]=description.trim();
}
if(!Object.keys(descriptions).length)throw new Error('No OKF stage descriptions found.');
await writeFile(output,`${JSON.stringify(descriptions,null,2)}\n`,'utf8');
console.log(`Generated ${Object.keys(descriptions).length} stage descriptions from OKF.`);
