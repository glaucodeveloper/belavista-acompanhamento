// BELAVISTA_CASH_EVIDENCE_V11
const clean=value=>String(value||'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'evidence.bin';
const repoParts=env=>String(env.GITHUB_REPO||env.GITHUB_REPOSITORY||'').split('/').filter(Boolean);
const runtime=env=>{const [owner,repo]=repoParts(env);if(!env.GITHUB_PAT)throw new Error('GITHUB_PAT não configurado.');if(!owner||!repo)throw new Error('GITHUB_REPO deve usar owner/repo.');return {owner,repo,branch:String(env.GITHUB_BRANCH||'master')};};
export async function saveCashEvidence(env,input={}){
  const dataUrl=String(input.dataUrl||''),match=dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);if(!match)throw new Error('Evidência inválida: envie imagem/PDF em data URL base64.');
  const contentType=String(input.contentType||match[1]||'').toLowerCase();if(!(contentType.startsWith('image/')||contentType==='application/pdf'))throw new Error('Evidência deve ser imagem ou PDF.');
  const content=match[2].replace(/\s/g,'');const approx=Math.floor(content.length*3/4);if(approx<64)throw new Error('Evidência vazia.');if(approx>6*1024*1024)throw new Error('Evidência excede 6 MB.');
  const {owner,repo,branch}=runtime(env),id=`CASH-PROOF-${Date.now().toString(36).toUpperCase()}`,ext=contentType==='application/pdf'?'.pdf':contentType.includes('jpeg')?'.jpg':contentType.includes('webp')?'.webp':'.png';
  const file=clean(input.fileName||`${id}${ext}`),path=`data/operational/evidence/cash/${id}-${file}`;
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const response=await fetch(url,{method:'PUT',headers:{Authorization:`Bearer ${env.GITHUB_PAT}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({message:`chore(belavista): comprovante de caixa ${id}`,content,branch})});
  const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.message||`GitHub evidence HTTP ${response.status}`);
  return {id,kind:String(input.kind||'upload'),path,sha:payload.content?.sha||'',contentType,size:approx,createdAt:new Date().toISOString()};
}
