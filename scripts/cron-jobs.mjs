import {mkdir,writeFile,readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {recalculateOperationalState, runAutomationPlanner} from '../operational-engine.mjs';
import {dispatchNotificationOutbox} from '../notification-service.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const runPython=(script,args=[])=>new Promise((resolve,reject)=>{
  const child=spawn(process.env.PYTHON||'python3',[script,...args],{stdio:['ignore','pipe','pipe']});
  let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  child.on('close',code=>code===0?resolve(out.trim()):reject(new Error(err||`python exited ${code}`)));
});
const monthKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
const safeJson=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch{return {};}};

export function startBelavistaCronJobs({root,dbPath}){
  if(globalThis.__belavistaCronJobsStarted)return;
  globalThis.__belavistaCronJobsStarted=true;
  const automationRoot=join(root,'data','automation');
  const reportRoot=join(root,'output','broker-reports');
  const stampFile=join(automationRoot,'last-runs.json');
  const reportScript=join(root,'scripts','generate-broker-report.py');
  const db=new DatabaseSync(dbPath);

  const stageSnapshot=async()=>{
    await mkdir(automationRoot,{recursive:true});
    const cash=db.prepare(`SELECT COALESCE(SUM(CASE WHEN kind='entrada' THEN amount_cents ELSE 0 END),0) AS entradas,COALESCE(SUM(CASE WHEN kind='saida' THEN amount_cents ELSE 0 END),0) AS saidas FROM cash_flow_entries`).get();
    const receipts=db.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(amount_cents),0) AS total FROM purchase_receipts`).get();
    const outsourcing=db.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(amount_cents),0) AS total FROM outsourcing_receipts`).get();
    const operational=recalculateOperationalState('cron.cash-snapshot');
    const planner=runAutomationPlanner({referenceDate:new Date().toISOString().slice(0,10)});
    const payload={generatedAt:new Date().toISOString(),cash:{entriesCents:Number(cash.entradas||0),exitsCents:Number(cash.saidas||0),balanceCents:Number(cash.entradas||0)-Number(cash.saidas||0)},documents:{purchaseReceipts:Number(receipts.count||0),purchaseReceiptCents:Number(receipts.total||0),outsourcingReceipts:Number(outsourcing.count||0),outsourcingReceiptCents:Number(outsourcing.total||0)},operational:{snapshotId:operational.id,calibrationVersion:operational.calibrationVersion,allocatableCents:operational.cash.allocatableCents,stages:operational.stages},automation:{jobId:planner.jobId,summary:planner.summary,notifications:planner.notifications}};
    await writeFile(join(automationRoot,'stage-cashflow-snapshot.json'),JSON.stringify(payload,null,2));
    await writeFile(join(automationRoot,'automation-panorama.json'),JSON.stringify(planner,null,2));
    return payload;
  };

  const brokerReports=async()=>{
    await mkdir(reportRoot,{recursive:true});
    const month=monthKey();
    return runPython(reportScript,['--db',dbPath,'--out',reportRoot,'--month',month]);
  };

  const runJob=async(name,fn)=>{
    try{const result=await fn();const stamps=await safeJson(stampFile);stamps[name]={at:new Date().toISOString(),ok:true,result:typeof result==='string'?result.slice(-500):result};await mkdir(automationRoot,{recursive:true});await writeFile(stampFile,JSON.stringify(stamps,null,2));console.log(`[cron] ${name}: ok`);}catch(error){console.warn(`[cron] ${name}:`,error.message);const stamps=await safeJson(stampFile);stamps[name]={at:new Date().toISOString(),ok:false,error:error.message};await mkdir(automationRoot,{recursive:true});await writeFile(stampFile,JSON.stringify(stamps,null,2));}
  };

  // Ao iniciar: recalcula a leitura financeira operacional e garante os relatórios do mês.
  setTimeout(()=>runJob('stage-cashflow-snapshot',stageSnapshot),1200);
  setTimeout(()=>runJob('notification-dispatch',dispatchNotificationOutbox),1900);
  setTimeout(()=>runJob('broker-monthly-reports',brokerReports),2600);

  // Recalcula o caixa/prontidão a cada hora. Relatórios são atualizados diariamente às 06h.
  setInterval(()=>runJob('stage-cashflow-snapshot',stageSnapshot),60*60*1000).unref?.();
  setInterval(()=>runJob('notification-dispatch',dispatchNotificationOutbox),60*1000).unref?.();
  setInterval(async()=>{const now=new Date();if(now.getHours()===6)await runJob('broker-monthly-reports',brokerReports);},60*60*1000).unref?.();
  console.log('[cron] jobs ativos: caixa/prontidão+automação (startup+1h), notificações (startup+1min), relatórios (startup+06h)');
}
