/** Persistent project archive on the configured D1 database. Files are chunked to fit D1 row limits. */
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{statusCode:status});};
const db=env=>{if(!env.BELAVISTA_DB)fail('Banco operacional não configurado.',503);return env.BELAVISTA_DB;};
const select=`SELECT id,title,category,code,issuer,document_date AS documentDate,description,source_material_id AS sourceMaterialId,file_name AS fileName,file_type AS fileType,file_size AS fileSize,properties_json AS propertiesJson,created_at AS createdAt,updated_at AS updatedAt FROM project_documents`;
const decodeRow=row=>row?(({propertiesJson,...document})=>({...document,properties:JSON.parse(propertiesJson||'{}')}))(row):null;
const formatMime=fileName=>({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',dwg:'application/octet-stream',dxf:'application/octet-stream'})[String(fileName).split('.').at(-1).toLowerCase()]||'application/octet-stream';

export async function listProjectDocuments(env){
  const database=db(env);
  const [records,columns]=await Promise.all([
    database.prepare(`${select} ORDER BY updated_at DESC,id`).all(),
    database.prepare(`SELECT id,label,position,created_at AS createdAt FROM project_document_columns ORDER BY position,id`).all(),
  ]);
  return {documents:(records.results||[]).map(decodeRow),columns:columns.results||[]};
}

export async function getProjectDocument(env,id){return decodeRow(await db(env).prepare(`${select} WHERE id=?`).bind(String(id||'')).first());}

/** Decode in sub-megabyte blocks; one D1 row stays below its size limit. */
function fileChunks(dataUrl,fileName){
  const match=String(dataUrl||'').match(/^data:([^;,]*);base64,([A-Za-z0-9+/=]+)$/);
  if(!match)fail('Arquivo em base64 inválido.');
  if(fileName.length>180||!/\.(pdf|docx?|xlsx?|dwg|dxf|png|jpe?g|webp)$/i.test(fileName))fail('Formato de arquivo não permitido.');
  const encoded=match[2];if(encoded.length>35_000_000)fail('O arquivo excede 25 MB.');
  const parts=[];let size=0;
  try{
    for(let offset=0;offset<encoded.length;offset+=1_048_576){
      const binary=atob(encoded.slice(offset,offset+1_048_576)),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
      size+=bytes.length;if(size>25*1024*1024)fail('O arquivo excede 25 MB.');parts.push(bytes);
    }
  }catch(error){if(error?.statusCode)throw error;fail('Arquivo em base64 inválido.');}
  if(size===0)fail('Arquivo vazio.');
  return {parts,size,fileType:formatMime(fileName)};
}

/** One D1 batch commits document metadata and every file chunk atomically. */
export async function saveProjectDocument(env,input={}){
  const database=db(env),id=String(input.id||'').trim()||`doc-${crypto.randomUUID()}`;
  const existing=await getProjectDocument(env,id),title=String(input.title||'').trim(),category=String(input.category||'').trim();
  if(!title||title.length>140||!category||category.length>80)fail('Título e categoria válidos são obrigatórios.');
  const code=String(input.code||'').trim(),issuer=String(input.issuer||'').trim(),documentDate=String(input.documentDate||'').trim(),description=String(input.description||'').trim(),sourceMaterialId=String(input.sourceMaterialId||'').trim();
  if(code.length>60||issuer.length>100||description.length>800||sourceMaterialId.length>100||documentDate&&!/^\d{4}-\d{2}-\d{2}$/.test(documentDate))fail('Campos do documento inválidos.');
  const columns=(await database.prepare(`SELECT id FROM project_document_columns`).all()).results||[],allowed=new Set(columns.map(column=>column.id)),properties={};
  if(input.properties&&typeof input.properties==='object'&&!Array.isArray(input.properties))for(const [key,value] of Object.entries(input.properties)){
    if(!allowed.has(key)||String(value).length>500)fail('Propriedade documental inválida.');properties[key]=String(value).trim();
  }
  const fileName=String(input.fileName||'').trim(),attachment=input.dataUrl?fileChunks(input.dataUrl,fileName):null;
  const timestamp=new Date().toISOString();
  const statements=[database.prepare(`INSERT INTO project_documents(id,title,category,code,issuer,document_date,description,source_material_id,file_name,file_type,file_size,properties_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,code=excluded.code,issuer=excluded.issuer,document_date=excluded.document_date,description=excluded.description,source_material_id=excluded.source_material_id,file_name=excluded.file_name,file_type=excluded.file_type,file_size=excluded.file_size,properties_json=excluded.properties_json,updated_at=excluded.updated_at`)
    .bind(id,title,category,code,issuer,documentDate,description,sourceMaterialId,attachment?fileName:existing?.fileName||'',attachment?attachment.fileType:existing?.fileType||'',attachment?attachment.size:existing?.fileSize||0,JSON.stringify(properties),existing?.createdAt||timestamp,timestamp)];
  if(attachment){
    statements.push(database.prepare(`DELETE FROM project_document_chunks WHERE document_id=?`).bind(id));
    for(const [index,part] of attachment.parts.entries())statements.push(database.prepare(`INSERT INTO project_document_chunks(document_id,chunk_index,content) VALUES(?,?,?)`).bind(id,index,part));
  }
  await database.batch(statements);
  return getProjectDocument(env,id);
}

export async function deleteProjectDocument(env,id){
  const key=String(id||''),existing=await getProjectDocument(env,key);if(!existing)return false;
  if(['doc-proj-exec','doc-proj-licenses','doc-presentation-v3'].includes(key)||existing.sourceMaterialId)fail('Este documento de referência não pode ser excluído.',403);
  const result=await db(env).prepare(`DELETE FROM project_documents WHERE id=?`).bind(key).run();return result.meta?.changes>0;
}

export async function getProjectDocumentFile(env,id){
  const document=await getProjectDocument(env,id);if(!document?.fileSize)return null;
  const rows=(await db(env).prepare(`SELECT chunk_index AS chunkIndex,content FROM project_document_chunks WHERE document_id=? ORDER BY chunk_index`).bind(id).all()).results||[];
  const bytes=new Uint8Array(document.fileSize);let offset=0;
  for(const row of rows){const part=new Uint8Array(row.content);bytes.set(part,offset);offset+=part.length;}
  if(offset!==document.fileSize)fail('Arquivo incompleto no armazenamento.',500);
  return {fileName:document.fileName,fileType:document.fileType,content:bytes};
}

export async function createProjectDocumentColumn(env,input={}){
  const database=db(env),label=String(input.label||'').trim();if(!label||label.length>50)fail('Nome da propriedade inválido.');
  const existing=(await database.prepare(`SELECT label FROM project_document_columns`).all()).results||[];
  if(existing.some(row=>row.label.toLocaleLowerCase('pt-BR')===label.toLocaleLowerCase('pt-BR')))fail('Essa propriedade já existe.',409);
  const id=`custom-${crypto.randomUUID()}`,position=(await database.prepare(`SELECT COALESCE(MAX(position),-1)+1 AS position FROM project_document_columns`).first()).position,timestamp=new Date().toISOString();
  await database.prepare(`INSERT INTO project_document_columns(id,label,position,created_at) VALUES(?,?,?,?)`).bind(id,label,position,timestamp).run();
  return {id,label,position,createdAt:timestamp};
}

export async function deleteProjectDocumentColumn(env,id){
  const database=db(env),key=String(id||''),column=await database.prepare(`SELECT id FROM project_document_columns WHERE id=?`).bind(key).first();if(!column)return false;
  const rows=(await database.prepare(`SELECT id,properties_json AS propertiesJson FROM project_documents`).all()).results||[];
  const statements=[];
  for(const row of rows){const properties=JSON.parse(row.propertiesJson||'{}');if(!(key in properties))continue;delete properties[key];statements.push(database.prepare(`UPDATE project_documents SET properties_json=?,updated_at=? WHERE id=?`).bind(JSON.stringify(properties),new Date().toISOString(),row.id));}
  statements.push(database.prepare(`DELETE FROM project_document_columns WHERE id=?`).bind(key));
  await database.batch(statements);return true;
}
