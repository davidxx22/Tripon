import {workspaceFrom} from '../public/trips.js';
import {validateData} from '../public/core.js';
import {applyChanges,SyncConflict,shared} from '../public/sync-core.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
export async function api(request,env){
  const url=new URL(request.url);
  if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Use this app’s own origin.'},403);
  if(!env.DB)return json({error:'Group storage is unavailable. Your local records are safe.'},503);
  try{
    if(request.method==='POST'&&url.pathname==='/api/groups'){
      const body=await readJson(request),document=shared(body.data?.version===2?workspaceFrom(body.data):validateData(body.data));
      const id=crypto.randomUUID(),key=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
      await env.DB.prepare('INSERT INTO tripon_groups (id,key_hash,document) VALUES (?,?,?)').bind(id,await hash(key),JSON.stringify(document)).run();
      return json({id,key,data:document,revision:1},201);
    }
    const match=url.pathname.match(/^\/api\/groups\/([a-f0-9-]{36})$/);if(!match)return json({error:'Not found.'},404);
    const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return json({error:'A valid group link is required.'},403);
    const load=()=>env.DB.prepare('SELECT document,revision,receipts FROM tripon_groups WHERE id=? AND key_hash=?').bind(match[1],hashValue).first();
    const hashValue=await hash(token);let row=await load();if(!row)return json({error:'This group link is invalid or no longer available.'},404);
    if(request.method==='GET')return json({data:JSON.parse(row.document),revision:row.revision});
    if(request.method!=='PATCH')return json({error:'Method not allowed.'},405);
    const body=await readJson(request);if(typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id))return json({error:'Invalid batch ID.'},400);
    for(let attempt=0;attempt<8;attempt++){
      const receipts=JSON.parse(row.receipts);
      if(receipts.includes(body.id))return json({data:JSON.parse(row.document),revision:row.revision,ack:body.id});
      let next;try{next=applyChanges(JSON.parse(row.document),body.ops,body.force===true);}catch(error){return json({error:error.message,conflicts:error instanceof SyncConflict?error.conflicts:[],data:JSON.parse(row.document),revision:row.revision},409);}
      const result=await env.DB.prepare('UPDATE tripon_groups SET document=?,revision=revision+1,receipts=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?').bind(JSON.stringify(next),JSON.stringify([...receipts,body.id].slice(-1000)),match[1],row.revision).run();
      if(result.meta.changes===1)return json({data:next,revision:row.revision+1,ack:body.id});
      row=await load();
    }
    return json({error:'The group is busy. Your edits are queued; retry shortly.'},503);
  }catch(error){if(error instanceof SyntaxError||error.message?.startsWith('Invalid backup:')||error.message==='Request too large.')return json({error:error.message},400);console.error('Tripon API request failed');return json({error:'Could not sync right now. Your local edits are kept; retry shortly.'},503);}
}
async function readJson(request){if(Number(request.headers.get('content-length'))>5*1024*1024)throw new Error('Request too large.');const text=await request.text();if(text.length>5*1024*1024)throw new Error('Request too large.');return JSON.parse(text);}
