import {workspaceFrom,LEGACY_TRIP} from './trips.js';
import {validateData} from './core.js';
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function shared(data){if(data.version===2){const w=workspaceFrom(data);w.theme='system';w.selectedTripId=w.trips[0]?.id??null;w.trips=w.trips.map(t=>({id:t.id,...shared(t)}));return w;}const d=structuredClone(data);d.theme='system';d.selectedWeekId=d.weeks[0].id;return validateData(d);}
function personSnapshot(d,id){const person=d.people.find(p=>p.id===id);if(!person)return null;const entries={};for(const w of d.weeks)if(w.entries[id])entries[w.id]=w.entries[id];return {person,entries};}
function changesSingle(before,after){
  const ops=[];const push=(type,id,old,value,extra={})=>{if(!equal(old,value))ops.push({type,id,before:old,value,...extra});};
  for(const key of ['destination','goalCents','demo'])push('trip',key,before[key],after[key]);
  for(const p of after.people){const old=before.people.find(x=>x.id===p.id);if(!old)push('person-add',p.id,null,p);else push('name',p.id,old.name,p.name);}
  for(const w of after.weeks){const old=before.weeks.find(x=>x.id===w.id);if(!old)push('week-add',w.id,null,w);else{
    push('dates',w.id,{start:old.start,end:old.end},{start:w.start,end:w.end});
    for(const p of after.people)for(let day=0;day<5;day++)push('entry',w.id,old.entries[p.id]?.[day]||0,w.entries[p.id]?.[day]||0,{person:p.id,day});
  }}
  for(const p of before.people)if(!after.people.some(x=>x.id===p.id))push('person-remove',p.id,personSnapshot(before,p.id),null);
  for(const w of before.weeks)if(!after.weeks.some(x=>x.id===w.id))push('week-remove',w.id,w,null);
  return ops;
}
function read(d,o){const w=d.weeks.find(x=>x.id===o.id),p=d.people.find(x=>x.id===o.id);switch(o.type){case'trip':return d[o.id];case'person-add':return p||null;case'name':return p?.name??null;case'person-remove':return personSnapshot(d,o.id);case'week-add':case'week-remove':return w||null;case'dates':return w?{start:w.start,end:w.end}:null;case'entry':return w&&d.people.some(x=>x.id===o.person)?w.entries[o.person]?.[o.day]||0:null;default:throw new Error('Unsupported edit.');}}
export class SyncConflict extends Error{constructor(conflicts){super('The group changed the same records.');this.conflicts=conflicts;}}
function applySingle(document,ops,force=false){
  if(!Array.isArray(ops)||!ops.length||ops.length>20000)throw new Error('Invalid edit batch.');
  const d=structuredClone(document),conflicts=[];
  for(const o of ops){
    if(!o||typeof o.id!=='string'||!['trip','person-add','person-remove','name','week-add','week-remove','dates','entry'].includes(o.type))throw new Error('Invalid edit.');
    if(o.type==='trip'&&!['destination','goalCents','demo'].includes(o.id))throw new Error('Invalid trip field.');
    if(o.type==='entry'&&(!Number.isInteger(o.day)||o.day<0||o.day>4||typeof o.person!=='string'))throw new Error('Invalid day.');
    const current=read(document,o);
    if(!force&&!equal(current,o.before)&&!equal(current,o.value)){conflicts.push({type:o.type,id:o.id,person:o.person,day:o.day,current,wanted:o.value});continue;}
    const w=d.weeks.find(x=>x.id===o.id),p=d.people.find(x=>x.id===o.id);
    switch(o.type){
      case'trip':d[o.id]=o.value;break;
      case'person-add':if(!p)d.people.push(o.value);else if(!equal(p,o.value))throw new Error('Person ID already exists.');break;
      case'name':if(!p)throw new Error('This person was removed. Export your pending edits before discarding them.');p.name=o.value;break;
      case'person-remove':d.people=d.people.filter(x=>x.id!==o.id);for(const week of d.weeks)delete week.entries[o.id];break;
      case'week-add':if(!w)d.weeks.push(o.value);else if(!equal(w,o.value))throw new Error('Week ID already exists.');break;
      case'week-remove':d.weeks=d.weeks.filter(x=>x.id!==o.id);break;
      case'dates':if(!w)throw new Error('This week was removed.');w.start=o.value.start;w.end=o.value.end;break;
      case'entry':if(!w||!d.people.some(x=>x.id===o.person))throw new Error('This person or week was removed. Export your pending edits before discarding them.');w.entries[o.person]||=Array(5).fill(0);w.entries[o.person][o.day]=o.value;break;
    }
  }
  if(conflicts.length)throw new SyncConflict(conflicts);
  if(!d.weeks.some(w=>w.id===d.selectedWeekId))d.selectedWeekId=d.weeks[0]?.id;
  return shared(d);
}

export function changes(before,after){
  if(before.version===1&&after.version===1)return changesSingle(before,after);
  const a=workspaceFrom(before),b=workspaceFrom(after),ops=[];
  for(const trip of b.trips){const old=a.trips.find(t=>t.id===trip.id);if(!old)ops.push({type:'trip-add',id:trip.id,before:null,value:trip});else ops.push(...changesSingle(old,trip).map(op=>({...op,scope:trip.id})));}
  for(const trip of a.trips)if(!b.trips.some(t=>t.id===trip.id))ops.push({type:'trip-remove',id:trip.id,before:trip,value:null});
  return ops;
}
export function applyChanges(document,ops,force=false){
  if(!Array.isArray(ops)||!ops.length||ops.length>20000)throw new Error('Invalid edit batch.');
  if(document.version===1&&!ops.some(o=>o?.scope||['trip-add','trip-remove'].includes(o?.type)))return applySingle(document,ops,force);
  const d=workspaceFrom(document),conflicts=[],scoped=new Map();
  for(const op of ops){
    if(op.type==='trip-add'){
      const old=d.trips.find(t=>t.id===op.id);
      if(old&&!equal(shared(old),shared(op.value)))throw new SyncConflict([{type:'trip-add',id:op.id,current:old,wanted:op.value}]);
      if(!old){if(op.value?.id!==op.id)throw new Error('Trip IDs do not match.');d.trips.push(op.value);}
    }else if(op.type==='trip-remove'){
      const old=d.trips.find(t=>t.id===op.id);
      if(old&&!force&&!equal(shared(old),shared(op.before)))conflicts.push({type:'trip-remove',id:op.id,current:old,wanted:null});
      else d.trips=d.trips.filter(t=>t.id!==op.id);
    }else{const scope=op.scope||LEGACY_TRIP;if(!scoped.has(scope))scoped.set(scope,[]);scoped.get(scope).push(op);}
  }
  for(const [scope,edits] of scoped){const index=d.trips.findIndex(t=>t.id===scope);if(index<0)throw new Error('This trip was removed. Export your pending edits before discarding them.');try{d.trips[index]={id:scope,...applySingle(d.trips[index],edits,force)};}catch(error){if(error instanceof SyncConflict)conflicts.push(...error.conflicts.map(c=>({...c,scope})));else throw error;}}
  if(conflicts.length)throw new SyncConflict(conflicts);
  if(!d.trips.some(t=>t.id===d.selectedTripId))d.selectedTripId=d.trips[0]?.id??null;
  return shared(workspaceFrom(d));
}
