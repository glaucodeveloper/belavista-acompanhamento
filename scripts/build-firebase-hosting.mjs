import {cp, mkdir, rm, stat} from 'node:fs/promises';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=join(root,'dist-firebase');
const rootExtensions=new Set(['.html','.js','.mjs','.css','.webmanifest','.svg','.ico']);
const excludedRoots=new Set([
  '.github','.firebase','node_modules','tests','scripts','worker','firebase-functions',
  'mobile','electron','desktop','video','dist-pages','dist-firebase'
]);
const tracked=execFileSync('git',['ls-files','--cached','-z'],{cwd:root,encoding:'utf8'})
  .split('\0').filter(Boolean);
const files=tracked.filter(relative=>{
  const parts=relative.split('/');
  if(excludedRoots.has(parts[0]))return false;
  if(parts[0]==='assets'||parts[0]==='docs')return true;
  return parts.length===1&&rootExtensions.has(extname(relative).toLowerCase())&&relative!=='server.mjs';
});

if(!files.includes('index.html'))throw new Error('index.html não foi incluído no pacote do Firebase Hosting.');
if(!files.includes('stage-admin-v10.js'))throw new Error('stage-admin-v10.js não foi incluído no pacote do Firebase Hosting.');

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const relative of files){
  const destination=join(output,relative);
  await mkdir(dirname(destination),{recursive:true});
  await cp(join(root,relative),destination,{recursive:true});
}

const bytes=await Promise.all(files.map(async relative=>(await stat(join(root,relative))).size));
const total=bytes.reduce((sum,size)=>sum+size,0);
console.log(`Firebase Hosting pronto: ${files.length} arquivos, ${(total/1024/1024).toFixed(1)} MiB em ${output}`);
