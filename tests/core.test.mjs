import test from 'node:test';
import assert from 'node:assert/strict';
import {amount,money,newTracker,blankWeek,addDays,validDate,personWeek,personTotal,weekTotal,tripTotal,progress,deletePerson,deleteWeek,validateData} from '../dist/core.js';
test('amounts use exact centavos, allow zero and reject invalid input',()=>{
  assert.equal(amount('0'),0);assert.equal(amount('10.5'),1050);assert.equal(amount('0.29'),29);assert.equal(amount('001.01'),101);assert.equal(money(12345),'₱123.45');
  for(const value of ['','-1','NaN','Infinity','1e3','10.999','.1','1.','1,000','₱10','+1','9999999999'])assert.throws(()=>amount(value));
});
test('empty and demo records are explicit and independent',()=>{const empty=newTracker(),demo=newTracker(true);assert.equal(tripTotal(empty),0);assert.equal(empty.demo,false);assert.equal(tripTotal(demo),20000);assert.equal(demo.demo,true);assert.equal(empty.people[2].name,'Deniele');});
test('weekly and all-week totals avoid double counting',()=>{const d=newTracker();const p=d.people[0].id,w=d.weeks[0];w.entries[p]=[10,20,30,40,50];const second=blankWeek(addDays(w.end,1));second.entries[p]=[1,2,3,4,5];d.weeks.push(second);assert.equal(personWeek(w,p),150);assert.equal(personTotal(d,p),165);assert.equal(weekTotal(d,w),150);assert.equal(tripTotal(d),165);w.entries[p][0]=29;assert.equal(tripTotal(d),184);});
test('goal progress clamps remaining at zero and percent at 100',()=>{const d=newTracker(true);assert.deepEqual(progress(d),{total:20000,remaining:0,percent:0});d.goalCents=40000;assert.equal(progress(d).percent,50);assert.equal(progress(d).remaining,20000);d.goalCents=10000;assert.equal(progress(d).percent,100);assert.equal(progress(d).remaining,0);});
test('removing a person removes all of their weekly data',()=>{const d=newTracker(true),id=d.people[0].id;const w=blankWeek();w.entries[id]=[100,0,0,0,0];d.weeks.push(w);deletePerson(d,id);assert.equal(tripTotal(d),15000);assert.equal(d.people.length,3);for(const week of d.weeks)assert.equal(week.entries[id],undefined);});
test('deleting a week updates selection and totals; retains one week',()=>{const d=newTracker(true);assert.throws(()=>deleteWeek(d,d.weeks[0].id));const old=d.weeks[0].id;const w=blankWeek();d.weeks.push(w);deleteWeek(d,old);assert.equal(tripTotal(d),0);assert.equal(d.selectedWeekId,w.id);assert.equal(d.people.length,4);});
test('dates span month/year boundaries and reject invalid dates',()=>{assert.equal(addDays('2026-12-30',4),'2027-01-03');assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-99-99'),false);assert.equal(validDate('2028-02-29'),true);});
test('backup round-trip includes trip, theme, demo and selected week',()=>{const d=newTracker(true);d.theme='dark';d.destination='Samal Island';d.goalCents=12345;assert.deepEqual(validateData(JSON.parse(JSON.stringify(d))),d);});
test('import rejects malformed, duplicate, unknown, and unsafe records',()=>{
  const mutations=[d=>d.version=2,d=>d.people.push({...d.people[0]}),d=>d.weeks.push({...d.weeks[0]}),d=>d.weeks[0].entries.noone=[0,0,0,0,0],d=>d.weeks[0].entries[d.people[0].id]=[-1,0,0,0,0],d=>d.weeks[0].entries[d.people[0].id]=[1.5,0,0,0,0],d=>d.weeks[0].end=addDays(d.weeks[0].end,1),d=>d.theme='rainbow',d=>d.selectedWeekId='missing',d=>d.people[0].id='__proto__',d=>d.weeks=[]];
  for(const mutate of mutations){const d=newTracker();mutate(d);assert.throws(()=>validateData(d));}
});
test('import sanitizes unknown metadata and preserves text as text',()=>{const d=newTracker();d.extra='<script>';d.people[0].name='<img src=x>';const clean=validateData(d);assert.equal(clean.extra,undefined);assert.equal(clean.people[0].name,'<img src=x>');});
