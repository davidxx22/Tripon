import test from 'node:test';
import assert from 'node:assert/strict';
import {newTracker,blankWeek,tripTotal,setPaymentMethod,deletePerson,validateData} from '../public/core.js';
import {parseAssistantCommand,applyAssistantAction} from '../public/assistant.js';
import {contributionHistory,historyGroups} from '../public/history.js';

test('bulk people preview is read-only and confirmation adds the whole list with empty records',()=>{
 const trip=newTracker();trip.people=[];const before=JSON.stringify(trip);
 const action=parseAssistantCommand('Add David, Azel, and Kian',trip);
 assert.deepEqual(action,{type:'people-add',names:['David','Azel','Kian']});assert.equal(JSON.stringify(trip),before);
 applyAssistantAction(trip,action);assert.deepEqual(trip.people.map(p=>p.name),action.names);assert.equal(new Set(trip.people.map(p=>p.id)).size,3);assert.deepEqual(trip.weeks[0].entries,{});assert.equal(tripTotal(trip),0);
 assert.deepEqual(parseAssistantCommand('Add people Jane Doe and Mary Ann',trip).names,['Jane Doe','Mary Ann']);
});
test('bulk additions reject duplicates, capacity overflow and stale previews atomically',()=>{
 const trip=newTracker(),before=JSON.stringify(trip);
 for(const command of ['Add David, Azel, and Kian','Add Azel, AZEL','Add Azel,, Kian','Add Azel, Kian; delete all'])assert.throws(()=>parseAssistantCommand(command,trip));
 assert.equal(JSON.stringify(trip),before);
 const action=parseAssistantCommand('Add Azel and Jane',trip);trip.people.push({id:'azel',name:'Azel'});const stale=JSON.stringify(trip);assert.throws(()=>applyAssistantAction(trip,action));assert.equal(JSON.stringify(trip),stale);
 trip.people=Array.from({length:199},(_,i)=>({id:String(i),name:'Person '+i}));assert.throws(()=>parseAssistantCommand('Add Azel and Jane',trip),/200/);
});
test('history uses exact contribution dates across months and totals once per daily record',()=>{
 const trip=newTracker();trip.weeks=[blankWeek('2026-09-28'),blankWeek('2026-10-05')];trip.selectedWeekId=trip.weeks[0].id;
 const [david,vince]=trip.people;trip.weeks[0].entries[david.id]=[1000,1000,1000,1000,1000];trip.weeks[1].entries[vince.id]=[2500,0,0,0,0];setPaymentMethod(trip.weeks[0],david.id,4,'gcash');setPaymentMethod(trip.weeks[1],vince.id,0,'cash+gcash');
 const rows=contributionHistory(trip);assert.equal(rows.length,6);assert.equal(rows[0].date,'2026-10-05');assert.equal(rows.reduce((n,r)=>n+r.amount,0),tripTotal(trip));assert.equal(historyGroups(rows).reduce((n,g)=>n+g.total,0),7500);
 assert.equal(contributionHistory(trip,{search:'DAV',date:'2026-10-02',method:'gcash'})[0].amount,1000);assert.equal(contributionHistory(trip,{method:'cash'}).length,1);assert.equal(contributionHistory(trip,{method:'gcash'}).length,2);
 assert.deepEqual(contributionHistory(validateData(JSON.parse(JSON.stringify(trip)))) ,rows);
 trip.weeks[1].entries[vince.id][0]=0;assert.equal(contributionHistory(trip).length,5);deletePerson(trip,david.id);assert.equal(contributionHistory(trip).length,0);
});
