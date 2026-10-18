import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {api} from '../worker/api.js';
import {localDB} from './local-db.mjs';
const DB=localDB();
const root=path.resolve('public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
if(pathname.startsWith('/api/')){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5*1024*1024){res.writeHead(413);res.end('Too large');return;}chunks.push(chunk);}const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});const response=await api(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)&&file!==root)throw new Error('invalid path');if((await stat(file)).isDirectory())file=path.join(file,'index.html');const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});
const port=Number(process.env.PORT)||4173;
server.listen(port,'127.0.0.1',()=>console.log(`Tripon: http://127.0.0.1:${port}`));
