const W=108;
const h=(c='─')=>c.repeat(W);

function clean(value,max=82){
  const s=String(value??'').replace(/\s+/g,' ').trim();
  return s.length>max?s.slice(0,max-1)+'…':s;
}

export function realityGraph({id,title,flow=[]}){
  let started=false;
  let checks=0;
  let passed=0;

  function start(){
    if(started)return;
    started=true;
    console.log('');
    console.log(`╔${h('═')}╗`);
    console.log(`║ REALITY ${clean(id,28).padEnd(28)} ${clean(title,75).padEnd(75)} ║`);
    console.log(`╠${h('═')}╣`);
    for(let i=0;i<flow.length;i++){
      const n=flow[i];
      console.log(`║ [${clean(n.point,20)}] ${clean(n.label,82).padEnd(82)} ║`);
      if(i<flow.length-1){
        console.log(`║ ${'│'.padStart(12)}${' '.repeat(W-12)} ║`);
        console.log(`║ ${'▼'.padStart(12)}${' '.repeat(W-12)} ║`);
      }
    }
    console.log(`╠${h()}╣`);
  }

  function model(questionId,answer){
    start();
    const choice=answer?.choice??answer?.noul??answer?.score??'?';
    const confidence=answer?.confidence==null?'':` conf=${Number(answer.confidence).toFixed(3)}`;
    const probs=answer?.probabilities
      ?' '+Object.entries(answer.probabilities).map(([k,v])=>`${k}:${Number(v).toFixed(2)}`).join(' ')
      :'';
    console.log(`║ MODEL ${clean(questionId,39).padEnd(39)} => ${clean(`${choice}${confidence}${probs}`,61).padEnd(61)} ║`);
  }

  function info(label,value=''){
    start();
    console.log(`║ INFO  ${clean(label,39).padEnd(39)} ${clean(value,62).padEnd(62)} ║`);
  }

  function check(label,ok,detail=''){
    start();
    checks++;
    if(ok)passed++;
    console.log(`║ ${ok?'✓':'✗'} ${clean(label,49).padEnd(49)} ${clean(detail,52).padEnd(52)} ║`);
    if(!ok)throw new Error(`REALITY ${id}: ${label}${detail?` :: ${detail}`:''}`);
  }

  function finish(){
    start();
    console.log(`╠${h()}╣`);
    console.log(`║ RESULT ${String(passed+'/'+checks).padEnd(99)} ║`);
    console.log(`╚${h('═')}╝`);
  }

  return {model,info,check,finish};
}

export async function realityCase(spec,fn){
  const graph=realityGraph(spec);
  try{
    await fn(graph);
  }finally{
    graph.finish();
  }
}
