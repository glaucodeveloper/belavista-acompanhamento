const text=(value,max=500)=>String(value??'').trim().slice(0,max);

function bearer(request){
  return text(request.headers.get('authorization')).replace(/^Bearer\s+/i,'');
}

function allowedEmails(env){
  return text(env.FIREBASE_ADMIN_EMAILS,2000).split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdminRequest(request,env){
  const token=bearer(request)||text(request.headers.get('x-belavista-token'));
  if(env.BELAVISTA_API_TOKEN&&token===String(env.BELAVISTA_API_TOKEN))return {uid:'service-token',email:'',mode:'service-token'};
  if(!token)throw Object.assign(new Error('Autenticação administrativa obrigatória.'),{statusCode:401});
  const apiKey=text(env.FIREBASE_WEB_API_KEY);
  if(!apiKey)throw Object.assign(new Error('FIREBASE_WEB_API_KEY não configurada no Worker.'),{statusCode:503});
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token})
  });
  const payload=await response.json().catch(()=>({}));
  const user=payload?.users?.[0];
  if(!response.ok||!user)throw Object.assign(new Error('Sessão Firebase inválida ou expirada.'),{statusCode:401});
  const email=String(user.email||'').toLowerCase();
  const allow=allowedEmails(env);
  if(allow.length&&!allow.includes(email))throw Object.assign(new Error('Usuário não autorizado para a administração.'),{statusCode:403});
  return {uid:user.localId,email,displayName:user.displayName||email,mode:'firebase'};
}
