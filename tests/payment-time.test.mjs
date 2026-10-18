import test from 'node:test';import assert from 'node:assert/strict';
import {newTracker,blankWeek,tripTotal,validateData,deletePerson,deleteWeek,localDateTime,parsePaymentTime,gcashTotal,paymentBreakdown,setPaymentMethod} from '../public/core.js';
import {parseAssistantCommand,previewContribution,applyContributionPreview} from '../public/assistant.js';
import {contributionHistory,editHistoryPayment} from '../public/history.js';
import {shared,changes,applyChanges,SyncConflict} from '../public/sync-core.js';
import {api} from '../worker/api.js';import {localDB} from '../scripts/local-db.mjs';
const at='2026-10-18T17:07:00.000Z',later='2026-10-19T04:42:00.000Z';
function pay(trip,text,mode,time=at){applyContributionPreview(trip,previewContribution(trip,parseAssistantCommand(text,trip),mode),time);}
test('a weekly split is one timestamped payment; repeated additions retain distinct payments',()=>{
 const t=newTracker();pay(t,'David 50 this week via GCash');let rows=contributionHistory(t);assert.equal(rows.length,1);assert.equal(rows[0].amount,5000);assert.equal(rows[0].at,at);assert.equal(rows[0].parts.length,5);assert.deepEqual(rows[0].parts.map(p=>p.amount),Array(5).fill(1000));
 pay(t,'David 25 this week in cash','add',later);rows=contributionHistory(t);assert.equal(rows.length,2);assert.equal(rows[0].at,later);assert.equal(rows.reduce((n,r)=>n+r.amount,0),7500);assert.equal(tripTotal(t),7500);assert.equal(contributionHistory(t,{method:'gcash'})[0].amount,5000);assert.deepEqual(validateData(t),t);
});
test('time correction updates all five allocations without changing amounts; stale previews fail',()=>{
 const t=newTracker();pay(t,'David 50 this week via GCash');const row=contributionHistory(t)[0];editHistoryPayment(t,row,later,'cash');assert.equal(contributionHistory(t).length,1);assert.equal(contributionHistory(t)[0].at,later);assert.equal(contributionHistory(t)[0].method,'cash');assert.equal(tripTotal(t),5000);assert.throws(()=>editHistoryPayment(t,row,at,'gcash'),/changed/);assert.deepEqual(validateData(t),t);
 const preview=previewContribution(t,parseAssistantCommand('David 10 this week',t),'add');editHistoryPayment(t,contributionHistory(t)[0],at,'cash');assert.throws(()=>applyContributionPreview(t,preview),/records changed/);
});
test('unknown legacy times remain unknown, including when a new payment is added',()=>{
 const t=newTracker(true);pay(t,'David 50 this week via GCash','add');const rows=contributionHistory(t);assert.equal(rows.filter(r=>r.at===null).reduce((n,r)=>n+r.amount,0),20000);assert.equal(rows.filter(r=>r.at!==null).length,1);assert.equal(rows.reduce((n,r)=>n+r.amount,0),tripTotal(t));
});
test('backup validation rejects corrupted allocations and timestamps; deletions remove only affected allocations',()=>{
 const t=newTracker();t.weeks.push(blankWeek('2026-11-01'));pay(t,'David 50 week 1');const id=t.people[0].id;
 for(const mutate of [r=>r.amount++,r=>r.at='2026-02-30T17:07:00.000Z',r=>r.id='__invalid!',r=>r.method='bank']){const bad=structuredClone(t);mutate(bad.weeks[0].payments[id][0][0]);assert.throws(()=>validateData(bad));}
 assert.deepEqual(contributionHistory(validateData(JSON.parse(JSON.stringify(t)))),contributionHistory(t));deleteWeek(t,t.weeks[0].id);assert.equal(contributionHistory(t).length,0);pay(t,'David 50 this week');deletePerson(t,id);assert.equal(contributionHistory(t).length,0);assert.equal(t.weeks[0].payments,undefined);
});
test('timestamp-only sync conflicts safely and legacy edits never retain false payment times',()=>{
 const t=newTracker();pay(t,'David 50 this week');const baseline=shared(t),a=structuredClone(baseline),b=structuredClone(baseline);editHistoryPayment(a,contributionHistory(a)[0],later,'cash');editHistoryPayment(b,contributionHistory(b)[0],'2026-10-20T01:00:00.000Z','gcash');const ops=changes(baseline,a);assert.equal(ops.length,5);assert.equal(ops[0].type,'payment');const merged=applyChanges(baseline,ops);assert.equal(contributionHistory(merged)[0].at,later);assert.throws(()=>applyChanges(merged,changes(baseline,b)),SyncConflict);
 const old=applyChanges(merged,[{type:'entry',id:t.weeks[0].id,person:t.people[0].id,day:0,before:1000,value:2000}]);assert.equal(contributionHistory(old).find(row=>row.at===null).amount,2000);assert.equal(tripTotal(old),6000);
});
test('local datetime conversion round trips and rejects invalid calendar dates',()=>{assert.equal(parsePaymentTime(localDateTime(at)),at);assert.throws(()=>parsePaymentTime('2026-02-30T12:00'));assert.equal(parsePaymentTime(''),null);});
test('Home GCash total counts exact GCash payments without guessing mixed legacy amounts',()=>{
 const t=newTracker();pay(t,'David 50 this week via GCash');pay(t,'David 25 this week in cash','add',later);assert.deepEqual(gcashTotal(t),{total:5000,mixed:0});assert.equal(tripTotal(t),7500);
 const vince=t.people[1].id;t.weeks[0].entries[vince]=[2000,1000,0,0,0];setPaymentMethod(t.weeks[0],vince,0,'cash+gcash');setPaymentMethod(t.weeks[0],vince,1,'gcash');assert.deepEqual(gcashTotal(t),{total:6000,mixed:2000});deletePerson(t,t.people[0].id);assert.deepEqual(gcashTotal(t),{total:1000,mixed:2000});
});
test('person payment breakdown respects person, week and allocation-month filters',()=>{
 const t=newTracker();t.weeks=[blankWeek('2026-09-28'),blankWeek('2026-11-01')];t.selectedWeekId=t.weeks[0].id;const personId=t.people[0].id;
 pay(t,'David 50 week 1 via GCash');pay(t,'David 25 week 1 in cash','add',later);pay(t,'David 10 week 2 in cash');pay(t,'Vince 100 week 1 via GCash');
 const all=paymentBreakdown(t,{personId});assert.equal(all.total,8500);assert.equal(all.cash,3500);assert.equal(all.gcash,5000);
 const september=paymentBreakdown(t,{personId,month:'2026-09'});assert.equal(september.total,4500);assert.equal(september.cash,1500);assert.equal(september.gcash,3000);
 const week=paymentBreakdown(t,{personId,weekId:t.weeks[1].id});assert.equal(week.total,1000);assert.equal(week.gcash,0);assert.equal(week.cash,1000);
});
test('API retains payment timestamps on create, edit and reload',async()=>{
 const DB=localDB(':memory:'),t=newTracker();pay(t,'David 50 this week via GCash');const created=await api(new Request('https://tripon.test/api/groups',{method:'POST',body:JSON.stringify({data:t})}),{DB});assert.equal(created.status,201);const group=await created.json(),next=structuredClone(group.data);editHistoryPayment(next,contributionHistory(next)[0],later,'gcash');const response=await api(new Request('https://tripon.test/api/groups/'+group.id,{method:'PATCH',headers:{authorization:'Bearer '+group.key},body:JSON.stringify({id:crypto.randomUUID(),ops:changes(group.data,next)})}),{DB});assert.equal(response.status,200);const reload=await api(new Request('https://tripon.test/api/groups/'+group.id,{headers:{authorization:'Bearer '+group.key}}),{DB});const result=await reload.json();assert.equal(contributionHistory(result.data).length,1);assert.equal(contributionHistory(result.data)[0].at,later);DB.close();
});
