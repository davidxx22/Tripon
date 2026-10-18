import {STORAGE_KEY, amount, money, newTracker, blankWeek, addDays, dateLabel, localDate, personWeek, personTotal, weekTotal, tripTotal, progress, uid, deletePerson, deleteWeek, validateData} from './core.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, unsaved = false, damaged = false, rawBackup = null, installPrompt = null, toastTimer;
try { rawBackup = localStorage.getItem(STORAGE_KEY); if (rawBackup) data=validateData(JSON.parse(rawBackup)); }
catch { damaged=true; }
const firstVisit=!data;
data ||= newTracker();
function applyTheme() { document.documentElement.dataset.theme=data.theme; $('theme').value=data.theme; const dark=data.theme==='dark'||data.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches; document.querySelector('meta[name="theme-color"]').content=dark?'#080c0b':'#f7f9f7'; }
function notify(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').hidden=false; toastTimer=setTimeout(()=>$('toast').hidden=true,4500); }
function showStorageError(message) {
  $('storage-alert').hidden=false; $('storage-alert').replaceChildren();
  const text=document.createElement('p'); text.textContent=message; $('storage-alert').append(text);
  const retry=document.createElement('button');retry.className='button compact';retry.textContent=damaged?'Download original data':'Retry saving';
  retry.onclick=()=>damaged?download(rawBackup||'','tripon-recovery.json'):save();$('storage-alert').append(retry);
}
function save() {
  if(damaged){unsaved=true;showStorageError('Existing data could not be read. It has not been overwritten. Download it for recovery, or restore a valid backup below.');return false;}
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); unsaved=false; $('storage-alert').hidden=true; $('save-status').textContent='✓ Saved on this device'; return true; }
  catch { unsaved=true; $('save-status').textContent='Not saved — export a backup'; showStorageError('Saving failed. Your edits are only in memory. Export a backup now and check browser storage before closing.'); return false; }
}
function commit(message) { render(); const ok=save(); if(message)notify(ok?message:message+' Edits are not saved—export a backup.'); }
function render() {
  applyTheme(); const w=currentWeek(), i=data.weeks.findIndex(x=>x.id===w.id), p=progress(data);
  $('trip-heading').textContent=data.destination;document.title=`Tripon · ${data.destination}`;
  $('demo-banner').hidden=!data.demo;
  $('recorded-label').textContent=data.demo?'SAMPLE CONTRIBUTIONS · DEMO ONLY':'RECORDED CONTRIBUTIONS';
  $('trip-total').textContent=money(p.total);
  $('savings-caption').textContent=data.demo?'A preview of how your tracker works. No actual savings recorded.':'Every contribution brings you closer.';
  $('goal-button').innerHTML=`${data.goalCents?escape(money(data.goalCents)):'Set a goal'} <span aria-hidden="true">↗</span>`;
  $('remaining').textContent=data.goalCents?(p.remaining?`${money(p.remaining)} remaining`:'Goal reached — your adventure is closer!'):'Give your next adventure a number.';
  $('progress-copy').textContent=data.demo?'Sample progress only':data.goalCents?'A little closer to your next adventure':'Set a target to track your progress';
  $('progress-percent').textContent=data.goalCents?`${p.percent.toFixed(1)}%`:'—';$('goal-progress').value=p.percent;
  $('week-select').innerHTML=data.weeks.map((x,n)=>`<option value="${escape(x.id)}" ${x.id===w.id?'selected':''}>Week ${n+1} · ${dateLabel(x.start)} – ${dateLabel(x.end,true)}</option>`).join('');
  $('prev-week').disabled=i===0;$('next-week').disabled=i===data.weeks.length-1;$('delete-week').disabled=data.weeks.length===1;
  $('delete-week').title=data.weeks.length===1?'Keep at least one week':'Delete selected week';
  $('table-caption').textContent=`${data.demo?'Sample ':''}Week ${i+1}, ${dateLabel(w.start,true)} to ${dateLabel(w.end,true)} daily contributions in Philippine pesos`;
  $('table-head').innerHTML=`<tr><th scope="col">Name</th>${Array.from({length:5},(_,n)=>`<th scope="col">Day ${n+1}<span>${dateLabel(addDays(w.start,n))}</span></th>`).join('')}<th scope="col">Weekly total</th></tr>`;
  $('table-body').innerHTML=data.people.map(person=>`<tr><th scope="row"><button class="name-button" data-person="${person.id}" aria-label="Manage ${escape(person.name)}"><span class="avatar" aria-hidden="true">${escape(person.name[0].toUpperCase())}</span><span class="person-name">${escape(person.name)}</span></button></th>${Array.from({length:5},(_,n)=>{const value=w.entries[person.id]?.[n];return `<td><button class="amount-button ${value===undefined?'blank':''}" data-entry="${person.id}" data-day="${n}" aria-label="${escape(person.name)}, Day ${n+1}, ${dateLabel(addDays(w.start,n))}, ${escape(money(value||0))}${value===undefined?', not entered':''}">${value===undefined?'—':escape(money(value))}</button></td>`;}).join('')}<td>${escape(money(personWeek(w,person.id)))}</td></tr>`).join('')||'<tr><td colspan="7" class="empty-state">Add your first person to start saving together.</td></tr>';
  $('table-foot').innerHTML=`<tr><th scope="row">${data.demo?'Sample total':'Group total'}</th>${Array.from({length:5},(_,n)=>`<td>${money(data.people.reduce((sum,person)=>sum+(w.entries[person.id]?.[n]||0),0))}</td>`).join('')}<td>${money(weekTotal(data,w))}</td></tr>`;
  $('people-totals').innerHTML=data.people.map(person=>`<div class="person-summary"><span class="avatar" aria-hidden="true">${escape(person.name[0].toUpperCase())}</span><div class="summary-name">${escape(person.name)}<small>${data.weeks.length} ${data.weeks.length===1?'week':'weeks'}${data.demo?' · sample data':''}</small></div><strong>${money(personTotal(data,person.id))}</strong></div>`).join('')||'<p class="empty-state">Your crew will appear here.</p>';
}
function currentWeek(){return data.weeks.find(w=>w.id===data.selectedWeekId)||data.weeks[0];}
const modal=$('modal');
function close(){modal.close();}
function openDialog(title,copy,body,setup){
  if(modal.open)modal.close();
  $('modal-content').innerHTML=`<div class="dialog-top"><h2 id="modal-title">${escape(title)}</h2><button class="icon-button" id="close-modal" aria-label="Close dialog">×</button></div>${copy?`<p class="dialog-copy">${escape(copy)}</p>`:''}${body}`;
  $('close-modal').onclick=close;modal.showModal();setup?.();
  const field=modal.querySelector('input:not([readonly])');if(field){field.focus();if(field.type!=='date')field.select();}
}
function formDialog(title,copy,fields,onSubmit,extra=''){
  openDialog(title,copy,`<form id="editor">${fields}<p class="form-error" id="form-error" role="alert"></p><div class="form-actions">${extra}<button class="button" type="button" id="cancel-edit">Cancel</button><button class="button primary" type="submit">Save changes</button></div></form>`,()=>{
    $('cancel-edit').onclick=close;
    $('editor').onsubmit=e=>{e.preventDefault();try{onSubmit(new FormData(e.target));}catch(err){$('form-error').textContent=err.message;}};
  });
}
function confirmDialog(title,copy,action,label='Delete',danger=true){
  openDialog(title,copy,`<div class="form-actions"><button class="button" id="cancel-confirm">Cancel</button><button class="button ${danger?'destructive':'primary'}" id="do-confirm">${escape(label)}</button></div>`,()=>{$('cancel-confirm').onclick=close;$('do-confirm').onclick=()=>{action();};});
}
function welcome(){
  openDialog('Your next trip starts here','',`<img class="welcome-mark" src="./assets/icon.svg" alt="Tripon travel savings icon"><p class="welcome-title">Save a little.<br>Go together.</p><p class="dialog-copy">Keep your crew’s travel contributions in one simple place. Start with David, Vince, Deniele, and Kian — you can edit everyone.</p><div class="welcome-buttons"><button id="start-empty" class="button primary">Start empty tracker →</button><button id="start-demo" class="button">Explore demo · ₱10 per day</button></div><p class="external-note">Saved only on this device. No accounts, automatic syncing, or money transfers.</p>`,()=>{
    $('start-empty').onclick=()=>{data=newTracker();close();commit('Your empty tracker is ready.');};
    $('start-demo').onclick=()=>{data=newTracker(true);close();commit('Demo mode — sample contributions only.');};
  });
}
function tripSettings(){formDialog('The next adventure','Set the destination and a target. Your target is separate from recorded contributions.',`<label class="field">Trip destination<input name="destination" value="${escape(data.destination)}" maxlength="80" required></label><label class="field">Savings goal (₱)<input name="goal" inputmode="decimal" value="${(data.goalCents/100).toFixed(2)}" required><small>Enter 0 to leave the goal unset. Up to two decimal places.</small></label>`,f=>{
  const destination=f.get('destination').trim();if(!destination)throw new Error('Enter a destination.');const goalCents=amount(f.get('goal'));
  data.destination=destination;data.goalCents=goalCents;close();commit('Trip settings saved.');
});}
function editContribution(personId,day){const person=data.people.find(p=>p.id===personId),w=currentWeek();formDialog(`${person.name} · Day ${day+1}`,`${dateLabel(addDays(w.start,day),true)}${data.demo?' · Sample contribution':''}`,`<label class="field">Contribution (₱)<input name="value" inputmode="decimal" value="${((w.entries[personId]?.[day]||0)/100).toFixed(2)}" required><small>Zero or a positive amount, with up to two decimal places.</small></label>`,f=>{const value=amount(f.get('value'));w.entries[personId]||=Array(5).fill(0);w.entries[personId][day]=value;close();commit();notify(data.demo?'Sample contribution updated.':'Contribution recorded.');});}
function personEditor(id){const person=data.people.find(p=>p.id===id);if(!person&&data.people.length>=200){notify('This tracker supports up to 200 people.');return;}
  formDialog(person?'Manage person':'Add to the crew','People appear in every week. Each week keeps its own contributions.',`<label class="field">Name<input name="name" value="${escape(person?.name||'')}" maxlength="60" required autocomplete="off"></label>`,f=>{const name=f.get('name').trim();if(!name)throw new Error('Enter a name.');if(person)person.name=name;else data.people.push({id:uid(),name});close();commit(person?'Name updated.':'Person added to all weeks.');},person?'<button type="button" class="text-button destructive" id="remove-person">Remove person</button>':'');
  if(person)$('remove-person').onclick=()=>confirmDialog(`Remove ${person.name}?`,`This permanently removes ${person.name} and their ${money(personTotal(data,id))} ${data.demo?'sample ':''}contributions from every week. Weekly and trip totals will decrease. Export a backup first if you may need them.`,()=>{deletePerson(data,id);close();commit('Person and their contributions removed.');},'Remove person');
}
function weekEditor(isNew){if(isNew&&data.weeks.length>=1000){notify('This tracker supports up to 1,000 weeks.');return;}const w=isNew?blankWeek(addDays(currentWeek().end,1)):currentWeek();
  formDialog(isNew?'A fresh week':'Edit week dates','Each week has five consecutive contribution days. Changing dates keeps its contributions on Day 1 through Day 5.',`<label class="field">First day<input type="date" name="start" id="week-start" min="1900-01-01" max="9998-12-27" value="${w.start}" required></label><label class="field">Last day<input type="date" id="week-end" value="${w.end}" readonly><small>Calculated as Day 5, four calendar days after the first day.</small></label>`,f=>{const start=f.get('start');if(!start||start<'1900-01-01'||start>'9998-12-27')throw new Error('Select a valid start date.');w.start=start;w.end=addDays(start,4);if(isNew){data.weeks.push(w);data.selectedWeekId=w.id;}close();commit(isNew?'New week created.':'Week dates updated.');});
  $('week-start').oninput=()=>{try{$('week-end').value=addDays($('week-start').value,4);}catch{$('week-end').value='';}};
}
function download(text,filename){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportBackup(){download(JSON.stringify(data,null,2),`tripon-${data.demo?'DEMO-':''}${localDate()}.json`);notify('Backup exported. Keep the JSON file somewhere safe.');}
async function importBackup(file){if(!file)return;try{if(file.size>5*1024*1024)throw new Error('Backup is too large (maximum 5 MB).');const candidate=validateData(JSON.parse(await file.text()));confirmDialog('Restore this backup?',`Replace this device’s current tracker with ${candidate.destination}: ${candidate.people.length} people, ${candidate.weeks.length} weeks, and ${money(tripTotal(candidate))}${candidate.demo?' in SAMPLE contributions':''}. This also replaces the goal and appearance. Export your current data first if needed.`,()=>{data=candidate;damaged=false;close();commit('Backup restored.');},'Replace and restore',false);}catch(err){openDialog('Backup not restored',err instanceof SyntaxError?'This file is not valid JSON. Select an unmodified Tripon JSON backup.':err.message,'<div class="form-actions"><button id="dismiss-import" class="button">Close</button></div>',()=>{$('dismiss-import').onclick=close;});}finally{$('import-file').value='';}}
function installation(){const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;openDialog(standalone?'Tripon is installed':'Take Tripon with you',standalone?'You are already using Tripon as an installed app.':'Install from Chrome on Android for a home screen shortcut and a standalone app.',`<ol class="install-steps"><li>Open this app’s HTTPS link in <strong>Chrome</strong>.</li><li>Tap Chrome’s <strong>⋮ menu</strong>, then <strong>Add to home screen</strong> or <strong>Install app</strong>.</li><li>Confirm <strong>Install</strong>. Open Tripon from its new icon.</li></ol><p class="external-note">Wait for “Offline ready” below before going offline. Installation keeps this browser’s records; another device starts with its own tracker. Export a backup to move records.</p><p id="offline-detail" class="dialog-copy">${escape($('connection').textContent)}</p><div class="form-actions"><button id="install-close" class="button">Got it</button></div>`,()=>{$('install-close').onclick=close;});}
$('edit-trip').onclick=tripSettings;$('goal-button').onclick=tripSettings;
$('theme').onchange=e=>{data.theme=e.target.value;applyTheme();save();};matchMedia('(prefers-color-scheme:dark)').addEventListener('change',applyTheme);
$('add-person').onclick=()=>personEditor();$('add-week').onclick=()=>weekEditor(true);$('edit-week').onclick=()=>weekEditor(false);
$('table-body').onclick=e=>{const entry=e.target.closest('[data-entry]'),person=e.target.closest('[data-person]');if(entry)editContribution(entry.dataset.entry,Number(entry.dataset.day));else if(person)personEditor(person.dataset.person);};
function selectWeek(id){data.selectedWeekId=id;commit();}
$('week-select').onchange=e=>selectWeek(e.target.value);
for(const [id,delta] of [['prev-week',-1],['next-week',1]])$(id).onclick=()=>{const index=data.weeks.findIndex(w=>w.id===data.selectedWeekId);const next=data.weeks[index+delta];if(next)selectWeek(next.id);};
$('delete-week').onclick=()=>{if(data.weeks.length<=1)return;const w=currentWeek();confirmDialog('Delete this week?',`Permanently delete Week ${data.weeks.indexOf(w)+1} and its ${money(weekTotal(data,w))} ${data.demo?'sample ':''}contributions. All-time person totals and trip savings will decrease. Other weeks are kept. Export a backup first if needed.`,()=>{deleteWeek(data,w.id);close();commit('Week and its contributions deleted.');},'Delete week');};
$('exit-demo').onclick=()=>confirmDialog('Start your real tracker?','This clears all sample contributions and demo edits, and starts an empty tracker with the four starter names. Export the demo if you want to keep it.',()=>{const theme=data.theme;data=newTracker();data.theme=theme;close();commit('Empty tracker ready. Real contributions start at zero.');},'Start empty',false);
$('export').onclick=exportBackup;$('import').onclick=()=>$('import-file').click();$('import-file').onchange=e=>importBackup(e.target.files[0]);
$('install').onclick=async()=>{if(!installPrompt){installation();return;}try{await installPrompt.prompt();const choice=await installPrompt.userChoice;installPrompt=null;$('install').textContent='Install app ↗';if(choice.outcome==='accepted')notify('Installation requested. Check your home screen.');}catch{installPrompt=null;installation();}};
$('how-install').onclick=installation;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').textContent='Install app ↓';});window.addEventListener('appinstalled',()=>{installPrompt=null;$('install').textContent='App installed ✓';notify('Tripon installed. Ready for your next adventure.');});
window.addEventListener('beforeunload',e=>{if(unsaved){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key!==STORAGE_KEY)return;if(unsaved){showStorageError('Another tab changed this tracker. Your unsaved edits remain here. Export them before reopening the app.');return;}try{if(e.newValue){data=validateData(JSON.parse(e.newValue));close();render();notify('Tracker updated from another tab.');}}catch{notify('Another tab changed storage. Reopen to check your saved data.');}});
let offlineReady=false;
function connection(){ const message=!navigator.onLine?(offlineReady?'Offline · edits stay saved':'Offline · on this device'):offlineReady?'Offline ready':'Preparing offline…'; $('connection').textContent=message;$('offline-footer').textContent=message;if($('offline-detail'))$('offline-detail').textContent=message; }
window.addEventListener('online',connection);window.addEventListener('offline',connection);
render();if(damaged)showStorageError('Existing data could not be read and has not been overwritten. Download it for recovery, then restore a valid backup.');else if(firstVisit)welcome();
if('serviceWorker' in navigator){
  const markReady=()=>{offlineReady=true;connection();};
  navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='OFFLINE_READY')markReady();});
  navigator.serviceWorker.register('./sw.js').then(async registration=>{await navigator.serviceWorker.ready;const worker=registration.active||registration.waiting;worker?.postMessage({type:'CHECK_READY'});if(registration.waiting)notify('App update ready. Close all Tripon tabs and reopen to update.');registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)notify('Update downloaded. Close all Tripon tabs and reopen to update.');});});}).catch(()=>{$('connection').textContent='Offline setup failed';notify('Offline setup failed. Reconnect and refresh before going offline.');});
}else $('connection').textContent='Offline unavailable';
