import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const fixtureDir=path.join(root,'assets','Testes Notas');
const manifestPath=path.join(fixtureDir,'fixtures.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));

const base=(
  process.env.BELAVISTA_WORKER_URL||
  process.env.BELAVISTA_API_BASE||
  'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev'
).replace(/\/+$/,'');

const token=process.env.BELAVISTA_ADMIN_ID_TOKEN||'';

const mime=file=>
  /\.webp$/i.test(file)?'image/webp':
  /\.(?:jpg|jpeg)$/i.test(file)?'image/jpeg':
  'image/png';

const dataUrl=(file,type)=>
  'data:'+type+';base64,'+fs.readFileSync(file).toString('base64');

const propMap=properties=>
  Object.fromEntries(
    (properties||[])
      .filter(item=>item?.key!=='items')
      .map(item=>[item.key,item.value])
  );

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function requestOcr(url,options){
  let response=null;
  let payload=null;

  for(let attempt=1;attempt<=3;attempt++){
    response=await fetch(url,options);
    payload=await response.json().catch(()=>({}));

    console.log(
      '[OCR HTTP]',
      'attempt='+attempt,
      'status='+response.status,
      'model='+(payload?.model||''),
      'profile='+(payload?.ocrProfile||''),
      'latencyMs='+(payload?.latencyMs||'')
    );

    if(response.status===200){
      return {response,payload,attempt};
    }

    const transient=
      [429,502,503,504].includes(response.status)&&
      /ResourceExhausted|request limit|rate limit|temporar|capacity|indispon|timeout/i.test(
        JSON.stringify(payload)
      );

    if(!transient||attempt===3){
      return {response,payload,attempt};
    }

    await sleep(2500*attempt);
  }

  return {response,payload,attempt:3};
}

test(
  'OCR real adiciona propriedades dinâmicas e propaga itens das imagens de assets/Testes Notas',
  {timeout:300000},
  async()=>{
    assert.ok(token,'BELAVISTA_ADMIN_ID_TOKEN obrigatório para teste OCR live.');
    assert.ok(fs.existsSync(fixtureDir),'Pasta de fixtures ausente: '+fixtureDir);
    assert.ok(manifest.length,'Nenhuma fixture em '+manifestPath);

    for(const fixture of manifest){
      const file=path.join(fixtureDir,fixture.file);
      assert.ok(fs.existsSync(file),'Fixture ausente: '+file);

      const type=mime(fixture.file);
      console.log('\n[OCR FIXTURE]',fixture.file);

      const {response,payload}=await requestOcr(
        base+'/api/records/ocr',
        {
          method:'POST',
          headers:{
            'content-type':'application/json',
            authorization:'Bearer '+token
          },
          body:JSON.stringify({
            attachment:{
              name:fixture.file,
              mimeType:type,
              dataUrl:dataUrl(file,type)
            },
            context:{
              source:'fixture-live-test',
              expectedDocumentType:fixture.documentType
            }
          })
        }
      );

      assert.equal(response.status,200,JSON.stringify(payload));
      assert.equal(payload.provider,'nvidia-api');
      assert.equal(payload.reviewRequired,true);
      assert.ok(payload.vision,'OCR precisa ser multimodal.');

      console.log(
        '[OCR RESULT]',
        fixture.file,
        'model='+String(payload.model||''),
        'profile='+String(payload.ocrProfile||''),
        'latencyMs='+String(payload.latencyMs||'')
      );
      if(payload.ocrAttempts){
        console.log('[OCR ATTEMPTS]',JSON.stringify(payload.ocrAttempts));
      }

      const props=propMap(payload.properties);

      assert.equal(
        String(props.invoiceNumber||'').trim(),
        fixture.invoiceNumber,
        fixture.file+': número da NF divergente.'
      );

      assert.match(
        String(props.supplier||''),
        new RegExp(fixture.supplier.split(' ')[0],'i'),
        fixture.file+': fornecedor divergente.'
      );

      assert.ok(
        Array.isArray(payload.items)&&payload.items.length>=1,
        fixture.file+': OCR não retornou itens.'
      );

      const item=
        payload.items.find(
          item=>
            String(item.materialId||'').toLowerCase()===
            fixture.item.materialId.toLowerCase()
        )||
        payload.items[0];

      assert.equal(
        Number(item.quantity),
        Number(fixture.item.quantity),
        fixture.file+': quantidade divergente.'
      );

      assert.equal(
        String(item.unit||'').toUpperCase(),
        String(fixture.item.unit||'').toUpperCase(),
        fixture.file+': unidade divergente.'
      );

      const itemProperty=(payload.properties||[]).find(
        item=>item.key==='items'&&Array.isArray(item.value)
      );

      assert.ok(
        itemProperty,
        fixture.file+': properties[key=items] não foi propagado.'
      );
    }
  }
);
