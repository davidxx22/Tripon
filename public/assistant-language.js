import {amount,money,addDays,localDate,MAX_CENTS} from './core.js';

// Bounded offline interpretation. Never correct a number or silently choose a
// person when more than one saved name is a plausible match.
function distance(a,b){
  const grid=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)grid[i][0]=i;
  for(let j=0;j<=b.length;j++)grid[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    grid[i][j]=Math.min(grid[i-1][j]+1,grid[i][j-1]+1,grid[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])grid[i][j]=Math.min(grid[i][j],grid[i-2][j-2]+1);
  }
  return grid[a.length][b.length];
}
const vocabulary=['contributed','contribute','distribute','equally','starting','selected','payment','payments','person','people','create','today','through','until','week','weeks','day','days','each','every','split','gave','give','paid','saved','cash','gcash','total','month','next','this'];
const aliases={pls:'please',plz:'please',wk:'week',wks:'weeks',wek:'week',dy:'day',payed:'paid',sent:'gave',deposited:'gave',donated:'gave',allocate:'distribute',assign:'distribute',divide:'distribute',evenly:'equally',thru:'through'};
const numberWords={one:'1',two:'2',three:'3',four:'4',five:'5'};
function personName(name,trip,notes){
  const value=name.trim(),key=value.toLocaleLowerCase(),exact=trip.people.filter(p=>p.name.toLocaleLowerCase()===key);
  if(exact.length===1)return exact[0].name;
  if(exact.length>1)throw new Error('More than one person has that name. Rename them to use unique names.');
  if(key.length<4)throw new Error(`No person named “${value}” exists in this trip. Use their full name or add them first.`);
  const candidates=trip.people.filter(p=>distance(key,p.name.toLocaleLowerCase())<=(Math.max(key.length,p.name.length)>=7?2:1));
  if(candidates.length>1)throw new Error('Which person did you mean: '+candidates.map(p=>p.name).join(' or ')+'? Enter their full name.');
  if(!candidates.length)throw new Error(`No person named “${value}” exists in this trip. Use their full name or add them first.`);
  notes.push(`Read “${value}” as “${candidates[0].name}”. Check the person before confirming.`);
  return candidates[0].name;
}
function normalize(text,trip){
  const notes=[],protectedWords=new Set(trip.people.flatMap(p=>p.name.toLowerCase().split(/\s+/)));
  let input=text.trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
  input=input.replace(/^(?:(?:can|could|would)\s+you\s+)?(?:(?:please|pls|plz|kindly)\s+)?/i,'').replace(/\s+(?:please|pls|plz)$/i,'');
  // Keep new names exactly as requested, even when they resemble command words.
  if(/^add\s+(?!(?:next|new|week|wek|wk)\b)/i.test(input)){
    if(!/^add\s+(?:a\s+)?(?:person|people|persons)\b/i.test(input)&&!/,|\s+and\s+/i.test(input))input=input.replace(/^add\s+/i,'add person ');
    return {input,notes};
  }
  input=input.replace(/\b(wk|week|day)(\d+)\b/gi,'$1 $2');
  input=input.replace(/\b(?:has\s+given|has\s+paid|just\s+gave)\b/gi,'gave');
  input=input.replace(/\b[a-z]+\b/gi,word=>{
    const lower=word.toLowerCase();if(protectedWords.has(lower))return word;
    if(aliases[lower])return aliases[lower];
    if(vocabulary.includes(lower)||lower.length<4)return word;
    const candidates=vocabulary.filter(target=>distance(lower,target)===1);
    if(candidates.length!==1)return word;
    notes.push(`Read “${word}” as “${candidates[0]}”.`);return candidates[0];
  });
  input=input.replace(/\b(week|day|days)\s+(one|two|three|four|five)\b/gi,(_,label,value)=>label+' '+numberWords[value.toLowerCase()]);
  input=input.replace(/\b(to|through|until)\s+(one|two|three|four|five)\b/gi,(_,label,value)=>label+' '+numberWords[value.toLowerCase()]);
  input=input.replace(/^(?:in\s+|for\s+)?(week\s+\d+|this week|selected week)\s*[,,:]?\s+(.+)$/i,'$2 in $1');
  input=input.replace(/\b(?:has\s+given|just\s+gave)\b/gi,'gave').replace(/^record\s+(?:that\s+)?/i,'');
  input=input.replace(/\btoday[.,]\s*/gi,'today, ');
  input=input.replace(/\b(?:put|spread)\s+(?:it\s+)?/gi,'distribute ');
  input=input.replace(/\b(?:what(?:'s| is))\s+(.+?)(?:['’]s)\s+total$/i,'show $1 total');
  input=input.replace(/^how much (?:has|did) (.+?) (?:paid|gave|contributed)(?: so far)?$/i,'show $1 total');
  const contribution=input.match(/^(.+?)\s+((?:gave|give|paid|contributed|saved)\s+.+)$/i);
  const query=input.match(/^(show|how much (?:does|did|has|is)|what is)\s+(.+?)(\s+(?:payment total|payments? total|total|payments?|contributions?).*)$/i);
  if(contribution){
    const names=contribution[1].split(/\s*,\s*(?:and\s+)?|\s+and\s+/i);
    input=names.map(name=>personName(name,trip,notes)).join(' and ')+' '+contribution[2];
  }else if(query)input=query[1]+' '+personName(query[2].replace(/['’]s$/,''),trip,notes)+query[3];
  else{
    const direct=input.match(/^(.+?)\s+((?:₱\s*|PHP\s*)?\d.*)$/i);
    if(direct&&!/^(?:add|create)\b/i.test(input))input=personName(direct[1],trip,notes)+' '+direct[2];
  }
  // A trailing bare method is clear; multiple methods still fail strict parsing.
  input=input.replace(/(?<!\bvia |\bin |\bby )\b(gcash|cash)$/i,'via $1').replace(/\b(using|via|in|by)\s+via\s+/gi,'$1 ');
  return {input,notes:[...new Set(notes)]};
}
function installmentCommand(input,trip){
  const person=trip.people.filter(p=>input.toLowerCase().startsWith(p.name.toLowerCase()+' ')).sort((a,b)=>b.name.length-a.name.length)[0];
  if(!person)return null;
  let body=input.slice(person.name.length).trim(),method;
  const methods=[...body.matchAll(/\b(?:via|in|using|by)\s+(cash|gcash)\b/gi)];
  if(methods.length>1)throw new Error('Use one payment method per command: Cash or GCash.');
  if(methods.length){method=methods[0][1].toLowerCase();body=body.replace(methods[0][0],'').trim();}
  const match=body.match(/^(?:(?:gave|give|paid|contributed|saved)\s+)?(?:₱\s*|PHP\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:pesos?|PHP))?(?:\s+|,\s*)(?:today\s*[,.:]?\s*)?[, ]*(?:split|distribute)\s+(?:(?:the\s+)?(?:amount|payment|money|total)\s+|(?:it|them)\s+)?(?:by|in\s+(?:increments|chunks)\s+of)\s+(?:₱\s*|PHP\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:pesos?|PHP))?(?:\s+(?:(?:in|for|across)\s+)?(week\s+\d+|this week|selected week))?$/i);
  if(!match)return null;
  const total=amount(match[1]),daily=amount(match[2]);
  if(daily===0)throw new Error('The amount to split by must be greater than zero. Nothing has been saved.');
  const count=Math.max(1,Math.ceil(total/daily));
  if(count>5)throw new Error(`${money(total)} split by ${money(daily)} needs ${count} days. A week has only five days. Choose a larger daily amount or record the rest in another week. Nothing has been saved.`);
  const number=match[3]?.match(/week\s+(\d+)/i),week=number?trip.weeks[Number(number[1])-1]:trip.weeks.find(w=>w.id===trip.selectedWeekId);
  if(!week)throw new Error('That week does not exist. Create it first.');
  const days=Array.from({length:count},(_,i)=>i),values=days.map(day=>Math.min(daily,total-day*daily));
  return {type:'contribution',personId:person.id,personName:person.name,weekId:week.id,start:week.start,end:week.end,days,values,total,split:count>1,method,interpretation:[`“Split by ${money(daily)}” means start at Day 1 of Week ${trip.weeks.indexOf(week)+1}: ${values.map((value,day)=>`Day ${day+1} ${money(value)}`).join(', ')}. Other days stay unchanged.`]};
}
function rangeCommand(input,trip){
  const people=trip.people.filter(p=>input.toLowerCase().startsWith(p.name.toLowerCase()+' ')).sort((a,b)=>b.name.length-a.name.length);
  if(!people.length)return null;
  const person=people[0];let body=input.slice(person.name.length).trim(),method;
  const methods=[...body.matchAll(/\b(?:via|in|using|by)\s+(cash|gcash)\b/gi)];
  if(methods.length>1)throw new Error('Use one payment method per command: Cash or GCash.');
  if(methods.length){method=methods[0][1].toLowerCase();body=body.replace(methods[0][0],'').trim();}
  const head=body.match(/^(?:(?:gave|give|paid|contributed|saved)\s+)?(?:₱\s*|PHP\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:pesos?|PHP))?\s+(.+)$/i);
  if(!head)return null;
  const range=head[2].match(/\b(?:from\s+)?days?\s+([1-5])\s*(?:to|through|until|-)\s*(?:day\s+)?([1-5])(?:\s+(?:(?:in|for|of)\s+)?(week\s+\d+|this week|selected week))?$/i);
  if(!range)return null;
  const first=Number(range[1])-1,last=Number(range[2])-1;if(first>last)throw new Error('The last day must come after the first day. Use Days 1 to 3, for example.');
  const target=range[3]||'selected week',number=target.match(/week\s+(\d+)/i),week=number?trip.weeks[Number(number[1])-1]:trip.weeks.find(w=>w.id===trip.selectedWeekId);
  if(!week)throw new Error('That week does not exist. Create it first.');
  const lead=head[2].slice(0,range.index).trim().replace(/^today\s*,?\s*/i,'').replace(/^,\s*/,'').replace(/^and\s+/i,'').trim();
  const explicit=lead.match(/^(?:(?:give|distribute|split)\s+(?:(?:it|them)\s+)?)?(?:₱\s*|PHP\s*)?(\d+(?:\.\d{1,2})?)(?:\s*pesos?)?\s+(?:each(?:\s+day)?|every day|per day)(?:\s+(?:for|on|across))?$/i);
  const perDay=/^(?:each(?:\s+day)?|every day|per day)(?:\s+(?:for|on|across))?$/i.test(lead);
  const equal=/^(?:(?:for|on)|(?:(?:split|distribute)(?:\s+(?:it|them))?(?:\s+equally)?(?:\s+(?:over|across|for|on))?))?$/i.test(lead);
  if(!explicit&&!perDay&&!equal)return null;
  const stated=amount(head[1]),days=Array.from({length:last-first+1},(_,i)=>first+i),daily=explicit?amount(explicit[1]):perDay?stated:null;
  const values=days.map((_,i)=>daily??Math.floor(stated/days.length)+(i<stated%days.length?1:0)),total=values.reduce((n,v)=>n+v,0);
  if(total>MAX_CENTS)throw new Error('The payment total would exceed ₱9,999,999.99.');
  const command={type:'contribution',personId:person.id,personName:person.name,weekId:week.id,start:week.start,end:week.end,days,values,total,split:days.length>1,method};
  if(explicit&&total!==stated)return {type:'allocation-clarification',command,stated,allocated:total,remainder:stated-total};
  return command;
}
export function resolveAllocation(request,choice){
  if(request.type!=='allocation-clarification')throw new Error('No allocation needs clarification.');
  const command=structuredClone(request.command),remaining=[0,1,2,3,4].filter(day=>!command.days.includes(day));
  if(choice==='remainder'&&request.remainder>0&&remaining.length){
    remaining.forEach((day,i)=>{command.days.push(day);command.values.push(Math.floor(request.remainder/remaining.length)+(i<request.remainder%remaining.length?1:0));});
  }else if(choice==='equal')command.values=command.days.map((_,i)=>Math.floor(request.stated/command.days.length)+(i<request.stated%command.days.length?1:0));
  else if(choice!=='allocated')throw new Error('Choose how to resolve the different amounts.');
  command.total=command.values.reduce((n,v)=>n+v,0);
  return command;
}
export function understandAssistant(text,trip,parseExact){
  const raw=String(text);if(!raw.trim()||raw.length>500)throw new Error('Enter a command with up to 500 characters.');
  if(/\b(?:not|never|don['’]?t|didn['’]?t|hasn['’]?t|cancel|except)\b/i.test(raw))throw new Error('I need a clear positive instruction before changing records. Describe only the contribution you want to record.');
  let original;
  try{return parseExact(raw,trip);}catch(error){original=error;}
  const {input,notes}=normalize(raw,trip);
  let result=installmentCommand(input,trip)||rangeCommand(input,trip);
  if(!result){
    // Without an explicit allocation, “today” refers to the actual calendar day.
    let canonical=input.replace(/\btoday$/i,'on '+localDate());
    const methodSuffix=canonical.match(/\s+(?:via|using|by|in)\s+(?:cash|gcash)$/i)?.[0]||'';
    if(methodSuffix)canonical=canonical.slice(0,-methodSuffix.length);
    canonical=canonical.replace(/\btoday$/i,'on '+localDate());
    canonical=canonical.replace(/\b(?:today\s*,?\s*)?(?:give|distribute|split)\s+(\d+(?:\.\d{1,2})?)(?:\s*pesos?)?\s+(?:each(?:\s+day)?|per day|every day)\s+(?:(?:in|for)\s+)?(this week|selected week|week\s+\d+)$/i,'$2, split $1 each day');
    canonical=canonical.replace(/\bsplit equally\s+(?:(?:in|for|across)\s+)?(this week|selected week|week\s+\d+)$/i,'$1, split equally').replace(/\b(?:in|for)\s+(week\s+\d+)$/i,'$1');
    canonical+=methodSuffix;
    try{result=parseExact(canonical,trip);}catch(error){if(input===raw.trim())throw original;throw error;}
  }
  return {...result,interpretation:[...notes,...(result.interpretation||[])]};
}
