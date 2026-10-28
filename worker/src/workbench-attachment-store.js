const MAX_BYTES=6*1024*1024;
const MIME_EXTENSIONS={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const select=`SELECT id,stage_key AS stageKey,activity_id AS activityId,kind,title,issuer,document_date AS documentDate,expires_at AS expiresAt,notes,file_name AS fileName,mime_type AS mimeType,file_size AS fileSize,created_by AS createdBy,created_at AS createdAt FROM workbench_attachments`;
const database=env=>{if(!env.BELAVISTA_DB)throw Object.assign(new Error('Banco operacional não configurado.'),{statusCode:503});return env.BELAVISTA_DB;};

function decodeFile(dataUrl,fileName){
  const match=String(dataUrl||'').match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match)throw Object.assign(new Error('Arquivo inválido ou não informado.'),{statusCode:400});
  const mimeType=match[1].toLowerCase(),extension=MIME_EXTENSIONS[mimeType];
  if(!extension)throw Object.assign(new Error('Use PDF, JPG, PNG ou WebP.'),{statusCode:400});
  const encoded=match[2].replace(/\s+/g,'');
  if(!encoded||encoded.length>Math.ceil(MAX_BYTES*4/3)+8)throw Object.assign(new Error('O arquivo deve ter no máximo 6 MB.'),{statusCode:413});
  let bytes;
  try{const binary=atob(encoded);bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));}
  catch{throw Object.assign(new Error('Arquivo em base64 inválido.'),{statusCode:400});}
  if(!bytes.byteLength||bytes.byteLength>MAX_BYTES)throw Object.assign(new Error('O arquivo deve ter no máximo 6 MB.'),{statusCode:413});
  const requested=String(fileName||'').trim().replace(/[^a-zA-Z0-9._ -]+/g,'-').slice(0,160)||'anexo';
  return {bytes,mimeType,fileName:requested.toLowerCase().endsWith(`.${extension}`)?requested:`${requested}.${extension}`};
}

export async function listWorkbenchAttachments(env,stageKey,activityId=''){
  const stage=String(stageKey||'').trim().toLowerCase();
  if(!stage)return [];
  const activity=String(activityId||'').trim(),db=database(env);
  const rows=activity
    ?(await db.prepare(`${select} WHERE stage_key=? AND activity_id=? ORDER BY created_at DESC LIMIT 100`).bind(stage,activity).all()).results||[]
    :(await db.prepare(`${select} WHERE stage_key=? ORDER BY created_at DESC LIMIT 100`).bind(stage).all()).results||[];
  return rows.map(row=>({...row,fileUrl:`/api/workbench/attachments/${encodeURIComponent(row.id)}/file`}));
}

export async function createWorkbenchAttachment(env,input={},actor={}){
  const db=database(env),stageKey=String(input.stageKey||'').trim().toLowerCase();
  if(!stageKey)throw Object.assign(new Error('Etapa obrigatória.'),{statusCode:400});
  const activityId=String(input.activityId||'').trim().slice(0,180),kind=String(input.kind||'evidence').trim().slice(0,80)||'evidence';
  const file=decodeFile(input.dataUrl,input.fileName),id=`ANX-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const createdAt=new Date().toISOString(),title=String(input.title||file.fileName).trim().slice(0,180)||file.fileName;
  const statements=[db.prepare(`INSERT INTO workbench_attachments(id,stage_key,activity_id,kind,title,issuer,document_date,expires_at,notes,file_name,mime_type,file_size,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,stageKey,activityId,kind,title,String(input.issuer||'').trim().slice(0,180),String(input.documentDate||'').trim().slice(0,40)||null,String(input.expiresAt||'').trim().slice(0,40)||null,String(input.notes||'').trim().slice(0,1000),file.fileName,file.mimeType,file.bytes.byteLength,String(actor.name||actor.githubLogin||actor.login||'').slice(0,160),createdAt)];
  const chunkSize=786_432;
  for(let offset=0,index=0;offset<file.bytes.length;offset+=chunkSize,index++)statements.push(db.prepare(`INSERT INTO workbench_attachment_chunks(attachment_id,chunk_index,content) VALUES(?,?,?)`).bind(id,index,file.bytes.slice(offset,offset+chunkSize)));
  await db.batch(statements);
  const row=await db.prepare(`${select} WHERE id=?`).bind(id).first();
  return {...row,fileUrl:`/api/workbench/attachments/${encodeURIComponent(id)}/file`};
}

export async function getWorkbenchAttachmentFile(env,id){
  const db=database(env),row=await db.prepare(`SELECT file_name AS fileName,mime_type AS mimeType,file_size AS fileSize FROM workbench_attachments WHERE id=?`).bind(String(id||'')).first();
  if(!row)return null;
  const chunks=(await db.prepare(`SELECT chunk_index AS chunkIndex,content FROM workbench_attachment_chunks WHERE attachment_id=? ORDER BY chunk_index`).bind(String(id||'')).all()).results||[];
  const bytes=new Uint8Array(Number(row.fileSize)||0);let offset=0;
  for(const chunk of chunks){const part=new Uint8Array(chunk.content);bytes.set(part,offset);offset+=part.length;}
  if(offset!==bytes.byteLength)throw Object.assign(new Error('Arquivo incompleto no armazenamento.'),{statusCode:500});
  return {fileName:row.fileName,mimeType:row.mimeType,content:bytes};
}
