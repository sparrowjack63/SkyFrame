// État global top-N
let CATALOG_TOP_N = parseInt(localStorage.getItem('catalog_top_n') || '100', 10);
let CATALOG_TOPN_LIST = [];

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
  const customIds = new Set(Object.keys(CUSTOM_META));
  const baseLayer = CATALOG_FALLBACK
    .filter(o => customIds.has(o.id))
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
