export class WorkerRegistryClient {
  constructor({
    baseUrl=process.env.BELAVISTA_WORKER_URL||'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev',
    token=process.env.BELAVISTA_ADMIN_ID_TOKEN||''
  }={}){
    this.baseUrl=String(baseUrl).replace(/\/+$/,'');
    this.token=token;
  }
  headers(extra={}){
    return {'content-type':'application/json',...(this.token?{authorization:`Bearer ${this.token}`}:{ }),...extra};
  }
  async readState(){
    const response=await fetch(`${this.baseUrl}/api/admin/config/state`,{headers:this.headers()});
    const text=await response.text();
    const payload=text?JSON.parse(text):{};
    if(!response.ok)throw new Error(`GET state HTTP ${response.status}: ${text.slice(0,1000)}`);
    return {state:payload.data||{},sha:payload.sha||null,source:payload.source||null};
  }
  async writeState(state,{sha,message='chore(belavista): desktop system model transition'}={}){
    const response=await fetch(`${this.baseUrl}/api/admin/config/state`,{
      method:'PUT',headers:this.headers(),body:JSON.stringify({data:state,sha,message})
    });
    const text=await response.text();
    const payload=text?JSON.parse(text):{};
    if(!response.ok)throw new Error(`PUT state HTTP ${response.status}: ${text.slice(0,1000)}`);
    return payload;
  }
}
