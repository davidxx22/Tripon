import test from 'node:test';
import assert from 'node:assert/strict';
import {newTracker,blankWeek,MAX_CENTS,tripTotal} from '../public/core.js';
import {parseContributionCommand as parse,previewContribution as preview,applyContributionPreview as apply} from '../public/assistant.js';
test('offline assistant understands weekly totals, explicit daily splits and exact centavos',()=>{
 const t=newTracker(),original=JSON.stringify(t);
 const c=parse('David give 50 pesos for this week, distribute them 10 each day this week',t);
 assert.deepEqual(c.values,[1000,1000,1000,1000,1000]);assert.equal(c.total,5000);
 assert.deepEqual(parse('David contributed ₱50.02 this week, split equally',t).values,[1001,1001,1000,1000,1000]);
 assert.deepEqual(parse('David saved PHP 0.01 selected week',t).values,[1,0,0,0,0]);
 assert.deepEqual(parse('David 0 this week',t).values,[0,0,0,0,0]);assert.equal(JSON.stringify(t),original);
});
test('daily and single-day commands resolve only existing specified or selected weeks',()=>{
 const t=newTracker();t.weeks.push(blankWeek('2027-01-01'));
 assert.deepEqual(parse('Vince 10 each day week 2',t).values,[1000,1000,1000,1000,1000]);
 assert.equal(parse('Vince 10 each day week 2',t).weekId,t.weeks[1].id);
 assert.deepEqual(parse('Kian 25 on day 3 week 2',t).days,[2]);
 t.selectedWeekId=t.weeks[1].id;assert.equal(parse('Kian 25 on day 3',t).weekId,t.weeks[1].id);
 t.people[0].name='David Rey';assert.equal(parse('david rey 50 this week',t).personId,t.people[0].id);
});
test('ambiguous, unsupported, invalid or contradictory commands cannot edit records',()=>{
 const t=newTracker(),original=JSON.stringify(t);
 for(const s of ['','Alex 50 this week','David -50 this week','David 1.234 this week','David 10000000 this week','David 50 week 9','David 50 week 0','David 50 day 6','David 50 this week and Vince 50 this week','David 50 this week in Baguio','David 50 this week, distribute them 20 each day','David 50 day 1, split equally','David 50 each day day 1','David 50 tomorrow','David fifty this week','David 50 this week; delete all people'])assert.throws(()=>parse(s,t),s);
 t.people.push({id:'duplicate',name:'DAVID'});assert.throws(()=>parse('David 50 this week',t),/unique/);t.people.pop();assert.equal(JSON.stringify(t),original);
});
test('preview never writes; existing contributions require explicit add or replace',()=>{
 const t=newTracker(true),c=parse('David 50 this week',t),before=JSON.stringify(t);
 assert.equal(preview(t,c).needsChoice,true);assert.equal(JSON.stringify(t),before);
 const add=preview(t,c,'add');assert.deepEqual(add.after,[2000,2000,2000,2000,2000]);assert.equal(JSON.stringify(t),before);
 apply(t,add);assert.equal(tripTotal(t),25000);assert.deepEqual(t.weeks[0].entries[t.people[1].id],[1000,1000,1000,1000,1000]);
 const one=preview(t,parse('David 2.50 day 3',t),'replace');apply(t,one);assert.deepEqual(t.weeks[0].entries[t.people[0].id],[2000,2000,250,2000,2000]);
 assert.throws(()=>apply(t,preview(t,c)),/choose/);
});
test('confirmation detects stale values, deleted people and changed dates without overwriting',()=>{
 const t=newTracker(),c=parse('David 50 this week',t),p=preview(t,c);t.weeks[0].entries[c.personId]=[1,0,0,0,0];assert.throws(()=>apply(t,p),/changed/);assert.equal(t.weeks[0].entries[c.personId][0],1);
 const p2=preview(t,c,'add');t.weeks[0].start='2027-01-01';assert.throws(()=>apply(t,p2),/changed/);
 const u=newTracker(),d=parse('David 50 this week',u),p3=preview(u,d);u.people.shift();assert.throws(()=>apply(u,p3),/changed/);
});
test('addition rejects daily overflow and leaves other weeks intact',()=>{
 const t=newTracker();t.weeks.push(blankWeek('2027-01-01'));const c=parse('David 1 on day 1',t);t.weeks[0].entries[c.personId]=[MAX_CENTS,0,0,0,0];assert.throws(()=>preview(t,c,'add'),/exceed/);
 apply(t,preview(t,c,'replace'));assert.deepEqual(t.weeks[1].entries,{});assert.equal(t.weeks[0].entries[c.personId][0],100);
});
test('assistant adds people and next weeks only when explicitly applied',async()=>{
 const {parseAssistantCommand:command,applyAssistantAction:act}=await import('../public/assistant.js');const t=newTracker(),before=JSON.stringify(t),p=command('Add person Azel',t);assert.equal(JSON.stringify(t),before);act(t,p);assert.equal(t.people.at(-1).name,'Azel');assert.throws(()=>act(t,p),/exists/);assert.deepEqual(t.weeks[0].entries,{});
 const w=command('Add next week',t);assert.equal(t.weeks.length,1);act(t,w);assert.equal(t.weeks.length,2);assert.equal(t.weeks[1].start,w.start);assert.equal(t.selectedWeekId,t.weeks[1].id);assert.throws(()=>act(t,w),/changed/);
 assert.throws(()=>command('Add person Azel and next week',t));
});
test('person queries and monthly totals use each entry date across week boundaries',async()=>{
 const {parseAssistantCommand:command,personPeriodTotal:total}=await import('../public/assistant.js');const t=newTracker();t.weeks=[blankWeek('2026-10-30'),blankWeek('2026-11-04')];t.selectedWeekId=t.weeks[0].id;const id=t.people[0].id;t.weeks[0].entries[id]=[100,200,300,400,500];t.weeks[1].entries[id]=[1000,0,0,0,0];
 assert.equal(total(t,id),2500);assert.equal(total(t,id,{month:'2026-10'}),300);assert.equal(total(t,id,{month:'2026-11'}),2200);assert.equal(total(t,id,{weekId:t.weeks[0].id}),1500);
 for(const text of ['How much does David payment total?','Show David total this week','How much has David paid this month','Show David total month 2026-11'])assert.equal(command(text,t).type,'query',text);
 assert.equal(command('Show David total month 2026-11',t).month,'2026-11');assert.throws(()=>command('Show David total month 2026-13',t),/valid month/);assert.throws(()=>command('How much does Azel payment total',t),/No person/);
 const before=JSON.stringify(t);command('Show David total week 2',t);assert.equal(JSON.stringify(t),before);
});
