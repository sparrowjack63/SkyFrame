// js/catalog/filter.js — Filtres, tri, accessibilité

function isRatingFilter(f){ return /^stars[1-5]$/.test(f); }

function getFilterStars(f){ return isRatingFilter(f) ? parseInt(f.slice(5),10) : null; }

function matchesObjectFilter(o, filter, lstD, mp){
  if(o.cat==='Planet') return filter==='all'||filter==='accessible'||filter==='planet';
  if(filter==='all') return true;
  if(filter==='nebula') return o.type==='nebula'||o.type==='snr';
  if(filter==='galaxy') return o.type==='galaxy';
  if(filter==='cluster') return o.type==='cluster';
  if(filter==='planetary') return o.type==='planetary';
  if(filter==='snr') return o.type==='snr';
  if(filter==='sh2') return o.cat==='Sh2';
  if(filter==='planet') return false;
  if(filter==='dualband'||filter==='lextreme') return o.emission;
  if(filter==='lightpollution'||filter==='rgb') return !o.emission;
  if(isRatingFilter(filter)) return getRating(o.id).stars===getFilterStars(filter);
  if(filter==='spring') return o.months&&o.months.some(m=>[2,3,4].includes(m));
  if(filter==='summer') return o.months&&o.months.some(m=>[5,6,7].includes(m));
  if(filter==='autumn') return o.months&&o.months.some(m=>[8,9,10].includes(m));
  if(filter==='winter') return o.months&&o.months.some(m=>[11,0,1].includes(m));
  if(filter==='accessible'){
    const{alt,az}=altaz(o.ra,o.dec,lstD,S.lat);
    return isAcc(alt,az)&&canShoot(o,mp.ill)&&alt>0;
  }
  return true;
}

function syncFilterButtons(activeFilter, clickedEl){
  document.querySelectorAll('.filter-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.filter===activeFilter);
  });
  if(clickedEl && !clickedEl.dataset.filter) clickedEl.classList.add('active');
}

function getCatalogById(){
  const byId={};
  CATALOG.forEach(o=>{ byId[o.id]=o; });
  return byId;
}

function getAnyCatalogById(){
  const byId=getCatalogById();
  CATALOG_TOPN_LIST.forEach(o=>{ if(!byId[o.id]) byId[o.id]=o; });
  CATALOG_FALLBACK.forEach(o=>{ if(!byId[o.id]) byId[o.id]=o; });
  return byId;
}

function resolveObjectById(id, t){
  if(PLANETS_META[id]) return t ? getPlanetObj(id,t) : getPlanetObj(id,getViewTime());
  const byId=getAnyCatalogById();
  return byId[id] || null;
}

function withComputedState(o, lstD, mp){
  const {alt,az}=altaz(o.ra,o.dec,lstD,S.lat);
  const sc=o.cat==='Planet'?{total:50,sA:50,sB:0,sC:0}:calcScore(o);
  return {...o,alt,az,acc:isAcc(alt,az),shoot:canShoot(o,mp.ill),score:sc.total};
}

function getForcedCompanionObjects(objs, sourceById, predicate, seenIds){
  const extra=[];
  for(let i=0;i<objs.length;i++){
    const o=objs[i];
    const companions=parseCompanions(getRating(o.id)?.comp || CUSTOM_META[o.id]?.rating?.comp);
    companions.forEach(cid=>{
      if(seenIds.has(cid)) return;
      const co=sourceById[cid];
      if(!co || (predicate && !predicate(co))) return;
      extra.push(co);
      seenIds.add(cid);
    });
  }
  return extra;
}

function isAccessibleAtAnyNightMoment(o, nb, mpNow){
  const STEPS=32;
  const nightBase=getDateForNightHour(nb.sunset);
  for(let i=0;i<=STEPS;i++){
    const h=nb.sunset + ((nb.sunrise-nb.sunset)*i/STEPS);
    const tc=getDateForNightHour(h, nightBase);
    const ld=lst(jd(tc),S.lon);
    const {alt,az}=altaz(o.ra,o.dec,ld,S.lat);
    const mp=moon(tc);
    if(isAcc(alt,az)&&canShoot(o,mp.ill)&&alt>0) return true;
  }
  return false;
}

function getVisibleCatalogList(filter, lstD, mp, mode='targets'){
  const topNIds=new Set(CATALOG_TOPN_LIST.map(o=>o.id));
  const catalogById=getCatalogById();
  let catList;
  if(filter==='accessible'){
    if(mode==='chart'){
      const nb=getOrComputeNightBounds();
      const isChartAccessible=o=>isAccessibleAtAnyNightMoment(o,nb,mp);
      catList=CATALOG_TOPN_LIST
        .map(o=>catalogById[o.id] || o)
        .filter(o=>isChartAccessible(o));
      const seenIds=new Set(catList.map(o=>o.id));
      catList.push(...getForcedCompanionObjects(catList,catalogById,isChartAccessible,seenIds));
    }else{
      catList=CATALOG_TOPN_LIST
        .map(o=>catalogById[o.id] || o)
        .filter(o=>matchesObjectFilter(o,filter,lstD,mp));
      const seenIds=new Set(catList.map(o=>o.id));
      catList.push(...getForcedCompanionObjects(catList,catalogById,o=>matchesObjectFilter(o,filter,lstD,mp),seenIds));
    }
  }else{
    catList=CATALOG_TOPN_LIST
      .map(o=>catalogById[o.id] || o)
      .filter(o=>matchesObjectFilter(o,filter,lstD,mp));
  }
  return catList;
}

function sortVisibleObjects(objs, filter){
  objs.sort((a,b)=>{
    if(filter==='accessible'){
      const starsA=getRating(a.id).stars||0;
      const starsB=getRating(b.id).stars||0;
      if(starsA!==starsB) return starsB-starsA;
      if(b.score!==a.score) return b.score-a.score;
      return b.alt-a.alt;
    }
    const tA=a.acc&&a.shoot?2:a.alt>0?1:0;
    const tB=b.acc&&b.shoot?2:b.alt>0?1:0;
    if(tA!==tB) return tB-tA;
    return b.score-a.score;
  });
  return objs;
}
