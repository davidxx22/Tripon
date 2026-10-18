import {addDays,paymentRecords,setPaymentRecords,setPaymentMethod,mergePaymentMethods,validPaymentTime} from './core.js';

export function contributionHistory(trip,{search='',date='',method='all'}={}){
  const events=new Map(),query=search.trim().toLocaleLowerCase();
  trip.weeks.forEach((week,index)=>trip.people.forEach(person=>{
    if(query&&!person.name.toLocaleLowerCase().includes(query))return;
    (week.entries[person.id]||[]).forEach((amount,day)=>{
      if(amount<=0)return;
      for(const record of paymentRecords(week,person.id,day)){
        const key=[person.id,record.id,record.at,record.method].join('|');
        let event=events.get(key);
        if(!event){const d=record.at?new Date(record.at):null;event={key,id:record.id,personId:person.id,name:person.name,weekId:week.id,weekNumber:index+1,day,at:record.at,date:d?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):null,amount:0,method:record.method,parts:[]};events.set(key,event);}
        event.amount+=record.amount;event.parts.push({weekId:week.id,day,amount:record.amount,allocationDate:addDays(week.start,day)});
      }
    });
  }));
  return [...events.values()].filter(row=>(!date||row.date===date)&&(method==='all'||row.method.split('+').includes(method))).sort((a,b)=>(b.at||'').localeCompare(a.at||'')||a.name.localeCompare(b.name)||a.key.localeCompare(b.key));
}
export function historyGroups(rows){
  const groups=[];
  for(const row of rows){let group=groups.at(-1);if(!group||group.date!==row.date){group={date:row.date,total:0,rows:[]};groups.push(group);}group.rows.push(row);group.total+=row.amount;}
  return groups;
}
export function editHistoryPayment(trip,snapshot,at,method){
  if(!validPaymentTime(at))throw new Error('Choose a valid payment date and time.');
  const current=contributionHistory(trip).find(row=>row.key===snapshot.key);
  if(!current||JSON.stringify(current)!==JSON.stringify(snapshot))throw new Error('This payment changed. Close and reopen it before editing.');
  const copy=structuredClone(trip.weeks);
  for(const part of snapshot.parts){const week=copy.find(w=>w.id===part.weekId),records=paymentRecords(week,snapshot.personId,part.day).map(record=>record.id===snapshot.id&&record.at===snapshot.at&&record.method===snapshot.method?{...record,at,method}:record);setPaymentRecords(week,snapshot.personId,part.day,records);setPaymentMethod(week,snapshot.personId,part.day,records.map(record=>record.method).reduce(mergePaymentMethods) );}
  trip.weeks=copy;
}
