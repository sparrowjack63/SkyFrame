// État global top-N
let CATALOG_TOP_N = parseInt(localStorage.getItem('catalog_top_n') || '100', 10);
let CATALOG_TOPN_LIST = [];

function mergeCatalogAliases(baseAliases, nextAliases){
  return [...new Set([...(baseAliases || []), ...(nextAliases || [])])];
}

function mergeSuggestionCatalogEntry(base, next){
  if(!base) return next ? {...next} : null;
  if(!next) return {...base};
  const aliases=mergeCatalogAliases(base.aliases, next.aliases);
  return {
    ...base,
    ...next,
    aliases: aliases.length ? aliases : undefined,
  };
}

// js/catalog/scoring.js — Calcul de score et top-N

function calcScore(o) {
  // A. Brillance de surface (40 pts max)
  let sA = 0;
  if (o.type === 'galaxy') {
    if (o.sb !== null && o.sb !== undefined) {
      // SB=20 → 40pts, SB=25.5 → 0pts
      sA = Math.max(0, Math.min(40, (25.5 - o.sb) / 5.5 * 40));
    }
  } else if (o.type === 'nebula') {
    sA = o.emission ? 35 : 20;
  } else if (o.type === 'planetary') {
    sA = 30;
  } else if (o.type === 'cluster') {
    const m = (o.mag !== null && o.mag !== undefined && o.mag < 99) ? o.mag : null;
    if (m !== null) sA = Math.max(0, Math.min(40, (12 - m) / 7 * 40));
  } else if (o.type === 'snr') {
    sA = 28;
  }
  // B. Taille angulaire (35 pts max) — interpolation log 3.4'→120'
  let sB = 0;
  const sz = o.size || 0;
  if (sz >= 120) { sB = 35; }
  else if (sz > 3.4) { sB = 35 * Math.log(sz / 3.4) / Math.log(120 / 3.4); }
  // C. Bonus groupe (15 pts par voisin, total plafonné à 100 avec sA+sB)
  let sC = 0;
  const gn = o.group ? o.group.length : 0;
  sC = gn * 15;
  const total = Math.round(Math.min(100, sA + sB + sC));
  return { total, sA: Math.round(sA), sB: Math.round(sB), sC: Math.round(sC) };
}

