import {extractText,getDocumentProxy} from 'unpdf';

const MAX_PDF_BYTES=1_450_000;
const MAX_PDF_TEXT_CHARS=48_000;
const PDF_DATA_URL=/^data:application\/pdf;base64,([A-Za-z0-9+/=\s]+)$/i;

function decodeBase64(value){
  const binary=atob(value);
  const bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  return bytes;
}

export function normalizePdfAttachment(input){
  const source=String(input?.dataUrl||'').trim();
  const match=source.match(PDF_DATA_URL);
  if(!match)return null;
  const base64=match[1].replace(/\s+/g,'');
  if(!base64||base64.length>Math.ceil(MAX_PDF_BYTES*4/3)+8)return null;
  const bytes=decodeBase64(base64);
  if(bytes.length<8||bytes.length>MAX_PDF_BYTES||String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')return null;
  return {
    id:`PDF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
    name:String(input?.name||'nota.pdf').replace(/[^a-zA-Z0-9._ -]+/g,'-').slice(0,120),
    mimeType:'application/pdf',
    sizeBytes:bytes.byteLength,
    bytes
  };
}

export async function extractPdfText(attachment,{maxPages=20,timeoutMs=12_000}={}){
  const bytes=attachment?.bytes;
  if(!(bytes instanceof Uint8Array)||!bytes.byteLength)throw new Error('PDF vazio ou inválido.');
  const extraction=(async()=>{
    const document=await getDocumentProxy(bytes,{isEvalSupported:false,maxImageSize:16_777_216});
    if(document.numPages>maxPages)throw new Error(`PDF com ${document.numPages} páginas; o limite de leitura é ${maxPages}.`);
    const result=await extractText(document,{mergePages:true});
    const text=String(result.text||'').replace(/\u0000/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,MAX_PDF_TEXT_CHARS);
    await document.destroy?.();
    if(text.length<30)throw new Error('O PDF não contém texto selecionável. Envie um PDF pesquisável ou uma imagem da nota.');
    return {text,totalPages:Number(result.totalPages||document.numPages||0)};
  })();
  let timeout;
  try{
    return await Promise.race([extraction,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Tempo esgotado ao ler o PDF.')),timeoutMs);})]);
  }finally{clearTimeout(timeout);}
}

function moneyCents(value){
  const normalized=String(value||'').replace(/\./g,'').replace(',','.');
  const amount=Number(normalized);
  return Number.isFinite(amount)?Math.round(amount*100):0;
}

export function isConstructionSupply(value){
  const normalized=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  return /\b(?:cimento|concreto|argamassa|areia|brita|pedra|tijolo|bloco|vergalhao|aco|ferro|malha|tela soldada|tela de aco|tela de protecao|tubo|tubulacao|pvc|dreno|drenagem|impermeabilizante|rejunte|cal|gesso|telha|madeira|compensado|piso|porcelanato|ceramica|tinta|selador|fita veda rosca|fita isolante|disjuntor|eletroduto|fio eletrico|cabo eletrico|luminaria|louca sanitaria|torneira|registro hidraulico|registro de agua|conexao pvc|conexao hidraulica|parafuso|prego|bucha|construcao|obra civil)\b/.test(normalized);
}

function fieldAfter(text,label,pattern,maxDistance=1600){
  const start=text.toLocaleLowerCase('pt-BR').indexOf(label.toLocaleLowerCase('pt-BR'));
  if(start<0)return '';
  const match=text.slice(start,start+maxDistance).match(pattern);
  return match?.[1]||'';
}

export function parseInvoicePdfText(text,{stages=[]}={}){
  const source=String(text||'').replace(/\r/g,'\n');
  const normalized=source.replace(/[\u00a0\u202f]/g,' ');
  if(!/(?:DANFE|NF-?e|nota fiscal eletr[oô]nica)/i.test(normalized))return null;
  const lines=normalized.split('\n').map(line=>line.trim()).filter(Boolean);
  const productsIndex=lines.findIndex(line=>/DADOS DO PRODUTO\s*\/\s*SERVI[CÇ]OS/i.test(line));
  const rows=[];
  let pending=null;
  const productStart=/^([A-Z0-9][A-Z0-9._/-]{4,})\s+(.{3,})$/i;
  const taxRow=/\b(\d{8})\s+(\d{3})\s+(\d{4})\s+([A-Z]{1,5})\s+(\d+(?:[,.]\d+)?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\b/i;
  if(productsIndex>=0){
    for(const line of lines.slice(productsIndex+1)){
      if(/C[ÁA]LCULO DO ISSQN|DADOS ADICIONAIS/i.test(line))break;
      const tax=line.match(taxRow);
      if(tax&&pending){
        const continuation=line.slice(0,tax.index).trim();
        const description=[pending.description,continuation].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
        rows.push({
          materialId:pending.code,
          description,
          materialName:description,
          itemKind:'material',
          quantity:Number(tax[5].replace(',','.')),
          unit:tax[4],
          unitPriceCents:moneyCents(tax[6]),
          totalPriceCents:moneyCents(tax[7]),
          confidence:.96,
          details:`NF-e · NCM ${tax[1]} · CFOP ${tax[3]}`,
          pointer:description,
          ...(!isConstructionSupply(description)?{stageKey:'office',stageName:'Escritório',destinationHint:'office'}:{destinationHint:'construction-stage-required'})
        });
        pending=null;
        continue;
      }
      const start=line.match(productStart);
      if(start){
        pending={code:start[1],description:start[2]};
        continue;
      }
      if(pending&&!/^\d/.test(line)&&!/^C[ÓO]DIGO|DESCRI[CÇ][AÃ]O/i.test(line))pending.description+=` ${line}`;
    }
  }
  const invoiceNumber=normalized.match(/\b\d{3}\.\d{3}\.\d{3}\b/)?.[0]||'';
  const supplier=normalized.match(/RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS/i)?.[1]?.trim()||'';
  const accessKey=(normalized.match(/CHAVE DE ACESSO[\s\S]{0,180}?((?:\d[\s-]*){44})/i)?.[1]||'').replace(/\D/g,'');
  const issueDate=fieldAfter(normalized,'DATA DA EMISSÃO',/\b(\d{2}\/\d{2}\/\d{4})\b/,1800);
  const supplierCnpj=fieldAfter(normalized,'NATUREZA DA OPERAÇÃO',/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/,1200);
  const totalAmountCents=rows.reduce((sum,item)=>sum+item.totalPriceCents,0);
  const properties=[
    ['invoiceNumber','Número da NF','text',invoiceNumber],
    ['supplier','Fornecedor','text',supplier],
    ['supplierCnpj','CNPJ do fornecedor','text',supplierCnpj],
    ['issueDate','Data de emissão','date',issueDate],
    ['accessKey','Chave de acesso','text',accessKey],
    ['totalAmountCents','Total da nota','currency',totalAmountCents]
  ].filter(([, , ,value])=>value!==''&&value!==0).map(([key,label,type,value])=>({key,label,type,value,confidence:.96}));
  if(!rows.length)return {
    documentType:'purchase_invoice',confidence:.28,invoiceNumber,supplier,supplierCnpj,accessKey,issueDate,
    totalAmountCents:0,properties,items:[],reviewRequired:true,error:'A nota foi aberta, mas o quadro de itens não pôde ser estruturado com segurança.',provider:'pdf-text'
  };
  const office=rows.some(item=>item.destinationHint==='office');
  const stageLabel=stages.find(stage=>String(stage.key||'').toLowerCase()==='office'||String(stage.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='escritorio');
  if(office&&stageLabel)for(const item of rows)if(item.destinationHint==='office'){
    item.stageKey=String(stageLabel.key||'office');
    item.stageName=String(stageLabel.name||'Escritório');
  }
  return {
    documentType:'purchase_invoice',confidence:.92,invoiceNumber,supplier,supplierCnpj,accessKey,issueDate,
    totalAmountCents,properties,items:rows,reviewRequired:true,provider:'pdf-text',
    classification:office?'administrative':'construction',
    destinationStageKey:office?String(stageLabel?.key||'office'):'',
    destinationStageName:office?String(stageLabel?.name||'Escritório'):'',
    source:'selectable-pdf-text'
  };
}
