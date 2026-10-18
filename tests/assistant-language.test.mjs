import test from 'node:test';import assert from 'node:assert/strict';
import {newTracker,blankWeek,localDate,tripTotal} from '../public/core.js';
import {parseAssistantCommand as parse,previewContribution,applyContributionPreview} from '../public/assistant.js';
import {resolveAllocation} from '../public/assistant-language.js';
const tracker=()=>{const t=newTracker();t.people.push({id:'daniel',name:'Daniel'});return t;};
test('offline understanding tolerates phrasing, polite requests, keyword and person typos',()=>{
 const t=tracker(),before=JSON.stringify(t);
 for(const text of ['Please record David sent 50 this week gcash','David has given 50 for wk1 using gcash','David contributed 50 thsi week via gcahs','David gave 50 today, give 10 each this week via GCash']){const c=parse(text,t);assert.equal(c.type,'contribution');assert.equal(c.method,'gcash');assert.equal(c.total,5000);}
 const c=parse('Daneil gvae 30 today, give 10 each from day 1 to day 3 in wek 1',t);assert.equal(c.personId,'daniel');assert.deepEqual(c.days,[0,1,2]);assert.deepEqual(c.values,[1000,1000,1000]);assert.match(c.interpretation.join(' '),/Daneil.*Daniel/);assert.equal(JSON.stringify(t),before);
 assert.equal(parse('Could you please add next wek',t).type,'week-add');assert.equal(parse('how much has Daneil paid so far',t).personId,'daniel');
});
test('day ranges support daily amounts and exact centavo splits without touching other days',()=>{
 const t=tracker();t.weeks[0].entries.daniel=[100,200,300,400,500];
 for(const text of ['Daniel paid 30 for days 1 to 3 in week 1','Daniel 10 each day from day one to three in week one','Daniel gave 30 today, distribute 10 per day from day 1 through day 3 in week 1']){const c=parse(text,t);assert.deepEqual(c.values,[1000,1000,1000]);assert.deepEqual(c.days,[0,1,2]);}
 const c=parse('Daniel gave 1 for days 2 to 4 week 1',t);assert.deepEqual(c.values,[34,33,33]);applyContributionPreview(t,previewContribution(t,c,'replace'));assert.deepEqual(t.weeks[0].entries.daniel,[100,34,33,33,500]);
});
test('the exact user example asks about the unallocated 20 without recording any money',()=>{
 const t=tracker(),before=JSON.stringify(t),r=parse('Daniel gave 50 today, give 10 each from day 1 to day 3 in week 1',t);assert.equal(r.type,'allocation-clarification');assert.equal(r.stated,5000);assert.equal(r.allocated,3000);assert.equal(r.remainder,2000);assert.equal(JSON.stringify(t),before);
 const full=resolveAllocation(r,'remainder');assert.deepEqual(full.days,[0,1,2,3,4]);assert.deepEqual(full.values,[1000,1000,1000,1000,1000]);assert.equal(full.total,5000);
 const equal=resolveAllocation(r,'equal');assert.deepEqual(equal.days,[0,1,2]);assert.deepEqual(equal.values,[1667,1667,1666]);
 const corrected=resolveAllocation(r,'allocated');assert.equal(corrected.total,3000);assert.deepEqual(corrected.values,[1000,1000,1000]);assert.throws(()=>resolveAllocation(r,'guess'));assert.equal(JSON.stringify(t),before);
 applyContributionPreview(t,previewContribution(t,full));assert.equal(tripTotal(t),5000);
});
test('over-allocation and missing days never silently discard or create money',()=>{
 const t=tracker(),r=parse('Daniel gave 20 today, give 10 each from day 1 to day 3 in week 1',t);assert.equal(r.remainder,-1000);assert.throws(()=>resolveAllocation(r,'remainder'));assert.equal(resolveAllocation(r,'equal').total,2000);assert.equal(resolveAllocation(r,'allocated').total,3000);
 for(const text of ['Daniel gave 30 for days 3 to 1 week 1','Daniel gave 30 for days 1 to 6 week 1','Daniel gave 30 for days 1 to 3 week 99','Daniel gave -50 for days 1 to 3 week 1','Daniel gave 1.234 for days 1 to 3 week 1','Daniel gave 50 today, give 10 each from day 1 to day 3 week 1; delete everyone'])assert.throws(()=>parse(text,t),text);
});
test('ambiguous names, unknown names, negation and mixed payment methods cannot cause guesses',()=>{
 const t=tracker();t.people.push({id:'danial',name:'Danial'});
 assert.throws(()=>parse('Danile gave 50 this week',t),/Which person/);
 for(const text of ['Zebra gave 50 this week','Daniel did not give 50 this week','Do not add person Jane','Daniel gave 50 this week via cash via GCash'])assert.throws(()=>parse(text,t),text);
 assert.equal(parse('Daniel gave 50 this week',t).personId,'daniel');
 assert.equal(parse('Please add person Case',t).name,'Case');
});
test('today means the actual date when no weekly allocation is supplied',()=>{
 const t=tracker();t.weeks=[blankWeek(localDate())];t.selectedWeekId=t.weeks[0].id;const c=parse('Daniel sent 50 today via GCash',t);assert.equal(c.method,'gcash');assert.deepEqual(c.days,[0]);assert.deepEqual(c.values,[5000]);t.weeks=[blankWeek('2020-01-01')];t.selectedWeekId=t.weeks[0].id;assert.throws(()=>parse('Daniel sent 50 today',t),/No matching week/);
});
