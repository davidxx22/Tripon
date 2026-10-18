import {addDays,paymentMethod} from './core.js';

// These are current daily records, not an audit log or verified transfer times.
export function contributionHistory(trip,{search='',date='',method='all'}={}){
  const rows=[],query=search.trim().toLocaleLowerCase();
  trip.weeks.forEach((week,index)=>trip.people.forEach(person=>{
    if(query&&!person.name.toLocaleLowerCase().includes(query))return;
    (week.entries[person.id]||[]).forEach((amount,day)=>{
      if(amount<=0)return;
      const contributionDate=addDays(week.start,day),label=paymentMethod(week,person.id,day);
      if(date&&date!==contributionDate||method!=='all'&&!label.split('+').includes(method))return;
      rows.push({personId:person.id,name:person.name,weekId:week.id,weekNumber:index+1,day,date:contributionDate,amount,method:label});
    });
  }));
  return rows.sort((a,b)=>b.date.localeCompare(a.date)||a.weekNumber-b.weekNumber||a.name.localeCompare(b.name));
}
export function historyGroups(rows){
  const groups=[];
  for(const row of rows){let group=groups.at(-1);if(group?.date!==row.date){group={date:row.date,total:0,rows:[]};groups.push(group);}group.rows.push(row);group.total+=row.amount;}
  return groups;
}
