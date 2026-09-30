import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {OpenJevClient} from '../../desktop/system-model/openjev-client.mjs';

test('OpenJevClient: missing option logit em direct cai para generation',async()=>{
  let calls=0;
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/v1/systemone'&&req.method==='POST'){
      let raw='';
      for await(const chunk of req)raw+=chunk;
      const body=JSON.parse(raw||'{}');
      calls++;

      if(body.options?.method==='direct'){
        res.writeHead(502,{'content-type':'application/json'});
        res.end(JSON.stringify({detail:'engine: missing option logit for D'}));
        return;
      }

      assert.equal(body.options?.method,'generation');
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({
        model:'minicpm5-2b-q4_k_m',
        answers:{
          agenda:{
            type:'choice',
            choice:'reschedule',
            method:'generation',
            generation:{valid:true,generated_text:'{}'}
          }
        },
        usage:{input_tokens:1,output_tokens:1},
        elapsedMs:10
      }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  try{
    const client=new OpenJevClient({
      baseUrl:`http://127.0.0.1:${address.port}`,
      method:'direct',
      timeoutMs:5000
    });

    const response=await client.decide({
      state:{x:1},
      questions:{
        agenda:{
          type:'choice',
          instructions:'choose',
          criteria:{keep:'k',schedule:'s',reschedule:'r',cancel:'c'}
        }
      }
    });

    assert.equal(calls,2);
    assert.equal(response.answers.agenda.choice,'reschedule');
    assert.equal(response.clientMeta.fallback,true);
    assert.equal(response.clientMeta.requestedMethod,'direct');
    assert.equal(response.clientMeta.effectiveMethod,'generation');
    assert.equal(response.clientMeta.fallbackReason,'missing-option-logit');
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