function buildTopNList(){
  // Calcul des scores bruts sur le catalogue dynamique
  const scored = CATALOG.map(o=>({...o, score: calcScore(o).total}));
  // Index du catalogue dynamique par ID pour enrichissement rapide
  const catalogById = {};
  scored.forEach(o => { catalogById[o.id] = o; });
  // Partage de score dans les groupes : chaque membre hérite du meilleur score du groupe
  const scoreById = {};
  scored.forEach(o => { scoreById[o.id] = o.score; });
  scored.forEach(o => {
    if (o.group && o.group.length > 0) {
      const bestGroup = Math.max(o.score, ...o.group.map(id => scoreById[id] || 0));
      if (bestGroup > o.score) o.score = bestGroup;
    }
  });
  // Couche 1 — socle garanti : objets de CATALOG_FALLBACK présents dans CUSTOM_META
  // Utilise les IDs corrects du fallback (ex: "M65" plutôt que "NGC3623")
  // Enrichit avec les données live d'OpenNGC si disponibles (ra/dec/size/score à jour)
  // Curated fallback entries should survive score cutoffs even when their
  // editorial note lives in RATINGS instead of CUSTOM_META.
  const curatedIds = new Set([...Object.keys(CUSTOM_META), ...Object.keys(RATINGS)]);
  const baseLayer = CATALOG_FALLBACK
    .filter(o => curatedIds.has(o.id))
    .map(o => {
      const live = catalogById[o.id];
      const base = live ? {...o, ...live, id: o.id, name: o.name} : {...o};
      base.score = live ? (scoreById[o.id] || calcScore(base).total) : calcScore(base).total;
      return base;
    });
  const baseIds = new Set(baseLayer.map(o => o.id));
  // Couche 2 — complétion dynamique : meilleurs objets restants par score
  const slots = Math.max(0, CATALOG_TOP_N - baseLayer.length);
  const dynamicLayer = scored
    .filter(o => !baseIds.has(o.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, slots);

  const catalogVisibleById = {};
  scored.forEach(o => { catalogVisibleById[o.id] = o; });
  const finalList = [...baseLayer, ...dynamicLayer];
  const finalIds = new Set(finalList.map(o => o.id));
  for(let i=0;i<finalList.length;i++){
    const o = finalList[i];
    const rating = getRating(o.id);
    const companions = parseCompanions(rating?.comp || CUSTOM_META[o.id]?.rating?.comp);
    companions.forEach(cid=>{
      if(finalIds.has(cid)) return;
      const companion = catalogVisibleById[cid];
      if(!companion) return;
      finalList.push(companion);
      finalIds.add(cid);
    });
  }
  CATALOG_TOPN_LIST = finalList;
}

function updateCatalogTopNList(){ buildTopNList(); }

function getSuggestionFamily(o){
  if(isCompositionEntry(o)) return 'composition';
  if(o.type==='snr') return 'snr';
  if(o.type==='planetary') return 'planetary';
  if(o.type==='cluster') return 'cluster';
  if(o.type==='galaxy') return 'galaxy';
  return 'nebula';
}

function matchesSuggestionFilter(o, filter){
  if(filter==='all') return true;
  const family=getSuggestionFamily(o);
  if(filter==='nebula') return family==='nebula' || family==='snr';
  return family===filter;
}

function getSuggestionAngularSeparationDeg(a, b){
  const degToRad=value => Number(value) * Math.PI / 180;
  const radToDeg=value => value * 180 / Math.PI;
  const ra1=degToRad(a.ra);
  const dec1=degToRad(a.dec);
  const ra2=degToRad(b.ra);
  const dec2=degToRad(b.dec);
  if(!Number.isFinite(ra1) || !Number.isFinite(dec1) || !Number.isFinite(ra2) || !Number.isFinite(dec2)) return Infinity;
  const cosSep=Math.sin(dec1)*Math.sin(dec2) + Math.cos(dec1)*Math.cos(dec2)*Math.cos(ra1-ra2);
  return radToDeg(Math.acos(Math.max(-1, Math.min(1, cosSep))));
}

function areSuggestionDuplicates(a, b){
  if(!a || !b || a.id===b.id) return false;
  if(a.type!==b.type) return false;
  const sizeA=Number(a.size) || 0;
  const sizeB=Number(b.size) || 0;
  const maxSize=Math.max(sizeA, sizeB, 1);
  const sizeGap=Math.abs(sizeA-sizeB)/maxSize;
  return getSuggestionAngularSeparationDeg(a,b) <= 0.15 && sizeGap <= 0.25;
}

function getSuggestionCompanionIds(o){
  return new Set(parseCompanions(getRating(o.id)?.comp || o?.suggestionRating?.comp || CUSTOM_META[o.id]?.rating?.comp));
}

function areSuggestionSameField(a, b){
  if(!a || !b || a.id===b.id) return false;
  const compA=getSuggestionCompanionIds(a);
  const compB=getSuggestionCompanionIds(b);
  const linked=compA.has(b.id) || compB.has(a.id) || [...compA].some(id => compB.has(id));
  if(!linked) return false;
  return getSuggestionAngularSeparationDeg(a,b) <= 2.6;
}

function getSuggestionParentRadiusDeg(o){
  return Math.max(0.2, ((Number(o.size) || 0) / 60) / 2);
}

function isSuggestionSubobjectOf(parent, child){
  if(!parent || !child || parent.id===child.id) return false;
  const groupMembers = new Set([...(parent.groupMembers || []), ...(parent.suggestionGroupMembers || [])]);
  if(groupMembers.has(child.id)) return true;
  const sep=getSuggestionAngularSeparationDeg(parent, child);
  const parentRadius=getSuggestionParentRadiusDeg(parent);
  const childSize=Number(child.size) || 0;
  const parentSize=Number(parent.size) || 0;
  if(parentSize <= 0 || childSize <= 0) return false;

  if(parent.type==='galaxy' && child.type!=='galaxy'){
    return sep <= parentRadius * 0.8 && childSize <= parentSize * 0.12;
  }
  if(parent.type==='nebula' && (child.type==='nebula' || child.type==='cluster')){
    return sep <= parentRadius * 0.75 && childSize <= parentSize * 0.35;
  }
  if(isCompositionEntry(parent)){
    return sep <= Math.max(1.2, parentRadius * 0.9) && childSize <= parentSize * 0.4;
  }
  return false;
}

function getSuggestionCandidates(options){
  const opts=(typeof options==='string') ? {filter:options} : (options || {});
  const filter=opts.filter || 'all';
  const limit=Number.isFinite(Number(opts.limit)) ? Math.max(0, Number(opts.limit)) : 100;
  const sortBy=opts.sortBy || 'editorial';
  const accessibleOnly=opts.onlyAccessible !== false;
  const nightBounds=(accessibleOnly && typeof getOrComputeNightBounds==='function') ? getOrComputeNightBounds() : null;
  const byId={};
  CATALOG_FALLBACK.forEach(o => { byId[o.id]=mergeSuggestionCatalogEntry(byId[o.id], o); });
  CATALOG.forEach(o => { byId[o.id]=mergeSuggestionCatalogEntry(byId[o.id], o); });
  const ranked = Object.values(byId)
    .filter(o => o && o.cat!=='Planet')
    .map(o => {
      const rt=getRating(o.id);
      return {
        ...o,
        score: calcScore(o).total,
        suggestionStars: rt.stars || 0,
        suggestionRating: rt,
        suggestionGroupMembers: o.groupMembers || (CUSTOM_META[o.id] && CUSTOM_META[o.id].groupMembers) || null,
        suggestionWindow: (nightBounds && typeof getPlanningWindowForObject==='function')
          ? getPlanningWindowForObject(o, nightBounds)
          : null
      };
    })
    .filter(o => !accessibleOnly || (nightBounds && isAccessibleAtAnyNightMoment(o, nightBounds)))
    .filter(o => matchesSuggestionFilter(o, filter))
    .sort((a,b) => {
      if(sortBy==='time'){
        const usableA=a.suggestionWindow && a.suggestionWindow.isSchedulable ? a.suggestionWindow.usableMinutes : 0;
        const usableB=b.suggestionWindow && b.suggestionWindow.isSchedulable ? b.suggestionWindow.usableMinutes : 0;
        if(usableB!==usableA) return usableB-usableA;
      }
      if((b.suggestionStars||0)!==(a.suggestionStars||0)) return (b.suggestionStars||0)-(a.suggestionStars||0);
      if((b.score||0)!==(a.score||0)) return (b.score||0)-(a.score||0);
      if((b.size||0)!==(a.size||0)) return (b.size||0)-(a.size||0);
      return (a.mag ?? 99) - (b.mag ?? 99);
    });
  const deduped=[];
  for(const o of ranked){
    if(deduped.some(existing =>
      areSuggestionDuplicates(existing, o)
      || areSuggestionSameField(existing, o)
      || isSuggestionSubobjectOf(existing, o)
    )) continue;
    deduped.push(o);
    if(deduped.length >= limit) break;
  }
  return deduped;
}
