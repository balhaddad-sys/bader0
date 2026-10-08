
/* ---------------------------------------------------------------------------
 * Interface
 * ------------------------------------------------------------------------- */
const STORAGE_KEY = 'cranial-nerve-localiser.v1';
const TABS = ['localise','results','practice','reference'];
const VALUES = ['R','L','B','P','N'];
const $ = id=>document.getElementById(id);
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap = text=>text[0].toUpperCase()+text.slice(1);
const listText = items=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} and ${items[items.length-1]}`;
const isPresent = v=>!!v&&v!=='N';
let state = {findings:{},lastSide:'R',theme:'system',practice:{answered:0,correct:0,streak:0,best:0,topic:'all'}};
let activePreset=null, zoneFilter=null, visibleLimit=6, currentTab='localise', mobileView='examination', resultsOnScreen=false, toastTimer, liveTimer;
let examinationScroll=0, activeCategory='eyes', lastAction=null, activeCheckId=null, checkOrigin=null;
let ranked=[];
let storageAvailable=true;
/* Each anatomy viewer remembers its chosen level and focused structure. */
const viewers={results:{auto:null,chosen:null,focus:null},reference:{chosen:'medulla',focus:null}};
let practice={current:null,options:[],answer:null,hint:false,recent:[],number:0};

/* Release 2.0 stored 1 / -1 relative to one "side of cranial signs"; convert that to per-finding sides. */
function migrateFindings(saved){
  const side=saved.side==='left'?'L':'R',other=OTHER_SIDE[side];
  const merged={contraWeak:['weak',other],ipsiWeak:['weak',side],contraAtaxia:['limbAtaxia',other],ipsiAtaxia:['limbAtaxia',side],
    bilateralPtosis:['ptosis','B'],bilateralVi:['vi','B'],bilateral7:['lmn7','B'],junctional:['junctional',other]};
  const out={};
  for(const [id,v] of Object.entries(saved.findings)){
    const [nid,s]=merged[id]||[id,side],f=FINDING_BY_ID.get(nid);
    if(!f||(v!==1&&v!==-1))continue;
    const value=v===-1?'N':f.sided?s:'P';
    out[nid]=out[nid]&&out[nid]!==value&&value!=='N'&&out[nid]!=='N'?'B':value;
  }
  return out;
}
function validValue(f,v){return v==='N'||(f.sided?(v==='R'||v==='L'||(v==='B'&&f.both!==false)):v==='P');}
try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(saved && typeof saved==='object'){
    if(['light','dark','system'].includes(saved.theme))state.theme=saved.theme;
    if(['R','L'].includes(saved.lastSide))state.lastSide=saved.lastSide;
    if(saved.findings && typeof saved.findings==='object'){
      const findings=Object.values(saved.findings).some(v=>typeof v==='number')?migrateFindings(saved):saved.findings;
      for(const f of FINDINGS)if(validValue(f,findings[f.id]))state.findings[f.id]=findings[f.id];
    }
    const p=saved.practice;
    if(p && typeof p==='object'){
      for(const key of ['answered','correct','streak','best'])if(Number.isInteger(p[key])&&p[key]>=0)state.practice[key]=p[key];
      if(p.topic==='all'||TOPICS.some(t=>t.id===p.topic))state.practice.topic=p.topic;
    }
  }
}catch{storageAvailable=false;}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}renderStorage();}
function renderStorage(){$('save-error').hidden=storageAvailable;$('storage-status').textContent=storageAvailable?'Saved on this device':'This session only';}
/* Label for a finding as it stands in a findings map (the examination by default). */
function label(f,findings=state.findings){return findingLabel(f,findings[f.id]);}
function valueText(f,v){return v==='N'?'tested normal':!v?'untested':f.sided?{R:'right',L:'left',B:'both sides'}[v]:'present';}
function zoneName(id){const z=ZONE_BY_ID.get(id);return ['above','outside'].includes(z.level)?z.name:`${{cortex:'Cerebrum',cord:'Spinal cord'}[z.level]||cap(z.level)} · ${z.name.toLowerCase()}`;}
/* Where the lesion sits, as a short phrase. */
function lesionText(r){
  const s=r.site;
  if(s.side!=='unilateral')return {midline:'Midline',bilateral:'Bilateral',none:'No fixed side'}[s.side];
  if(!r.side||!r.sideKnown)return 'Side not yet clear';
  const word=cap(SIDE_WORD[r.side]);
  return ZONE_BY_ID.get(s.zone).level==='cortex'?`${word} hemisphere`:`${word}-sided lesion`;
}
function siteTitle(site){return site.eponym||site.name;}
function announce(message){clearTimeout(liveTimer);liveTimer=setTimeout(()=>{$('live-status').textContent=message;},180);}
function dismissToast(){clearTimeout(toastTimer);$('toast').hidden=true;renderDock();}
function toast(message,undo=false){clearTimeout(toastTimer);$('toast-message').textContent=message;$('toast-undo').hidden=!undo;$('toast').hidden=false;renderDock();toastTimer=setTimeout(dismissToast,undo?6500:3600);}
function rememberAction(){lastAction={findings:{...state.findings},activePreset,zoneFilter};}
function undoLast(){if(!lastAction)return;state.findings={...lastAction.findings};activePreset=lastAction.activePreset;zoneFilter=lastAction.zoneFilter;lastAction=null;visibleLimit=6;update();toast('Last change undone');(document.querySelector('dialog[open] .close-sheet')||$(`tab-${currentTab}`)).focus({preventScroll:true});announce('Last change undone. Your previous examination has been restored.');}
function openSheet(id){dismissToast();if(id==='review-sheet')$('marked-review').open=true;$(id).showModal();}
function clearFindings(){if(!Object.keys(state.findings).length)return;rememberAction();state.findings={};activePreset=null;zoneFilter=null;visibleLimit=6;update();toast('All findings cleared',true);announce('All findings cleared. Undo is available.');}
function applyTheme(){document.documentElement.classList.add('theme-changing');if(state.theme==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=state.theme;$('theme').value=state.theme;void document.documentElement.offsetWidth;requestAnimationFrame(()=>document.documentElement.classList.remove('theme-changing'));}

/* ---- Recording findings ---- */
/* Set a finding to a value ('R','L','B','P','N') or clear it (0). */
function setFinding(id,value){
  const f=FINDING_BY_ID.get(id);if(!f)return;
  const old=state.findings[id]||0;
  if(value===old)return;
  rememberAction();
  if(value)state.findings[id]=value;else delete state.findings[id];
  if(value==='R'||value==='L')state.lastSide=value;
  activePreset=null;visibleLimit=6;update();
  const text=value&&value!=='N'?label(f):f.name;
  const top=ranked[0];
  announce(`${text}: ${valueText(f,value)}.${top?` Leading pattern: ${siteTitle(top.site)}, ${lesionText(top)}, ${Math.round(top.fit*100)} percent fit.`:''}`);
  toast(`${text} · ${value==='N'?'tested normal':value?'present':'cleared'}`,true);
}
/* Tapping a finding cycles untested → present (on the last side used) → tested normal → untested. */
function cycleFinding(id){
  const f=FINDING_BY_ID.get(id),v=state.findings[id];
  setFinding(id,!v?(f.sided?state.lastSide:'P'):v==='N'?0:'N');
}
/* A side button marks the finding present on that side, or clears it if already so. */
function toggleSide(id,side){setFinding(id,state.findings[id]===side?0:side);}

/* ---- Finding sheet: bedside technique, localising value and recording ---- */
function siteNames(list){return list.sort((a,b)=>b.prior-a.prior).map(siteTitle);}
function findingValue(f){
  const defining=siteNames(SITES.filter(s=>weightOf(s,f.id)>=3)),typical=siteNames(SITES.filter(s=>weightOf(s,f.id)===2));
  const short=names=>names.length>5?`${names.slice(0,5).join(', ')} and ${names.length-5} more`:listText(names);
  const parts=[];
  if(defining.length)parts.push(`Defining for ${short(defining)}.`);
  if(typical.length)parts.push(`${defining.length?'Also typical':'Typical'} of ${short(typical)}.`);
  if(!parts.length)parts.push('Supportive only: it refines a pattern but cannot define one in this model.');
  if(f.soft)parts.push('A soft, less specific finding.');
  return parts.join(' ');
}
function checkActions(f){
  const v=state.findings[f.id]||0;
  const options=f.sided?[['R','Right'],['L','Left'],...(f.both===false?[]:[['B','Both']])]:[['P','Present']];
  return options.map(([value,text])=>`<button class="primary-action" data-check-value="${value}" aria-pressed="${v===value}">${text}</button>`).join('')
    +`<button class="secondary-action" data-check-value="N" aria-pressed="${v==='N'}"><span aria-hidden="true">−</span> Tested normal</button>`;
}
function openCheck(id,origin){
  const f=FINDING_BY_ID.get(id);if(!f)return;
  activeCheckId=id;checkOrigin=origin;
  const v=state.findings[id]||0;
  $('check-kicker').textContent=origin==='suggest'?'Examine next':GROUPS.find(g=>g.id===f.group).name;
  $('check-title').textContent=f.name;$('check-hint').textContent=f.hint;
  $('check-test').textContent=f.test;$('check-value').textContent=findingValue(f);
  $('check-state').textContent=isPresent(v)?`Currently marked: ${label(f)}.`:v==='N'?'Currently tested normal.':'Currently untested.';
  const actions=$('check-actions');
  actions.innerHTML=checkActions(f);actions.dataset.count=String(actions.children.length);
  $('check-clear').textContent=v?'Clear to untested':'Leave untested';
  openSheet('check-sheet');
}

/* ---- Examination ---- */
function renderFindings(){
  for(const f of FINDINGS){
    const b=$(`finding-${f.id}`),v=state.findings[f.id]||0;
    const status=isPresent(v)?'present':v==='N'?'absent':'untested';
    b.dataset.state=status;b.querySelector('.finding-label').textContent=isPresent(v)&&!f.sided?label(f):f.name;b.querySelector('.state-mark').textContent=isPresent(v)?'✓':v==='N'?'−':'';
    b.setAttribute('aria-label',`${isPresent(v)?label(f):f.name}. ${isPresent(v)?'Present. Tap for tested normal':v==='N'?'Tested normal. Tap to clear':f.sided?`Untested. Tap for present on the ${SIDE_WORD[state.lastSide]}, or choose a side`:'Untested. Tap for present'}.`);
    b.setAttribute('title',f.hint);
    $(`info-${f.id}`).setAttribute('aria-label',`How to examine: ${f.name}`);
    if(f.sided)document.querySelectorAll(`[data-side-for="${f.id}"]`).forEach(s=>s.setAttribute('aria-pressed',String(v===s.dataset.sideValue)));
  }
  document.querySelectorAll('[data-preset]').forEach(b=>{const active=b.dataset.preset===activePreset;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const values=Object.values(state.findings),present=values.filter(isPresent).length,absent=values.filter(v=>v==='N').length;
  $('finding-count').innerHTML=present||absent?`<b>${present} present</b> <span class="separator">·</span> ${absent} tested normal`:'No findings marked';
  $('clear-all').disabled=!present&&!absent;
  for(const g of GROUPS){const selected=FINDINGS.filter(f=>f.group===g.id&&state.findings[f.id]).length;$(`counter-${g.id}`).textContent=selected?`${selected} marked`:'';}
  renderMarkedReview();filterFindings();
}
function renderMarkedReview(){
  const marked=FINDINGS.filter(f=>state.findings[f.id]);
  const present=marked.filter(f=>isPresent(state.findings[f.id])).length;
  $('marked-review').hidden=!marked.length;
  $('marked-summary').textContent=`Review findings · ${present} present, ${marked.length-present} normal`;
  $('mobile-marked-count').textContent=marked.length?String(marked.length):'';
  $('review-count').textContent=marked.length;$('open-review').disabled=!marked.length;$('review-empty').hidden=marked.length>0;$('review-clear').disabled=!marked.length;
  $('result-tools').hidden=!marked.length;$('result-pattern-count').textContent=`${present} present · ${marked.length-present} normal`;
  document.querySelectorAll('[data-undo]').forEach(b=>b.disabled=!lastAction);
  $('marked-chips').innerHTML=marked.map(f=>{
    const yes=isPresent(state.findings[f.id]),text=yes?label(f):f.name;
    return `<button class="finding" id="review-${f.id}" data-finding="${f.id}" data-review="true" data-state="${yes?'present':'absent'}" aria-label="${esc(text)}. ${yes?'Present. Tap for tested normal':'Tested normal. Tap to clear'}." title="${esc(f.hint)}"><span class="state-mark" aria-hidden="true">${yes?'✓':'−'}</span><span class="finding-label">${esc(text)}</span></button>`;
  }).join('');
}
const fold=text=>text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function filterFindings(){
  const q=fold($('finding-search').value.trim());
  const tokens=q.split(/\s+/).filter(Boolean);let total=0;
  for(const g of GROUPS){let visible=0;for(const f of FINDINGS.filter(f=>f.group===g.id)){
    const haystack=fold(`${f.name} ${f.sided||''} ${f.hint} ${f.syn} ${g.name} ${g.nerve} ${g.hint}`);
    const matches=(q||activeCategory==='all'||activeCategory===g.id)&&tokens.every(t=>haystack.includes(t));$(`finding-row-${f.id}`).hidden=!matches;if(matches)visible++;
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

/* ---- Region map ---- */
function mapCell(z){return `<button class="map-cell" data-zone="${z.id}" aria-pressed="false" aria-label="${esc(zoneName(z.id))}: no matching pattern" disabled><span class="zone-name">${esc(z.name).replace('Subarachnoid','Subarach&shy;noid')}</span><span class="zone-fit">—</span></button>`;}
function initMap(){
  const levels=[['cortex','Cortex','and deep'],['above','Base','I–II'],['midbrain','Midbrain','III–IV'],['pons','Pons','V–VIII'],['medulla','Medulla','IX–XII*'],['cord','Cord','C1–S5']];
  $('neuraxis').innerHTML=levels.map(([id,name,nerve])=>`<div class="map-row ${id}"><div class="level">${name}<small>${nerve}</small></div><div class="map-cells">${ZONES.filter(z=>z.level===id).map(mapCell).join('')}</div></div>`).join('');
  $('outside-map').innerHTML=ZONES.filter(z=>z.level==='outside').map(mapCell).join('');
  $('neuraxis').setAttribute('aria-label','From cerebrum to spinal cord. XI is grouped with the medulla in the mnemonic but originates in the cervical spinal cord.');
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

/* ---- Brainstem and cord sections ---- */
function involvedCount(sectionId){return [...structureStates(sectionId,state.findings).values()].filter(s=>s==='involved').length;}
/* Sides on which a result's lesion lies, for shading: one side when known, otherwise both. */
function resultSides(r){return r.site.side==='unilateral'&&r.side&&r.sideKnown?[r.side]:['R','L'];}
function viewerConfig(key){
  const v=viewers[key];
  if(key==='reference')return {section:v.chosen,zoneSides:[],zone:null,states:new Map(),note:''};
  const top=ranked[0],leadSection=top?sectionForSite(top.site):null;
  let auto=leadSection;
  if(!auto){let best=0;for(const s of SECTIONS){const n=involvedCount(s.id);if(n>best){best=n;auto=s.id;}}auto=auto||'medulla';}
  if(v.auto!==auto){v.auto=auto;v.chosen=null;v.focus=null;}
  const section=v.chosen||auto,leading=top&&section===leadSection,sides=leading?resultSides(top):['R','L'];
  const marked=Object.keys(state.findings).length;
  const where=leading?(sides.length>1?(top.site.side==='unilateral'?', side not yet clear':', on both sides'):` on the ${SIDE_WORD[sides[0]]}`):'';
  const note=!marked?'Mark findings and the structures they involve will be shaded here.'
    :leading?`The shaded region is the leading pattern, ${siteTitle(top.site)}${where}. Solid structures explain present findings; dashed ones were tested normal.`
    :top&&!leadSection?`The leading pattern, ${siteTitle(top.site)}, lies outside these sections. Solid structures are those your findings would involve at this level.`
    :'Solid structures are those your findings would involve at this level; dashed ones were tested normal.';
  return {section,zoneSides:leading?sides:[],zone:leading?top.site.zone:null,states:structureStates(section,state.findings,sides),note};
}
function structureInfo(id,withState){
  const s=STRUCTURES[id],linked=s.findings.map(key=>FINDING_BY_ID.get(parseLink(key,'i').id));
  const sign=f=>{const v=withState?state.findings[f.id]:0;return `${esc(isPresent(v)?label(f):f.name)}${isPresent(v)?' <b class="good">present</b>':v==='N'?' <span class="muted">tested normal</span>':''}`;};
  return `<h3>${esc(s.name)}</h3><dl class="structure-dl"><dt>Does</dt><dd>${esc(s.does)}</dd><dt>If damaged</dt><dd>${esc(s.lesion)}</dd>${linked.length?`<dt>Bedside sign</dt><dd>${linked.map(sign).join('; ')}</dd>`:''}</dl>`;
}
function renderSectionViewer(key){
  const el=$(key==='results'?'result-sections':'reference-sections'),v=viewers[key],cfg=viewerConfig(key);
  const section=SECTION_BY_ID.get(cfg.section);
  const focus=section.structures.includes(v.focus)?v.focus:null;
  const order={involved:2,spared:1};
  const stateOf=id=>cfg.states.get(`${id}:R`)==='involved'||cfg.states.get(`${id}:L`)==='involved'?'involved':cfg.states.get(`${id}:R`)||cfg.states.get(`${id}:L`)||'';
  const structures=[...section.structures].sort((a,b)=>(order[stateOf(b)]||0)-(order[stateOf(a)]||0));
  const levelButtons=SECTIONS.map(s=>`<button class="level-button" data-section-level="${s.id}" aria-pressed="${s.id===cfg.section}"><span>${esc(s.name.replace('Cervical cord','Cord'))}</span><small>${esc(s.nerves)}</small></button>`).join('');
  const chips=structures.map(id=>{const st=stateOf(id);return `<button class="structure-chip ${st}" data-structure-chip="${id}" aria-pressed="${id===focus}">${esc(STRUCTURES[id].name)}${st?`<span class="sr-only">, ${st}</span>`:''}</button>`;}).join('');
  el.innerHTML=`<div class="level-tabs" role="group" aria-label="Level">${levelButtons}</div>
    <figure class="section-figure">${sectionSvg(cfg.section,{zoneSides:cfg.zoneSides,zone:cfg.zone,states:cfg.states,focus,prefix:`${key}-${cfg.section}`})}
    <figcaption>${esc(section.name)}, ${esc(section.level.toLowerCase())} level. Axial, as on MRI: front at the top, patient’s right on your left. Schematic.</figcaption>
    <div class="section-legend" aria-hidden="true"><span><i class="lg-nucleus"></i>Nucleus</span><span><i class="lg-tract"></i>Tract</span>${key==='results'?`<span><i class="lg-involved"></i>Explains a finding</span><span><i class="lg-spared"></i>Tested normal</span>${cfg.zone?'<span><i class="lg-zone"></i>Leading region</span>':''}`:''}</div></figure>
    <div class="section-info">${focus?structureInfo(focus,key==='results'):`<p class="section-hint">${esc(cfg.note||'Tap a structure in the diagram or the list below.')}</p>`}</div>
    <div class="structure-list" role="group" aria-label="Structures at this level">${chips}</div>`;
}
function focusStructure(key,id){
  const v=viewers[key];v.focus=v.focus===id?null:id;renderSectionViewer(key);
  const chip=$(key==='results'?'result-sections':'reference-sections').querySelector(`[data-structure-chip="${id}"]`);
  if(chip&&document.activeElement?.dataset?.structureChip)chip.focus({preventScroll:true});
  if(v.focus)announce(`${STRUCTURES[id].name}. ${STRUCTURES[id].lesion}`);
}

/* ---- Results ---- */
function suggestionButton(f){return `<button class="suggestion" data-suggest="${f.id}" aria-haspopup="dialog" aria-label="${esc(f.name)}. Untested. See how to examine it and record the result." title="${esc(f.hint)}">${esc(f.name)}</button>`;}
function tagsBlock(title,kind,items){return `<div class="evidence-block"><div class="evidence-label ${kind}">${title}</div>${items.length?`<div class="tags">${items.map(t=>`<span class="tag ${kind}">${esc(t)}</span>`).join('')}</div>`:`<p class="no-evidence">${kind==='unexplained'?'All marked abnormalities are accounted for.':'None among the tested findings.'}</p>`}</div>`;}
/* What a result explains, misses and is contradicted by, for its chosen lesion side. */
function evidenceFor(r,findings){
  const s=r.site,h=r.side,explains=[],unexplained=[],against=[];
  for(const f of FINDINGS){
    const v=findings[f.id];if(!v)continue;
    const entries=s.byFinding.get(f.id)||[];
    if(v==='N'){if(entries.length)against.push(`${f.name} — tested normal`);continue;}
    const match=Math.max(0,...entries.map(e=>sideMatch(e.rel,v,h)));
    const excluded=s.excluders.some(x=>x.id===f.id&&sideMatch(x.rel,v,h)===1);
    if(excluded)against.push(label(f,findings));
    else if(match)explains.push(label(f,findings));
    else if(entries.length&&h){const e=entries[0];against.push(`${label(f,findings)} — expected ${e.rel==='b'?'on both sides':`on the ${SIDE_WORD[e.rel==='c'?OTHER_SIDE[h]:h]}`}`);}
    else unexplained.push(label(f,findings));
  }
  return {explains,unexplained,against};
}
/* The leading card's picture: the axial section for brainstem and cord sites, the sagittal sketch otherwise. */
function heroArt(r){
  const s=r.site,section=sectionForSite(s);
  if(!section)return `<div class="hero-art">${anatomyArt(s.zone,'lead-'+s.id)}</div><span class="anatomy-caption">${esc(zoneName(s.zone))}<small>Schematic · level only</small></span>`;
  const sides=resultSides(r);
  return `<div class="hero-art axial">${sectionSvg(section,{zoneSides:sides,zone:s.zone,states:structureStates(section,state.findings,sides),mini:true,prefix:'hero-'+s.id})}</div><span class="anatomy-caption">${esc(zoneName(s.zone))}<small>Axial · patient’s right on the left</small></span>`;
}
function resultCard(r,index){
  const s=r.site,pct=Math.round(r.fit*100);
  const {explains,unexplained,against}=evidenceFor(r,state.findings);
  const worth=FINDINGS.filter(f=>!state.findings[f.id]&&(weightOf(s,f.id)>=2||excludes(s,f.id))).sort((a,b)=>(weightOf(s,b.id)||2)-(weightOf(s,a.id)||2)).slice(0,5);
  return `<details class="result-card ${index===0?'top':''}" data-result="${s.id}" ${index===0?'open':''}>
  <summary class="result-summary"><span class="rank-no">${String(ranked.indexOf(r)+1).padStart(2,'0')}</span><div class="result-copy"><h3 class="result-name">${esc(siteTitle(s))}</h3>${s.eponym?`<p class="result-anatomy">${esc(s.name)}</p>`:''}<div class="result-subline"><span class="side-pill">${esc(lesionText(r))}</span></div></div><div class="result-metric"><div class="percent">${pct}<small>%</small></div><div class="fit-caption">Pattern fit</div><div class="fit-bar" aria-hidden="true"><span style="--fit:${pct}%"></span></div><span class="expand-hint" aria-hidden="true"></span></div>${index===0?heroArt(r):''}</summary>
  <div class="result-details">${tagsBlock('Explains','good',explains)}${unexplained.length?tagsBlock('Doesn’t explain','unexplained',unexplained):''}${against.length?tagsBlock('Argues against','against',against):''}${!unexplained.length&&!against.length?'<p class="clear-evidence">No mismatches among marked findings.</p>':''}<details class="clinical-more"><summary>Clinical notes & investigation</summary>${worth.length?`<div class="evidence-block"><div class="evidence-label">Worth checking</div><div class="chips">${worth.map(suggestionButton).join('')}</div></div>`:''}<dl class="clinical-dl"><dt>Region</dt><dd>${esc(zoneName(s.zone))}</dd><dt>Usual causes</dt><dd>${esc(s.causes)}</dd><dt>Investigation</dt><dd>${esc(s.investigation)}</dd></dl><blockquote class="pearl"><span class="pearl-label">At the bedside</span>${esc(s.pearl)}</blockquote><p class="score-detail" title="Evidence, absent expected signs, untested signs, contradictions, unexplained findings">Score components · E ${r.E} · A ${r.A} · U ${r.U} · C ${r.C} · O ${r.O}</p></details></div></details>`;
}
function renderResults(){
  ranked=rankSites(state.findings);renderMap();
  const next=examineNext(ranked.slice(0,4),state.findings);
  $('examine-next').innerHTML=next.length?`<section class="examine-next" aria-label="Examine next"><div class="small-heading"><span class="next-spark" aria-hidden="true">✳</span> The next useful check</div><p>Choose a sign to see how to examine it, then record the side or tested normal.</p><div class="chips">${next.map(n=>suggestionButton(n.finding)).join('')}</div></section>`:'';
  const filtered=zoneFilter?ranked.filter(r=>r.site.zone===zoneFilter):ranked;
  const filterBanner=zoneFilter?`<div class="zone-filter"><span>${esc(zoneName(zoneFilter))}</span><button id="clear-zone">Clear filter ×</button></div>`:'';
  const anyPresent=Object.values(state.findings).some(isPresent);
  $('ranking').innerHTML='';$('anatomy-panel').hidden=!Object.keys(state.findings).length;
  if(!ranked.length){$('leading-result').innerHTML=`${filterBanner}<div class="empty-state"><div class="empty-symbol" aria-hidden="true">∴</div><h3>${anyPresent?'One more clue':'Start with a finding'}</h3><p>${anyPresent?'These signs are nonspecific on their own. Add a cranial nerve, long-tract, cortical or cord sign to compare anatomical sites.':'Mark a finding and choose its side. Your best-fitting anatomical patterns will appear here.'}</p><button class="text-button" data-mobile-view="examination">Add examination findings</button><br><button class="text-button" data-load-example="wallenberg">Try the Wallenberg case ↗</button><br><button class="text-button" data-go-practice>Or test yourself with a practice case ↗</button></div>`;}
  else if(!filtered.length){$('leading-result').innerHTML=`${filterBanner}<div class="empty-state"><h3>No matches in this region</h3><p>Clear the region filter to see all candidates.</p></div>`;}
  else{$('leading-result').innerHTML=filterBanner+resultCard(filtered[0],0);$('ranking').innerHTML=`${filtered.length>1?`<div class="rank-heading"><strong>Other possibilities</strong><span>${filtered.length-1} ${zoneFilter?'in this region':'alternative sites'}</span></div>`:''}${filtered.slice(1,visibleLimit).map((r,i)=>resultCard(r,i+1)).join('')}${filtered.length>visibleLimit?`<button class="more-button" id="show-more">Show ${Math.min(6,filtered.length-visibleLimit)} more <span class="muted">· ${filtered.length-visibleLimit} remaining</span></button>`:''}`;}
  renderSectionViewer('results');
  const top=ranked[0];
  $('results-eyebrow').textContent=zoneFilter?'Filtered by region':'02 / Follow the anatomy';
  $('mobile-result-count').textContent=top?`${Math.round(top.fit*100)}%`:'';
  $('dock-kicker').textContent=top?`Best pattern fit · ${Math.round(top.fit*100)}%`:'Your examination';$('dock-best').textContent=top?siteTitle(top.site):'Start with a localising finding';
  renderDock();
}
function summaryText(){
  const present=FINDINGS.filter(f=>isPresent(state.findings[f.id])).map(f=>label(f));
  const normal=FINDINGS.filter(f=>state.findings[f.id]==='N').map(f=>f.name);
  const lines=['Cranial nerve localiser · teaching summary',''];
  if(present.length)lines.push('Present:',...present.map(t=>`• ${t}`));
  if(normal.length)lines.push(`${present.length?'\n':''}Tested normal:`,...normal.map(t=>`• ${t}`));
  if(ranked.length){lines.push('','Best-fitting patterns:');ranked.slice(0,3).forEach((r,i)=>lines.push(`${i+1}. ${siteTitle(r.site)} (${r.site.name}) · ${lesionText(r)} · ${Math.round(r.fit*100)}% pattern fit`));}
  else lines.push('','No localising pattern yet.');
  lines.push('','Pattern fit is not probability. A teaching aid, not a diagnostic tool.');
  return lines.join('\n');
}
async function copySummary(){
  const text=summaryText();let copied=false;
  try{await navigator.clipboard.writeText(text);copied=true;}catch{}
  if(!copied){
    const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;top:0;left:0;opacity:0';
    document.body.append(area);area.select();try{copied=document.execCommand('copy');}catch{}area.remove();
  }
  toast(copied?'Summary copied. Paste it into your notes.':'Copying is not available on this device.');
}
function renderDock(){$('mobile-dock').hidden=currentTab!=='localise'||mobileView==='results'||resultsOnScreen||!ranked.length||!$('toast').hidden;}
function setMobileView(view){setTab(view==='results'?'results':'localise');$(`tab-${view==='results'?'results':'localise'}`).focus({preventScroll:true});}
function update(){renderFindings();renderResults();save();}
function loadFindings(findings){
  rememberAction();
  state.findings={...findings};
  zoneFilter=null;visibleLimit=6;$('finding-search').value='';
}
function loadPreset(id){
  const preset=PRESETS.find(p=>p.id===id);if(!preset)return;
  loadFindings(preset.findings);
  activePreset=id;update();
  $('case-sheet').close();setTab('results');$('results').focus({preventScroll:true});
  toast(`${preset.name} case loaded`,true);
  announce(`${preset.name} case loaded. ${ranked[0]?`Leading pattern: ${siteTitle(ranked[0].site)}, ${lesionText(ranked[0])}, ${Math.round(ranked[0].fit*100)} percent fit.`:''}`);
}

/* ---- Practice ---- */
function practicePool(){const topic=state.practice.topic;return PRACTICE_SITES.filter(s=>topic==='all'||TOPIC_BY_SITE.get(s.id)===topic);}
function newPracticeCase(){
  const pool=practicePool(),fresh=pool.filter(s=>!practice.recent.includes(s.id)),candidates=fresh.length?fresh:pool;
  for(let attempt=0;attempt<12;attempt++){
    const site=candidates[Math.floor(Math.random()*candidates.length)],made=makePracticeCase(site);
    if(!made)continue;
    practice={...practice,current:made,options:practiceOptions(made),answer:null,hint:false,number:practice.number+1};
    practice.recent=[site.id,...practice.recent].slice(0,Math.max(1,Math.min(8,Math.floor(pool.length/2))));
    return;
  }
}
function practiceHint(site){
  const z=ZONE_BY_ID.get(site.zone);
  if(['midbrain','pons','medulla'].includes(z.level))return `the lesion is in the ${z.level}. Which structures sit side by side there?`;
  if(z.level==='cortex')return 'the lesion is in the cerebral hemisphere. Which signs only the cortex or deep white matter can produce?';
  if(z.level==='cord')return 'the lesion is in the spinal cord or its roots. Which tracts cross where?';
  if(site.zone==='diffuse')return 'no single focal lesion explains everything. Think of a diffuse or neuromuscular process.';
  return `the lesion lies outside the brainstem: think about the ${z.name.toLowerCase()} region.`;
}
function practiceScore(){
  const p=state.practice;
  const share=p.answered?p.correct/p.answered:0,circumference=2*Math.PI*15;
  const ring=`<svg class="score-ring" viewBox="0 0 36 36" role="img" aria-label="${Math.round(share*100)} percent correct"><circle class="ring-bg" cx="18" cy="18" r="15"/><circle class="ring-fg" cx="18" cy="18" r="15" stroke-dasharray="${(circumference*share).toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 18 18)"/><text x="18" y="21.3" text-anchor="middle">${Math.round(share*100)}%</text></svg>`;
  $('practice-score').innerHTML=p.answered?`${ring}<span><b>${p.streak}</b> in a row</span><span><b>${p.correct}</b>/${p.answered} correct</span><span>Best run <b>${p.best}</b></span><button class="text-button" id="practice-reset">Reset</button>`:'<span>Your score appears here</span>';
  $('practice-badge').textContent=p.streak>1?String(p.streak):'';
}
function renderPractice(){
  if(!practice.current)newPracticeCase();
  const c=practice.current,answered=practice.answer!==null;
  $('practice-topics').innerHTML=[{id:'all',name:'All topics'},...TOPICS].map(t=>`<button class="topic-chip" data-practice-topic="${t.id}" aria-pressed="${state.practice.topic===t.id}">${esc(t.name)}</button>`).join('');
  practiceScore();
  const present=FINDINGS.filter(f=>isPresent(c.findings[f.id])),normal=FINDINGS.filter(f=>c.findings[f.id]==='N');
  const tags=(list,cls,text)=>`<ul class="practice-tags ${cls}">${list.map(f=>`<li>${esc(text(f))}</li>`).join('')}</ul>`;
  const options=practice.options.map((s,i)=>{
    const cls=!answered?'':s===c.site?'correct':s.id===practice.answer?'wrong':'dim';
    const mark=!answered?'':s===c.site?'<span class="option-mark" aria-hidden="true">✓</span><span class="sr-only">, the answer</span>':s.id===practice.answer?'<span class="option-mark" aria-hidden="true">✕</span><span class="sr-only">, your choice</span>':'';
    return `<button class="practice-option ${cls}" data-practice-option="${s.id}" ${answered?'aria-disabled="true"':''}><span class="option-letter" aria-hidden="true">${'ABCD'[i]}</span><span class="option-text"><strong>${esc(siteTitle(s))}</strong><small>${esc(s.name)}</small></span>${mark}</button>`;
  }).join('');
  let feedback='';
  if(answered){
    const answer=c.site,result=c.ranking[0],chosen=SITE_BY_ID.get(practice.answer),correct=chosen===answer;
    const clues=FINDINGS.filter(f=>isPresent(c.findings[f.id])&&weightOf(answer,f.id)>=2).map(f=>label(f,c.findings));
    const why=correct?null:evidenceFor(scoreSite(chosen,c.findings),c.findings);
    const section=sectionForSite(answer),sides=resultSides(result);
    feedback=`<section class="practice-feedback ${correct?'is-correct':'is-wrong'}" id="practice-feedback" tabindex="-1" aria-labelledby="feedback-verdict">
      <p class="feedback-verdict" id="feedback-verdict">${correct?'Correct':'Not this time'}</p>
      <h3>${esc(siteTitle(answer))}</h3><p class="feedback-region">${esc(answer.name)} · ${esc(zoneName(answer.zone))} · ${esc(lesionText(result))}</p>
      ${clues.length?`<div class="evidence-block"><div class="evidence-label good">Key clues</div><div class="tags">${clues.map(t=>`<span class="tag good">${esc(t)}</span>`).join('')}</div></div>`:''}
      ${why?`<div class="evidence-block"><div class="evidence-label against">Why not ${esc(siteTitle(chosen))}?</div><div class="tags">${[...why.against.map(t=>`<span class="tag against">${esc(t)}</span>`),...why.unexplained.map(t=>`<span class="tag unexplained">Doesn’t explain: ${esc(t)}</span>`)].join('')||'<span class="no-evidence">It fits less completely: fewer of its expected signs are present.</span>'}</div></div>`:''}
      ${section?`<figure class="section-figure feedback-figure">${sectionSvg(section,{zoneSides:sides,zone:answer.zone,states:structureStates(section,c.findings,sides),prefix:'practice'})}<figcaption>${esc(SECTION_BY_ID.get(section).name)}, as on MRI: patient’s right on your left.</figcaption></figure>`:''}
      <blockquote class="pearl"><span class="pearl-label">At the bedside</span>${esc(answer.pearl)}</blockquote>
      <div class="practice-next"><button class="primary-action" id="practice-next">Next case <span aria-hidden="true">→</span></button><button class="secondary-action" id="practice-open">Open in localiser <span aria-hidden="true">↗</span></button></div>
    </section>`;
  }
  $('practice-card').innerHTML=`<header class="practice-case-head"><h3 id="practice-case-title" tabindex="-1">Case ${practice.number}</h3><span class="side-pill">${esc(TOPICS.find(t=>t.id===TOPIC_BY_SITE.get(c.site.id)).name)}</span></header>
    <div class="practice-findings"><p class="practice-label">On examination</p>${tags(present,'present',f=>label(f,c.findings))}${normal.length?`<p class="practice-label">Tested normal</p>${tags(normal,'normal',f=>f.name)}`:''}</div>
    <div class="practice-question" role="group" aria-labelledby="practice-question-label"><p class="practice-label" id="practice-question-label">Which localisation explains this best?</p>${options}</div>
    ${answered?feedback:`<div class="practice-actions">${practice.hint?`<p class="practice-hint"><b>Hint:</b> ${esc(practiceHint(c.site))}</p>`:'<button class="text-button" id="practice-hint">Show a hint</button>'}<button class="text-button" id="practice-skip">Skip this case</button></div>`}`;
}
function answerPractice(id){
  if(practice.answer!==null||!practice.current)return;
  practice.answer=id;
  const correct=id===practice.current.site.id,p=state.practice;
  p.answered++;if(correct){p.correct++;p.streak++;p.best=Math.max(p.best,p.streak);}else p.streak=0;
  save();renderPractice();
  $('practice-feedback').focus({preventScroll:true});
  $('practice-feedback').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  announce(correct?`Correct. ${siteTitle(practice.current.site)}, ${lesionText(practice.current.ranking[0])}.`:`Not this time. The best fit is ${siteTitle(practice.current.site)}, ${lesionText(practice.current.ranking[0])}.`);
}
function nextPractice(){newPracticeCase();renderPractice();$('practice-case-title').focus({preventScroll:true});scrollTo({top:$('panel-practice').offsetTop-12,behavior:'instant'});announce(`Case ${practice.number}. ${FINDINGS.filter(f=>isPresent(practice.current.findings[f.id])).map(f=>label(f,practice.current.findings)).join(', ')}.`);}
function openPracticeInLocaliser(){
  const c=practice.current;if(!c)return;
  loadFindings(c.findings);activePreset=null;update();setTab('results');$('results').focus({preventScroll:true});
  toast('Practice case opened in the localiser',true);
}

/* ---- Navigation ---- */
function setTab(name){
  if(currentTab===name)return;
  if(currentTab==='localise')examinationScroll=scrollY;
  currentTab=name;mobileView=name==='results'?'results':'examination';resultsOnScreen=false;
  for(const tab of TABS){const active=name===tab;$(`tab-${tab}`).setAttribute('aria-selected',String(active));$(`tab-${tab}`).tabIndex=active?0:-1;}
  const secondary=name==='practice'||name==='reference';
  $('view-reference').hidden=!secondary;$('view-localise').hidden=secondary;
  $('panel-practice').hidden=name!=='practice';$('panel-reference').hidden=name!=='reference';
  $('view-localise').setAttribute('aria-labelledby',name==='results'?'tab-results':'tab-localise');
  $('workspace').dataset.mobileView=mobileView;
  $('mobile-examination').setAttribute('aria-pressed',String(mobileView==='examination'));$('mobile-results').setAttribute('aria-pressed',String(mobileView==='results'));
  $('marked-review').open=false;
  if(secondary)dismissToast();
  if(name==='practice')renderPractice();
  renderDock();
  if(secondary)scrollTo({top:0,behavior:'instant'});
  else if(matchMedia('(max-width: 959px)').matches)scrollTo({top:name==='localise'?examinationScroll:0,behavior:'instant'});
  else if(name==='results')$('results').scrollIntoView({block:'start'});
  announce({results:'Results. Use Findings to return to the examination.',reference:'Bedside reference.',practice:`Practice. Case ${practice.number}.`,localise:'Findings. Your examination has been retained.'}[name]);
}
function renderReference(){
  $('nerve-grid').innerHTML=NERVES.map(n=>`<details class="nerve-card"><summary class="nerve-head"><span class="roman">${n.roman}</span><h3>${esc(n.name)}</h3>${levelGlyph(...NERVE_GLYPHS[n.roman])}</summary><dl class="nerve-dl">${[['Nucleus',n.nucleus],['Course / foramen',n.course],['Function',n.function],['Bedside test',n.test],['Lesion signs',n.signs]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`).join('');
  $('rule-table').innerHTML=RULE_OF_FOUR.map(r=>`<tr><th scope="row">${esc(r.level)}</th><td>${esc(r.nerves)}</td><td>${esc(r.medial)}</td><td>${esc(r.lateral)}</td></tr>`).join('');
  $('rules-grid').innerHTML=RULES.map((r,i)=>`<article class="rule"><span class="rule-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div></article>`).join('');
  const sources=[['Cranial nerve examination · Merck Manual','https://www.merckmanuals.com/professional/neurologic-disorders/neurologic-examination/how-to-assess-the-cranial-nerves'],['Neuroanatomy · University of Utah','https://neurologicexam.med.utah.edu/adult/html/cranialnerve_anatomy.html'],['Rule of 4 · Practical Neurology','https://pn.bmj.com/content/11/3/167'],['Modern management of III palsy · Eye','https://pmc.ncbi.nlm.nih.gov/articles/PMC8727561/'],['Adult strabismus guidance · AAO','https://www.aaojournal.org/article/S0161-6420%2824%2900013-7/fulltext'],['Kernohan phenomenon · Systematic review','https://pmc.ncbi.nlm.nih.gov/articles/PMC9452377/'],['Numb chin syndrome · Case series','https://pmc.ncbi.nlm.nih.gov/articles/PMC6217713/'],['HINTS in the acute vestibular syndrome · Stroke','https://pubmed.ncbi.nlm.nih.gov/19762709/'],['Pituitary apoplexy · UK guideline','https://doi.org/10.1111/j.1365-2265.2010.03913.x'],['Giant cell arteritis · BSR guideline','https://ueaeprints.uea.ac.uk/id/eprint/73817/']];
  $('source-links').innerHTML=sources.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`).join('');
  renderSectionViewer('reference');
}
function renderCases(){
  let n=0;
  $('presets').innerHTML=TOPICS.map(t=>({t,presets:PRESETS.filter(p=>TOPIC_BY_SITE.get(p.site)===t.id)})).filter(g=>g.presets.length).map(({t,presets})=>`<section class="case-group"><h3 class="case-group-title">${esc(t.name)}</h3><div class="case-grid">${presets.map(p=>`<button class="preset" data-preset="${p.id}" aria-pressed="false"><span class="case-index">${String(++n).padStart(2,'0')}</span><strong>${esc(p.name)}</strong><span class="case-note">${esc(p.note)}</span></button>`).join('')}</div></section>`).join('');
}
function findingRow(f){
  const sides=f.sided?`<span class="side-chips" role="group" aria-label="Side: ${esc(f.name)}">${[['R','R','right'],['L','L','left'],...(f.both===false?[]:[['B','Both','both sides']])].map(([value,text,word])=>`<button class="side-chip" data-side-for="${f.id}" data-side-value="${value}" aria-pressed="false" aria-label="${esc(f.name)}, ${word}">${text}</button>`).join('')}</span>`:'';
  return `<div class="finding-row${f.sided?' sided':''}" id="finding-row-${f.id}"><button class="finding" id="finding-${f.id}" data-finding="${f.id}" data-state="untested"><span class="state-mark" aria-hidden="true"></span><span class="finding-label"></span>${f.soft?'<span class="soft-indicator" aria-hidden="true">Soft</span>':''}</button>${sides}<button class="finding-info" id="info-${f.id}" data-info="${f.id}" aria-haspopup="dialog"><span aria-hidden="true">i</span></button></div>`;
}

function init(){
  applyTheme();
  const categories=[['eyes','III','Eyes'],['vision','I–II','Vision & smell'],['nystagmus','≋','Nystagmus'],['face','VII','Face'],['hearing','VIII','Hearing & balance'],['bulbar','XII','Bulbar'],['tracts','↕','Limbs'],['cortex','Cx','Cortex'],['cord','C–S','Spinal cord'],['coma','GCS','Conscious level'],['context','＋','Context'],['all','∴','All signs']];
  $('categories').innerHTML=categories.map(([id,symbol,name])=>`<button class="category" data-category="${id}" aria-pressed="${id===activeCategory}"><span class="category-symbol" aria-hidden="true">${symbol}</span><span>${name}</span><span class="category-count"></span></button>`).join('');
  $('finding-groups').innerHTML=GROUPS.map(g=>`<details class="group" id="group-${g.id}" open><summary><span class="nerve-label" aria-hidden="true">${g.nerve}</span><span class="group-title">${g.name}</span><span class="group-counter" id="counter-${g.id}"></span><span class="chevron" aria-hidden="true"></span></summary><div class="group-content"><div class="chips">${FINDINGS.filter(f=>f.group===g.id).map(findingRow).join('')}</div></div></details>`).join('');
  renderCases();
  initMap();renderReference();renderFindings();renderResults();save();
  $('atlas-count').textContent=SITES.length;$('case-count').textContent=PRESETS.length;
  // On the website, offer the Android app; inside the Android shell the page is served from appassets.
  $('apk-link').hidden=location.protocol!=='https:'||location.hostname==='appassets.androidplatform.net';
  document.addEventListener('click',event=>{
    const structure=event.target.closest('[data-structure]');
    if(structure&&structure.closest('.section-viewer')){focusStructure(structure.closest('.section-viewer').dataset.viewer,structure.dataset.structure);return;}
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.finding){const id=b.dataset.finding,fromReview=b.dataset.review;cycleFinding(id);if(fromReview){const target=$(`review-${id}`)||$('marked-chips').querySelector('button')||$('review-sheet').querySelector('[data-undo]');target.focus({preventScroll:true});}}
    else if(b.dataset.sideFor)toggleSide(b.dataset.sideFor,b.dataset.sideValue);
    else if(b.dataset.info)openCheck(b.dataset.info,'list');
    else if(b.dataset.suggest)openCheck(b.dataset.suggest,'suggest');
    else if(b.hasAttribute('data-check-value')){const value=b.dataset.checkValue,id=activeCheckId,origin=checkOrigin;$('check-sheet').close();if(VALUES.includes(value))setFinding(id,value);else if(state.findings[id])setFinding(id,0);(origin==='list'?$(`finding-${id}`):$('results')).focus({preventScroll:true});}
    else if(b.hasAttribute('data-close-sheet'))b.closest('dialog').close();
    else if(b.hasAttribute('data-undo'))undoLast();
    else if(b.dataset.mobileView)setMobileView(b.dataset.mobileView);
    else if(b.dataset.category){activeCategory=b.dataset.category;$('finding-search').value='';$('category-sheet').close();filterFindings();announce(`${b.textContent.replace(/\d+$/,'').trim()} findings`);}
    else if(b.dataset.preset)loadPreset(b.dataset.preset);
    else if(b.dataset.loadExample)loadPreset(b.dataset.loadExample);
    else if(b.dataset.zone){zoneFilter=zoneFilter===b.dataset.zone?null:b.dataset.zone;visibleLimit=6;renderResults();announce(zoneFilter?`Results filtered to ${zoneName(zoneFilter)}.`:'Showing all regions.');}
    else if(b.dataset.sectionLevel){const viewer=b.closest('.section-viewer').dataset.viewer;viewers[viewer].chosen=b.dataset.sectionLevel;viewers[viewer].focus=null;renderSectionViewer(viewer);$(viewer==='results'?'result-sections':'reference-sections').querySelector(`[data-section-level="${b.dataset.sectionLevel}"]`).focus({preventScroll:true});announce(`${SECTION_BY_ID.get(b.dataset.sectionLevel).name} section.`);}
    else if(b.dataset.structureChip)focusStructure(b.closest('.section-viewer').dataset.viewer,b.dataset.structureChip);
    else if(b.dataset.practiceTopic){state.practice.topic=b.dataset.practiceTopic;save();practice.current=null;practice.recent=[];renderPractice();$('practice-topics').querySelector(`[data-practice-topic="${state.practice.topic}"]`).focus({preventScroll:true});announce(`${b.textContent} selected. Case ${practice.number}.`);}
    else if(b.dataset.practiceOption)answerPractice(b.dataset.practiceOption);
    else if(b.hasAttribute('data-go-practice'))setTab('practice');
    else if(b.id==='practice-hint'){practice.hint=true;renderPractice();$('practice-skip').focus({preventScroll:true});announce(`Hint: ${practiceHint(practice.current.site)}`);}
    else if(b.id==='practice-skip'||b.id==='practice-next')nextPractice();
    else if(b.id==='practice-open')openPracticeInLocaliser();
    else if(b.id==='practice-reset'){Object.assign(state.practice,{answered:0,correct:0,streak:0,best:0});save();practiceScore();$('practice-title').focus();announce('Practice score reset.');}
    else if(b.id==='copy-summary')copySummary();
    else if(b.id==='clear-zone'){zoneFilter=null;renderResults();$('results').focus({preventScroll:true});}
    else if(b.id==='show-more'){const previous=visibleLimit;visibleLimit+=6;renderResults();const firstNew=document.querySelectorAll('.result-summary')[previous];firstNew?.focus({preventScroll:true});}
    else if(b.id==='clear-all'||b.id==='review-clear')clearFindings();
    else if(b.id==='search-clear'||b.id==='reset-search'){$('finding-search').value='';filterFindings();$('finding-search').focus();}
    else if(TABS.includes(b.id.replace('tab-',''))&&b.id.startsWith('tab-'))setTab(b.id.replace('tab-',''));
    else if(b.id==='see-results')setMobileView('results');
    else if(b.id==='open-categories')openSheet('category-sheet');
    else if(b.id==='open-cases')openSheet('case-sheet');
    else if(b.id==='open-review'||b.id==='review-results')openSheet('review-sheet');
    else if(b.id==='dismiss-toast')dismissToast();
  });
  $('finding-search').addEventListener('input',filterFindings);
  $('theme').addEventListener('change',e=>{state.theme=e.target.value;applyTheme();save();});
  document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
  document.querySelector('[role="tablist"]').addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const i=TABS.indexOf(currentTab),name=e.key==='Home'?TABS[0]:e.key==='End'?TABS[TABS.length-1]:TABS[(i+(e.key==='ArrowRight'?1:TABS.length-1))%TABS.length];setTab(name);$(`tab-${name}`).focus();}});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{resultsOnScreen=entries[0].isIntersecting;renderDock();},{threshold:0});observer.observe($('results'));}
  else{const check=()=>{const r=$('results').getBoundingClientRect();resultsOnScreen=r.top<innerHeight&&r.bottom>0;renderDock();};addEventListener('scroll',check,{passive:true});addEventListener('resize',check);check();}
}
init();
// Read-only inspection hooks for offline verification; the application has no network API.
window.CranialLocaliser=Object.freeze({scoreSite,rankSites,examineNext,makePracticeCase,structureStates,getState:()=>JSON.parse(JSON.stringify(state)),findings:FINDINGS,sites:SITES,presets:PRESETS,zones:ZONES,sections:SECTIONS});
