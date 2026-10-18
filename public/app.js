import {workspaceFrom,newWorkspace,currentTrip,removeTrip} from './trips.js';
import {GroupSync,inviteFromHash} from './sync.js';
import {PROFILE_KEY,validateProfile,profileInitials,prepareProfilePhoto} from './profile.js';
import {parseAssistantCommand,previewContribution,applyContributionPreview,applyAssistantAction,personPeriodTotal,previewBatch,applyBatchPreview} from './assistant.js';
import {STORAGE_KEY, amount, money, newTracker, blankWeek, addDays, dateLabel, localDate, personWeek, personTotal, weekTotal, tripTotal, progress, uid, deletePerson, deleteWeek, validateData,paymentMethod,paymentLabel,setPaymentMethod} from './core.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paymentOptions(selected='unspecified',keep=false){const options=[...(keep?['keep']:[]),'unspecified','cash','gcash'];if(selected&&!options.includes(selected))options.push(selected);return options.map(value=>`<option value="${value}" ${selected===value?'selected':''}>${escape(value==='keep'?'Keep existing labels':paymentLabel(value))}</option>`).join('');}
function methodField(selected){return `<label class="field">Payment method<select id="assistant-method">${paymentOptions(selected||'keep',true)}</select><small>Labels only. This does not transfer money or verify a payment.</small></label>`;}
let profile=null;
try{const raw=localStorage.getItem(PROFILE_KEY);if(raw)profile=validateProfile(JSON.parse(raw));}catch{/* A damaged local profile never blocks savings records. */}
function profileAvatar(element,value=profile){
  element.replaceChildren();
  if(value?.photo){const image=document.createElement('img');image.src=value.photo;image.alt='';element.append(image);}else element.textContent=profileInitials(value?.name||'Traveler');
}
function renderProfile(){
  profileAvatar($('profile-icon'));profileAvatar($('settings-avatar'));
  $('profile-name').textContent=profile?.name||'Traveler';$('profile-open').setAttribute('aria-label',`Edit profile${profile?' for '+profile.name:''}`);
}
function storeProfile(value){const next=validateProfile(value);localStorage.setItem(PROFILE_KEY,JSON.stringify(next));profile=next;renderProfile();}
function profileFields(){return `<div class="profile-photo-row"><span id="profile-preview" class="profile-avatar large"></span><div><label class="field">Profile picture (optional)<input id="profile-file" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG or WebP, up to 8 MB. Stored only on this device.</small></label><button id="profile-remove-photo" class="text-button" type="button">Remove photo</button></div></div><label class="field">Display name<input id="profile-display-name" maxlength="60" value="${escape(profile?.name||'Traveler')}" autocomplete="nickname" required></label><p id="profile-error" class="form-error" role="alert"></p>`;}
function mountProfileFields(){
  let photo=profile?.photo||'',pending=false,photoRequest=0;const field=$('profile-file'),name=$('profile-display-name'),error=$('profile-error'),preview=$('profile-preview'),remove=$('profile-remove-photo');
  const draw=()=>{profileAvatar(preview,{name:name.value||'Traveler',photo});remove.hidden=!photo;};draw();name.oninput=draw;
  field.onchange=async()=>{const file=field.files[0];if(!file)return;const request=++photoRequest;pending=true;error.textContent='Preparing photo…';try{const result=await prepareProfilePhoto(file);if(request!==photoRequest||!field.isConnected)return;photo=result;error.textContent='';draw();}catch(e){if(field.isConnected&&request===photoRequest)error.textContent=e.message;}finally{if(request===photoRequest)pending=false;field.value='';}};
  remove.onclick=()=>{photoRequest++;pending=false;photo='';error.textContent='';draw();};
  return ()=>{if(pending)throw new Error('Please wait for the photo to finish loading.');return validateProfile({version:1,name:name.value,photo});};
}
function profileEditor(){
  openDialog('Your profile','This is a local profile, not a login. It does not change names in trip records or automatically sync your name/photo to other phones.',`<form id="profile-form">${profileFields()}<div class="form-actions"><button id="profile-cancel" type="button" class="button">Cancel</button><button type="submit" class="button primary">Save profile</button></div></form>`,()=>{
    const read=mountProfileFields();$('profile-cancel').onclick=close;$('profile-form').onsubmit=e=>{e.preventDefault();try{const value=read();try{storeProfile(value);}catch{throw new Error('Your profile could not be saved on this device. Check browser storage and try again.');}close();notify('Profile saved on this device.');}catch(error){$('profile-error').textContent=error.message;}};
  });
}
let sync, workspace;
let activePage='home';
function sizeApp(){const viewport=window.visualViewport;if(!viewport||viewport.scale===1)document.documentElement.style.setProperty('--app-height',`${Math.round(viewport?.height||window.innerHeight)}px`);}
sizeApp();window.addEventListener('resize',sizeApp);window.visualViewport?.addEventListener('resize',sizeApp);
function applyView(){
  document.body.dataset.page=activePage;
  document.querySelectorAll('[data-page-panel]').forEach(panel=>{panel.hidden=panel.dataset.pagePanel!==activePage||(panel.hasAttribute('data-needs-trip')&&!workspace.trips.length);});
  document.querySelectorAll('.bottom-nav [data-nav]').forEach(button=>{if(button.dataset.nav===activePage)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
}
function navigate(page){if(!['home','transactions','people','settings'].includes(page))return;activePage=page;applyView();document.querySelector('.page-scroll').scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true});}
document.addEventListener('click',event=>{const button=event.target.closest('[data-nav]');if(button)navigate(button.dataset.nav);});
let data, unsaved = false, damaged = false, rawBackup = null, toastTimer;
try { rawBackup = localStorage.getItem(STORAGE_KEY); if (rawBackup) {workspace=workspaceFrom(JSON.parse(rawBackup));data=currentTrip(workspace)||newTracker();} }
catch { damaged=true; }
const firstVisit=!workspace;
workspace ||= newWorkspace();
data=currentTrip(workspace)||newTracker();
function pack(){const id=workspace.selectedTripId;workspace.theme=data.theme;workspace.trips=workspace.trips.map(t=>t.id===id?{...data,id}:t);return workspace;}
function useWorkspace(incoming,preserve=true){const old=workspace;pack();const next=workspaceFrom(incoming);if(preserve){next.theme=old.theme;if(next.trips.some(t=>t.id===old.selectedTripId))next.selectedTripId=old.selectedTripId;for(const t of next.trips){const previous=old.trips.find(p=>p.id===t.id);if(previous&&t.weeks.some(w=>w.id===previous.selectedWeekId))t.selectedWeekId=previous.selectedWeekId;}}workspace=next;data=currentTrip(workspace)||newTracker();data.theme=workspace.theme;}
function applyTheme() { const dark=data.theme==='dark';data.theme=dark?'dark':'light';workspace.theme=data.theme;document.documentElement.dataset.theme=data.theme;$('theme').checked=dark;document.querySelector('meta[name="theme-color"]').content=dark?'#080c0b':'#f7f9f7'; }
function notify(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').hidden=false; toastTimer=setTimeout(()=>$('toast').hidden=true,4500); }
function showStorageError(message) {
  $('storage-alert').hidden=false; $('storage-alert').replaceChildren();
  const text=document.createElement('p'); text.textContent=message; $('storage-alert').append(text);
  const retry=document.createElement('button');retry.className='button compact';retry.textContent=damaged?'Download original data':'Retry saving';
  retry.onclick=()=>damaged?download(rawBackup||'','tripon-recovery.json'):save();$('storage-alert').append(retry);
}
function save() {
  if(damaged){unsaved=true;showStorageError('Existing data could not be read. It has not been overwritten. Download it for recovery, or restore a valid backup below.');return false;}
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(pack())); sync?.capture(workspace); unsaved=false; $('storage-alert').hidden=true; $('save-status').textContent='✓ Saved on this device'; return true; }
  catch { unsaved=true; $('save-status').textContent='Not saved — export a backup'; showStorageError('Saving failed. Your edits are only in memory. Export a backup now and check browser storage before closing.'); return false; }
}
function commit(message) { render(); const ok=save(); if(message)notify(ok?message:message+' Edits are not saved—export a backup.'); }
function render() {
  const hasTrips=workspace.trips.length>0;
  $('assistant-open').hidden=!hasTrips;
  $('trip-select').disabled=!hasTrips;$('edit-trip').hidden=!hasTrips;$('no-trips').hidden=hasTrips;for(const selector of ['.savings-panel','.tracker','.lower-grid'])document.querySelector(selector).hidden=!hasTrips;
  $('trip-select').innerHTML=workspace.trips.map(t=>`<option value="${escape(t.id)}" ${t.id===workspace.selectedTripId?'selected':''}>${escape(t.id===workspace.selectedTripId?data.destination:t.destination)}${(t.id===workspace.selectedTripId?data.demo:t.demo)?' · sample':''}</option>`).join('')||'<option>No trips yet</option>';
  applyTheme();renderProfile(); const w=currentWeek(), i=data.weeks.findIndex(x=>x.id===w.id), p=progress(data);
  $('trip-heading').textContent=hasTrips?data.destination:'No trips yet';document.querySelector('.intro-copy').textContent=hasTrips?'Group travel savings':'Add a trip to start recording contributions.';document.title=hasTrips?`Tripon · ${data.destination}`:'Tripon';
  $('demo-banner').hidden=!hasTrips||!data.demo;
  $('recorded-label').textContent=data.demo?'SAMPLE CONTRIBUTIONS · DEMO ONLY':'RECORDED CONTRIBUTIONS';
  $('trip-total').textContent=money(p.total);
  $('savings-caption').textContent=data.demo?'A preview of how your tracker works. No actual savings recorded.':'Total across all weeks.';
  $('savings-progress').hidden=!data.goalCents;
  $('progress-copy').textContent=data.demo?'Sample progress only':p.remaining?`${money(p.remaining)} remaining`:'Goal reached';
  $('progress-percent').textContent=data.goalCents?`${p.percent.toFixed(1)}%`:'—';$('goal-progress').value=p.percent;
  $('week-select').innerHTML=data.weeks.map((x,n)=>`<option value="${escape(x.id)}" ${x.id===w.id?'selected':''}>Week ${n+1} · ${dateLabel(x.start)} – ${dateLabel(x.end,true)}</option>`).join('');
$('delete-week').disabled=data.weeks.length===1;
  $('delete-week').title=data.weeks.length===1?'Keep at least one week':'Delete selected week';
  $('table-caption').textContent=`${data.demo?'Sample ':''}Week ${i+1}, ${dateLabel(w.start,true)} to ${dateLabel(w.end,true)} daily contributions in Philippine pesos`;
  $('table-head').innerHTML=`<tr><th scope="col">Name</th>${Array.from({length:5},(_,n)=>`<th scope="col">Day ${n+1}<span>${dateLabel(addDays(w.start,n))}</span></th>`).join('')}<th scope="col">Weekly total</th></tr>`;
  $('table-body').innerHTML=data.people.map(person=>`<tr><th scope="row"><button class="name-button" data-person="${person.id}" aria-label="Manage ${escape(person.name)}"><span class="avatar" aria-hidden="true">${escape(person.name[0].toUpperCase())}</span><span class="person-name">${escape(person.name)}</span></button></th>${Array.from({length:5},(_,n)=>{const value=w.entries[person.id]?.[n],method=paymentMethod(w,person.id,n);return `<td><button class="amount-button ${value===undefined?'blank':''}" data-entry="${person.id}" data-day="${n}" aria-label="${escape(person.name)}, Day ${n+1}, ${dateLabel(addDays(w.start,n))}, ${escape(money(value||0))}${value===undefined?', not entered':', '+escape(paymentLabel(method))}"><span>${value===undefined?'—':escape(money(value))}</span>${value!==undefined&&method!=='unspecified'?`<small class="payment-label" title="Payment method label; not a verified payment">${escape(paymentLabel(method))}</small>`:''}</button></td>`;}).join('')}<td>${escape(money(personWeek(w,person.id)))}</td></tr>`).join('')||'<tr><td colspan="7" class="empty-state">Add your first person to start saving together.</td></tr>';
  $('table-foot').innerHTML=`<tr><th scope="row">${data.demo?'Sample total':'Group total'}</th>${Array.from({length:5},(_,n)=>`<td>${money(data.people.reduce((sum,person)=>sum+(w.entries[person.id]?.[n]||0),0))}</td>`).join('')}<td>${money(weekTotal(data,w))}</td></tr>`;
  const period=$('totals-period').value,month=$('totals-month').value||localDate().slice(0,7);
  $('totals-month-field').hidden=period!=='month';
  const periodLabel=period==='week'?`Week ${i+1} · ${dateLabel(w.start)} – ${dateLabel(w.end,true)}`:period==='month'?`${month} · by contribution date`:'All weeks';
  $('totals-period-label').textContent=periodLabel;
  $('people-totals').innerHTML=data.people.map(person=>`<div class="person-summary"><span class="avatar" aria-hidden="true">${escape(person.name[0].toUpperCase())}</span><div class="summary-name">${escape(person.name)}<small>${data.demo?'Sample contributions':'Recorded contributions'}</small></div><strong>${money(personPeriodTotal(data,person.id,period==='week'?{weekId:w.id}:period==='month'?{month}:{}))}</strong></div>`).join('')||'<p class="empty-state">Your crew will appear here.</p>';
  applyView();
}
function currentWeek(){return data.weeks.find(w=>w.id===data.selectedWeekId)||data.weeks[0];}
const modal=$('modal');
let dialogOpener;
function resumeAfterDialog(){queueMicrotask(()=>{if(!modal.open){const target=dialogOpener?.isConnected&&!dialogOpener.closest('dialog')&&!dialogOpener.matches('.skip')?dialogOpener:$('main');target.focus({preventScroll:true});if(sync){sync.paused=false;void sync.flush();}}});}
function close(){modal.close();resumeAfterDialog();}
modal.addEventListener('cancel',resumeAfterDialog);
function openDialog(title,copy,body,setup){
  if(!modal.open)dialogOpener=document.activeElement;
  if(sync)sync.paused=true;
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
function contributionAssistant(initial=''){
  const tripId=workspace.selectedTripId;
  if(!tripId)return;
  const selected=currentWeek(),index=data.weeks.findIndex(w=>w.id===selected.id)+1;
  openDialog('Tripon assistant','Works offline using simple commands. Changes always need your confirmation.',`
    <div class="assistant-context">${escape(data.destination)} · Selected week ${index}<br><span>${escape(dateLabel(selected.start,true))} – ${escape(dateLabel(selected.end,true))}${data.demo?' · SAMPLE DATA':''}</span></div>
    <div class="assistant-message">Record contributions, add a person or next week, or ask for someone’s totals. “This week” means the selected week above; “this month” means the current calendar month. I only use this trip.</div>
    <form id="assistant-form"><label class="field" for="assistant-command">Your message<textarea id="assistant-command" rows="3" maxlength="500" required placeholder="David contributed 50 pesos this week, split equally">${escape(initial)}</textarea></label>
    <details class="assistant-examples"><summary>Example commands</summary><ul><li>David contributed 50 pesos this week via GCash</li><li>Azel gave 50 this week in cash</li><li>David gave 50 pesos for September 28 to October 2, 2026, split 10 each day</li><li>David, Azel, and Kian gave 50 today, split equally this week</li><li>Vince 10 each day week 1</li><li>Kian 25 on day 3</li><li>Add person Azel</li><li>Add next week</li><li>Add week starting October 05, 2026 to October 09, 2026</li><li>David 50 on 2026-09-28</li><li>How much does Azel payment total?</li><li>Show David total this week</li><li>Show David total month 2026-10</li></ul><p>Use a person’s full name. Weekly totals split across five days; extra centavos go to the earliest days. For multiple people, choose whether the amount is per person or shared between them. “Today, split equally this week” allocates the contribution to the selected week. The next week starts after the latest saved week. Totals are records, not verified payments.</p></details>
    <p id="assistant-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" id="assistant-cancel" class="button">Cancel</button><button type="submit" class="button primary">Preview changes</button></div></form>`,()=>{
    $('assistant-command').focus();$('assistant-cancel').onclick=close;
    $('assistant-form').onsubmit=e=>{e.preventDefault();try{if(workspace.selectedTripId!==tripId)throw new Error('The selected trip changed. Close and reopen the assistant.');const text=$('assistant-command').value,command=parseAssistantCommand(text,data);if(command.type==='contribution')assistantPreview(text,command,tripId);else if(command.type==='contribution-batch')assistantBatchPreview(text,command,tripId);else assistantActionPreview(text,command,tripId);}catch(error){$('assistant-error').textContent=error.message;}};
  });
}
function assistantBatchPreview(text,batch,tripId){
  const first=batch.commands[0],week=data.weeks.find(w=>w.id===first.weekId),hasExisting=batch.commands.some(c=>week.entries[c.personId]);
  openDialog('Preview group contributions','Choose how to allocate the amount, then review every person before saving.',`
    <p class="assistant-user">${escape(text)}</p><div class="assistant-context">${escape(data.destination)} · Week ${data.weeks.indexOf(week)+1}<br>${escape(dateLabel(week.start,true))} – ${escape(dateLabel(week.end,true))}${data.demo?' · SAMPLE DATA':''}</div>
    <label class="field">What does ${money(first.total)} mean?<select id="assistant-allocation"><option value="">Choose an allocation</option><option value="each">${money(first.total)} per person</option><option value="combined">${money(first.total)} combined for everyone listed</option></select></label>${methodField(first.method)}
    ${hasExisting?'<fieldset class="assistant-choice"><legend>Some people already have records. How should I apply this?</legend><label><input type="radio" name="assistant-mode" value="add"> Add to existing amounts</label><label><input type="radio" name="assistant-mode" value="replace"> Replace the requested days</label></fieldset>':''}
    <div id="assistant-preview" aria-live="polite"></div><p id="assistant-error" class="form-error" role="alert"></p><p class="small muted">${sync?.state?'Confirmed changes sync to your group. Offline edits queue until you reconnect.':'Confirmed changes save on this device.'} Every person must already exist. No money is transferred.</p>
    <div class="form-actions"><button id="assistant-back" class="button">Edit message</button><button id="assistant-confirm" class="button primary" disabled>Confirm &amp; save</button></div>`,()=>{
    let plan;
    const update=()=>{try{
      const method=$('assistant-method').value;plan=previewBatch(data,{...batch,commands:batch.commands.map(c=>({...c,method:method==='keep'?undefined:method}))},document.querySelector('input[name="assistant-mode"]:checked')?.value,$('assistant-allocation').value);
      $('assistant-confirm').disabled=plan.needsChoice;$('assistant-error').textContent='';
      if(plan.needsChoice){$('assistant-preview').innerHTML='<p class="assistant-message">Choose the allocation'+(hasExisting?' and Add or Replace':'')+' to see the amounts. No records have changed.</p>';return;}
      $('assistant-preview').innerHTML=plan.plans.map(p=>`<details class="batch-person" open><summary>${escape(p.command.personName)} · ${money(p.command.total)} ${plan.allocation==='each'?'per person':'share'}</summary><div class="assistant-preview-list"><div class="assistant-preview-head"><span>Day / date</span><span>Before</span><span>After</span></div>${p.after.map((value,day)=>`<div class="assistant-preview-row requested"><span>Day ${day+1}<small>${escape(dateLabel(addDays(p.command.start,day)))}</small></span><span>${money(p.before?.[day]||0)}</span><span><strong>${money(value)}</strong><small class="payment-label">${escape(paymentLabel(p.afterMethods[day]))}</small></span></div>`).join('')}</div><p class="small">Weekly total: ${money((p.before||[]).reduce((a,b)=>a+b,0))} → ${money(p.after.reduce((a,b)=>a+b,0))}</p></details>`).join('')+`<p class="assistant-total">Command total<strong>${money(plan.total)}</strong></p><p class="small muted">${plan.plans[0].mode==='add'?'Adding to existing entries.':'Replacing the requested days.'} Other people, weeks, and trips stay unchanged.</p>`;
    }catch(error){plan=null;$('assistant-confirm').disabled=true;$('assistant-error').textContent=error.message;}};
    $('assistant-allocation').onchange=update;$('assistant-method').onchange=update;document.querySelectorAll('input[name="assistant-mode"]').forEach(input=>input.onchange=update);
    $('assistant-back').onclick=()=>contributionAssistant(text);
    $('assistant-confirm').onclick=()=>{try{if(workspace.selectedTripId!==tripId)throw new Error('The selected trip changed. Preview your message again.');if(!plan||plan.needsChoice)return;applyBatchPreview(data,plan);data.selectedWeekId=first.weekId;close();commit('Group contributions saved.');navigate('transactions');}catch(error){$('assistant-error').textContent=error.message;$('assistant-confirm').disabled=true;}};update();
  });
}
function assistantActionPreview(text,action,tripId){
  const isQuery=action.type==='query',week=data.weeks.find(w=>w.id===(action.weekId||data.selectedWeekId)),month=action.month||localDate().slice(0,7);
  let body;
  if(isQuery){
    body=`<div class="assistant-context"><strong>${escape(action.personName)} · ${escape(data.destination)}</strong>${data.demo?' · SAMPLE DATA':''}</div><div class="assistant-answer"><p>All-time total<strong>${money(personPeriodTotal(data,action.personId))}</strong></p><p>Week ${data.weeks.indexOf(week)+1} · ${escape(dateLabel(week.start))} – ${escape(dateLabel(week.end,true))}<strong>${money(personPeriodTotal(data,action.personId,{weekId:week.id}))}</strong></p><p>Month ${escape(month)}<strong>${money(personPeriodTotal(data,action.personId,{month}))}</strong></p></div><p class="small muted">Monthly totals use the date of each daily entry across all weeks. This answer does not change any records.</p>`;
  }else{
    body=`<div class="assistant-context"><strong>${escape(data.destination)}${data.demo?' · SAMPLE DATA':''}</strong></div><div class="assistant-message">${action.type==='person-add'?`Add <strong>${escape(action.name)}</strong> to this trip with no contributions. Existing people and amounts stay unchanged.`:`Create <strong>Week ${data.weeks.length+1}</strong>: ${escape(dateLabel(action.start,true))} – ${escape(dateLabel(action.end,true))}, with no contributions. Existing people are available in the new week. Other weeks stay unchanged.`}</div><p class="small muted">${sync?.state?'This change syncs to everyone in your group when online.':'This change saves on this device.'} Other trips stay unchanged.</p>`;
  }
  openDialog(isQuery?'Recorded contribution totals':'Preview changes','',`<p class="assistant-user">${escape(text)}</p>${body}<p id="assistant-error" class="form-error" role="alert"></p><div class="form-actions"><button id="assistant-back" class="button">${isQuery?'Ask another':'Edit message'}</button><button id="assistant-confirm" class="button primary">${isQuery?'Done':'Confirm &amp; save'}</button></div>`,()=>{
    $('assistant-back').onclick=()=>contributionAssistant(isQuery?'':text);
    $('assistant-confirm').onclick=()=>{if(isQuery){close();return;}try{if(workspace.selectedTripId!==tripId)throw new Error('The selected trip changed. Enter your command again.');applyAssistantAction(data,action);$('assistant-confirm').disabled=true;close();commit(action.type==='person-add'?'Person added.':'New week created.');navigate(action.type==='person-add'?'people':'transactions');}catch(error){$('assistant-error').textContent=error.message;$('assistant-confirm').disabled=true;}};
  });
}
function assistantPreview(text,command,tripId){
  const initial=previewContribution(data,command),weekIndex=data.weeks.findIndex(w=>w.id===command.weekId)+1;
  openDialog('Preview contributions','Review every daily amount before saving.',`
    <p class="assistant-user">${escape(text)}</p><div class="assistant-context"><strong>${escape(command.personName)} · ${escape(data.destination)}</strong><br>Week ${weekIndex} · ${escape(dateLabel(command.start,true))} – ${escape(dateLabel(command.end,true))}${data.demo?'<br><strong>Sample contributions only</strong>':''}</div>
    ${methodField(command.method)}${initial.hasExisting?'<fieldset class="assistant-choice"><legend>This person already has records this week. How should I apply this?</legend><label><input type="radio" name="assistant-mode" value="add"> Add to existing amounts</label><label><input type="radio" name="assistant-mode" value="replace"> Replace the requested days</label></fieldset>':''}
    <div id="assistant-preview" aria-live="polite"></div><p id="assistant-error" class="form-error" role="alert"></p>
    <p class="small muted">${sync?.state?'Confirmed changes sync to your group. Offline changes queue until you reconnect.':'Confirmed changes save on this device.'} This records contributions; it does not move or verify money.</p>
    <div class="form-actions"><button id="assistant-back" class="button">Edit message</button><button id="assistant-confirm" class="button primary" disabled>Confirm &amp; save</button></div>`,()=>{
      let plan;
      const update=()=>{try{
        const method=$('assistant-method').value;command={...command,method:method==='keep'?undefined:method};plan=previewContribution(data,command,document.querySelector('input[name="assistant-mode"]:checked')?.value);
        $('assistant-error').textContent='';$('assistant-confirm').disabled=plan.needsChoice;
        if(plan.needsChoice){$('assistant-preview').innerHTML='<p class="assistant-message">Choose Add or Replace to see the updated amounts. Your records have not changed.</p>';return;}
        const beforeTotal=(plan.before||[]).reduce((a,b)=>a+b,0),afterTotal=plan.after.reduce((a,b)=>a+b,0);
        $('assistant-preview').innerHTML=`<div class="assistant-preview-list"><div class="assistant-preview-head"><span>Day / date</span><span>Before</span><span>After</span></div>${plan.after.map((value,day)=>`<div class="assistant-preview-row ${command.days.includes(day)?'requested':''}"><span>Day ${day+1}<small>${escape(dateLabel(addDays(command.start,day)))}</small></span><span>${money(plan.before?.[day]||0)}</span><span><strong>${money(value)}</strong><small class="payment-label">${escape(paymentLabel(plan.afterMethods[day]))}</small></span></div>`).join('')}</div><p class="assistant-total">${escape(command.personName)}’s weekly total <strong>${money(beforeTotal)} → ${money(afterTotal)}</strong></p><p class="small muted">${plan.mode==='add'?'Adding to':'Replacing'} ${command.days.length===5?'all five days':'Day '+(command.days[0]+1)}. Other people, weeks, and trips stay unchanged.</p>`;
      }catch(error){plan=null;$('assistant-confirm').disabled=true;$('assistant-error').textContent=error.message;}};
      document.querySelectorAll('input[name="assistant-mode"]').forEach(input=>input.onchange=update);
      $('assistant-method').onchange=update;
      $('assistant-back').onclick=()=>contributionAssistant(text);
      $('assistant-confirm').onclick=()=>{try{if(workspace.selectedTripId!==tripId)throw new Error('The selected trip changed. Preview your command again.');if(!plan||plan.needsChoice)return;applyContributionPreview(data,plan);$('assistant-confirm').disabled=true;close();commit(data.demo?'Sample contributions saved.':'Contributions saved.');}catch(error){$('assistant-error').textContent=error.message;$('assistant-confirm').disabled=true;}};
      update();
    });
}
$('assistant-open').onclick=()=>contributionAssistant();
function welcome(){
  openDialog('Welcome to Tripon','',`<p class="welcome-title">Make yourself at home.</p><p class="dialog-copy">Choose a display name and optional photo. Your profile stays on this device; there is no login. You can edit it later using the profile icon.</p>${!profile?profileFields():''}<div class="welcome-buttons"><button id="start-empty" class="button primary">Start empty tracker →</button><button id="start-demo" class="button">Explore demo · ₱10 per day</button></div><p class="external-note">Starter names: David, Vince, Deniele and Kian. Share a group invite link to sync trip records; profile details are not shared.</p>`,()=>{
    const read=!profile?mountProfileFields():null;
    const start=demo=>{try{if(read){const value=read();try{storeProfile(value);}catch{throw new Error('Profile could not be saved. Check browser storage and try again.');}}data=newTracker(demo);close();commit(demo?'Demo mode — sample contributions only.':'Your empty tracker is ready.');}catch(error){if($('profile-error'))$('profile-error').textContent=error.message;}};
    $('start-empty').onclick=()=>start(false);$('start-demo').onclick=()=>start(true);
  });
}
function tripSettings(){formDialog('Trip settings','Set the destination and a target. Your target is separate from recorded contributions.',`<label class="field">Trip destination<input name="destination" value="${escape(data.destination)}" maxlength="80" required></label><label class="field">Savings goal (₱)<input name="goal" inputmode="decimal" value="${(data.goalCents/100).toFixed(2)}" required><small>Enter 0 to leave the goal unset. Up to two decimal places.</small></label>`,f=>{
  const destination=f.get('destination').trim();if(!destination)throw new Error('Enter a destination.');const goalCents=amount(f.get('goal'));
  data.destination=destination;data.goalCents=goalCents;close();commit('Trip settings saved.');
},'<button type="button" class="text-button destructive" id="delete-trip">Delete Trip</button>');
$('delete-trip').onclick=()=>{
  const tripId=workspace.selectedTripId,trip=data;
  confirmDialog(`Delete ${trip.destination}?`,`Permanently remove this trip’s savings goal, ${trip.people.length} people, ${trip.weeks.length} weeks, and ${money(tripTotal(trip))}${trip.demo?' in sample contributions':' in recorded contributions'}${sync?.state?' for everyone in this group':''}. Other trips and their records are kept. This cannot be undone without a backup. Export a backup before deleting if needed.`,()=>{
    pack();removeTrip(workspace,tripId);data=currentTrip(workspace)||newTracker();data.theme=workspace.theme;close();commit('Trip deleted. Other trips are unchanged.');
  },'Delete Trip');
};}
function editContribution(personId,day){const person=data.people.find(p=>p.id===personId),w=currentWeek();formDialog(`${person.name} · Day ${day+1}`,`${dateLabel(addDays(w.start,day),true)}${data.demo?' · Sample contribution':''}`,`<label class="field">Contribution (₱)<input name="value" inputmode="decimal" value="${((w.entries[personId]?.[day]||0)/100).toFixed(2)}" required><small>Zero or a positive amount, with up to two decimal places.</small></label><label class="field">Payment method<select name="method">${paymentOptions(paymentMethod(w,personId,day))}</select><small>Cash or GCash is a record label, not payment verification. Combined labels do not specify how much came through each method.</small></label>`,f=>{const value=amount(f.get('value'));w.entries[personId]||=Array(5).fill(0);w.entries[personId][day]=value;setPaymentMethod(w,personId,day,f.get('method'));close();commit();notify(data.demo?'Sample contribution updated.':'Contribution recorded.');});}
function personEditor(id){const person=data.people.find(p=>p.id===id);if(!person&&data.people.length>=200){notify('This tracker supports up to 200 people.');return;}
  formDialog(person?'Manage person':'Add to the crew','People appear in every week. Each week keeps its own contributions.',`<label class="field">Name<input name="name" value="${escape(person?.name||'')}" maxlength="60" required autocomplete="off"></label>`,f=>{const name=f.get('name').trim();if(!name)throw new Error('Enter a name.');if(person)person.name=name;else data.people.push({id:uid(),name});close();commit(person?'Name updated.':'Person added to all weeks.');},person?'<button type="button" class="text-button destructive" id="remove-person">Remove person</button>':'');
  if(person)$('remove-person').onclick=()=>confirmDialog(`Remove ${person.name}?`,`This permanently removes ${person.name} and their ${money(personTotal(data,id))} ${data.demo?'sample ':''}contributions from every week${sync?.state?' for everyone in this group':''}. Weekly and trip totals will decrease. Export a backup first if you may need them.`,()=>{deletePerson(data,id);close();commit('Person and their contributions removed.');},'Remove person');
}
function weekEditor(isNew){if(isNew&&data.weeks.length>=1000){notify('This tracker supports up to 1,000 weeks.');return;}const w=isNew?blankWeek(addDays(currentWeek().end,1)):currentWeek();
  formDialog(isNew?'New week':'Edit week dates','Each week has five consecutive contribution days. Changing dates keeps its contributions on Day 1 through Day 5.',`<label class="field">First day<input type="date" name="start" id="week-start" min="1900-01-01" max="9998-12-27" value="${w.start}" required></label><label class="field">Last day<input type="date" id="week-end" value="${w.end}" readonly><small>Calculated as Day 5, four calendar days after the first day.</small></label>`,f=>{const start=f.get('start');if(!start||start<'1900-01-01'||start>'9998-12-27')throw new Error('Select a valid start date.');w.start=start;w.end=addDays(start,4);if(isNew){data.weeks.push(w);data.selectedWeekId=w.id;}close();commit(isNew?'New week created.':'Week dates updated.');});
  $('week-start').oninput=()=>{try{$('week-end').value=addDays($('week-start').value,4);}catch{$('week-end').value='';}};
}
function download(text,filename){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportBackup(){download(JSON.stringify(pack(),null,2),`tripon-all-trips-${data.demo?'DEMO-':''}${localDate()}.json`);notify('Backup exported. Keep the JSON file somewhere safe.');}
async function importBackup(file){if(!file)return;try{if(file.size>5*1024*1024)throw new Error('Backup is too large (maximum 5 MB).');const raw=JSON.parse(await file.text()),multiple=raw.version===2,candidate=multiple?workspaceFrom(raw):validateData(raw);confirmDialog('Restore this backup?',`Replace ${multiple?'all trips':'the selected trip'} ${sync?.state?'in the shared group’s records for everyone':'on this device'} with ${multiple?candidate.trips.length+' trips':candidate.destination+' · '+candidate.people.length+' people · '+money(tripTotal(candidate))}. Other trips are ${multiple?'replaced too':'kept'}. Appearance is restored on this device. Export a backup first if needed.`,()=>{if(multiple)useWorkspace(candidate,false);else{data=candidate;pack();}damaged=false;close();commit('Backup restored.');},'Replace and restore',false);}catch(err){openDialog('Backup not restored',err instanceof SyntaxError?'This file is not valid JSON. Select an unmodified Tripon JSON backup.':err.message,'<div class="form-actions"><button id="dismiss-import" class="button">Close</button></div>',()=>{$('dismiss-import').onclick=close;});}finally{$('import-file').value='';}}
function installation(){const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;openDialog(standalone?'Tripon is installed':'Take Tripon with you',standalone?'You are already using Tripon as an installed app.':'Install from Chrome on Android for a home screen shortcut and a standalone app.',`<ol class="install-steps"><li>Open this app’s HTTPS link in <strong>Chrome</strong>.</li><li>Tap Chrome’s <strong>⋮ menu</strong>, then <strong>Add to home screen</strong> or <strong>Install app</strong>.</li><li>Confirm <strong>Install</strong>. Open Tripon from its new icon.</li></ol><p class="external-note">Wait for “Offline ready” below before going offline. Open the same group invite link on every phone to sync records. Offline edits sync when you reconnect. Keep an exported backup too.</p><p id="offline-detail" class="dialog-copy">${escape($('connection').textContent)}</p><div class="form-actions"><button id="install-close" class="button">Got it</button></div>`,()=>{$('install-close').onclick=close;});}
$('edit-trip').onclick=tripSettings;
$('profile-open').onclick=profileEditor;$('profile-edit').onclick=profileEditor;
$('theme').onchange=e=>{data.theme=e.target.checked?'dark':'light';applyTheme();save();};
$('how-install').onclick=installation;
$('totals-month').value=localDate().slice(0,7);
$('totals-period').onchange=render;
$('totals-month').onchange=()=>{if(!$('totals-month').value)$('totals-month').value=localDate().slice(0,7);render();};
$('add-person').onclick=()=>personEditor();$('add-week').onclick=()=>weekEditor(true);$('edit-week').onclick=()=>weekEditor(false);
$('table-body').onclick=e=>{const entry=e.target.closest('[data-entry]'),person=e.target.closest('[data-person]');if(entry)editContribution(entry.dataset.entry,Number(entry.dataset.day));else if(person)personEditor(person.dataset.person);};
function selectWeek(id){data.selectedWeekId=id;commit();}
$('week-select').onchange=e=>selectWeek(e.target.value);
$('delete-week').onclick=()=>{if(data.weeks.length<=1)return;const w=currentWeek();confirmDialog('Delete this week?',`Permanently delete Week ${data.weeks.indexOf(w)+1} and its ${money(weekTotal(data,w))} ${data.demo?'sample ':''}contributions. All-time person totals and trip savings will decrease. ${sync?.state?'This deletes the week for everyone in the group. ':''}Other weeks are kept. Export a backup first if needed.`,()=>{deleteWeek(data,w.id);close();commit('Week and its contributions deleted.');},'Delete week');};
$('exit-demo').onclick=()=>confirmDialog('Start your real tracker?','This clears the selected trip’s sample contributions and demo edits, and starts it empty with the four starter names. Other trips are kept. Export the demo if you want to keep it.',()=>{const theme=data.theme;data=newTracker();data.theme=theme;close();commit('Empty tracker ready. Real contributions start at zero.');},'Start empty',false);
$('export').onclick=exportBackup;$('import').onclick=()=>$('import-file').click();$('import-file').onchange=e=>importBackup(e.target.files[0]);

window.addEventListener('beforeunload',e=>{if(unsaved){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key!==STORAGE_KEY||sync?.state)return;if(unsaved){showStorageError('Another tab changed this tracker. Your unsaved edits remain here. Export them before reopening the app.');return;}try{if(e.newValue){useWorkspace(JSON.parse(e.newValue),false);close();render();notify('Tracker updated from another tab.');}}catch{notify('Another tab changed storage. Reopen to check your saved data.');}});
let offlineReady=false;
function connection(){ const message=!navigator.onLine?(offlineReady?'Offline · edits stay saved':'Offline · on this device'):offlineReady?'Offline ready':'Preparing offline…'; $('connection').textContent=message;$('offline-footer').textContent=message;if($('offline-detail'))$('offline-detail').textContent=message; }
window.addEventListener('online',connection);window.addEventListener('offline',connection);
sync=new GroupSync({getData:()=>pack(),onData:incoming=>{useWorkspace(incoming);render();save();},onStatus:state=>{
  $('group-title').textContent=state.joined?'Shared group':'Only this device';$('sync-status').textContent=state.joined?state.text:'Create a group to sync across phones.';$('share-group').textContent=state.joined?'Invite link':'Share group';$('join-group').hidden=state.joined;$('review-sync').hidden=!state.conflict;
  $('storage-copy').textContent=state.joined?'This tracker is shared with everyone who has the invite link. Offline edits are queued on this device until they sync. Export backups regularly.':'Records are saved on this device. Create or join a shared group to sync across phones.';
}});
render();sync.start();if(damaged)showStorageError('Existing data could not be read and has not been overwritten. Download it for recovery, then restore a valid backup.');else if(inviteFromHash())void openInvite(inviteFromHash());else if(firstVisit)welcome();
if('serviceWorker' in navigator){
  const markReady=()=>{offlineReady=true;connection();};
  navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='OFFLINE_READY')markReady();});
  navigator.serviceWorker.register('./sw.js').then(async registration=>{await navigator.serviceWorker.ready;const worker=registration.active||registration.waiting;worker?.postMessage({type:'CHECK_READY'});if(registration.waiting)notify('App update ready. Close all Tripon tabs and reopen to update.');registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)notify('Update downloaded. Close all Tripon tabs and reopen to update.');});});}).catch(()=>{$('connection').textContent='Offline setup failed';notify('Offline setup failed. Reconnect and refresh before going offline.');});
}else $('connection').textContent='Offline unavailable';

