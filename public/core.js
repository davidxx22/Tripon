export const STORAGE_KEY = 'tripon.v1';
export const THEMES = ['system', 'light', 'dark'];
export const MAX_CENTS = 999999999;
export const PAYMENT_METHODS=['unspecified','cash','gcash','cash+gcash','cash+unspecified','gcash+unspecified','cash+gcash+unspecified'];
export function paymentMethod(week,person,day){return week.paymentMethods?.[person]?.[day]||'unspecified';}
export function paymentLabel(method){return method==='unspecified'?'Not specified':method.split('+').map(x=>x==='gcash'?'GCash':x==='cash'?'Cash':'Not specified').join(' + ');}
export function mergePaymentMethods(before,after){const all=new Set([...before.split('+'),...after.split('+')]);return ['cash','gcash','unspecified'].filter(x=>all.has(x)).join('+');}
export function validPaymentTime(value){return value===null||(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&validDate(value.slice(0,10))&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);}
export function localDateTime(value=new Date().toISOString()){if(!value)return '';const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function parsePaymentTime(value){if(!value)return null;if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||!validDate(value.slice(0,10)))throw new Error('Choose a valid payment date and time.');const date=new Date(value);if(!Number.isFinite(date.valueOf())||localDateTime(date.toISOString())!==value)throw new Error('Choose a valid payment date and time.');return date.toISOString();}
export function paymentRecords(week,person,day){const value=week.entries[person]?.[day]||0;return week.payments?.[person]?.[day]??(value?[{id:`legacy-${week.id}-${day}`,at:null,amount:value,method:paymentMethod(week,person,day)}]:[]);}
export function setPaymentRecords(week,person,day,records){week.payments||={};week.payments[person]||=Array.from({length:5},()=>null);week.payments[person][day]=structuredClone(records);}
export function recordPayment(week,person,day,record,mode='replace'){
  if(!validPaymentTime(record.at))throw new Error('Choose a valid payment time.');
  const records=mode==='add'?structuredClone(paymentRecords(week,person,day)):[];
  if(record.amount>0)records.push({...record});
  if(records.length>500)throw new Error('This daily entry has reached its limit of 500 payment records.');
  setPaymentRecords(week,person,day,records);
}
export function setPaymentMethod(week,person,day,method){
  if(!PAYMENT_METHODS.includes(method))throw new Error('Choose Cash, GCash, or Not specified.');
  if(method==='unspecified'&&!week.paymentMethods?.[person])return;
  week.paymentMethods||={};week.paymentMethods[person]||=Array(5).fill('unspecified');week.paymentMethods[person][day]=method;
  if(week.paymentMethods[person].every(x=>x==='unspecified'))delete week.paymentMethods[person];
  if(!Object.keys(week.paymentMethods).length)delete week.paymentMethods;
}
export function money(cents) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100); }
export function amount(text) {
  const s = String(text).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(s)) throw new Error('Enter zero or a positive amount with up to 2 decimal places.');
  const [whole, fraction = ''] = s.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) throw new Error('Amount must be ₱9,999,999.99 or less.');
  return cents;
}
export function validDate(s) { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number(s.slice(0,4))<1900||Number(s.slice(0,4))>9998)return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s; }
export function addDays(s, n) { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); }
export function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function dateLabel(s, full = false) { return new Intl.DateTimeFormat('en-PH', { month:'short',day:'numeric',...(full ? {year:'numeric'} : {}), timeZone:'UTC' }).format(new Date(s+'T12:00:00Z')); }
export const uid = () => crypto.randomUUID();
export function blankWeek(start = localDate()) { return { id:uid(), start, end:addDays(start,4), entries:{} }; }
export function newTracker(demo = false) {
  const people = ['David','Vince','Deniele','Kian'].map(name => ({id:uid(),name}));
  const week = blankWeek();
  if (demo) for (const p of people) week.entries[p.id] = Array(5).fill(1000);
  return {version:1, destination:'Samal', goalCents:0, theme:'light', demo, people, weeks:[week], selectedWeekId:week.id};
}
export function personWeek(week, id) { return (week.entries[id] || []).reduce((sum,n)=>sum+n,0); }
export function personTotal(data,id) { return data.weeks.reduce((sum,w)=>sum+personWeek(w,id),0); }
export function weekTotal(data,week) { return data.people.reduce((sum,p)=>sum+personWeek(week,p.id),0); }
export function tripTotal(data) { return data.weeks.reduce((sum,w)=>sum+weekTotal(data,w),0); }
export function paymentBreakdown(data,{personId,weekId,month}={}){
  const result={total:0,cash:0,gcash:0,unspecified:0,mixed:0,gcashMixed:0};
  for(const week of data.weeks){if(weekId&&week.id!==weekId)continue;for(const person of data.people){if(personId&&person.id!==personId)continue;for(let day=0;day<5;day++){if(month&&addDays(week.start,day).slice(0,7)!==month)continue;for(const record of paymentRecords(week,person.id,day)){result.total+=record.amount;if(['cash','gcash','unspecified'].includes(record.method))result[record.method]+=record.amount;else{result.mixed+=record.amount;if(record.method.split('+').includes('gcash'))result.gcashMixed+=record.amount;}}}}}
  return result;
}
export function gcashTotal(data){const result=paymentBreakdown(data);return {total:result.gcash,mixed:result.gcashMixed};}
export function progress(data) { const total=tripTotal(data); return {total, remaining:Math.max(0,data.goalCents-total), percent:data.goalCents ? Math.min(100,total/data.goalCents*100) : 0}; }
export function deletePerson(data,id) { data.people=data.people.filter(p=>p.id!==id); for(const w of data.weeks){delete w.entries[id];for(const key of ['paymentMethods','payments'])if(w[key]){delete w[key][id];if(!Object.keys(w[key]).length)delete w[key];}} }
export function deleteWeek(data,id) { if(data.weeks.length<=1) throw new Error('Keep at least one week.'); data.weeks=data.weeks.filter(w=>w.id!==id); if(data.selectedWeekId===id)data.selectedWeekId=data.weeks[0].id; }
export function validateData(raw) {
  const fail = message => {throw new Error('Invalid backup: '+message);};
  const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const id = v => typeof v==='string' && /^[a-zA-Z0-9-]{1,80}$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
  const cents = n => Number.isSafeInteger(n) && n>=0 && n<=MAX_CENTS;
  if(!obj(raw) || raw.version!==1)fail('unsupported format or version.');
  if(typeof raw.destination!=='string'||!raw.destination.trim()||raw.destination.length>80)fail('destination is required (max 80 characters).');
  if(!cents(raw.goalCents)||!THEMES.includes(raw.theme)||typeof raw.demo!=='boolean')fail('invalid goal, theme, or sample-data flag.');
  if(!Array.isArray(raw.people)||raw.people.length>200)fail('maximum 200 people.');
  const ids=new Set();
  const people=raw.people.map(p=>{if(!obj(p)||!id(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60)fail('invalid or duplicate person.'); ids.add(p.id); return {id:p.id,name:p.name.trim()};});
  if(!Array.isArray(raw.weeks)||raw.weeks.length<1||raw.weeks.length>1000)fail('include 1–1,000 weeks.');
  const weekIds=new Set();
  const weeks=raw.weeks.map(w=>{
    if(!obj(w)||!id(w.id)||weekIds.has(w.id)||!validDate(w.start)||!validDate(w.end)||w.end!==addDays(w.start,4)||!obj(w.entries))fail('weeks need unique IDs and five consecutive dates.');
    weekIds.add(w.id); const entries={};
    for(const [key,values] of Object.entries(w.entries)){if(!ids.has(key)||!Array.isArray(values)||values.length!==5||!values.every(cents))fail('invalid contribution or unknown person.');entries[key]=[...values];}
    const paymentMethods={};
    if(w.paymentMethods!==undefined){
      if(!obj(w.paymentMethods))fail('invalid payment methods.');
      for(const [key,values] of Object.entries(w.paymentMethods)){
        if(!ids.has(key)||!entries[key]||!Array.isArray(values)||values.length!==5||!values.every(v=>PAYMENT_METHODS.includes(v)))fail('invalid payment method or unknown contribution.');
        if(values.some(v=>v!=='unspecified'))paymentMethods[key]=[...values];
      }
    }
    const payments={};
    if(w.payments!==undefined){
      if(!obj(w.payments))fail('invalid payment records.');
      for(const [key,days] of Object.entries(w.payments)){
        if(!ids.has(key)||!entries[key]||!Array.isArray(days)||days.length!==5)fail('invalid payment record owner.');
        payments[key]=days.map((records,day)=>{
          if(records===null)return null;
          if(!Array.isArray(records)||records.length>500)fail('invalid payment record list.');
          const seen=new Set();let total=0;
          const checked=records.map(record=>{if(!obj(record)||typeof record.id!=='string'||!/^[a-zA-Z0-9-]{1,160}$/.test(record.id)||seen.has(record.id)||!cents(record.amount)||record.amount===0||!validPaymentTime(record.at)||!PAYMENT_METHODS.includes(record.method))fail('invalid payment record.');seen.add(record.id);total+=record.amount;return {id:record.id,at:record.at,amount:record.amount,method:record.method};});
          if(total!==entries[key][day])fail('payment allocations do not match the daily amount.');return checked;
        });
      }
    }
    return {id:w.id,start:w.start,end:w.end,entries,...(Object.keys(paymentMethods).length?{paymentMethods}:{}),...(Object.keys(payments).length?{payments}:{})};
  });
  if(!weekIds.has(raw.selectedWeekId))fail('selected week does not exist.');
  return {version:1,destination:raw.destination.trim(),goalCents:raw.goalCents,theme:raw.theme,demo:raw.demo,people,weeks,selectedWeekId:raw.selectedWeekId};
}
