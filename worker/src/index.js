import {routeRequest, handleQueueBatch, handleScheduled} from './routes.js';
import {RecordDigestWorkflow, PurchaseReceiptDigestWorkflow} from './workflows.js';
import {requireAdminRequest} from './request-auth.js';
import {limitedActorCanAccessApi} from '../../api-access-policy.mjs';

export default {
  async fetch(request,env,ctx){
    const origin=request.headers.get('origin')||'';
    const allowedOrigins=String(env.ALLOWED_ORIGINS||'*').split(',').map(item=>item.trim()).filter(Boolean);
    const allowOrigin=allowedOrigins.includes('*')?'*':allowedOrigins.includes(origin)?origin:'';
    const cors={
      ...(allowOrigin?{'access-control-allow-origin':allowOrigin}:{}),
      'access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers':'authorization,content-type,x-belavista-token,x-belavista-role,x-belavista-user,x-belavista-name',
      'access-control-max-age':'86400',
      vary:'Origin'
    };
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    const pathname=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    try{
      const publicApi=pathname==='/api/health'||pathname==='/api/runtime'
        ||pathname==='/api/ai/status'||pathname==='/api/inference/status'
        ||pathname==='/api/ai/tools'||pathname.startsWith('/api/public/')
        ||pathname==='/api/auth/session'||pathname==='/api/ai/dashboard-demo-generation';
      if(pathname.startsWith('/api/')&&!publicApi){
        const actor=await requireAdminRequest(request,env);
        if(!limitedActorCanAccessApi(actor,pathname,request.method,new URL(request.url).search)){
          const privateLeadPath=pathname==='/api/admin/public-leads'||pathname==='/api/admin/public-lead-summary';
          return new Response(JSON.stringify({error:'Este perfil só pode acessar registros e a linha do tempo do cronograma.'}),
            {status:403,headers:{'content-type':'application/json; charset=utf-8',...(privateLeadPath?{'cache-control':'no-store'}:{}),...cors}});
        }
      }
      const response=await routeRequest(request,env,ctx);
      const headers=new Headers(response.headers);
      for(const [name,value] of Object.entries(cors))headers.set(name,value);
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }catch(error){
      console.error('worker request failed',error);
      const privateLeadPath=pathname==='/api/admin/public-leads'||pathname==='/api/admin/public-lead-summary';
      return new Response(JSON.stringify({error:error?.message||'Erro interno do Worker.'}),{status:Number(error?.statusCode)||500,headers:{'content-type':'application/json; charset=utf-8',...(privateLeadPath?{'cache-control':'no-store'}:{}),...cors}});
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
