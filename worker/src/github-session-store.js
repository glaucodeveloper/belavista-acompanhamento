import {newSessionToken,sessionTokenHash,verifyRepositoryPat} from '../../github-pat-auth.mjs';
import {foremanAccessKeyActorV1,normalizeForemanAccessPermissionsV1} from '../../foreman-access-key-policy.mjs';

const fail=(message,statusCode)=>Object.assign(new Error(message),{statusCode});
const NO_EXPIRY_AT='9999-12-31T23:59:59.999Z';
const repository=env=>String(env.GITHUB_REPO||'').trim();
const requiredDb=env=>{
  if(!env.BELAVISTA_DB)throw fail('BELAVISTA_DB não configurado.',503);
  return env.BELAVISTA_DB;
};
const userSelect=`SELECT github_auth_users.github_id AS githubId,
  github_auth_users.github_login AS githubLogin,
  github_auth_users.role AS role,github_auth_users.user_type AS userType,
  github_auth_users.commercial_profile AS commercialProfile,
  github_auth_users.active AS active,
  github_auth_users.created_at AS createdAt,
  github_auth_users.updated_at AS updatedAt FROM github_auth_users`;
const actorFor=(user,key=null)=>{
  const actor={uid:`github:${user.githubId}`,githubId:user.githubId,
  githubLogin:user.githubLogin,name:user.githubLogin,role:user.role,
  userType:user.userType||'',commercialProfile:user.commercialProfile||'',mode:'github-pat'};
  return key?{...foremanAccessKeyActorV1(actor,key),name:key.label,login:key.label}:actor;
};

