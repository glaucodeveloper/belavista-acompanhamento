import {routeRequest, handleQueueBatch, handleScheduled} from './routes.js';
import {RecordDigestWorkflow, PurchaseReceiptDigestWorkflow} from './workflows.js';

export default {
  async fetch(request,env,ctx){
    const origin=request.headers.get('origin')||'';
    const allowedOrigins=String(env.ALLOWED_ORIGINS||'*').split(',').map(item=>item.trim()).filter(Boolean);
    const allowOrigin=allowedOrigins.includes('*')?'*':allowedOrigins.includes(origin)?origin:'';
    const cors={
      ...(allowOrigin?{'access-control-allow-origin':allowOrigin}:{}),
      'access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers':'authorization,content-type,x-belavista-token',
      'access-control-max-age':'86400',
      vary:'Origin'
    };
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    const pathname=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    // BELAVISTA_RECORD_OCR_AUTH_ROUTE_V22
    const authManagedByRoute=pathname==='/api/public/lead-chat'||pathname==='/api/public/lead-register'||pathname==='/api/operational-loop'||pathname==='/api/ai'||pathname==='/api/ai/vision-reasoning'||pathname==='/api/gemini'||pathname.startsWith('/api/admin/')||pathname.startsWith('/api/live-tests')||pathname==='/instagram/webhook'||pathname==='/whatsapp/webhook'||pathname==='/api/records/ocr';
    if(env.BELAVISTA_API_TOKEN&&request.method!=='GET'&&!authManagedByRoute){
      const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
      const token=request.headers.get('x-belavista-token')||bearer;
      if(token!==env.BELAVISTA_API_TOKEN)return new Response(JSON.stringify({error:'Não autorizado.'}),{status:401,headers:{'content-type':'application/json; charset=utf-8',...cors}});
    }
    try{
      const response=await routeRequest(request,env,ctx);
      const headers=new Headers(response.headers);
      for(const [name,value] of Object.entries(cors))headers.set(name,value);
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }catch(error){
      console.error('worker request failed',error);
      return new Response(JSON.stringify({error:error?.message||'Erro interno do Worker.'}),{status:Number(error?.statusCode)||500,headers:{'content-type':'application/json; charset=utf-8',...cors}});
    }
  },
  async queue(batch,env,ctx){
    return handleQueueBatch(batch,env,ctx);
  },
  async scheduled(controller,env,ctx){
    return handleScheduled(controller,env,ctx);
  }
};

export {RecordDigestWorkflow, PurchaseReceiptDigestWorkflow};
