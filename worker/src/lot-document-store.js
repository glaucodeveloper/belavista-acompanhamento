// BELAVISTA_LOT_DOCUMENT_GITHUB_UPLOAD_V1
const clean=value=>String(value||'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'documento';
const runtime=env=>{
  const [owner,repo]=String(env.GITHUB_REPO||env.GITHUB_REPOSITORY||'').split('/').filter(Boolean);
  if(!env.GITHUB_PAT)throw new Error('GITHUB_PAT não configurado no Worker.');
  if(!owner||!repo)throw new Error('GITHUB_REPO deve usar owner/repo.');
  return {owner,repo,branch:String(env.GITHUB_BRANCH||'master')};
};

export async function saveLotDocument(env,input={}){
  const dataUrl=String(input.dataUrl||'');
  const match=dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if(!match)throw new Error('Arquivo inválido: envie imagem ou PDF em data URL base64.');
  const contentType=String(input.contentType||match[1]||'').toLowerCase();
  if(!(contentType.startsWith('image/')||contentType==='application/pdf'))throw new Error('O documento deve ser uma imagem ou PDF.');
  const content=match[2].replace(/\s/g,'');
  const size=Math.floor(content.length*3/4);
  if(size<64)throw new Error('Arquivo vazio.');
  if(size>6*1024*1024)throw new Error('O arquivo excede o limite de 6 MB.');
  const lotKey=clean(input.lotKey||'lote');
  const id=`LOT-DOC-${Date.now().toString(36).toUpperCase()}`;
  const extension=contentType==='application/pdf'?'.pdf':contentType.includes('jpeg')?'.jpg':contentType.includes('webp')?'.webp':'.png';
  const file=clean(input.fileName||`${id}${extension}`);
  const path=`data/operational/lots/${lotKey}/documents/${id}-${file}`;
  const {owner,repo,branch}=runtime(env);
  const endpoint=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const response=await fetch(endpoint,{method:'PUT',headers:{Authorization:`Bearer ${env.GITHUB_PAT}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({message:`docs(lote): anexo ${lotKey} ${id}`,content,branch})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.message||`GitHub respondeu ${response.status}.`);
  return {id,path,sha:payload.content?.sha||'',commitSha:payload.commit?.sha||'',url:payload.content?.html_url||`https://github.com/${owner}/${repo}/blob/${branch}/${path}`,fileName:file,contentType,size,createdAt:new Date().toISOString()};
}
