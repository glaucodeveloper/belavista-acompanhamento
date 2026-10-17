import {actorFromGithubSession} from './github-session-store.js';

const requestActors=new WeakMap();

export function bearerToken(request){
  const value=String(request.headers.get('authorization')||'');
  return value.match(/^Bearer\s+(.+)$/i)?.[1]||'';
}

export async function requireAdminRequest(request,env){
  let pending=requestActors.get(request);
  if(!pending){
    pending=actorFromGithubSession(env,bearerToken(request));
    requestActors.set(request,pending);
  }
  return pending;
}
