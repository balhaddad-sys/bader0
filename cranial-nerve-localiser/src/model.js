
/* ---------------------------------------------------------------------------
 * The ranking model. Pure functions of a findings map: {id: 'R' | 'L' | 'B' for a
 * sided finding present on the right, left or both sides, 'P' for an unsided finding
 * present, 'N' for tested normal}. The UI and the offline tests both call these.
 * ------------------------------------------------------------------------- */
const OTHER_SIDE = {R:'L', L:'R'};
const SIDE_WORD = {R:'right', L:'left'};

/* Parse 'finding:rel' keys once. Sided findings default to the same side as a unilateral lesion. */
function parseLink(key, defaultRel){
  const [id,rel]=key.split(':');
  const f=FINDING_BY_ID.get(id);
  return {id, rel:f&&f.sided?(rel||defaultRel):null};
}
for(const site of SITES){
  const def=site.side==='unilateral'?'i':'a';
  site.entries=Object.entries(site.w).map(([key,w])=>({...parseLink(key,def),w})).sort((a,b)=>b.w-a.w);
  site.byFinding=new Map();
  for(const e of site.entries){if(!site.byFinding.has(e.id))site.byFinding.set(e.id,[]);site.byFinding.get(e.id).push(e);}
  site.excluders=site.ex.map(key=>parseLink(key,def));
  site.hypotheses=site.side==='unilateral'?(site.lesionSides||['R','L']):[null];
}
function weightOf(site,id){return Math.max(0,...(site.byFinding.get(id)||[]).map(e=>e.w));}
function excludes(site,id){return site.excluders.some(x=>x.id===id);}

/* How well a recorded value fits a link, for a lesion on side h: 1 full, 0.5 partial, 0 none. */
function sideMatch(rel,value,h){
  if(rel===null||value==='P'||rel==='a')return 1;
  if(rel==='b')return value==='B'?1:.5;
  if(value==='B')return .5;
  return value===(rel==='i'?h:OTHER_SIDE[h])?1:0;
}
function scoreHypothesis(site,findings,h){
  let E=0,A=0,U=0,C=0,O=0,eligible=false;
  const explained=new Set();
  for(const [id,entries] of site.byFinding){
    const v=findings[id],top=entries[0].w;
    if(v==='N'){A+=top>=2?top:top*.5;continue;}
    if(!v){if(top>=2)U+=top*.25;continue;}
    let best=0,bestW=0;
    for(const e of entries){const s=sideMatch(e.rel,v,h)*e.w;if(s>best){best=s;bestW=e.w;}}
    if(best){E+=best;explained.add(id);if(bestW>=2)eligible=true;}
    else if(top>=2)U+=top*.25; // present only on the unexpected side: the expected side is still untested
  }
  const counted=new Set();
  for(const x of site.excluders){
    const v=findings[x.id];
    if(!v||counted.has(x.id))continue;
    if(v==='N'){E+=.5;counted.add(x.id);}
    else if(sideMatch(x.rel,v,h)===1){C+=3;counted.add(x.id);}
  }
  for(const f of FINDINGS){const v=findings[f.id];if(v&&v!=='N'&&!explained.has(f.id))O+=f.soft?.5:1.5;}
  const denominator=E+A+U+C+O;
  return {site,side:h,E,A,U,C,O,fit:denominator?E/denominator:0,eligible};
}
/* Best lesion side for a site. `sideKnown` is false when both sides fit identically. */
function scoreSite(site,findings){
  const results=site.hypotheses.map(h=>scoreHypothesis(site,findings,h))
    .sort((a,b)=>(b.eligible-a.eligible)||(b.fit-a.fit)||(b.E-a.E));
  const best=results[0];
  best.sideKnown=results.length<2||Math.abs(results[1].fit-best.fit)>1e-9||Math.abs(results[1].E-best.E)>1e-9||results[1].eligible!==best.eligible;
  return best;
}
function rankSites(findings){return SITES.map(s=>scoreSite(s,findings)).filter(s=>s.eligible).sort((a,b)=>b.fit-a.fit||b.E-a.E||b.site.prior-a.site.prior);}
function examineNext(candidates,findings){
  if(candidates.length<2)return [];
  const range=values=>Math.max(...values)-Math.min(...values);
  return FINDINGS.filter(f=>!findings[f.id]&&candidates.some(c=>c.site.byFinding.has(f.id)||excludes(c.site,f.id))).map(f=>{
    const outcomes=f.sided?['R','L','N']:['P','N'];
    const spread=Math.max(...outcomes.map(v=>range(candidates.map(c=>scoreSite(c.site,{...findings,[f.id]:v}).fit-c.fit))));
    return {finding:f,spread};
  }).filter(f=>f.spread>.08).sort((a,b)=>b.spread-a.spread).slice(0,5);
}

