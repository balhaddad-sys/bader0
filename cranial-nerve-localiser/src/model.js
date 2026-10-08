
/* ---------------------------------------------------------------------------
 * The ranking model. Pure functions of a findings map ({id: 1 present, -1 tested
 * normal}); the UI and the offline tests both call these.
 * ------------------------------------------------------------------------- */
function scoreSite(site, findings){
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
function rankSites(findings){return SITES.map(s=>scoreSite(s,findings)).filter(s=>s.eligible).sort((a,b)=>b.fit-a.fit||b.E-a.E||b.site.prior-a.site.prior);}
function examineNext(candidates,findings){
  if(candidates.length<2)return [];
  const range=values=>Math.max(...values)-Math.min(...values);
  return FINDINGS.filter(f=>!findings[f.id]&&candidates.some(c=>c.site.w[f.id]||c.site.ex.includes(f.id))).map(f=>{
    const p=candidates.map(c=>scoreSite(c.site,{...findings,[f.id]:1}).fit-c.fit);
    const a=candidates.map(c=>scoreSite(c.site,{...findings,[f.id]:-1}).fit-c.fit);
    return {finding:f,spread:Math.max(range(p),range(a))};
  }).filter(f=>f.spread>.08).sort((a,b)=>b.spread-a.spread).slice(0,5);
}

/* Fill a finding template for a side of cranial signs ('right' or 'left'). */
function sidedText(text,side){
  const other=side==='right'?'left':'right';
  return text.replaceAll('{s}',side).replaceAll('{o}',other).replaceAll('{S}',side[0].toUpperCase()+side.slice(1));
}

/* ---------------------------------------------------------------------------
 * Practice cases. A case is built from one site's own weights, then accepted only
 * if the model itself ranks that site first by a clear margin, so every question
 * has one defensible answer within this teaching model.
 * ------------------------------------------------------------------------- */
const PRACTICE_MARGIN=.04;
function shuffled(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function makePracticeCase(site,rng=Math.random){
  const byWeight=n=>Object.entries(site.w).filter(([,w])=>n===3?w>=3:w===n).map(([id])=>id);
  const defining=byWeight(3),typical=byWeight(2),supportive=byWeight(1);
  for(let attempt=0;attempt<40;attempt++){
    const complete=attempt>=20;
    const present=new Set(defining);
    for(const id of typical)if(complete||rng()<.7)present.add(id);
    for(const id of supportive)if(rng()<.3)present.add(id);
    if(!present.size&&typical.length)present.add(typical[Math.floor(rng()*typical.length)]);
    if(present.size<2){const pool=[...typical,...supportive].filter(id=>!present.has(id));if(pool.length)present.add(pool[Math.floor(rng()*pool.length)]);}
    const findings={};
    for(const id of present)findings[id]=1;
    const negatives=shuffled(site.ex.filter(id=>!present.has(id)),rng);
    for(const id of complete?negatives:negatives.slice(0,2+Math.floor(rng()*2)))findings[id]=-1;
    const ranking=rankSites(findings);
    if(ranking[0]?.site.id===site.id&&(!ranking[1]||ranking[0].fit-ranking[1].fit>=PRACTICE_MARGIN))return {site,findings,ranking};
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
/* The proximal facial pattern always ties with Bell’s palsy in this model, so it cannot be asked fairly. */
const PRACTICE_SITES=SITES.filter(s=>s.id!=='proximal-facial');
