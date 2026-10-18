export const STORAGE_KEY = 'tripon.v1';
export const THEMES = ['system', 'light', 'dark'];
export const MAX_CENTS = 999999999;
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
export function progress(data) { const total=tripTotal(data); return {total, remaining:Math.max(0,data.goalCents-total), percent:data.goalCents ? Math.min(100,total/data.goalCents*100) : 0}; }
export function deletePerson(data,id) { data.people=data.people.filter(p=>p.id!==id); for(const w of data.weeks) delete w.entries[id]; }
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
    return {id:w.id,start:w.start,end:w.end,entries};
  });
  if(!weekIds.has(raw.selectedWeekId))fail('selected week does not exist.');
  return {version:1,destination:raw.destination.trim(),goalCents:raw.goalCents,theme:raw.theme,demo:raw.demo,people,weeks,selectedWeekId:raw.selectedWeekId};
}
