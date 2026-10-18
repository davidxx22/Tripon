import {shared,changes,applyChanges} from './sync-core.js';
const KEY='tripon.group.v1';
export function inviteFromHash(){const match=location.hash.match(/^#group=([a-f0-9-]{36})\.([a-f0-9]{64})$/);return match?{id:match[1],key:match[2]}:null;}
export class GroupSync{
  constructor({getData,onData,onStatus}){this.getData=getData;this.onData=onData;this.onStatus=onStatus;this.busy=false;this.conflict=null;try{this.state=JSON.parse(localStorage.getItem(KEY)||'null');if(this.state&&!/^[a-f0-9]{64}$/.test(this.state.key))this.state=null;}catch{this.state=null;}this.last=shared(getData());}
  persist(){localStorage.setItem(KEY,JSON.stringify(this.state));}
  status(text){this.onStatus({text,joined:!!this.state,pending:this.state?.queue.length||0,conflict:this.conflict});}
  capture(data){const next=shared(data);if(this.state){const ops=changes(this.last,next);if(ops.length){this.state.queue.push({id:crypto.randomUUID(),ops});this.persist();this.status(navigator.onLine?'Syncing…':'Offline · edits queued');}}this.last=next;if(this.state)void this.flush();}
  async request(path,options={},credentials=this.state){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(path,{...options,signal:controller.signal,cache:'no-store',headers:{'content-type':'application/json',...(credentials?{authorization:'Bearer '+credentials.key}:{}),...options.headers}});const body=await response.json();if(!response.ok){const error=new Error(body.error||'Sync failed.');error.status=response.status;error.body=body;throw error;}return body;}finally{clearTimeout(timeout);}}
  async create(){if(this.state)throw new Error('This tracker already belongs to a shared group.');const snapshot=shared(this.getData());const result=await this.request('/api/groups',{method:'POST',body:JSON.stringify({data:snapshot})},null);localStorage.setItem('tripon.personal.v1',JSON.stringify(this.getData()));this.state={id:result.id,key:result.key,queue:[],revision:result.revision};this.last=snapshot;this.persist();this.status('Group synced');return this.link();}
  async fetchInvite(credentials){return this.request('/api/groups/'+credentials.id,{},credentials);}
  join(credentials,result){localStorage.setItem('tripon.personal.v1',JSON.stringify(this.getData()));this.state={...credentials,queue:[],revision:result.revision};this.last=shared(result.data);this.persist();this.onData(result.data);this.status('Group synced');history.replaceState(null,'',location.pathname+location.search);void this.flush();}
  link(){return this.state?`${location.origin}${location.pathname}#group=${this.state.id}.${this.state.key}`:'';}
  async flush(){
    if(!this.state||this.busy||this.conflict||this.paused)return;
    if(!navigator.onLine){this.status(this.state.queue.length?'Offline · edits queued':'Offline · showing saved group');return;}
    this.busy=true;try{
      let response;
      while(this.state.queue.length&&!this.paused){const batch=this.state.queue[0];this.status('Syncing…');response=await this.request('/api/groups/'+this.state.id,{method:'PATCH',body:JSON.stringify(batch)});this.state.queue.shift();this.state.revision=response.revision;this.persist();}
      if(this.paused)return;
      response=await this.request('/api/groups/'+this.state.id);this.state.revision=response.revision;
      if(this.paused)return;
      let merged=shared(response.data);for(const batch of this.state.queue)merged=applyChanges(merged,batch.ops,true);
      const unchanged=JSON.stringify(shared(this.getData()))===JSON.stringify(merged);
      this.last=merged;this.persist();if(!unchanged)this.onData(merged);this.status('Group synced');
    }catch(error){
      if(error.status===409){this.conflict=error.body;this.status('Conflicting edits · review changes');}
      else this.status(navigator.onLine?(error.status===403||error.status===404?'Group link unavailable · local copy kept':'Could not sync · will retry'):'Offline · edits queued');
    }finally{this.busy=false;}
  }
  async resolve(keepMine){
    if(!this.conflict)return;
    if(keepMine){for(const batch of this.state.queue)batch.force=true;this.conflict=null;this.persist();await this.flush();}
    else {const response=await this.fetchInvite(this.state);this.state.queue=[];this.last=shared(response.data);this.state.revision=response.revision;this.conflict=null;this.persist();this.onData(response.data);this.status('Group synced');}
  }
  leave(){if(this.state?.queue.length)throw new Error('Sync or export pending edits before leaving.');const personal=localStorage.getItem('tripon.personal.v1');this.state=null;this.conflict=null;localStorage.removeItem(KEY);this.status('Only this device');return personal?JSON.parse(personal):null;}
  start(){this.status(this.state?'Connecting to group…':'Only this device');if(this.state)void this.flush();setInterval(()=>{if(!document.hidden)void this.flush();},5000);window.addEventListener('online',()=>void this.flush());window.addEventListener('offline',()=>this.status(this.state?.queue.length?'Offline · edits queued':this.state?'Offline · showing saved group':'Only this device'));document.addEventListener('visibilitychange',()=>{if(!document.hidden)void this.flush();});}
}
