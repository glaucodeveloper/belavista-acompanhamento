export class OpenJevClient {
  constructor({
    baseUrl=process.env.BELAVISTA_OPENJEV_URL||'http://127.0.0.1:8090',
    model=process.env.BELAVISTA_SYSTEM_MODEL||null,
    method=process.env.BELAVISTA_SYSTEM_MODEL_METHOD||'direct',
    timeoutMs=Number(process.env.BELAVISTA_SYSTEM_MODEL_TIMEOUT_MS||120000),
    directFallback=process.env.BELAVISTA_OPENJEV_DIRECT_FALLBACK||'generation'
  }={}){
    this.baseUrl=String(baseUrl).replace(/\/+$/,'');
    this.model=model?String(model):null;
    this.method=method;
    this.timeoutMs=timeoutMs;
    this.directFallback=directFallback;
  }

  async health(){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),Math.min(this.timeoutMs,15000));
    try{
      const response=await fetch(`${this.baseUrl}/health`,{signal:controller.signal});
      const text=await response.text();
      let payload={};
      try{payload=text?JSON.parse(text):{};}catch{}
      if(!response.ok)throw new Error(`OpenJEV health HTTP ${response.status}: ${text.slice(0,1200)}`);
      return payload;
    }finally{
      clearTimeout(timer);
    }
  }

  async #request({state,questions,method}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const body={state,questions,options:{method}};
      if(this.model)body.model=this.model;

      const started=performance.now();
      const response=await fetch(`${this.baseUrl}/v1/systemone`,{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(body),
        signal:controller.signal
      });
      const text=await response.text();
      let payload={};
      try{payload=text?JSON.parse(text):{};}catch{}

      return {
        ok:response.ok,
        status:response.status,
        text,
        payload,
        method,
        elapsedMs:Math.round(performance.now()-started)
      };
    }finally{
      clearTimeout(timer);
    }
  }

  async decide({state,questions,method=this.method}){
    const first=await this.#request({state,questions,method});

    if(first.ok){
      if(!first.payload||typeof first.payload!=='object'||!first.payload.answers){
        throw new Error('OpenJEV não retornou answers.');
      }
      first.payload.clientElapsedMs=first.elapsedMs;
      first.payload.clientMeta={
        requestedMethod:method,
        effectiveMethod:method,
        fallback:false
      };
      return first.payload;
    }

    const missingOptionLogit=
      first.status===502 &&
      /missing option logit/i.test(first.text);

    if(
      method==='direct' &&
      missingOptionLogit &&
      this.directFallback==='generation'
    ){
      const second=await this.#request({
        state,
        questions,
        method:'generation'
      });

      if(second.ok){
        if(!second.payload||typeof second.payload!=='object'||!second.payload.answers){
          throw new Error('OpenJEV fallback generation não retornou answers.');
        }
        second.payload.clientElapsedMs=first.elapsedMs+second.elapsedMs;
        second.payload.clientMeta={
          requestedMethod:'direct',
          effectiveMethod:'generation',
          fallback:true,
          fallbackReason:'missing-option-logit',
          directStatus:first.status,
          directError:first.text.slice(0,800)
        };
        return second.payload;
      }

      throw new Error(
        `OpenJEV direct falhou (${first.status}: ${first.text.slice(0,900)}) e fallback generation também falhou (${second.status}: ${second.text.slice(0,900)})`
      );
    }

    throw new Error(`OpenJEV HTTP ${first.status}: ${first.text.slice(0,1800)}`);
  }
}