export async function openGithubSession(env,pat,{account=''}={}){
  const tokenValue=String(pat||'').trim();
  const accountLabel=String(account||'').trim().replace(/\s+/g,' ');
  let delegatedKey=null,identity;
  if(tokenValue.startsWith('bvk_')){
    delegatedKey=await requiredDb(env).prepare(`SELECT k.id,k.github_id AS githubId,k.label,k.role_id AS roleId,
      k.permissions_json AS permissionsJson,r.name AS roleName,r.permissions_json AS rolePermissionsJson,
      k.created_at AS createdAt,k.expires_at AS expiresAt,k.revoked_at AS revokedAt
      FROM github_foreman_access_keys k LEFT JOIN github_foreman_access_roles r ON r.id=k.role_id
      WHERE k.token_hash=?`).bind(await sessionTokenHash(tokenValue)).first();
    if(!delegatedKey||delegatedKey.revokedAt||delegatedKey.expiresAt<=new Date().toISOString())throw fail('Chave de encarregado expirada ou revogada.',401);
    if(accountLabel&&delegatedKey.label.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR')!==accountLabel.toLocaleLowerCase('pt-BR'))
      throw fail('Conta ou chave de campo inválida.',401);
    delegatedKey.permissions=JSON.parse(delegatedKey.rolePermissionsJson||delegatedKey.permissionsJson||'[]');
    identity=await requiredDb(env).prepare(`SELECT github_id AS githubId,github_login AS githubLogin FROM github_auth_users WHERE github_id=? AND active=1`).bind(delegatedKey.githubId).first();
    if(!identity)throw fail('Conta administradora da chave inativa.',401);
  }else{
    if(accountLabel)throw fail('Use a chave de campo da conta cadastrada em Configurações.',401);
    identity=await verifyRepositoryPat(tokenValue,repository(env));
  }
  const db=requiredDb(env);
  const timestamp=new Date().toISOString();
  // Repository PATs open owner sessions; delegated field keys keep their scoped role.
  await db.prepare(`INSERT INTO github_auth_users
    (github_id,github_login,role,user_type,commercial_profile,active,created_at,updated_at)
    VALUES(?,?,'owner','', '',1,?,?)
    ON CONFLICT(github_id) DO UPDATE SET github_login=excluded.github_login,
      role='owner',user_type='',commercial_profile='',active=1,updated_at=excluded.updated_at`)
    .bind(identity.githubId,identity.githubLogin,timestamp,timestamp).run();
  const user=await db.prepare(`${userSelect} WHERE github_id=?`).bind(identity.githubId).first();
  if(!user)throw fail('Não foi possível iniciar uma sessão de acesso.',500);
  const token=newSessionToken();
  const now=new Date();
  const expiresAt=new Date(now.getTime()+24*60*60*1000).toISOString();
  await db.prepare(`INSERT INTO github_auth_sessions
    (token_hash,github_id,created_at,expires_at,delegated_key_id) VALUES(?,?,?,?,?)`)
    .bind(await sessionTokenHash(token),identity.githubId,now.toISOString(),expiresAt,delegatedKey?.id||null).run();
  return {token,expiresAt,actor:actorFor(user,delegatedKey)};
}

export async function actorFromGithubSession(env,token){
  if(!/^bvs_[a-f0-9]{64}$/.test(String(token||'')))throw fail('Sessão obrigatória.',401);
  const user=await requiredDb(env).prepare(`${userSelect.replace(' FROM github_auth_users',`,s.delegated_key_id AS delegatedKeyId,
    k.label AS delegatedKeyLabel,k.role_id AS delegatedRoleId,k.permissions_json AS delegatedPermissionsJson,
    r.name AS delegatedRoleName,r.permissions_json AS delegatedRolePermissionsJson,
    k.expires_at AS delegatedExpiresAt,k.revoked_at AS delegatedRevokedAt FROM github_auth_users`)} JOIN github_auth_sessions s
    ON s.github_id=github_auth_users.github_id
    LEFT JOIN github_foreman_access_keys k ON k.id=s.delegated_key_id
    LEFT JOIN github_foreman_access_roles r ON r.id=k.role_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`)
    .bind(await sessionTokenHash(token),new Date().toISOString()).first();
  if(!user||!user.active||user.delegatedKeyId&&(!user.delegatedKeyLabel||user.delegatedRevokedAt||user.delegatedExpiresAt<=new Date().toISOString()))throw fail('Sessão expirada ou acesso revogado.',401);
  const key=user.delegatedKeyId?{id:user.delegatedKeyId,label:user.delegatedKeyLabel,roleId:user.delegatedRoleId||'',roleName:user.delegatedRoleName||'',permissions:JSON.parse(user.delegatedRolePermissionsJson||user.delegatedPermissionsJson||'[]')}:null;
  return actorFor(user,key);
}

export async function revokeGithubSession(env,token){
  if(!/^bvs_[a-f0-9]{64}$/.test(String(token||'')))return false;
  const result=await requiredDb(env).prepare(`UPDATE github_auth_sessions
    SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL`)
    .bind(new Date().toISOString(),await sessionTokenHash(token)).run();
  return Number(result.meta?.changes||0)>0;
}

export async function listForemanAccessKeys(env,githubId){
  const rows=await requiredDb(env).prepare(`SELECT k.id,k.label,k.role_id AS roleId,r.name AS roleName,
    COALESCE(r.permissions_json,k.permissions_json) AS permissionsJson,k.created_at AS createdAt,
    k.expires_at AS expiresAt,k.revoked_at AS revokedAt,k.created_by AS createdBy FROM github_foreman_access_keys k
    LEFT JOIN github_foreman_access_roles r ON r.id=k.role_id
    WHERE k.github_id=? ORDER BY k.created_at DESC`).bind(Number(githubId)).all();
  return (rows.results||[]).map(row=>({...row,expiresAt:row.expiresAt===NO_EXPIRY_AT?null:row.expiresAt,permissions:JSON.parse(row.permissionsJson||'[]')}));
}

export async function listForemanAccessRoles(env,githubId){
  const rows=await requiredDb(env).prepare(`SELECT id,name,permissions_json AS permissionsJson,created_at AS createdAt,updated_at AS updatedAt
    FROM github_foreman_access_roles WHERE github_id=? ORDER BY name COLLATE NOCASE`).bind(Number(githubId)).all();
  return (rows.results||[]).map(row=>({...row,permissions:JSON.parse(row.permissionsJson||'[]')}));
}

export async function saveForemanAccessRole(env,{githubId,id='',name,permissions}={}){
  const cleanName=String(name||'').trim().replace(/\s+/g,' '),scopes=normalizeForemanAccessPermissionsV1(permissions),now=new Date().toISOString();
  if(cleanName.length<2||cleanName.length>60)throw fail('Dê ao papel um nome entre 2 e 60 caracteres.',400);
  if(!scopes.length)throw fail('Selecione ao menos uma permissão para o papel.',400);
  const roleId=String(id||`FROLE-${crypto.randomUUID()}`);
  try{
    await requiredDb(env).prepare(`INSERT INTO github_foreman_access_roles(id,github_id,name,permissions_json,created_at,updated_at)
      VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,permissions_json=excluded.permissions_json,updated_at=excluded.updated_at
      WHERE github_foreman_access_roles.github_id=excluded.github_id`).bind(roleId,Number(githubId),cleanName,JSON.stringify(scopes),now,now).run();
  }catch(error){if(/unique/i.test(error.message||''))throw fail('Já existe um papel com esse nome.',409);throw error;}
  const role=await requiredDb(env).prepare(`SELECT id,name,permissions_json AS permissionsJson,created_at AS createdAt,updated_at AS updatedAt
    FROM github_foreman_access_roles WHERE id=? AND github_id=?`).bind(roleId,Number(githubId)).first();
  if(!role)throw fail('Papel não encontrado para esta conta.',404);
  return {...role,permissions:JSON.parse(role.permissionsJson||'[]')};
}

export async function deleteForemanAccessRole(env,githubId,id){
  const linked=await requiredDb(env).prepare(`SELECT COUNT(*) AS total FROM github_foreman_access_keys WHERE github_id=? AND role_id=? AND revoked_at IS NULL`).bind(Number(githubId),String(id||'')).first();
  if(Number(linked?.total||0))throw fail('Revogue primeiro as chaves ativas vinculadas a este papel.',409);
  const result=await requiredDb(env).prepare(`DELETE FROM github_foreman_access_roles WHERE id=? AND github_id=?`).bind(String(id||''),Number(githubId)).run();
  return Number(result.meta?.changes||0)>0;
}

export async function createForemanAccessKey(env,{githubId,label,permissions,roleId='',createdBy=''}={}){
  const cleanLabel=String(label||'').trim().replace(/\s+/g,' ');
  let selectedPermissions=permissions;
  if(!roleId)throw fail('Selecione um papel dinâmico antes de emitir a chave.',400);
  const role=await requiredDb(env).prepare(`SELECT id,name,permissions_json AS permissionsJson FROM github_foreman_access_roles WHERE id=? AND github_id=?`).bind(String(roleId),Number(githubId)).first();
  if(!role)throw fail('Selecione um papel válido da sua conta.',400);
  selectedPermissions=JSON.parse(role.permissionsJson||'[]');
  const scopes=normalizeForemanAccessPermissionsV1(selectedPermissions);
  if(cleanLabel.length<2||cleanLabel.length>60)throw fail('Dê à chave um nome entre 2 e 60 caracteres.',400);
  if(!scopes.length)throw fail('Selecione ao menos uma permissão.',400);
  const id=`FKEY-${crypto.randomUUID()}`,token=newSessionToken().replace(/^bvs_/,'bvk_'),now=new Date(),expiresAt=NO_EXPIRY_AT;
  await requiredDb(env).prepare(`INSERT INTO github_foreman_access_keys
    (id,github_id,label,permissions_json,token_hash,created_at,expires_at,created_by,role_id) VALUES(?,?,?,?,?,?,?,?,?)`)
    .bind(id,Number(githubId),cleanLabel,JSON.stringify(scopes),await sessionTokenHash(token),now.toISOString(),expiresAt,String(createdBy||''),String(roleId||'')||null).run();
  return {id,label:cleanLabel,roleId:String(roleId||''),permissions:scopes,token,createdAt:now.toISOString(),expiresAt:null,revokedAt:null};
}

export async function revokeForemanAccessKey(env,githubId,id){
  const result=await requiredDb(env).prepare(`UPDATE github_foreman_access_keys SET revoked_at=?
    WHERE id=? AND github_id=? AND revoked_at IS NULL`).bind(new Date().toISOString(),String(id||''),Number(githubId)).run();
  return Number(result.meta?.changes||0)>0;
}
