const githubHeaders=token=>({
  accept:'application/vnd.github+json',
  authorization:`Bearer ${token}`,
  'user-agent':'belavista-acompanhamento',
  'x-github-api-version':'2022-11-28'
});

const authError=(message,statusCode)=>Object.assign(new Error(message),{statusCode});

async function githubGet(path,token){
  let response;
  try{
    response=await fetch(`https://api.github.com${path}`,{
      headers:githubHeaders(token),signal:AbortSignal.timeout(10000),cache:'no-store'
    });
  }catch{
    throw authError('Não foi possível consultar o GitHub. Tente novamente.',503);
  }
  if(response.status===401||response.status===403||response.status===404){
    throw authError('PAT inválido ou sem acesso ao repositório privado.',401);
  }
  if(!response.ok)throw authError(`GitHub indisponível (HTTP ${response.status}).`,503);
  return response.json();
}

export async function verifyRepositoryPat(value,repository){
  const token=String(value||'').trim();
  if(token.length<20||token.length>1024||/[\s\r\n]/.test(token)){
    throw authError('Informe um PAT válido do repositório.',400);
  }
  const repo=String(repository||'').trim();
  if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)){
    throw authError('Repositório de autenticação não configurado.',503);
  }
  const user=await githubGet('/user',token);
  if(!Number.isSafeInteger(user.id)||!user.login)throw authError('Identidade GitHub inválida.',401);
  const repositoryInfo=await githubGet(`/repos/${repo}`,token);
  if(repositoryInfo.full_name?.toLowerCase()!==repo.toLowerCase()||repositoryInfo.private!==true){
    throw authError('O repositório privado de autenticação não está acessível.',403);
  }
  return {githubId:user.id,githubLogin:String(user.login),name:String(user.name||user.login),
    avatarUrl:String(user.avatar_url||'')};
}

export async function githubIdentityForLogin(value){
  const login=String(value||'').trim();
  if(!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(login)){
    throw authError('Login GitHub inválido.',400);
  }
  let response;
  try{
    response=await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`,{
      headers:{accept:'application/vnd.github+json','user-agent':'belavista-acompanhamento',
        'x-github-api-version':'2022-11-28'},
      signal:AbortSignal.timeout(10000),cache:'no-store'
    });
  }catch{throw authError('Não foi possível consultar o GitHub.',503);}
  if(response.status===404)throw authError('Conta GitHub não encontrada.',404);
  if(!response.ok)throw authError(`GitHub indisponível (HTTP ${response.status}).`,503);
  const user=await response.json();
  if(!Number.isSafeInteger(user.id)||!user.login)throw authError('Identidade GitHub inválida.',502);
  return {githubId:user.id,githubLogin:String(user.login)};
}

export function newSessionToken(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return `bvs_${Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')}`;
}

export async function sessionTokenHash(token){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(token||'')));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export const repositoryOwner=repository=>String(repository||'').split('/')[0].toLowerCase();
