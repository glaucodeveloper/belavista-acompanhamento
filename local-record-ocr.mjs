import {createWorker} from 'tesseract.js';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const cachePath=fileURLToPath(new URL('./data/ocr-models/',import.meta.url));

const field=(text,...names)=>{
  for(const name of names){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const matches=[...text.matchAll(new RegExp('^\\s*'+escaped+'\\s*:\\s*(.+)$','gim'))];
    const value=matches.map(match=>match[1]?.trim()).filter(Boolean).at(-1);
    if(value)return value;
  }
  return '';
};
const cents=value=>{
  const match=String(value||'').match(/(?:R\$\s*)?([\d.]+,\d{2})/);
  return match?Math.round(Number(match[1].replace(/\./g,'').replace(',','.'))*100):0;
};
const property=(key,label,type,value,confidence)=>({key,label,type,value,source:'local-image-ocr',confidence});

export async function extractLocalRecordOcr({attachment}){
  const start=Date.now();
  const dataUrl=String(attachment?.dataUrl||'');
  const encoded=dataUrl.split(',')[1];
  if(!encoded)throw Object.assign(new Error('Imagem OCR inválida.'),{statusCode:400});
  await mkdir(cachePath,{recursive:true});
  const worker=await createWorker('por+eng',1,{cachePath});
  let recognized;
  try{recognized=await worker.recognize(Buffer.from(encoded,'base64'));}
  finally{await worker.terminate();}
  const text=String(recognized?.data?.text||'');
  if(!text.trim())throw Object.assign(new Error('Nenhum texto legível na imagem.'),{statusCode:422});
  const confidence=Math.max(0,Math.min(1,Number(recognized?.data?.confidence||0)/100));
  const invoiceNumber=field(text,'numeroNf','Número da NF','Numero da NF')
    ||text.match(/\binvoice\s*(?:no\.?|number|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/-]{4,})/i)?.[1]||'';
  const supplier=field(text,'fornecedor')
    ||(invoiceNumber?String(text.split(/\r?\n/).find(line=>/\b(?:TAX\s+)?INVOICE\b/i.test(line))||'').replace(/\b(?:TAX\s+)?INVOICE\b.*$/i,'').replace(/^[^\p{L}]+/u,'').trim():'');
  const supplierCnpj=field(text,'cnpj','CNPJ').match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/)?.[0]||'';
  const rawDate=field(text,'dataEmissao','Data de emissão')
    ||text.match(/\binvoice\s*date\s*[:.]?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1]||'';
  const dateParts=rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const parsedEnglishDate=!dateParts&&/^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(rawDate)?Date.parse(`${rawDate} UTC`):NaN;
  const issueDate=dateParts?`${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`:Number.isFinite(parsedEnglishDate)?new Date(parsedEnglishDate).toISOString().slice(0,10):rawDate;
  const series=field(text,'serie','Série');
  const accessKey=field(text,'chaveAcesso','Chave de acesso');
  const totalAmountCents=cents(field(text,'valorTotalNota','valorTotal','Valor total da nota'));
  const materialId=field(text,'materialId','materialld','Código','Codigo');
  const description=field(text,'descricao','Descrição')||materialId.replace(/[-_]+/g,' ');
  const quantity=Number(field(text,'quantidade').replace(',','.'))||null;
  const unit=field(text,'unidade');
  const unitPriceCents=cents(field(text,'valorUnitario','Valor Unitário'));
  const totalPriceCents=cents(field(text,'valorTotalItem','valorTotalltem','Valor Total'));
  if(!invoiceNumber&&!supplier&&!materialId)throw Object.assign(new Error('OCR local não identificou uma nota ou recibo com segurança; revise a imagem.'),{statusCode:422});
  const item=materialId||description?{index:0,itemKind:'material',materialId,materialName:description,description,quantity,unit,unitPriceCents,totalPriceCents,stageKey:'',stageName:'',activityId:'',activityName:'',details:'',pointer:'Texto extraído da imagem; revise antes de confirmar.',confidence}:null;
  const genericItems=invoiceNumber&&!item?[...text.matchAll(/^\s*(\d{1,2})\s+(.+?)\s+(\d{1,4})\s+[^\d\n]*([\d,]+\.\d{2})\s+[^\d\n]*([\d,]+\.\d{2})(?:\s+\d)?\s*$/gm)]
    .map((match,index)=>({index,itemKind:'material',materialId:'',materialName:match[2].trim(),description:match[2].trim(),quantity:Number(match[3]),unit:'',unitPriceCents:0,totalPriceCents:0,stageKey:'',stageName:'',activityId:'',activityName:'',details:match[0].trim(),pointer:match[0].trim(),confidence}))
    .filter(entry=>entry.materialName&&entry.quantity>0).slice(0,100):[];
  const items=item?[item]:genericItems;
  const properties=[
    ['invoiceNumber','Número da NF','text',invoiceNumber],['series','Série','text',series],
    ['issueDate','Data de emissão','date',issueDate],['supplier','Fornecedor','text',supplier],
    ['supplierCnpj','CNPJ do fornecedor','text',supplierCnpj],['accessKey','Chave de acesso','text',accessKey],
    ['totalAmountCents','Valor total da nota','currency',totalAmountCents]
  ].filter(([, , ,value])=>value!==''&&value!==0).map(args=>property(...args,confidence));
  properties.push(property('items','Itens','items',items,confidence));
  return {documentType:'purchase_invoice',confidence,properties,items,reviewRequired:true,
    provider:'local-tesseract',vision:true,model:'tesseract-por+eng',latencyMs:Date.now()-start,
    ocrProfile:'local-text-extraction',ocrText:text};
}