/* Label for a finding as recorded: "Ptosis on the right", "Bilateral ptosis" or just "Ptosis". */
function findingLabel(f,value){
  if(!f.sided)return f.label;
  if(value==='R'||value==='L'){const word=SIDE_WORD[value];return f.sided.replaceAll('{side}',word).replaceAll('{Side}',word[0].toUpperCase()+word.slice(1));}
  if(value==='B')return f.both||`${f.name} on both sides`;
  return f.name;
}

/* ---------------------------------------------------------------------------
 * Practice cases. A case is built from one site's own weights for a random lesion
 * side, then accepted only if the model ranks that site, on that side, first by a
 * clear margin, so every question has one defensible answer within this model.
 * ------------------------------------------------------------------------- */
const PRACTICE_MARGIN=.04;
function shuffled(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function recordedValue(link,h,rng){
  if(!link.rel)return 'P';
  if(link.rel==='b')return 'B';
  if(link.rel==='a')return rng()<.5?'R':'L';
  return link.rel==='i'?h:OTHER_SIDE[h];
}
function makePracticeCase(site,rng=Math.random){
  const pick=n=>site.entries.filter(e=>n===3?e.w>=3:e.w===n);
  const defining=pick(3),typical=pick(2),supportive=pick(1);
  for(let attempt=0;attempt<40;attempt++){
    const complete=attempt>=20;
    const h=site.hypotheses[Math.floor(rng()*site.hypotheses.length)];
    const findings={};
    const add=e=>{if(!findings[e.id])findings[e.id]=recordedValue(e,h,rng);};
    defining.forEach(add);
    for(const e of typical)if(complete||rng()<.7)add(e);
    for(const e of supportive)if(rng()<.3)add(e);
    if(!Object.keys(findings).length&&typical.length)add(typical[Math.floor(rng()*typical.length)]);
    if(Object.keys(findings).length<2){const pool=[...typical,...supportive].filter(e=>!findings[e.id]);if(pool.length)add(pool[Math.floor(rng()*pool.length)]);}
    const negatives=shuffled([...new Set(site.excluders.map(x=>x.id))].filter(id=>!findings[id]),rng);
    for(const id of complete?negatives:negatives.slice(0,2+Math.floor(rng()*2)))findings[id]='N';
    const ranking=rankSites(findings),top=ranking[0];
    const sided=Object.values(findings).some(v=>v==='R'||v==='L'||v==='B');
    const rightSide=h===null||!sided||(top?.side===h&&top.sideKnown);
    if(top?.site===site&&rightSide&&(!ranking[1]||top.fit-ranking[1].fit>=PRACTICE_MARGIN))return {site,side:sided?h:null,findings,ranking};
  }
  return null;
}
/* Four choices: the answer, its two closest rivals in the model, and one wider distractor. */
function practiceOptions(practiceCase,rng=Math.random){
  const answer=practiceCase.site;
  const rivals=practiceCase.ranking.slice(1).map(r=>r.site);
  const chosen=rivals.slice(0,2);
  const topic=TOPIC_BY_SITE.get(answer.id);
  const pool=[...rivals.slice(2,8),...shuffled(SITES.filter(s=>TOPIC_BY_SITE.get(s.id)===topic),rng),...shuffled(SITES,rng)]
    .filter(s=>s!==answer&&!chosen.includes(s));
  while(chosen.length<3&&pool.length){const next=pool.splice(chosen.length<2?0:Math.floor(rng()*Math.min(pool.length,6)),1)[0];if(!chosen.includes(next))chosen.push(next);}
  return shuffled([answer,...chosen],rng);
}
/* Sites that can never win a fair question in this model; the tests keep this list honest. */
const PRACTICE_EXCLUDED=['proximal-facial'];
const PRACTICE_SITES=SITES.filter(s=>!PRACTICE_EXCLUDED.includes(s.id));
