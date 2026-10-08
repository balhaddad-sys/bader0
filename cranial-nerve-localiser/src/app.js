const SITES = [...SITES_A,...SITES_B];
const FINDING_BY_ID = new Map(FINDINGS.map(f=>[f.id,f]));
const ZONE_BY_ID = new Map(ZONES.map(z=>[z.id,z]));
const STORAGE_KEY = 'cranial-nerve-localiser.v1';
const $ = id=>document.getElementById(id);
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = {side:'right',findings:{},theme:'system'};
let activePreset=null, zoneFilter=null, visibleLimit=6, currentTab='localise', mobileView='examination', resultsOnScreen=false, toastTimer, liveTimer;
let examinationScroll=0, activeCategory='eyes', lastAction=null, activeCheckId=null;
let ranked=[];
let storageAvailable=true;
try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(saved && typeof saved==='object'){
    if(['right','left'].includes(saved.side))state.side=saved.side;
    if(['light','dark','system'].includes(saved.theme))state.theme=saved.theme;
    if(saved.findings && typeof saved.findings==='object')for(const f of FINDINGS){if(saved.findings[f.id]===1||saved.findings[f.id]===-1)state.findings[f.id]=saved.findings[f.id];}
  }
}catch{storageAvailable=false;}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}renderStorage();}
function renderStorage(){$('save-error').hidden=storageAvailable;$('storage-status').textContent=storageAvailable?'Saved on this device':'This session only';}
function label(f){return f.label.replaceAll('{s}',state.side).replaceAll('{o}',opposite()).replaceAll('{S}',state.side[0].toUpperCase()+state.side.slice(1));}
function opposite(){return state.side==='right'?'left':'right';}
function hint(f){return f.hint.replaceAll('{s}',state.side).replaceAll('{o}',opposite());}
function zoneName(id){const z=ZONE_BY_ID.get(id);return ['above','outside'].includes(z.level)?z.name:`${z.level[0].toUpperCase()+z.level.slice(1)} · ${z.name.toLowerCase()}`;}
function sideText(site){if(site.side==='ipsilateral')return `${state.side[0].toUpperCase()+state.side.slice(1)} · ipsilateral`;if(site.side==='contralateral'){const o=opposite();return `${o[0].toUpperCase()+o.slice(1)} · contralateral`;}return {midline:'Midline',bilateral:'Bilateral',none:'No fixed side'}[site.side];}
function scoreSite(site, findings=state.findings){
  let E=0,A=0,U=0,C=0,O=0,eligible=false;
  for(const [id,w] of Object.entries(site.w)){
    const status=findings[id]||0;
    if(status===1){E+=w;if(w>=2)eligible=true;}
    else if(status===-1)A+=w>=2?w:w*.5;
    else if(w>=2)U+=w*.25;
  }
  for(const id of site.ex){if(findings[id]===1)C+=3;else if(findings[id]===-1)E+=.5;}
  for(const f of FINDINGS){if(findings[f.id]===1&&!site.w[f.id])O+=f.soft?.5:1.5;}
  const denominator=E+A+U+C+O;
  return {site,E,A,U,C,O,fit:denominator?E/denominator:0,eligible};
}
function rankSites(findings=state.findings){return SITES.map(s=>scoreSite(s,findings)).filter(s=>s.eligible).sort((a,b)=>b.fit-a.fit||b.E-a.E||b.site.prior-a.site.prior);}
function examineNext(candidates=ranked.slice(0,4),findings=state.findings){
  if(candidates.length<2)return [];
  const range=values=>Math.max(...values)-Math.min(...values);
  return FINDINGS.filter(f=>!findings[f.id]&&candidates.some(c=>c.site.w[f.id]||c.site.ex.includes(f.id))).map(f=>{
    const p=candidates.map(c=>scoreSite(c.site,{...findings,[f.id]:1}).fit-c.fit);
    const a=candidates.map(c=>scoreSite(c.site,{...findings,[f.id]:-1}).fit-c.fit);
    return {finding:f,spread:Math.max(range(p),range(a))};
  }).filter(f=>f.spread>.08).sort((a,b)=>b.spread-a.spread).slice(0,5);
}
function announce(message){clearTimeout(liveTimer);liveTimer=setTimeout(()=>{$('live-status').textContent=message;},180);}
function dismissToast(){clearTimeout(toastTimer);$('toast').hidden=true;renderDock();}
function toast(message,undo=false){clearTimeout(toastTimer);$('toast-message').textContent=message;$('toast-undo').hidden=!undo;$('toast').hidden=false;renderDock();toastTimer=setTimeout(dismissToast,undo?6500:3600);}
function rememberAction(){lastAction={side:state.side,findings:{...state.findings},activePreset,zoneFilter};}
function undoLast(){if(!lastAction)return;state.side=lastAction.side;state.findings={...lastAction.findings};activePreset=lastAction.activePreset;zoneFilter=lastAction.zoneFilter;lastAction=null;visibleLimit=6;update();toast('Last change undone');(document.querySelector('dialog[open] .close-sheet')||$(`tab-${currentTab}`)).focus({preventScroll:true});announce('Last change undone. Your previous examination has been restored.');}
function openSheet(id){dismissToast();if(id==='review-sheet')$('marked-review').open=true;$(id).showModal();}
function openCheck(id){const f=FINDING_BY_ID.get(id);if(!f)return;activeCheckId=id;$('check-title').textContent=label(f);$('check-hint').textContent=hint(f);openSheet('check-sheet');}
function clearFindings(){if(!Object.keys(state.findings).length)return;rememberAction();state.findings={};activePreset=null;zoneFilter=null;visibleLimit=6;update();toast('All findings cleared',true);announce('All findings cleared. Undo is available.');}
function applyTheme(){document.documentElement.classList.add('theme-changing');if(state.theme==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=state.theme;$('theme').value=state.theme;void document.documentElement.offsetWidth;requestAnimationFrame(()=>document.documentElement.classList.remove('theme-changing'));}
function renderFindings(){
  for(const f of FINDINGS){
    const b=$(`finding-${f.id}`),v=state.findings[f.id]||0;
    const status=v===1?'present':v===-1?'absent':'untested';
    b.dataset.state=status;b.querySelector('.finding-label').textContent=label(f);b.querySelector('.state-mark').textContent=v===1?'✓':v===-1?'−':'';
    b.setAttribute('aria-label',`${label(f)}. ${v===1?'Present. Tap for tested normal':v===-1?'Absent, tested normal. Tap to clear':'Untested. Tap for present'}.`);
    b.setAttribute('title',hint(f));
  }
  document.querySelectorAll('[data-side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.side===state.side)));
  document.querySelectorAll('[data-preset]').forEach(b=>{const active=b.dataset.preset===activePreset;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const present=Object.values(state.findings).filter(v=>v===1).length,absent=Object.values(state.findings).filter(v=>v===-1).length;
  $('finding-count').innerHTML=present||absent?`<b>${present} present</b> <span class="separator">·</span> ${absent} tested normal`:'No findings marked';
  $('clear-all').disabled=!present&&!absent;
  for(const g of GROUPS){const selected=FINDINGS.filter(f=>f.group===g.id&&state.findings[f.id]).length;$(`counter-${g.id}`).textContent=selected?`${selected} marked`:'';}
  renderMarkedReview();filterFindings();
}
function renderMarkedReview(){
  const marked=FINDINGS.filter(f=>state.findings[f.id]);
  const present=marked.filter(f=>state.findings[f.id]===1).length;
  $('marked-review').hidden=!marked.length;
  $('marked-summary').textContent=`Review findings · ${present} present, ${marked.length-present} normal`;
  $('mobile-marked-count').textContent=marked.length?String(marked.length):'';
  $('review-count').textContent=marked.length;$('open-review').disabled=!marked.length;$('review-empty').hidden=marked.length>0;$('review-clear').disabled=!marked.length;
  $('review-results').hidden=!marked.length;$('result-pattern-count').textContent=`${present} present · ${marked.length-present} normal`;
  document.querySelectorAll('[data-undo]').forEach(b=>b.disabled=!lastAction);
  $('marked-chips').innerHTML=marked.map(f=>{
    const isPresent=state.findings[f.id]===1;
    return `<button class="finding" id="review-${f.id}" data-finding="${f.id}" data-review="true" data-state="${isPresent?'present':'absent'}" aria-label="${esc(label(f))}. ${isPresent?'Present. Tap for tested normal':'Absent, tested normal. Tap to clear'}." title="${esc(hint(f))}"><span class="state-mark" aria-hidden="true">${isPresent?'✓':'−'}</span><span class="finding-label">${esc(label(f))}</span></button>`;
  }).join('');
}
function filterFindings(){
  const q=$('finding-search').value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const tokens=q.split(/\s+/).filter(Boolean);let total=0;
  for(const g of GROUPS){let visible=0;for(const f of FINDINGS.filter(f=>f.group===g.id)){
    const haystack=`${label(f)} ${hint(f)} ${g.name} ${g.nerve} ${g.hint}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const matches=(q||activeCategory==='all'||activeCategory===g.id)&&tokens.every(t=>haystack.includes(t));$(`finding-${f.id}`).hidden=!matches;if(matches)visible++;
  }const group=$(`group-${g.id}`);group.hidden=!visible;if((q||activeCategory!=='all')&&visible)group.open=true;total+=visible;}
  document.querySelectorAll('[data-category]').forEach(b=>{b.setAttribute('aria-pressed',String(!q&&b.dataset.category===activeCategory));const count=FINDINGS.filter(f=>(b.dataset.category==='all'||f.group===b.dataset.category)&&state.findings[f.id]).length;b.querySelector('.category-count').textContent=count||'';});
  $('group-count').textContent=q?`${total} matches`:`${total} signs`;
  const current=GROUPS.find(g=>g.id===activeCategory);
  $('category-title').textContent=q?'Search results':current?current.name:'All examination areas';
  $('category-symbol').textContent=q?'⌕':current?current.nerve:'∴';
  $('category-hint').textContent=q?`${total} matches across all areas`:`${total} findings · change area`;
  $('finding-groups').classList.toggle('single-category',!q&&activeCategory!=='all');
  $('no-findings').hidden=total>0;$('search-clear').hidden=!q;
}
function mapCell(z){return `<button class="map-cell" data-zone="${z.id}" aria-pressed="false" aria-label="${esc(zoneName(z.id))}: no matching pattern" disabled><span class="zone-name">${esc(z.name).replace('Subarachnoid','Subarach&shy;noid')}</span><span class="zone-fit">—</span></button>`;}
function initMap(){
  const levels=[['above','Above','I–II'],['midbrain','Midbrain','III–IV'],['pons','Pons','V–VIII'],['medulla','Medulla','IX–XII*']];
  $('neuraxis').innerHTML=levels.map(([id,name,nerve])=>`<div class="map-row ${id}"><div class="level">${name}<small>${nerve}</small></div><div class="map-cells">${ZONES.filter(z=>z.level===id).map(mapCell).join('')}</div></div>`).join('');
  $('outside-map').innerHTML=ZONES.filter(z=>z.level==='outside').map(mapCell).join('');
  $('neuraxis').setAttribute('aria-label','Brainstem levels. XI is grouped with the medulla in the mnemonic but originates in the cervical spinal cord.');
}
function renderMap(){
  const bestByZone=new Map();for(const result of ranked)if(!bestByZone.has(result.site.zone))bestByZone.set(result.site.zone,result.fit);
  const top=ranked[0];
  document.querySelectorAll('[data-zone]').forEach(b=>{
    const id=b.dataset.zone,fit=bestByZone.get(id),shade=top&&fit!==undefined?Math.pow(fit/top.fit,4):0;
    b.style.setProperty('--shade',String(shade));b.classList.toggle('hot',shade>.52);b.classList.toggle('best',top?.site.zone===id);
    b.setAttribute('aria-pressed',String(id===zoneFilter));b.disabled=fit===undefined&&id!==zoneFilter;
    b.querySelector('.zone-fit').textContent=fit!==undefined?`${Math.round(fit*100)}%`:'—';
    b.setAttribute('aria-label',`${zoneName(id)}. ${fit!==undefined?`${Math.round(fit*100)} percent best pattern fit. ${id===zoneFilter?'Selected. Tap to clear filter':'Tap to filter results'}`:'No matching patterns'}.`);
  });
}
function suggestionButton(f){return `<button class="suggestion" data-suggest="${f.id}" aria-haspopup="dialog" aria-label="${esc(label(f))}. Untested. Record examination result." title="${esc(hint(f))}">${esc(label(f))}</button>`;}
function tagsBlock(title,kind,items){return `<div class="evidence-block"><div class="evidence-label ${kind}">${title}</div>${items.length?`<div class="tags">${items.map(t=>`<span class="tag ${kind}">${esc(t)}</span>`).join('')}</div>`:`<p class="no-evidence">${kind==='unexplained'?'All marked abnormalities are accounted for.':'None among the tested findings.'}</p>`}</div>`;}
function resultCard(r,index){
  const s=r.site,positive=FINDINGS.filter(f=>state.findings[f.id]===1),pct=Math.round(r.fit*100);
  const explains=positive.filter(f=>s.w[f.id]).map(label);
  const unexplained=positive.filter(f=>!s.w[f.id]&&!s.ex.includes(f.id)).map(label);
  const against=[...positive.filter(f=>s.ex.includes(f.id)).map(label),...FINDINGS.filter(f=>state.findings[f.id]===-1&&s.w[f.id]).map(f=>`${label(f)} — tested normal`)];
  const worth=FINDINGS.filter(f=>!state.findings[f.id]&&(s.w[f.id]>=2||s.ex.includes(f.id))).sort((a,b)=>(s.w[b.id]||2)-(s.w[a.id]||2)).slice(0,5);
  return `<details class="result-card ${index===0?'top':''}" data-result="${s.id}" ${index===0?'open':''}>
  <summary class="result-summary"><span class="rank-no">${String(ranked.indexOf(r)+1).padStart(2,'0')}</span><div class="result-copy"><h3 class="result-name">${esc(s.eponym||s.name)}</h3>${s.eponym?`<p class="result-anatomy">${esc(s.name)}</p>`:''}<div class="result-subline"><span class="side-pill">${esc(sideText(s))}</span></div></div><div class="result-metric"><div class="percent">${pct}<small>%</small></div><div class="fit-caption">Pattern fit</div><div class="fit-bar" aria-hidden="true"><span style="--fit:${pct}%"></span></div><span class="expand-hint" aria-hidden="true"></span></div>${index===0?`<div class="hero-art">${anatomyArt(s.zone,'lead-'+s.id)}</div><span class="anatomy-caption">${esc(zoneName(s.zone))}<small>Schematic · level only</small></span>`:''}</summary>
  <div class="result-details">${tagsBlock('Explains','good',explains)}${unexplained.length?tagsBlock('Doesn’t explain','unexplained',unexplained):''}${against.length?tagsBlock('Argues against','against',against):''}${!unexplained.length&&!against.length?'<p class="clear-evidence">No mismatches among marked findings.</p>':''}<details class="clinical-more"><summary>Clinical notes & investigation</summary>${worth.length?`<div class="evidence-block"><div class="evidence-label">Worth checking</div><div class="chips">${worth.map(suggestionButton).join('')}</div></div>`:''}<dl class="clinical-dl"><dt>Region</dt><dd>${esc(zoneName(s.zone))}</dd><dt>Usual causes</dt><dd>${esc(s.causes)}</dd><dt>Investigation</dt><dd>${esc(s.investigation)}</dd></dl><blockquote class="pearl"><span class="pearl-label">At the bedside</span>${esc(s.pearl)}</blockquote><p class="score-detail" title="Evidence, absent expected signs, untested signs, contradictions, unexplained findings">Score components · E ${r.E} · A ${r.A} · U ${r.U} · C ${r.C} · O ${r.O}</p></details></div></details>`;
}
function renderResults(){
  ranked=rankSites();renderMap();
  const next=examineNext();
  $('examine-next').innerHTML=next.length?`<section class="examine-next" aria-label="Examine next"><div class="small-heading"><span class="next-spark" aria-hidden="true">✳</span> The next useful check</div><p>Choose a sign, then record present or tested normal.</p><div class="chips">${next.map(n=>suggestionButton(n.finding)).join('')}</div></section>`:'';
  const filtered=zoneFilter?ranked.filter(r=>r.site.zone===zoneFilter):ranked;
  const filterBanner=zoneFilter?`<div class="zone-filter"><span>${esc(zoneName(zoneFilter))}</span><button id="clear-zone">Clear filter ×</button></div>`:'';
  const anyPresent=Object.values(state.findings).some(v=>v===1);
  $('ranking').innerHTML='';$('anatomy-panel').hidden=!ranked.length;
  if(!ranked.length){$('leading-result').innerHTML=`${filterBanner}<div class="empty-state"><div class="empty-symbol" aria-hidden="true">∴</div><h3>${anyPresent?'One more clue':'Start with a finding'}</h3><p>${anyPresent?'These signs are nonspecific on their own. Add a cranial nerve or long-tract sign to compare anatomical sites.':'Mark a finding in the examination. Your best-fitting anatomical patterns will appear here.'}</p><button class="text-button" data-mobile-view="examination">Add examination findings</button><br><button class="text-button" data-load-example="wallenberg">Try the Wallenberg case ↗</button></div>`;}
  else if(!filtered.length){$('leading-result').innerHTML=`${filterBanner}<div class="empty-state"><h3>No matches in this region</h3><p>Clear the region filter to see all candidates.</p></div>`;}
  else{$('leading-result').innerHTML=filterBanner+resultCard(filtered[0],0);$('ranking').innerHTML=`${filtered.length>1?`<div class="rank-heading"><strong>Other possibilities</strong><span>${filtered.length-1} ${zoneFilter?'in this region':'alternative sites'}</span></div>`:''}${filtered.slice(1,visibleLimit).map((r,i)=>resultCard(r,i+1)).join('')}${filtered.length>visibleLimit?`<button class="more-button" id="show-more">Show ${Math.min(6,filtered.length-visibleLimit)} more <span class="muted">· ${filtered.length-visibleLimit} remaining</span></button>`:''}`;}
  const top=ranked[0];
  $('results-eyebrow').textContent=zoneFilter?'Filtered by region':'02 / Follow the anatomy';
  $('results-title').textContent='Your localisation';
  $('mobile-result-count').textContent=top?`${Math.round(top.fit*100)}%`:'';
  $('dock-kicker').textContent=top?`Best pattern fit · ${Math.round(top.fit*100)}%`:'Your examination';$('dock-best').textContent=top?(top.site.eponym||top.site.name):'Start with a localising finding';
  renderDock();
}
function renderDock(){$('mobile-dock').hidden=currentTab!=='localise'||mobileView==='results'||resultsOnScreen||!ranked.length||!$('toast').hidden;}
function setMobileView(view){setTab(view==='results'?'results':'localise');$(`tab-${view==='results'?'results':'localise'}`).focus({preventScroll:true});}
function update(){renderFindings();renderResults();save();}
function markFinding(id,direct=null){
  if(!FINDING_BY_ID.has(id))return;
  const old=state.findings[id]||0,next=direct!==null?direct:old===0?1:old===1?-1:0;
  if(next===old)return;
  rememberAction();
  if(next)state.findings[id]=next;else delete state.findings[id];
  activePreset=null;visibleLimit=6;update();
  const top=ranked[0];announce(`${label(FINDING_BY_ID.get(id))}: ${next===1?'present':next===-1?'tested normal':'untested'}.${top?` Leading pattern: ${top.site.eponym||top.site.name}, ${Math.round(top.fit*100)} percent fit.`:''}`);
  toast(`${label(FINDING_BY_ID.get(id))} · ${next===1?'present':next===-1?'tested normal':'cleared'}`,true);
}
function loadPreset(id){
  const preset=PRESETS.find(p=>p.id===id);if(!preset)return;
  rememberAction();
  state.findings={};preset.present.forEach(f=>state.findings[f]=1);preset.absent.forEach(f=>state.findings[f]=-1);
  activePreset=id;zoneFilter=null;visibleLimit=6;$('finding-search').value='';update();
  $('case-sheet').close();setTab('results');$('results').focus({preventScroll:true});
  toast(`${preset.name} case loaded`,true);
  announce(`${preset.name} case loaded. ${ranked[0]?`Leading pattern: ${ranked[0].site.eponym||ranked[0].site.name}, ${Math.round(ranked[0].fit*100)} percent fit.`:''}`);
}
function setTab(name){
  if(currentTab===name)return;
  if(currentTab==='localise')examinationScroll=scrollY;
  currentTab=name;mobileView=name==='results'?'results':'examination';resultsOnScreen=false;
  for(const tab of ['localise','results','reference']){const active=name===tab;$(`tab-${tab}`).setAttribute('aria-selected',String(active));$(`tab-${tab}`).tabIndex=active?0:-1;}
  $('view-reference').hidden=name!=='reference';$('view-localise').hidden=name==='reference';
  $('view-localise').setAttribute('aria-labelledby',name==='results'?'tab-results':'tab-localise');
  $('workspace').dataset.mobileView=mobileView;
  $('mobile-examination').setAttribute('aria-pressed',String(mobileView==='examination'));$('mobile-results').setAttribute('aria-pressed',String(mobileView==='results'));
  $('marked-review').open=false;renderDock();
  if(matchMedia('(max-width: 959px)').matches)scrollTo({top:name==='localise'?examinationScroll:0,behavior:'instant'});
  else if(name==='results')$('results').scrollIntoView({block:'start'});
  announce(name==='results'?'Results. Use Findings to return to the examination.':name==='reference'?'Bedside reference.':'Findings. Your examination has been retained.');
}
function renderReference(){
  $('nerve-grid').innerHTML=NERVES.map(n=>`<details class="nerve-card"><summary class="nerve-head"><span class="roman">${n.roman}</span><h3>${esc(n.name)}</h3></summary><dl class="nerve-dl">${[['Nucleus',n.nucleus],['Course / foramen',n.course],['Function',n.function],['Bedside test',n.test],['Lesion signs',n.signs]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`).join('');
  $('rule-table').innerHTML=RULE_OF_FOUR.map(r=>`<tr><th scope="row">${esc(r.level)}</th><td>${esc(r.nerves)}</td><td>${esc(r.medial)}</td><td>${esc(r.lateral)}</td></tr>`).join('');
  $('rules-grid').innerHTML=RULES.map((r,i)=>`<article class="rule"><span class="rule-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div></article>`).join('');
  const sources=[['Cranial nerve examination · Merck Manual','https://www.merckmanuals.com/professional/neurologic-disorders/neurologic-examination/how-to-assess-the-cranial-nerves'],['Neuroanatomy · University of Utah','https://neurologicexam.med.utah.edu/adult/html/cranialnerve_anatomy.html'],['Rule of 4 · Practical Neurology','https://pn.bmj.com/content/11/3/167'],['Modern management of III palsy · Eye','https://pmc.ncbi.nlm.nih.gov/articles/PMC8727561/'],['Adult strabismus guidance · AAO','https://www.aaojournal.org/article/S0161-6420%2824%2900013-7/fulltext'],['Kernohan phenomenon · Systematic review','https://pmc.ncbi.nlm.nih.gov/articles/PMC9452377/'],['Numb chin syndrome · Case series','https://pmc.ncbi.nlm.nih.gov/articles/PMC6217713/']];
  $('source-links').innerHTML=sources.map(([name,url])=>`<a href="${url}" target="_self" rel="noopener noreferrer">${name}</a>`).join('');
}
function init(){
  applyTheme();
  const categories=[['eyes','III','Eyes'],['vision','II','Vision'],['face','VII','Face'],['hearing','VIII','Hearing'],['bulbar','XII','Bulbar'],['tracts','↕','Limbs'],['context','＋','Context'],['all','∴','All signs']];
  $('categories').innerHTML=categories.map(([id,symbol,name])=>`<button class="category" data-category="${id}" aria-pressed="${id===activeCategory}"><span class="category-symbol" aria-hidden="true">${symbol}</span><span>${name}</span><span class="category-count"></span></button>`).join('');
  $('finding-groups').innerHTML=GROUPS.map(g=>`<details class="group" id="group-${g.id}" open><summary><span class="nerve-label" aria-hidden="true">${g.nerve}</span><span class="group-title">${g.name}</span><span class="group-counter" id="counter-${g.id}"></span><span class="chevron" aria-hidden="true"></span></summary><div class="group-content"><div class="chips">${FINDINGS.filter(f=>f.group===g.id).map(f=>`<button class="finding" id="finding-${f.id}" data-finding="${f.id}" data-state="untested"><span class="state-mark" aria-hidden="true"></span><span class="finding-label"></span>${f.soft?'<span class="soft-indicator" aria-hidden="true">Soft</span>':''}</button>`).join('')}</div></div></details>`).join('');
  const caseNotes={wallenberg:'Crossed sensory signs',weber:'III palsy + weakness',pcomm:'Pupil-involving III',diabetic:'Pupil-sparing III',cavernous:'Multiple ocular motor nerves',cpa:'Hearing + facial signs','facial-canal':'Segmental VII palsy','medial-medulla':'Tongue + long tracts',ino:'An adduction deficit','one-and-half':'Gaze palsy + INO',parinaud:'Dorsal midbrain signs',villaret:'Lower nerves + Horner','miller-fisher':'Eyes, gait and reflexes'};
  $('presets').innerHTML=PRESETS.map((p,i)=>`<button class="preset" data-preset="${p.id}" aria-pressed="false"><span class="case-index">${String(i+1).padStart(2,'0')}</span><strong>${p.name}</strong><span class="case-note">${caseNotes[p.id]}</span><span class="case-load">Load pattern <span aria-hidden="true">↗</span></span></button>`).join('');
  initMap();renderReference();renderFindings();renderResults();save();$('atlas-count').textContent=SITES.length;
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.finding){const id=b.dataset.finding,fromReview=b.dataset.review;markFinding(id);if(fromReview){const target=$(`review-${id}`)||$('marked-chips').querySelector('button')||$('review-sheet').querySelector('[data-undo]');target.focus({preventScroll:true});}}
    else if(b.dataset.suggest)openCheck(b.dataset.suggest);
    else if(b.hasAttribute('data-check-value')){const value=Number(b.dataset.checkValue),id=activeCheckId;$('check-sheet').close();if(value!==0)markFinding(id,value);$('results').focus({preventScroll:true});}
    else if(b.hasAttribute('data-close-sheet'))b.closest('dialog').close();
    else if(b.hasAttribute('data-undo'))undoLast();
    else if(b.dataset.mobileView)setMobileView(b.dataset.mobileView);
    else if(b.dataset.category){activeCategory=b.dataset.category;$('finding-search').value='';$('category-sheet').close();filterFindings();announce(`${b.textContent.replace(/\d+$/,'').trim()} findings`);}
    else if(b.dataset.side){if(state.side!==b.dataset.side){rememberAction();state.side=b.dataset.side;update();toast(`Cranial signs on the ${state.side}`,true);announce(`Cranial signs set to ${state.side}. All sided labels updated.`);}}
    else if(b.dataset.preset)loadPreset(b.dataset.preset);
    else if(b.dataset.loadExample)loadPreset(b.dataset.loadExample);
    else if(b.dataset.zone){zoneFilter=zoneFilter===b.dataset.zone?null:b.dataset.zone;visibleLimit=6;renderResults();announce(zoneFilter?`Results filtered to ${zoneName(zoneFilter)}.`:'Showing all regions.');}
    else if(b.id==='clear-zone'){zoneFilter=null;renderResults();$('results').focus({preventScroll:true});}
    else if(b.id==='show-more'){const previous=visibleLimit;visibleLimit+=6;renderResults();const firstNew=document.querySelectorAll('.result-summary')[previous];firstNew?.focus({preventScroll:true});}
    else if(b.id==='clear-all'||b.id==='review-clear')clearFindings();
    else if(b.id==='search-clear'||b.id==='reset-search'){$('finding-search').value='';filterFindings();$('finding-search').focus();}
    else if(['tab-localise','tab-results','tab-reference'].includes(b.id))setTab(b.id.replace('tab-',''));
    else if(b.id==='see-results')setMobileView('results');
    else if(b.id==='open-categories')openSheet('category-sheet');
    else if(b.id==='open-cases')openSheet('case-sheet');
    else if(b.id==='open-review'||b.id==='review-results')openSheet('review-sheet');
    else if(b.id==='dismiss-toast')dismissToast();
  });
  $('finding-search').addEventListener('input',filterFindings);
  $('theme').addEventListener('change',e=>{state.theme=e.target.value;applyTheme();save();});
  document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
  document.querySelector('[role="tablist"]').addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const tabs=['localise','results','reference'],name=e.key==='Home'?tabs[0]:e.key==='End'?tabs[2]:tabs[(tabs.indexOf(currentTab)+(e.key==='ArrowRight'?1:2))%3];setTab(name);$(`tab-${name}`).focus();}});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{resultsOnScreen=entries[0].isIntersecting;renderDock();},{threshold:0});observer.observe($('results'));}
  else{const check=()=>{const r=$('results').getBoundingClientRect();resultsOnScreen=r.top<innerHeight&&r.bottom>0;renderDock();};addEventListener('scroll',check,{passive:true});addEventListener('resize',check);check();}
}
init();
// Read-only inspection hooks for offline verification; the application has no network API.
window.CranialLocaliser=Object.freeze({scoreSite,rankSites,examineNext,getState:()=>JSON.parse(JSON.stringify(state)),findings:FINDINGS,sites:SITES,presets:PRESETS,zones:ZONES});

