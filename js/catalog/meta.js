// js/catalog/meta.js — Formatage, stats catalogue, affichage

function formatDisplayName(o){
  if(!o) return '';
  const raw=(o.name||o.id||'').trim();
  if(o.cat!=='Messier') return raw;
  const id=o.id||'';
  const secondary=(o.secondaryId||'').trim();
  const parts=raw.split(/[—–]/).map(s=>s.trim()).filter(Boolean);
  const labelParts=[];
  if(id) labelParts.push(id);
  if(secondary && secondary!==id) labelParts.push(secondary.replace(/^NGC(\d+)$/,'NGC $1').replace(/^IC(\d+)$/,'IC $1'));
  const title=parts.length>1 ? parts.slice(1).join(' — ') : (raw!==id ? raw : '');
  if(title) labelParts.push(title);
  return [...new Set(labelParts)].join(' — ') || raw;
}

function formatCatalogIdForSearch(id){
  return String(id||'')
    .trim()
    .replace(/^NGC\s*(\d+)$/i,'NGC $1')
    .replace(/^IC\s*(\d+)$/i,'IC $1')
    .replace(/^Sh2\s*-?\s*(\d+)$/i,'Sh2-$1')
    .replace(/^M\s*(\d+)$/i,'M$1');
}

function getAstroBinSearchQuery(o){
  if(!o || o.cat==='Planet') return null;
  if(o.astrobinQuery) return String(o.astrobinQuery).trim();
  const primaryId=formatCatalogIdForSearch(o.id||'');
  if(/^M\d+$/i.test(primaryId)) return primaryId.toUpperCase();
  const secondaryId=formatCatalogIdForSearch(o.secondaryId||'');
  if(/^M\d+$/i.test(secondaryId)) return secondaryId.toUpperCase();
  if(primaryId) return primaryId;
  if(secondaryId) return secondaryId;
  const rawName=(o.name||'').split(/[—–]/)[0].trim();
  return rawName || null;
}

function getAstroBinSearchUrl(o){
  const query=getAstroBinSearchQuery(o);
  return query ? `https://www.astrobin.com/search/?q=${encodeURIComponent(query)}` : null;
}

function isCompositionEntry(o){
  return !!(o && ((o.cat&&String(o.cat).startsWith('Comp')) || (Array.isArray(o.groupMembers)&&o.groupMembers.length)));
}

