import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
// Build one portable Worker ESM module, embedding the complete static PWA.
// There are no runtime packages and no source files are removed by this build.
const assets={};const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else assets['/'+path.relative('public',file).replaceAll('\\','/')]=[mime[path.extname(file)]||'application/octet-stream',(await readFile(file)).toString('base64')];}}
await walk('public');
const strip=source=>source.replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'');
const core=strip(await readFile('public/core.js','utf8')),sync=strip(await readFile('public/sync-core.js','utf8')),api=strip(await readFile('worker/api.js','utf8'));
const routing=`
const ASSETS=${JSON.stringify(assets)};
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return api(request,env);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const file=url.pathname==='/'?'/index.html':url.pathname;const asset=ASSETS[file];if(!asset)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':asset[0],'cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"}});}};
`;
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js',core+'\n'+sync+'\n'+api+'\n'+routing);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));console.log('Built Worker with embedded PWA and shared-group API.');
