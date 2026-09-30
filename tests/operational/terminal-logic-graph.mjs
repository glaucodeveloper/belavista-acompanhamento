const width=92;
const line=(ch='─')=>ch.repeat(width);
function trim(text,n=70){
  const s=String(text??'').replace(/\s+/g,' ').trim();
  return s.length>n?s.slice(0,n-1)+'…':s;
}
export function createLogicGraph({id,title,flow=[]}){
  const checks=[]; let rendered=false;
  function renderHead(){
    if(rendered)return; rendered=true;
    console.log(''); console.log(`╔${line('═')}╗`);
    console.log(`║ TEST ${id} :: ${trim(title,width-14).padEnd(width-14)} ║`);
    console.log(`╠${line('═')}╣`);
    flow.forEach((node,index)=>{
      const tag=`[${node.point}]`;
      console.log(`║ ${tag.padEnd(22)} ${trim(node.label,width-26).padEnd(width-26)} ║`);
      if(index<flow.length-1){
        console.log(`║ ${'│'.padStart(12)}${' '.repeat(width-12)} ║`);
        console.log(`║ ${'▼'.padStart(12)}${' '.repeat(width-12)} ║`);
      }
    });
    console.log(`╠${line('─')}╣`);
  }
  function check(label,ok,detail=''){
    renderHead(); checks.push({label,ok,detail}); const mark=ok?'✓':'✗';
    console.log(`║ ${mark} ${trim(label,44).padEnd(44)} ${trim(detail,43).padEnd(43)} ║`);
    if(!ok)throw new Error(`CHECK ${id}: ${label}${detail?` :: ${detail}`:''}`);
  }
  function finish(){
    renderHead(); const passed=checks.filter(x=>x.ok).length;
    console.log(`╠${line('─')}╣`);
    console.log(`║ RESULT ${String(passed+'/'+checks.length).padEnd(width-8)} ║`);
    console.log(`╚${line('═')}╝`);
  }
  return {check,finish};
}
export async function operationalCase(t,spec,run){
  const graph=createLogicGraph(spec);
  try{await run(graph);}finally{graph.finish();}
}