function shareDialog(){
  const link=sync.link();
  openDialog('Group invite link','Anyone with this link can view and edit this group. Share it only with your travel group. No account is needed.',`<label class="field">Invite link<input class="invite-field" id="invite-link" readonly value="${escape(link)}"></label><div class="form-actions"><button class="button destructive" id="leave-group">Leave on this device</button><button class="button primary" id="copy-invite">Copy link</button></div><p class="group-note">Other phones must open this exact invite link once. The public homepage alone does not join your group.</p>`,()=>{
    $('copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(link);notify('Invite link copied.');}catch{$('invite-link').focus();$('invite-link').select();notify('Select and copy the invite link.');}};
    $('leave-group').onclick=()=>confirmDialog('Leave this group on this device?',`The shared group remains available to everyone else. This phone will return to its previous personal tracker.${sync.state.queue.length?' You have unsynced edits. Leaving discards them on this device. Export a backup before continuing.':' Export a backup first if needed.'}`,()=>{try{const personal=sync.leave(true);useWorkspace(personal||newWorkspace(),false);close();commit('Returned to this device’s tracker.');}catch(error){notify(error.message);}},'Leave group',false);
  });
}
$('share-group').onclick=()=>{
  if(sync.state){shareDialog();return;}
  confirmDialog('Share this tracker?','Upload all trips, with their goals, people, weeks and contributions, to a shared group. Anyone with its private invite link can edit it. A copy of this device’s previous tracker is kept locally.',async()=>{const button=$('do-confirm');button.disabled=true;button.textContent='Creating…';try{await sync.create();shareDialog();}catch(error){button.disabled=false;button.textContent='Create shared group';notify(error.message);}},'Create shared group',false);
};
async function openInvite(credentials){
  try{const result=await sync.fetchInvite(credentials);if(sync.state?.id===credentials.id&&sync.state?.key===credentials.key){history.replaceState(null,'',location.pathname);notify('This device already belongs to the group.');return;}
    if(sync.state?.queue.length){notify('Sync or export pending edits before joining a different group.');return;}
    confirmDialog('Join this group?',`Open the shared group with ${workspaceFrom(result.data).trips.length} ${workspaceFrom(result.data).trips.length===1?'trip':'trips'}. Your current tracker is kept as a local personal copy. Everyone with this link can edit all trips in the group.`,()=>{try{sync.join(credentials,result);close();notify('Joined the group. Changes will sync across phones.');}catch(error){notify('Could not save group connection: '+error.message);}},'Join group',false);
  }catch(error){openDialog('Could not join group',navigator.onLine?error.message:'Connect to the internet to join a group for the first time.','<div class="form-actions"><button class="button" id="join-error-close">Close</button></div>',()=>{$('join-error-close').onclick=close;});}
}
$('join-group').onclick=()=>formDialog('Join a group','Paste the complete invite link from someone in your group. The link grants editing access.',`<label class="field">Group invite link<input name="invite" type="url" required placeholder="https://…/#group=…"></label>`,f=>{const url=new URL(f.get('invite'));if(![location.origin,'https://tripon-travel-savings.stonykiwi.chatgpt.site'].includes(url.origin))throw new Error('Use a group link from this Tripon site.');const match=url.hash.match(/^#group=([a-f0-9-]{36})\.([a-f0-9]{64})$/);if(!match)throw new Error('This is not a complete group invite link.');void openInvite({id:match[1],key:match[2]});});
$('review-sync').onclick=()=>{
  const conflicts=sync.conflict?.conflicts||[];
  openDialog('Review conflicting edits','Another phone changed the same records while you were editing. Your pending edits are still on this device. Export a backup if you want to keep a copy before choosing.',`<ul class="conflict-list">${conflicts.slice(0,10).map(c=>`<li>${escape(c.type==='contribution'?`Day ${c.day+1}: group ${money(c.current?.amount||0)} (${paymentLabel(c.current?.method||'unspecified')}), yours ${money(c.wanted?.amount||0)} (${paymentLabel(c.wanted?.method||'unspecified')})`:c.type==='entry'?`Day ${c.day+1}: group ${money(c.current||0)}, yours ${money(c.wanted||0)}`:c.type==='name'?'A person’s name changed.':c.type==='dates'?'A week’s dates changed.':c.type.includes('remove')?'Records you removed were changed by someone else.':'Trip or group records changed.')}</li>`).join('')||'<li>A trip, person or week used by your pending edits was removed. Your edits cannot be applied automatically.</li>'}</ul><div class="form-actions"><button class="button" id="conflict-export">Export my copy</button><button class="button" id="use-group">Use group records</button><button class="button primary" id="keep-mine">Keep my edits</button></div>`,()=>{
    $('conflict-export').onclick=exportBackup;
    $('use-group').onclick=()=>confirmDialog('Discard this device’s pending edits?','Your unsynced changes will be discarded and replaced with the current shared group records. Export them first if needed.',async()=>{try{await sync.resolve(false);close();}catch(error){notify(error.message);}},'Use group records',false);
    $('keep-mine').onclick=()=>confirmDialog('Apply your pending edits?','Overwrite the conflicting shared fields with your edits. Edits to other fields are kept. Deletions will remove those records for everyone. If a trip, person or week was removed, restore those records manually from a backup instead.',async()=>{close();sync.paused=false;await sync.resolve(true);},'Apply my edits',false);
  });
};

$('trip-select').onchange=e=>{pack();workspace.selectedTripId=e.target.value;data=currentTrip(workspace)||newTracker();data.theme=workspace.theme;commit();};
$('add-trip').onclick=()=>{
  if(workspace.trips.length>=50){notify('This group supports up to 50 trips.');return;}
  formDialog('Add trip','This trip gets its own people, weeks, contributions and savings goal. Shared groups sync it to everyone.',`<label class="field">Trip destination<input name="destination" maxlength="80" required placeholder="e.g. Siargao"></label><label class="field">Savings goal (₱)<input name="goal" inputmode="decimal" value="0.00" required></label>`,f=>{
    const destination=f.get('destination').trim();if(!destination)throw new Error('Enter a destination.');const goalCents=amount(f.get('goal'));
    pack();const trip={id:uid(),...newTracker()};trip.destination=destination;trip.goalCents=goalCents;trip.theme=workspace.theme;workspace.trips.push(trip);workspace.selectedTripId=trip.id;data=trip;close();commit('Trip added.');
  });
};
