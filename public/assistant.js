import {amount,MAX_CENTS,addDays,localDate,uid,validDate} from './core.js';

export function assistantDate(text){
  const value=text.trim().toLowerCase();let result=value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){
    const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const m=value.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/),d=value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
    if(!m&&!d)throw new Error('Use a full date, such as 2026-09-28 or September 28, 2026.');
    const name=(m?m[1]:d[2]).replace(/^sept$/,'sep'),index=months.findIndex(x=>x===name||x.slice(0,3)===name);
    if(index<0)throw new Error('Use a valid month name or YYYY-MM-DD.');
    result=`${(m||d)[3]}-${String(index+1).padStart(2,'0')}-${String(m?m[2]:d[1]).padStart(2,'0')}`;
  }
  if(!validDate(result))throw new Error('That calendar date is not valid. Include the year, for example 2026-09-28.');
  return result;
}

export function personPeriodTotal(trip,personId,{weekId,month}={}){
  return trip.weeks.reduce((sum,week)=>sum+(weekId&&week.id!==weekId?0:(week.entries[personId]||[]).reduce((n,value,day)=>n+(!month||addDays(week.start,day).slice(0,7)===month?value:0),0)),0);
}
function namedPerson(trip,name){
  const matches=trip.people.filter(p=>p.name.toLocaleLowerCase()===name.trim().toLocaleLowerCase());
  if(matches.length!==1)throw new Error(matches.length?'That name matches more than one person. Rename them to use unique names.':'No person has that name in this trip. Use their full name or add them first.');
  return matches[0];
}
export function parseAssistantCommand(text,trip){
  const input=String(text).trim().replace(/[.!?]$/,'').replace(/\s+/g,' ');
  if(!input||input.length>500)throw new Error('Enter a command with up to 500 characters.');
  const add=input.match(/^add\s+(?:a\s+)?person\s+(.+)$/i);
  if(add){const name=add[1].trim();if(name.length>60||/[\r\n;]|\s(?:and|then)\s/i.test(name))throw new Error('Add one person at a time, with a name of up to 60 characters.');if(trip.people.length>=200)throw new Error('This trip already has 200 people.');if(trip.people.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('That name already exists in this trip.');return {type:'person-add',name};}
  const datedWeek=input.match(/^(?:add|create)\s+(?:(?:a|the)\s+)?(?:new\s+)?week\s+(?:starting(?:\s+on)?|from|on)\s+(.+)$/i);
  if(datedWeek||/^(?:add|create)\s+(?:(?:the|a)\s+)?(?:next|new)\s+week$/i.test(input)){
    if(trip.weeks.length>=1000)throw new Error('This trip already has 1,000 weeks.');
    const latest=trip.weeks.reduce((a,b)=>a.end>b.end?a:b),start=datedWeek?assistantDate(datedWeek[1]):addDays(latest.end,1);
    if(start>'9998-12-27')throw new Error('The next week exceeds the supported date range.');
    if(trip.weeks.some(w=>w.start===start))throw new Error('A week already starts on that date. Select that week to record contributions.');
    return {type:'week-add',start,end:addDays(start,4),previousEnd:latest.end,dated:!!datedWeek};
  }
  const query=input.match(/^(?:how much\s+(?:does|did|has|is)\s+|(?:show|what is)\s+)(.+?)(?:[’']s)?\s+(?:payment total|payments? total|contributions? total|total|paid|contributed|saved|payments?|contributions?)(?:\s+(?:in|for))?(?:\s+(this week|selected week|week\s+\d+|this month|month\s+\d{4}-\d{2}|all time|all weeks|in total))?$/i);
  if(query){
    const person=namedPerson(trip,query[1]),period=(query[2]||'all time').toLowerCase();let weekId,month;
    if(/week/.test(period)&&period!=='all weeks'){const n=period.match(/week\s+(\d+)/),week=n?trip.weeks[Number(n[1])-1]:trip.weeks.find(w=>w.id===trip.selectedWeekId);if(!week)throw new Error('That week does not exist.');weekId=week.id;}
    if(period==='this month')month=localDate().slice(0,7);
    else if(period.startsWith('month ')){month=period.slice(6);if(!/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(month))throw new Error('Use a valid month, such as month 2026-10.');}
    return {type:'query',personId:person.id,personName:person.name,weekId,month};
  }
  return {type:'contribution',...parseContributionCommand(input,trip)};
}
export function applyAssistantAction(trip,action){
  if(action.type==='person-add'){
    const checked=parseAssistantCommand('add person '+action.name,trip);trip.people.push({id:uid(),name:checked.name});return;
  }
  if(action.type==='week-add'){
    const fresh=parseAssistantCommand(action.dated?'add week starting '+action.start:'add next week',trip);
    if(fresh.start!==action.start||fresh.end!==action.end)throw new Error('The weeks changed after this preview. Enter the command again.');
    const week={id:uid(),start:fresh.start,end:fresh.end,entries:{}};trip.weeks.push(week);trip.selectedWeekId=week.id;return;
  }
  throw new Error('This action is not supported.');
}

// Deliberately small grammar: unsupported wording never produces a guess or edit.
export function parseContributionCommand(text,trip){
  const input=String(text).trim().replace(/[.!]$/,'').replace(/\s+/g,' ');
  if(!input||input.length>500)throw new Error('Enter a contribution command (maximum 500 characters).');
  const names=trip.people.filter(p=>input.toLocaleLowerCase().startsWith(p.name.toLocaleLowerCase()+' '));
  if(!names.length)throw new Error('Start with an existing person’s full name, for example: David contributed 50 pesos this week.');
  names.sort((a,b)=>b.name.length-a.name.length);
  const person=names[0];
  if(trip.people.filter(p=>p.name.toLocaleLowerCase()===person.name.toLocaleLowerCase()).length!==1)throw new Error('More than one person has that name. Rename them so each name is unique.');
  const body=input.slice(person.name.length).trim();
  const dated=body.match(/^(?:(?:contributed|gave|give|paid|saved|save|add|set|fill)\s+)?(?:₱\s*|PHP\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:pesos?|PHP))?\s+(?:on|for)\s+(\d{4}-\d{2}-\d{2}|[a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[a-z]+\s+\d{4})(?:\s+(?:in\s+)?week\s+(\d+))?$/i);
  if(dated){
    const date=assistantDate(dated[2]),cents=amount(dated[1]),matches=trip.weeks.filter((w,i)=>(!dated[3]||i===Number(dated[3])-1)&&w.start<=date&&w.end>=date);
    if(!matches.length)throw new Error('No matching week contains that date. First add a week starting on the needed date, or check the week number.');
    if(matches.length>1)throw new Error('That date appears in overlapping weeks. Add the week number, for example “David 50 on '+date+' in week 2”.');
    const week=matches[0],day=[0,1,2,3,4].find(n=>addDays(week.start,n)===date);
    return {personId:person.id,personName:person.name,weekId:week.id,start:week.start,end:week.end,days:[day],values:[cents],total:cents,split:false};
  }
  const match=body.match(/^(?:(?:contributed|gave|give|paid|saved|save|add|set|fill)\s+)?(?:₱\s*|PHP\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:pesos?|PHP))?\s+(?:(each|every|per)\s+day\s+)?(?:for\s+)?(this week|selected week|week\s+\d+|(?:on\s+)?day\s+[1-5](?:\s+(?:this week|selected week|week\s+\d+))?)(.*)$/i);
  if(!match)throw new Error('Try “David 50 this week”, “David 10 each day week 2”, or “David 25 on 2026-09-28”. Use positive numbers or zero, with up to two decimal places.');
  const cents=amount(match[1]),perDay=!!match[2],target=match[3].toLowerCase(),tail=match[4].trim();
  const number=target.match(/week\s+(\d+)/),week=number?trip.weeks[Number(number[1])-1]:trip.weeks.find(w=>w.id===trip.selectedWeekId);
  if(!week)throw new Error('That week does not exist. Create it first or choose an existing week number.');
  const day=target.match(/day\s+([1-5])/);
  if(day&&perDay)throw new Error('Use either one day or an amount per day, not both.');
  let daily;
  if(tail){
    if(day||perDay)throw new Error('Extra instructions are not supported. Use one simple contribution command.');
    if(/^(?:[,;—-]\s*)?(?:split(?:\s+it)?|distribute(?:\s+(?:it|them))?)\s+(?:equally|evenly)(?:\s+(?:across|over)\s+(?:all\s+)?(?:five|5)\s+days)?$/i.test(tail)){
      // The weekly total below is divided exactly in centavos.
    }else{
      const explicit=tail.match(/^(?:[,;—-]\s*)?(?:split(?:\s+it)?|distribute(?:\s+(?:it|them))?)\s+(?:₱\s*|PHP\s*)?(\d+(?:\.\d{1,2})?)(?:\s+pesos?)?\s+(?:each|every|per)\s+day(?:\s+(?:this week|selected week))?$/i);
      if(!explicit)throw new Error('I could not understand the extra instructions. Try “David 50 this week, split equally”.');
      daily=amount(explicit[1]);if(daily*5!==cents)throw new Error('The daily amounts do not equal the weekly total. Check the amounts and try again.');
    }
  }
  const days=day?[Number(day[1])-1]:[0,1,2,3,4];
  const values=days.map((_,i)=>day||perDay?cents:daily??Math.floor(cents/5)+(i<cents%5?1:0));
  return {personId:person.id,personName:person.name,weekId:week.id,start:week.start,end:week.end,days,values,total:values.reduce((a,b)=>a+b,0),split:!day&&!perDay};
}

export function previewContribution(trip,command,mode){
  const week=trip.weeks.find(w=>w.id===command.weekId),person=trip.people.find(p=>p.id===command.personId);
  if(!week||!person||person.name!==command.personName||week.start!==command.start||week.end!==command.end)throw new Error('The person or week changed. Enter your command again.');
  const before=week.entries[person.id]?[...week.entries[person.id]]:null;
  const hasExisting=before!==null;
  if(mode!==undefined&&!['add','replace'].includes(mode))throw new Error('Choose Add or Replace.');
  if(hasExisting&&!mode)return {hasExisting,needsChoice:true,before};
  const after=before?[...before]:Array(5).fill(0);
  command.days.forEach((day,i)=>{after[day]=command.values[i]+(mode==='add'?after[day]:0);if(!Number.isSafeInteger(after[day])||after[day]>MAX_CENTS)throw new Error('A daily amount would exceed ₱9,999,999.99.');});
  return {hasExisting,needsChoice:false,before,after,command,mode:mode||'replace'};
}

export function applyContributionPreview(trip,plan){
  if(plan.needsChoice||!plan.command)throw new Error('Preview the changes and choose how to handle existing records first.');
  const fresh=previewContribution(trip,plan.command,plan.mode);
  if(JSON.stringify(fresh.before)!==JSON.stringify(plan.before))throw new Error('These contributions changed after the preview. Preview your command again.');
  if(JSON.stringify(fresh.after)!==JSON.stringify(plan.after))throw new Error('The preview changed. Preview your command again.');
  trip.weeks.find(w=>w.id===plan.command.weekId).entries[plan.command.personId]=[...fresh.after];
}
