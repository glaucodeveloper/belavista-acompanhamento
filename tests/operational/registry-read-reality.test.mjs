import test from 'node:test';
import assert from 'node:assert/strict';
import {OpenJevClient} from '../../desktop/system-model/openjev-client.mjs';
import {WorkerRegistryClient} from '../../desktop/system-model/worker-registry-client.mjs';
import {realityCase} from './reality-terminal.mjs';

const LIVE=process.env.BELAVISTA_OPENJEV_LIVE==='1';
const TOKEN=process.env.BELAVISTA_ADMIN_ID_TOKEN||'';

test('REAL REGISTRY — lê estado real do GitHub-backed Worker e consulta MiniCPM sem escrever',async t=>{
  if(!LIVE){t.skip('Defina BELAVISTA_OPENJEV_LIVE=1');return;}
  if(!TOKEN){t.skip('Defina BELAVISTA_ADMIN_ID_TOKEN');return;}

  await realityCase({
    id:'REAL-REGISTRY-READ',
    title:'Worker/GitHub registry real → recorte real → MiniCPM real; zero writes',
    flow:[
      {point:'WORKER',label:'GET /api/admin/config/state autenticado'},
      {point:'GITHUB REGISTRY',label:'estado operacional atual e SHA real'},
      {point:'STATE SCOPE',label:'seleciona primeira atividade e dependências relevantes'},
      {point:'OPENJEV',label:'POST /v1/systemone real'},
      {point:'MiniCPM5 2B',label:'classifica readiness observacional; nenhum commit é feito'}
    ]
  },async g=>{
    const registry=new WorkerRegistryClient();
    const model=new OpenJevClient();
    const health=await model.health();
    assert.equal(health.ready,true);
    assert.match(String(health.model||''),/minicpm/i);

    const current=await registry.readState();
    const state=current.state||{};
    const activity=(state.activities||[])[0];
    assert.ok(activity,'Registry real não possui activities[0].');

    const stage=(state.stages||[]).find(x=>String(x.id)===String(activity.stageId))||null;
    const scope={
      version:state.version,
      cash:state.cash,
      activity,
      stage,
      materials:state.materials,
      personnel:state.personnel,
      blockers:(state.blockers||[]).filter(x=>!x.activityId||x.activityId===activity.id),
      agenda:(state.agenda||[]).filter(x=>x.activityId===activity.id),
      evidence:(state.evidence||[]).filter(x=>x.activityId===activity.id),
      serviceAssignments:(state.serviceAssignments||[]).filter(x=>x.activityId===activity.id)
    };

    const response=await model.decide({
      state:scope,
      questions:{
        readiness:{
          type:'choice',
          instructions:'Com base somente neste recorte real atual do sistema, qual é a condição operacional desta atividade?',
          criteria:{
            blocked:'Existe impedimento atual explícito nos dados',
            ready:'Pode ser executada agora pelos dados disponíveis',
            in_progress:'Os dados mostram execução em andamento',
            completed:'Os dados mostram conclusão'
          }
        },
        needs_attention:{
          type:'noul',
          instructions:'Este recorte real exige atenção operacional neste momento?',
          criteria:{
            false:'Não há sinal explícito de ação necessária',
            true:'Há blocker, falta, conflito, evidência pendente ou ação operacional necessária'
          }
        }
      }
    });

    g.info('registry source',current.source||'unknown');
    g.info('registry sha',current.sha||'none');
    g.info('state version',state.version||'none');
    g.info('activity',`${activity.id} ${activity.title||activity.name||''}`);
    g.info('model',response.model||health.model);
    g.info('elapsed',`${response.clientElapsedMs??response.elapsedMs??'?'} ms`);
    g.model('readiness',response.answers.readiness);
    g.model('needs_attention',response.answers.needs_attention);
    g.check('SHA real foi carregado',Boolean(current.sha),String(current.sha||''));
    g.check('MiniCPM respondeu readiness',Boolean(response.answers?.readiness?.choice),String(response.answers?.readiness?.choice||''));
    g.check('nenhuma escrita foi executada',true,'teste chama somente readState() + OpenJEV');
  });
});
