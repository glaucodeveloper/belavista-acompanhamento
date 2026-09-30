// BELAVISTA_WORKER_MEDIA_V1
// Imagens chegam ao Worker, são validadas e só então podem ser encaminhadas
// ao VLM. Quando o binding R2 está presente, o conteúdo fica privado e a
// aplicação recebe apenas uma referência auditável, nunca uma URL pública.

const MAX_IMAGE_BYTES=6*1024*1024;
const MAX_IMAGE_BASE64_LENGTH=8_400_000;
const DATA_URL_RE=/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;

const extensionFor=mime=>mime==='image/jpeg'||mime==='image/jpg'?'jpg':mime.split('/')[1]||'bin';
const safeName=value=>String(value||'imagem').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'imagem';
const idFor=()=>`IMG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

export function normalizeImageAttachment(input){
  const source=String(input?.dataUrl||'').trim();
  const match=source.match(DATA_URL_RE);
  if(!match)return null;
  const originalMime=match[1].toLowerCase();
  const mimeType=originalMime==='image/jpg'?'image/jpeg':originalMime;
  const base64=match[2].replace(/\s+/g,'');
  if(!base64||base64.length>MAX_IMAGE_BASE64_LENGTH)return null;
  const sizeBytes=Math.floor(base64.length*3/4)-((base64.endsWith('==')?2:base64.endsWith('=')?1:0));
  if(sizeBytes<64||sizeBytes>MAX_IMAGE_BYTES)return null;
  return {
    id:idFor(),
    name:safeName(input?.name||'imagem'),
    mimeType,
    base64,
    dataUrl:`data:${mimeType};base64,${base64}`,
    sizeBytes
  };
}

function decodeBase64(base64){
  const binary=atob(base64);
  const bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  return bytes;
}

export async function holdImageInWorker(env,input,{channel='admin-chat',purpose='analysis'}={}){
  const image=normalizeImageAttachment(input);
  if(!image)return null;
  const extension=extensionFor(image.mimeType);
  const key=`attachments/${channel}/${new Date().toISOString().slice(0,10)}/${image.id}.${extension}`;
  const bucket=env.BELAVISTA_MEDIA||env.BELAVISTA_UPLOADS;
  const binding=env.BELAVISTA_MEDIA?'BELAVISTA_MEDIA':'BELAVISTA_UPLOADS';
  const reference=`r2://${binding}/${key}`;
  const base={id:image.id,name:image.name,mimeType:image.mimeType,sizeBytes:image.sizeBytes,key,reference};
  if(!bucket){
    return {...base,stored:false,storage:'worker-ephemeral',warning:'BELAVISTA_UPLOADS não configurado; a imagem não será persistida.'};
  }
  await bucket.put(key,decodeBase64(image.base64),{
    httpMetadata:{contentType:image.mimeType,cacheControl:'private, no-store'},
    customMetadata:{
      source:'belavista-chat',channel,purpose,
      originalName:image.name,createdAt:new Date().toISOString()
    }
  });
  return {...base,stored:true,storage:'cloudflare-r2'};
}

export async function getHeldImage(env,{key}={}){
  const safeKey=String(key||'').trim();
  const bucket=env.BELAVISTA_MEDIA||env.BELAVISTA_UPLOADS;
  if(!bucket||!safeKey.startsWith('attachments/'))return null;
  return bucket.get(safeKey);
}

function encodeBase64(bytes){
  let binary='';
  const chunkSize=0x8000;
  for(let index=0;index<bytes.length;index+=chunkSize)binary+=String.fromCharCode(...bytes.subarray(index,index+chunkSize));
  return btoa(binary);
}

export async function readHeldImageDataUrl(env,reference){
  const match=String(reference||'').trim().match(/^r2:\/\/[^/]+\/(attachments\/.+)$/i);
  if(!match)return null;
  const object=await getHeldImage(env,{key:match[1]});
  if(!object)return null;
  const bytes=new Uint8Array(await object.arrayBuffer());
  const mimeType=object.httpMetadata?.contentType||'image/jpeg';
  return `data:${mimeType};base64,${encodeBase64(bytes)}`;
}
