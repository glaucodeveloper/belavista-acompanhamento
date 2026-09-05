const AUTH_MODE=String(process.env.BELAVISTA_AUTH_MODE||'demo').trim().toLowerCase();
const ROLE_ALIASES=new Map([
  ['owner','owner'],['dono','owner'],['proprietario','owner'],['proprietário','owner'],
  ['admin','admin'],['administrador','admin'],
  ['foreman','foreman'],['encarregado','foreman'],
  ['developer','developer'],['desenvolvimento','developer'],['desenvolvedor','developer'],['ti','developer'],['dev','developer']
]);

const LOCAL_DEVELOPER_EMAILS=new Set([
  'icaroglaucooliveira@gmail.com',
  ...String(process.env.BELAVISTA_LOCAL_DEVELOPER_EMAILS||'').split(',').map(value=>value.trim().toLocaleLowerCase('pt-BR')).filter(Boolean)
]);
const localHost=req=>/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(String(req?.headers?.host||''));
const localDeveloperEmail=email=>LOCAL_DEVELOPER_EMAILS.has(String(email||'').trim().toLocaleLowerCase('pt-BR'));

let adminAuthPromise;
const firebaseAuth=()=>adminAuthPromise||(adminAuthPromise=(async()=>{
  const [{getApps,initializeApp,applicationDefault,cert},{getAuth}]=await Promise.all([
    import('firebase-admin/app'),import('firebase-admin/auth')
  ]);
  if(!getApps().length){
    const inline=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'').trim();
    initializeApp({credential:inline?cert(JSON.parse(inline)):applicationDefault(),databaseURL:process.env.FIREBASE_DATABASE_URL});
  }
  return getAuth();
})());

const normalizedRole=value=>ROLE_ALIASES.get(String(value||'').trim().toLocaleLowerCase('pt-BR'))||'';

export async function requestActor(req){
  if(AUTH_MODE==='firebase'){
    const token=String(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i)?.[1];
    if(!token)throw Object.assign(new Error('Autenticação obrigatória.'),{statusCode:401});
    const decoded=await (await firebaseAuth()).verifyIdToken(token,true);
    const claimedRole=normalizedRole(decoded.role);
    const role=localHost(req)&&localDeveloperEmail(decoded.email)?'developer':claimedRole==='developer'?'':claimedRole;
    if(!role)throw Object.assign(new Error('Perfil operacional não configurado.'),{statusCode:403});
    return {uid:decoded.uid,role,name:String(decoded.name||decoded.email||decoded.uid),mode:'firebase'};
  }
  const requestedRole=normalizedRole(req.headers['x-belavista-role']);
  const fallbackRole=normalizedRole(process.env.BELAVISTA_DEMO_ROLE)||'owner';
  const role=requestedRole==='developer'?(localHost(req)?'developer':fallbackRole):requestedRole||fallbackRole;
  return {uid:String(req.headers['x-belavista-user']||'local-warley'),role,name:String(req.headers['x-belavista-name']||'Warley'),mode:'demo'};
}

export async function requireRoles(req,allowed=[]){
  const actor=await requestActor(req);
  if(actor.role==='developer'&&localHost(req))return actor;
  if(!allowed.includes(actor.role))throw Object.assign(new Error('Seu perfil não possui permissão para esta operação.'),{statusCode:403});
  return actor;
}

export const authStatus=()=>({mode:AUTH_MODE,productionReady:AUTH_MODE==='firebase',roles:['owner','admin','foreman','developer'],localDeveloperScope:'localhost only'});
