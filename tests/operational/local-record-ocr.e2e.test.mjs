import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const base=(process.env.BELAVISTA_TEST_BASE||'http://127.0.0.1:8080').replace(/\/$/,'');
const fixtures=JSON.parse(await readFile(new URL('../../assets/Testes Notas/fixtures.json',import.meta.url),'utf8'));
const sendImage=async(path,file,extra={})=>{
  const image=await readFile(new URL('../../assets/Testes Notas/'+file,import.meta.url));
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    attachment:{name:file,mimeType:'image/png',dataUrl:'data:image/png;base64,'+image.toString('base64')},...extra
  })});
  return {status:response.status,payload:await response.json()};
};
const prop=(payload,key)=>payload.properties?.find(item=>item.key===key)?.value;

test('imagem real passa pela rota local de OCR e preenche as três notas de teste', {timeout:180000},async()=>{
  for(const fixture of fixtures){
    const {status,payload}=await sendImage('/api/records/ocr',fixture.file);
    assert.equal(status,200,`${fixture.file}: ${JSON.stringify(payload)}`);
    assert.equal(payload.provider,'local-tesseract');
    assert.equal(payload.reviewRequired,true);
    assert.equal(prop(payload,'invoiceNumber'),fixture.invoiceNumber);
    assert.equal(prop(payload,'supplier'),fixture.supplier);
    assert.equal(prop(payload,'supplierCnpj'),fixture.supplierCnpj);
    assert.equal(prop(payload,'totalAmountCents'),fixture.totalAmountCents);
    const item=payload.items?.[0];
    assert.equal(item?.materialId,fixture.item.materialId);
    assert.equal(item?.quantity,fixture.item.quantity);
    assert.equal(item?.unit,fixture.item.unit);
    assert.equal(item?.unitPriceCents,fixture.item.unitPriceCents);
    assert.equal(item?.totalPriceCents,fixture.item.totalPriceCents);
    assert.deepEqual(prop(payload,'items'),payload.items);
  }
});

test('inferência visual propõe material só quando a etapa é explícita', {timeout:90000},async()=>{
  const file=fixtures[0].file;
  const context={stages:[{key:'terraplanagem',name:'Terraplanagem'}]};
  const explicit=await sendImage('/api/ai/vision-reasoning',file,{message:'Nota fiscal de material para Terraplanagem',context});
  assert.equal(explicit.status,200,JSON.stringify(explicit.payload));
  assert.equal(explicit.payload.recordOcr?.items?.[0]?.materialId,'diesel');
  assert.equal(explicit.payload.toolCalls?.[0]?.name,'stage.allocate_visual_record');
  assert.equal(explicit.payload.toolCalls?.[0]?.arguments?.stageKey,'terraplanagem');
  assert.equal(explicit.payload.toolCalls?.[0]?.arguments?.quantity,1200);
  const ambiguous=await sendImage('/api/ai/vision-reasoning',file,{message:'Leia esta nota fiscal',context});
  assert.equal(ambiguous.status,200,JSON.stringify(ambiguous.payload));
  assert.deepEqual(ambiguous.payload.toolCalls,[]);
  assert.equal(ambiguous.payload.ocrAllocation,'awaiting-explicit-stage');
});
