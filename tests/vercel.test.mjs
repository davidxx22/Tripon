import test from 'node:test';
import assert from 'node:assert/strict';
import proxy from '../api/sync.js';
test('Vercel proxy forwards only group credentials to fixed storage and prevents caching',async()=>{
 const original=globalThis.fetch;let target,options;
 globalThis.fetch=async(url,init)=>{target=url;options=init;return Response.json({revision:1});};
 try{const id='12345678-1234-1234-1234-123456789012';const response=await proxy.fetch(new Request('https://tripon.example/api/sync?groupId='+id,{headers:{authorization:'Bearer test',cookie:'private=value',origin:'https://tripon.example'}}));assert.equal(response.status,200);assert.equal(target,'https://tripon-travel-savings.stonykiwi.chatgpt.site/api/groups/'+id);assert.equal(options.headers.get('authorization'),'Bearer test');assert.equal(options.headers.has('cookie'),false);assert.equal(options.headers.has('origin'),false);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal((await proxy.fetch(new Request('https://tripon.example/api/sync',{method:'POST',headers:{origin:'https://other.example'}}))).status,403);
 assert.equal((await proxy.fetch(new Request('https://tripon.example/api/sync?groupId=invalid'))).status,400);
 globalThis.fetch=async()=>{throw new Error('Offline');};assert.equal((await proxy.fetch(new Request('https://tripon.example/api/sync',{method:'POST',body:'{}'}))).status,503);
 }finally{globalThis.fetch=original;}
});
