import test from 'node:test';
import assert from 'node:assert/strict';
import {runOperationalAssistant} from '../../worker/src/nvidia.js';

test('NVIDIA recebe política operacional e devolve apenas ferramentas permitidas',async()=>{
  const prior=globalThis.fetch;
  let requestBody=null;
  globalThis.fetch=async (_url,init={})=>{
    requestBody=JSON.parse(init.body);
    return new Response(JSON.stringify({
      model:'test-model',
      choices:[{message:{content:JSON.stringify({
        text:'Criei um apontamento pendente e preciso do projeto assinado.',
        risk:'medium',
        nextAction:'Anexar projeto',
        toolCalls:[
          {name:'agenda.create_pending',arguments:{title:'Conferir liberação',stageKey:'project',detailsNeeded:'data de aprovação',evidenceRequired:true}},
          {name:'documents.open_form',arguments:{reason:'projeto assinado'}},
          {name:'shell.exec',arguments:{command:'rm -rf /'}}
        ]
      })}}]
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const result=await runOperationalAssistant({NVIDIA_API_KEY:'test',NVIDIA_MODEL:'test-model'}, {
      message:'Atue sobre a prioridade de liberação.',
      view:'control',
      instruction:'Faça no sistema o que der e peça evidência quando faltar.',
      requestContext:{source:'control-ai-priority',priority:{id:'a1',relation:'Projeto executivo'}}
    });
    assert.equal(result.toolCalls.length,2);
    assert.deepEqual(result.toolCalls.map(item=>item.name),['agenda.create_pending','documents.open_form']);
    const messages=requestBody.messages;
    const combined=messages.map(item=>typeof item.content==='string'?item.content:JSON.stringify(item.content)).join('\n');
    assert.match(combined,/INSTRUÇÃO OPERACIONAL PERMANENTE/);
    assert.match(combined,/Faça no sistema o que der/);
    assert.match(combined,/control-ai-priority/);
    assert.match(combined,/completamente externo/);
  }finally{
    globalThis.fetch=prior;
  }
});