function formatCatalogTimestamp(ts){
  if(!ts) return '—';
  const d=new Date(ts);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`;
}

function getCatalogCacheLabel(){
  const st=CATALOG_RUNTIME_STATE.cacheState;
  if(st==='hit') return 'cache local utilisé';
  if(st==='refreshed') return 'cache rafraîchi';
  if(st==='stale') return 'cache expiré';
  if(st==='stale-error') return 'cache expiré, fallback';
  if(st==='unavailable') return 'cache indisponible';
  return 'sans cache';
}

function getCatalogLocalComplementCounts(){
  const dynamicIds=new Set(CATALOG.filter(o=>o.cat!=='Sh2').map(o=>o.id));
  const fallbackOnly=CATALOG_FALLBACK.filter(o=>!dynamicIds.has(o.id));
  const fallbackCompositions=CATALOG_FALLBACK.filter(o=>isCompositionEntry(o));
  const customObjects=(CATALOG_RUNTIME_STATE.source==='openngc' ? fallbackOnly.length : fallbackCompositions.length) + SHARPLESS_CATALOG.length;
  const compositions=(CATALOG_RUNTIME_STATE.source==='openngc' ? fallbackOnly : fallbackCompositions).filter(o=>isCompositionEntry(o)).length;
  const editorial=Object.keys(CUSTOM_META).length;
  return {customObjects,compositions,editorial};
}

function getCatalogStatsSnapshot(){
  const t=getViewTime();
  const lstD=lst(jd(t),S.lon);
  const mp=moon(t);
  const accessibleNow=getVisibleCatalogList('accessible',lstD,mp,'targets').length;
  const companionCount=getTopNCompanionCount();
  const retainedBaseCount=Math.max(0,CATALOG_TOPN_LIST.length-companionCount);
  const retained=CATALOG_TOPN_LIST.slice();
  const repartition={
    galaxy:retained.filter(o=>o.type==='galaxy').length,
    nebula:retained.filter(o=>o.type==='nebula'||o.type==='snr').length,
    cluster:retained.filter(o=>o.type==='cluster').length,
    planetary:retained.filter(o=>o.type==='planetary').length,
    composition:retained.filter(o=>isCompositionEntry(o)).length,
  };
  return {t,accessibleNow,companionCount,retainedBaseCount,totalAvailable:CATALOG.length,retainedTotal:CATALOG_TOPN_LIST.length,repartition,local:getCatalogLocalComplementCounts()};
}

function renderCatalogStatsPanel(){
  const stateGrid=document.getElementById('catalog-state-grid');
  const sourceList=document.getElementById('catalog-source-list');
  const breakdownGrid=document.getElementById('catalog-breakdown-grid');
  const infoEl=document.getElementById('catalog-info');
  if(!stateGrid||!sourceList||!breakdownGrid||!infoEl) return;
  const stats=getCatalogStatsSnapshot();
  const mainSource=CATALOG_RUNTIME_STATE.source==='openngc' ? 'OpenNGC dynamique' : 'fallback local';
  const modeLabel=CATALOG_RUNTIME_STATE.mode==='enriched' ? 'catalogue enrichi' : 'fallback local';
  infoEl.textContent=`${stats.totalAvailable} objets actifs · ${stats.retainedTotal} retenus (${stats.retainedBaseCount<=CATALOG_TOP_N?`top ${CATALOG_TOP_N}`:`sélection`} + ${stats.companionCount} compagnon${stats.companionCount>1?'s':''})`;
  stateGrid.innerHTML=[
    {k:'Objets disponibles',v:stats.totalAvailable,s:'catalogue réellement chargé'},
    {k:'Objets retenus',v:stats.retainedTotal,s:`base ${stats.retainedBaseCount} · compagnons ${stats.companionCount}`},
    {k:'Top-N configuré',v:CATALOG_TOP_N,s:'sélection principale avant ajouts forcés'},
    {k:'Accessibles maintenant',v:stats.accessibleNow,s:`au ${String(stats.t.getHours()).padStart(2,'0')}h${String(stats.t.getMinutes()).padStart(2,'0')}${simTime?' (simulation)':''}`},
  ].map(item=>`<div class="catalog-stat-box"><div class="catalog-stat-k">${item.k}</div><div class="catalog-stat-v">${item.v}</div><div class="catalog-stat-s">${item.s}</div></div>`).join('');
  sourceList.innerHTML=[
    ['Source principale',`${mainSource} · ${CATALOG_RUNTIME_STATE.primaryCount||0} objets`],
    ['Compléments locaux',`${stats.local.customObjects} objets custom · ${stats.local.compositions} compositions/groupes · ${stats.local.editorial} métadonnées éditoriales`],
    ['Cache / refresh',`${getCatalogCacheLabel()} · dernier refresh ${formatCatalogTimestamp(CATALOG_RUNTIME_STATE.lastRefreshTs||CATALOG_RUNTIME_STATE.cacheTs)}`],
    ['Mode courant',modeLabel],
  ].map(([label,val])=>`<div class="catalog-inline-item"><div class="catalog-inline-label">${label}</div><div class="catalog-inline-value">${val}</div></div>`).join('');
  breakdownGrid.innerHTML=[
    {k:'Galaxies',v:stats.repartition.galaxy,s:'dans la sélection retenue'},
    {k:'Nébuleuses',v:stats.repartition.nebula,s:'émission, réflexion, SNR'},
    {k:'Amas',v:stats.repartition.cluster,s:'ouverts + globulaires'},
    {k:'Planétaires',v:stats.repartition.planetary,s:'PN retenues'},
    {k:'Compositions / groupes',v:stats.repartition.composition,s:'entrées composées ou groupées'},
  ].map(item=>`<div class="catalog-stat-box"><div class="catalog-stat-k">${item.k}</div><div class="catalog-stat-v">${item.v}</div><div class="catalog-stat-s">${item.s}</div></div>`).join('');
}
