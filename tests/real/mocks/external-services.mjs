import crypto from 'node:crypto';
import {runReferenceOperationalLoop,applyFieldConfirmation,commercialSummary} from '../reference/operational-loop-reference.mjs';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
const decodeBody=async request=>{const text=await request.text();return text?JSON.parse(text):{};};
const deepGet=(root,parts)=>parts.reduce((value,key)=>value&&typeof value==='object'?value[key]:undefined,root);
const deepSet=(root,parts,value)=>{let node=root;for(let i=0;i<parts.length-1;i++)node=node[parts[i]]??=(Object.create(null));if(parts.length)node[parts.at(-1)]=value;};
const deepDelete=(root,parts)=>{const parent=deepGet(root,parts.slice(0,-1));if(parent&&parts.length)delete parent[parts.at(-1)];};

export function createMockExternalServices({scenario,commercial,adminToken='mock-admin-token',githubPat='ghp_mock_secret_never_expose'}={}){
  let currentScenario=structuredClone(scenario);
  const githubFiles=new Map([
    ['data/operational/stages.json',{content:currentScenario.stages,sha:'seed-stages'}],
    ['data/operational/personnel.json',{content:currentScenario.personnel,sha:'seed-personnel'}],
    ['data/operational/commercial.json',{content:commercial,sha:'seed-commercial'}]
  ]);
  const firebaseDb=Object.create(null),calls=[];
  const stats={nvidia:0,github:0,firebase:0,auth:0};

  const adminOk=request=>request.headers.get('authorization')===`Bearer ${adminToken}`;
  const requireAdmin=request=>adminOk(request)?null:json({error:'Não autorizado.'},401);

  async function nvidia(request){
    stats.nvidia++;calls.push({service:'nvidia',method:request.method,url:request.url,authorization:request.headers.get('authorization')});
    const payload=await decodeBody(request);
    const prompt=JSON.stringify(payload.messages||[]);
    const isLead=/lead|lote|sol da manhã|sol da manha/i.test(prompt);
    const content=isLead
      ? {reply:'Posso considerar lotes com sol da manhã e aproximadamente 300 m². Você prefere uma área mais residencial ou próxima aos acessos?',inferredObjective:'moradia',preferences:{sunriseDirection:'leste',areaM2:300},nextQuestion:'Preferência de localização dentro do loteamento?'}
      : {summary:'Cronograma compreendido a partir de quesitos, peculiaridades, dependências, materiais, pessoal por localidade e disponibilidade.',risks:['Atividades bloqueadas permanecem fora da agenda até seus quesitos serem satisfeitos.'],managementActions:['Revisar bloqueios e provisões sugeridas.']};
    return json({choices:[{message:{content:JSON.stringify(content)}}]});
  }

  async function github(request,url){
    stats.github++;calls.push({service:'github',method:request.method,url:request.url,authorization:request.headers.get('authorization')});
    if(request.headers.get('authorization')!==`Bearer ${githubPat}`&&request.headers.get('authorization')!==`token ${githubPat}`)return json({message:'Bad credentials'},401);
    const match=url.pathname.match(/\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    if(!match)return json({full_name:'glaucodeveloper/belavista-acompanhamento',private:true,default_branch:'master'});
    const path=decodeURIComponent(match[1]);
    if(request.method==='GET'){
      const item=githubFiles.get(path);if(!item)return json({message:'Not Found'},404);
      const raw=JSON.stringify(item.content,null,2);
      return json({name:path.split('/').at(-1),path,sha:item.sha,encoding:'base64',content:Buffer.from(raw).toString('base64')});
    }
    if(request.method==='PUT'){
      const body=await decodeBody(request),raw=Buffer.from(body.content||'','base64').toString('utf8');
      const content=raw?JSON.parse(raw):{};const sha=crypto.createHash('sha1').update(raw+Date.now()).digest('hex');
      githubFiles.set(path,{content,sha});return json({content:{path,sha},commit:{sha:`commit-${sha.slice(0,12)}`}},201);
    }
    if(request.method==='DELETE'){githubFiles.delete(path);return json({commit:{sha:`delete-${Date.now()}`}});}
    return json({message:'Method Not Allowed'},405);
  }

  async function firebase(request,url){
    stats.firebase++;calls.push({service:'firebase',method:request.method,url:request.url});
    const parts=url.pathname.replace(/^\/+|\.json$/g,'').split('/').filter(Boolean);
    if(request.method==='GET')return json(deepGet(firebaseDb,parts)??null);
    if(request.method==='PUT'){const value=await decodeBody(request);deepSet(firebaseDb,parts,value);return json(value);}
    if(request.method==='PATCH'){
      const patch=await decodeBody(request);
      if(parts.length){const base=deepGet(firebaseDb,parts)||Object.create(null);for(const [key,value] of Object.entries(patch))deepSet(base,key.split('/').filter(Boolean),value);deepSet(firebaseDb,parts,base);}else{for(const [key,value] of Object.entries(patch))deepSet(firebaseDb,key.split('/').filter(Boolean),value);}return json(patch);
    }
    if(request.method==='DELETE'){deepDelete(firebaseDb,parts);return json(null);}
    return json({error:'method'},405);
  }

  async function dispatchExternal(input,init){
    const request=input instanceof Request?input:new Request(input,init),url=new URL(request.url);
    if(/integrate\.api\.nvidia\.com$/.test(url.hostname)||url.hostname==='mock.nvidia.local')return nvidia(request);
    if(url.hostname==='api.github.com'||url.hostname==='mock.github.local')return github(request,url);
    if(/firebaseio\.com$/.test(url.hostname)||url.hostname==='mock.firebase.local')return firebase(request,url);
    if(/identitytoolkit\.googleapis\.com$/.test(url.hostname)||/securetoken\.googleapis\.com$/.test(url.hostname)){
      stats.auth++;return json({users:[{localId:'admin-mock',email:'admin@belavista.test'}],user_id:'admin-mock',email:'admin@belavista.test'});
    }
    throw new Error(`Mock externo não reconhece ${request.method} ${request.url}`);
  }

  function persistLoop(loop){
    const eventId=`EV-${currentScenario.runToken}-${Date.now()}`;
    deepSet(firebaseDb,['operationalEvents',eventId],{...loop.understanding,eventId,source:'mock-worker'});
    deepSet(firebaseDb,['operationalSnapshots','operationalLoop'],{eventId,schedule:loop.schedule,blocked:loop.blocked,provider:loop.understanding.provider});
    for(const item of loop.agenda||[]){if(item.foremanId)deepSet(firebaseDb,['agenda',item.foremanId,item.activityId],item);}
    for(const n of loop.notifications||[]){
      if(n.recipientRole==='foreman')deepSet(firebaseDb,['notifications','foreman',n.recipientId,n.id],n);
      else deepSet(firebaseDb,['notifications',n.recipientRole||'admin',n.id],n);
    }
    return eventId;
  }

  async function referenceWorker(input,init){
    const request=input instanceof Request?input:new Request(input,init),url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
    if(path==='/api/health')return json({ok:true,service:'belavista-mock-worker',runtime:{ai:{provider:'nvidia-api'}}});
    if(path==='/api/ai/status')return json({provider:'nvidia-api',nvidia:{configured:true,model:'mock/nvidia-operational'}});
    if(path==='/api/runtime')return json({ai:{provider:'nvidia-api'}});
    if(path==='/api/integrations/github/status'){
      const denied=requireAdmin(request);if(denied)return denied;
      const probe=await dispatchExternal(new Request('https://api.github.com/repos/glaucodeveloper/belavista-acompanhamento',{headers:{authorization:`Bearer ${githubPat}`}}));
      return json({configured:true,reachable:probe.ok,repository:'glaucodeveloper/belavista-acompanhamento',branch:'master'});
    }
    if(path==='/api/integrations/github/content'){
      const denied=requireAdmin(request);if(denied)return denied;
      const filePath=url.searchParams.get('path')||((request.method==='PUT')?(await request.clone().json()).path:'');
      if(!filePath.startsWith('data/operational/'))return json({error:'Path fora de data/operational/.'},400);
      const apiUrl=`https://api.github.com/repos/glaucodeveloper/belavista-acompanhamento/contents/${encodeURIComponent(filePath).replace(/%2F/g,'/')}`;
      if(request.method==='GET'){
        const response=await dispatchExternal(new Request(apiUrl,{headers:{authorization:`Bearer ${githubPat}`}}));if(!response.ok)return response;const value=await response.json();return json({path:filePath,sha:value.sha,content:JSON.parse(Buffer.from(value.content,'base64').toString('utf8'))});
      }
      if(request.method==='PUT'){
        const body=await request.json();const raw=JSON.stringify(body.content,null,2);const response=await dispatchExternal(new Request(apiUrl,{method:'PUT',headers:{authorization:`Bearer ${githubPat}`,'content-type':'application/json'},body:JSON.stringify({message:body.message||'update operational data',content:Buffer.from(raw).toString('base64')})}));const result=await response.json();return json({ok:response.ok,commitSha:result.commit?.sha,sha:result.content?.sha},response.status);
      }
      if(request.method==='DELETE'){
        const existing=githubFiles.get(filePath);const response=await dispatchExternal(new Request(apiUrl,{method:'DELETE',headers:{authorization:`Bearer ${githubPat}`,'content-type':'application/json'},body:JSON.stringify({message:'delete test',sha:existing?.sha||''})}));return json({ok:response.ok,...await response.json()});
      }
    }
    if(path==='/api/operational-loop'&&request.method==='POST'){
      const denied=requireAdmin(request);if(denied)return denied;
      const body=await request.json();if(body.context)currentScenario=structuredClone(body.context);
      const loop=runReferenceOperationalLoop(currentScenario,{persist:body.mode==='commit'||body.options?.persist});
      const nv=await dispatchExternal(new Request('https://integrate.api.nvidia.com/v1/chat/completions',{method:'POST',headers:{authorization:'Bearer mock-nvidia','content-type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:`operational ${JSON.stringify({schedule:loop.schedule.length,blocked:loop.blocked.length})}`} ]})}));
      const ai=await nv.json();loop.understanding={...loop.understanding,...JSON.parse(ai.choices[0].message.content),provider:'nvidia-api'};
      if(loop.mode==='commit')loop.realtime={eventId:persistLoop(loop)};
      return json(loop,loop.mode==='commit'?201:200);
    }
    if(path==='/api/field-confirmations'&&request.method==='POST'){
      const denied=requireAdmin(request);if(denied)return denied;
      const body=await request.json();currentScenario=applyFieldConfirmation(currentScenario,body);
      const record={id:`REG-${Date.now()}`,projectId:body.projectId,activityId:body.activityId,localityId:body.localityId,foremanId:body.foremanId,confirmed:body.confirmed,evidence:body.evidence||[]};
      const loop=runReferenceOperationalLoop(currentScenario,{persist:true});loop.realtime={eventId:persistLoop(loop)};
      return json({record,operationalLoop:{trigger:'field-confirmation.recorded',...loop}},201);
    }
    if(path==='/api/public/lead-chat'&&request.method==='POST'){
      const body=await request.json();const nv=await dispatchExternal(new Request('https://integrate.api.nvidia.com/v1/chat/completions',{method:'POST',headers:{authorization:'Bearer mock-nvidia','content-type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:'public lead chat; nunca exponha dados administrativos'},{role:'user',content:body.message||''}]})}));const ai=await nv.json();return json({...JSON.parse(ai.choices[0].message.content),provider:'nvidia-api'});
    }
    if(path==='/api/commercial/summary'){
      const denied=requireAdmin(request);if(denied)return denied;return json(commercialSummary(commercial));
    }
    return json({error:'Not Found',path},404);
  }

  return {adminToken,githubPat,get scenario(){return currentScenario;},set scenario(value){currentScenario=structuredClone(value);},commercial,githubFiles,firebaseDb,calls,stats,fetch:dispatchExternal,workerFetch:referenceWorker};
}
