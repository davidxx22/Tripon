// Vercel hosts the app; this fixed upstream retains the existing shared D1 data.
// No database key or deployment credential is exposed to the browser.
const UPSTREAM='https://tripon-travel-savings.stonykiwi.chatgpt.site';
const json=(error,status)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
export default {
  async fetch(request){
    const url=new URL(request.url),origin=request.headers.get('origin');
    if(origin&&origin!==url.origin)return json('Use this app’s own origin.',403);
    const groupId=url.searchParams.get('groupId')||url.pathname.match(/^\/api\/groups\/([a-f0-9-]{36})$/)?.[1]||'';
    if(groupId&&!/^[a-f0-9-]{36}$/.test(groupId))return json('Invalid group ID.',400);
    if(!['GET','POST','PATCH'].includes(request.method))return json('Method not allowed.',405);
    if(!groupId&&request.method!=='POST')return json('Not found.',404);
    if(groupId&&request.method==='POST')return json('Method not allowed.',405);
    const headers=new Headers({'content-type':'application/json'});
    const bearer=request.headers.get('authorization');if(bearer)headers.set('authorization',bearer);
    try{
      let body;if(request.method!=='GET'){body=await request.arrayBuffer();if(body.byteLength>4*1024*1024)return json('Sync request too large (maximum 4 MB on Vercel). Export a backup and reduce the tracker size.',413);}
      const response=await fetch(UPSTREAM+'/api/groups'+(groupId?'/'+groupId:''),{method:request.method,headers,body,redirect:'error',signal:AbortSignal.timeout(10000)});
      if(!response.headers.get('content-type')?.includes('application/json'))return json('Group storage is temporarily unavailable. Your local records are kept.',503);
      return new Response(response.body,{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
    }catch{return json('Could not reach group storage. Your edits remain on this device and will retry.',503);}
  }
};
