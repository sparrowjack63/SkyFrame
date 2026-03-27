// js/planner/core.js — État, calculs, fenêtres de planification


function loadPlannedTargetIds(){
  try{
    const raw=localStorage.getItem(PLAN_STORAGE_KEY);
    if(raw===null) return [];
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed)?[...new Set(parsed.filter(Boolean))]:[];
  }catch(e){return [];}
}

function savePlannedTargetIds(){
  try{localStorage.setItem(PLAN_STORAGE_KEY,JSON.stringify([...new Set(PLANNED_TARGET_IDS.filter(Boolean))]));}catch(e){}
}

function isInPlanning(id){return PLANNED_TARGET_IDS.includes(id);}

function addToPlannerById(id, source='app'){
  const o=resolveObjectById(id,getViewTime());
  if(!o){showToast('❌ Objet introuvable');return;}
  if(isInPlanning(id)){showToast(`✅ ${formatDisplayName(o)} déjà dans la planification`); if(currentPage==='planner') renderPlanner(); return;}
  PLANNED_TARGET_IDS.push(id);
  savePlannedTargetIds();
  if(currentPage==='planner') renderPlanner();
  if(currentPage==='chart') drawChart();
  if(currentPage==='targets') renderTargets();
  showToast(`🗓️ ${formatDisplayName(o)} ajouté via ${source}`);
}

function removeFromPlannerById(id){
  const idx=PLANNED_TARGET_IDS.indexOf(id);
  if(idx<0) return;
  const o=resolveObjectById(id,getViewTime());
  PLANNED_TARGET_IDS.splice(idx,1);
  savePlannedTargetIds();
  renderPlanner();
  if(currentPage==='chart') drawChart();
  if(currentPage==='targets') renderTargets();
  showToast(`🗑️ ${o?formatDisplayName(o):id} retiré de la planification`);
}

function formatDurationMinutes(mins){
  if(!isFinite(mins)||mins<=0) return '0 min';
  const h=Math.floor(mins/60), m=Math.round(mins%60);
  if(h&&m) return `${h}h${String(m).padStart(2,'0')}`;
  if(h) return `${h}h00`;
  return `${m} min`;
}

function formatPlanningTime(date){
  return date?`${String(date.getHours()).padStart(2,'0')}h${String(date.getMinutes()).padStart(2,'0')}`:'—';
}

function getPlanningWindowForObject(o, nb, stepMin=5){
  if(!o) return null;
  const rec=recFilter(o,moon(getViewTime()).ill);
  const rt=getRating(o.id);
  const base={
    id:o.id, object:o,
    name:formatDisplayName(o),
    typeLabel:TYPE_LABEL[o.type]||o.type||'—',
    filter:(rec&&rec.name)||o.filter||'—',
    stars:rt.stars||0, tag:rt.tag||'',
    note:rt.reason||o.notes||o.desc||'',
    companions:rt.comp || (Array.isArray(o.group)&&o.group.length?o.group.slice(0,4).join(', '):''),
    startDate:null,endDate:null,
    rawMinutes:0, usableMinutes:0, exposures:0,
    status:'unavailable',
    statusLabel:'Pas de fenêtre utile cette nuit',
    statusDetail:'Pas de fenêtre utile cette nuit',
    isSchedulable:false,
    visibilityReason:'unavailable'
  };
  if(o.cat==='Planet'){
    return {...base,status:'planet',statusLabel:'Planète hors planification',statusDetail:'Les planètes restent visibles mais ne sont pas encore intégrées au calcul détaillé de planification.',visibilityReason:'planet'};
  }
  const startHour=nb.sunset, endHour=nb.sunrise;
  const totalMin=Math.max(0,Math.round((endHour-startHour)*60));
  const nightBase=getDateForNightHour(startHour);
  let startDate=null,endDate=null,lastDate=null;
  let anyAboveHorizon=false;
  for(let offset=0; offset<=totalMin; offset+=stepMin){
    const hLocal=startHour + offset/60;
    const d=getDateForNightHour(hLocal, nightBase);
    const ld=lst(jd(d),S.lon);
    const pos=altaz(o.ra,o.dec,ld,S.lat);
    const above=pos.alt>0;
    const ok=above && isAcc(pos.alt,pos.az);
    if(above) anyAboveHorizon=true;
    if(ok && !startDate) startDate=new Date(d);
    if(ok) lastDate=new Date(d);
    if(!ok && startDate && !endDate && lastDate) endDate=new Date(lastDate.getTime()+stepMin*60000);
  }
  if(startDate && !endDate && lastDate) endDate=new Date(lastDate.getTime()+stepMin*60000);
  if(!startDate||!endDate){
    const visibilityReason=anyAboveHorizon?'inaccessible':'below-horizon';
    const statusLabel=anyAboveHorizon?'Inaccessible':'Pas de fenêtre utile cette nuit';
    const statusDetail=anyAboveHorizon?'Objet visible dans le ciel mais hors fenêtre exploitable depuis le balcon cette nuit.':'Objet absent ou trop bas pendant toute la nuit utile.';
    return {...base,status:'unavailable',statusLabel,statusDetail,visibilityReason};
  }
  const raw=Math.max(0,Math.round((endDate-startDate)/60000));
  const usable=Math.max(0,raw-PLAN_TARGET_OVERHEAD_MIN);
  const exposures=Math.floor(usable/PLAN_EXPOSURE_MIN);
  const status=usable>=15?'ok':(usable>=5?'limit':'short');
  const statusLabel=status==='ok'?'OK':(status==='limit'?'Limite':'Trop court');
  const statusDetail=status==='ok'?'Fenêtre exploitable correcte cette nuit.':(status==='limit'?'Fenêtre exploitable courte mais encore utilisable.':'Fenêtre trop courte après marge fixe de session.');
  return {
    ...base,
    startDate,endDate,
    rawMinutes:raw, usableMinutes:usable, exposures,
    status,
    statusLabel,
    statusDetail,
    isSchedulable:true,
    visibilityReason:'window'
  };
}

function buildPlanningState(){
  const nb=getOrComputeNightBounds();
  const plannedItems=PLANNED_TARGET_IDS.map(id=>resolveObjectById(id,getViewTime())).filter(Boolean).map(o=>getPlanningWindowForObject(o,nb));
  const usableItems=plannedItems.filter(it=>it&&it.isSchedulable).sort((a,b)=>a.startDate-b.startDate);
  const unavailable=plannedItems.filter(it=>it&&!it.isSchedulable).map(it=>`${it.name} : ${it.statusLabel.toLowerCase()}`);
  const conflicts=[];
  for(let i=1;i<usableItems.length;i++){
    const prev=usableItems[i-1], cur=usableItems[i];
    if(cur.startDate<prev.endDate){
      conflicts.push(`${prev.name} chevauche ${cur.name} (${formatPlanningTime(cur.startDate)} avant ${formatPlanningTime(prev.endDate)})`);
    }
  }
  const tooShort=plannedItems.filter(it=>it&&it.status==='short').map(it=>`${it.name} : fenêtre exploitable ${formatDurationMinutes(it.usableMinutes)}`);
  const totalRaw=usableItems.reduce((s,it)=>s+it.rawMinutes,0);
  const totalUsable=usableItems.reduce((s,it)=>s+it.usableMinutes,0);
  const totalExposures=usableItems.reduce((s,it)=>s+it.exposures,0);
  const endAdvice=usableItems.length?usableItems.reduce((latest,it)=>it.endDate>latest?it.endDate:latest,usableItems[0].endDate):null;
  return {
    nb,
    plannedItems,
    usableItems,
    items:plannedItems,
    timelineItems:usableItems,
    conflicts,
    tooShort,
    unavailable,
    totalRaw,
    totalUsable,
    totalExposures,
    endAdvice,
    totalPlanned:plannedItems.length,
    totalSchedulable:usableItems.length
  };
}

function buildPlannerNightTimeline(state){
  if(!state||!state.nb) return '';
  const nb=state.nb;
  const timelineItems=(state.timelineItems||[]);
  const hasItems=!!timelineItems.length;
  const axisStart=nb.sunset;
  const axisEnd=nb.sunrise;
  const span=Math.max(0.01,axisEnd-axisStart);
  const padPx=10;
  const lightBandTop=24;
  const lightBandH=24;
  const moonBandTop=56;
  const moonBandH=16;
  const laneTop=82;
  const markerMinGapPct=9;
  const tbase=getDateForNightHour(axisStart);
  const itemPositions=[];
  const laneEnds=[];
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function toHour(date){
    let h=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
    if(h<axisStart-2) h+=24;
    return h;
  }
  function pctFromHour(h){ return Math.max(0,Math.min(100,((h-axisStart)/span)*100)); }
  timelineItems.forEach(it=>{
    const startHour=toHour(it.startDate);
    const endHour=Math.max(startHour+(5/60),toHour(it.endDate));
    // First free lane (startHour >= lane end), or open a new lane
    let lane=laneEnds.findIndex(end=>startHour>=end);
    if(lane===-1) lane=laneEnds.length;
    laneEnds[lane]=endHour;
    itemPositions.push({
      item:it,
      startHour,endHour,lane,
      left:pctFromHour(startHour),
      width:Math.max(1.4,pctFromHour(endHour)-pctFromHour(startHour))
    });
  });
  // Dynamic lane count from actual assignments; adaptive sizing for many lanes
  const laneCount=hasItems?Math.max(laneEnds.length,1):2;
  const laneH=laneCount<=3?30:Math.max(20,30-(laneCount-3)*2);
  const laneGap=laneCount<=3?12:Math.max(4,12-(laneCount-3));
  const itemTopOffset=Math.max(0,Math.floor((laneH-22)/2));
  const tickHours=[];
  const startTick=Math.ceil(axisStart);
  const endTick=Math.floor(axisEnd);
  for(let h=startTick;h<=endTick;h++) tickHours.push(h);
  if(!tickHours.length||Math.abs(tickHours[0]-axisStart)>0.34) tickHours.unshift(axisStart);
  if(Math.abs(tickHours[tickHours.length-1]-axisEnd)>0.34) tickHours.push(axisEnd);
  const bands=[
    {from:axisStart,to:nb.civilDusk,cls:'civil'},
    {from:nb.civilDusk,to:nb.nautDusk,cls:'naut'},
    {from:nb.nautDusk,to:nb.astroDusk,cls:'astro'},
    {from:nb.astroDusk,to:nb.astroDawn,cls:'dark'},
    {from:nb.astroDawn,to:nb.nautDawn,cls:'astro'},
    {from:nb.nautDawn,to:nb.civilDawn,cls:'naut'},
    {from:nb.civilDawn,to:axisEnd,cls:'civil'}
  ];
  const lightSegments=getPlannerLightSegments(nb,tbase,axisStart,axisEnd);
  const moonInfo=getMoonTimelineEvents(nb,tbase,axisStart,axisEnd);
  const moonMarkers=[];
  let lastMarkerPct=-999;
  moonInfo.events.forEach(ev=>{
    const pct=pctFromHour(ev.h);
    const wideEdge=(pct<3)||(pct>97);
    const allow=wideEdge || Math.abs(pct-lastMarkerPct)>=markerMinGapPct;
    if(!allow) return;
    lastMarkerPct=pct;
    moonMarkers.push({
      ...ev,
      pct,
      labelClass:ev.type==='moon-rise'?'moon-rise':'moon-set',
      labelStyle:wideEdge?(pct<3?'left:4px;right:auto;transform:none;':'left:auto;right:4px;transform:none;'):''
    });
  });
  const gaps=[];
  for(let i=1;i<timelineItems.length;i++){
    const prev=itemPositions[i-1],cur=itemPositions[i];
    if(cur.startHour>prev.endHour) gaps.push({left:pctFromHour(prev.endHour),width:pctFromHour(cur.startHour)-pctFromHour(prev.endHour)});
  }
  const overlaps=[];
  for(let i=1;i<timelineItems.length;i++){
    const prev=itemPositions[i-1],cur=itemPositions[i];
    if(cur.startHour<prev.endHour){
      overlaps.push({left:pctFromHour(cur.startHour),width:pctFromHour(Math.min(prev.endHour,cur.endHour))-pctFromHour(cur.startHour)});
    }
  }
  const lastLaneBottom=laneTop+laneCount*(laneH+laneGap)-laneGap;
  const gapRowTop=lastLaneBottom+8;
  const overlapRowTop=gapRowTop+(gaps.length?14:0);
  const axisHeight=overlapRowTop+(overlaps.length?16:0)+(gaps.length&&!overlaps.length?10:0)+6;
  const overlayY=lightBandTop+6;
  const overlayInnerPx=4;
  const moonBandLabelY=moonBandTop+(moonBandH/2);
  const lightLegendLabels={'glow-off':'lumières éteintes + lune basse','glow-low':'gêne faible','glow-mid':'gêne modérée','glow-high':'gêne forte'};
  const emptyStateMarkup=!hasItems?`<div style="position:absolute;left:${padPx}px;right:${padPx}px;top:${laneTop+16}px;padding:14px 16px;border-radius:12px;border:1px dashed rgba(255,255,255,.14);background:rgba(6,16,23,.58);backdrop-filter:blur(2px);text-align:left;">
        <div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:6px;">Planification vide, structure conservée</div>
        <div style="font-size:11px;line-height:1.6;color:var(--text2);">La timeline reste visible pour garder les repères de nuit. Ajoute des cibles depuis <b>Cibles</b> ou <b>Courbes</b> pour remplir automatiquement les fenêtres utiles.</div>
      </div>`:'';
  return `<div class="planner-session planner-nightviz">
    <div class="planner-nightviz-head">
      <div>
        <div class="planner-nightviz-title">Timeline visuelle de la nuit</div>
        <div class="planner-nightviz-sub">Lecture rapide ${fmtH(axisStart)} → ${fmtH(axisEnd)} · bande haute = ambiance lumineuse, traits = repères lune, blocs = fenêtres utiles triées par début</div>
      </div>
      <div style="font-size:10px;color:var(--text3);font-family:var(--mono);">${hasItems?(state.conflicts.length?`⚠️ ${state.conflicts.length} chevauchement${state.conflicts.length>1?'s':''}`:'ordre lisible'):'timeline vide'}${gaps.length?` · ${gaps.length} trou${gaps.length>1?'s':''}`:''}</div>
    </div>
    <div class="planner-nightviz-scroll">
    <div class="planner-nightviz-axis" style="height:${axisHeight}px;">
      ${bands.map(b=>`<div class="planner-nightviz-band ${b.cls}" style="left:${pctFromHour(b.from)}%;width:${Math.max(0,pctFromHour(b.to)-pctFromHour(b.from))}%;"></div>`).join('')}
      <div class="planner-nightviz-strip light" style="top:${lightBandTop}px;"></div>
      <div class="planner-nightviz-strip moon" style="top:${moonBandTop}px;"></div>
      ${lightSegments.map(seg=>{
        const left=pctFromHour(seg.from), width=Math.max(0,pctFromHour(seg.to)-pctFromHour(seg.from));
        const canLabel=width>16;
        const mid=left+width/2;
        return `<div class="planner-nightviz-overlay ${seg.cls}" style="left:calc(${left}% + ${padPx+overlayInnerPx}px);width:calc(${Math.max(width,2)}% - ${(padPx+overlayInnerPx)*2}px);top:${overlayY}px;"></div>${canLabel?`<div class="planner-nightviz-overlay-label ${seg.cls}" style="left:${mid}%;top:${overlayY+6}px;">${seg.label}</div>`:''}`;
      }).join('')}
      ${moonMarkers.map(ev=>`<div class="planner-nightviz-marker ${ev.labelClass}" style="left:${ev.pct}%;"><div class="planner-nightviz-marker-label" style="top:${moonBandLabelY}px;${ev.labelStyle}">${ev.label}</div></div>`).join('')}
      ${tickHours.map(h=>`<div class="planner-nightviz-grid" style="left:${pctFromHour(h)}%;"></div><div class="planner-nightviz-tick" style="left:${pctFromHour(h)}%;">${fmtH(h)}</div>`).join('')}
      ${Array.from({length:laneCount},(_,lane)=>`<div class="planner-nightviz-lane" style="top:${laneTop+lane*(laneH+laneGap)}px;height:${laneH}px;"></div>`).join('')}
      ${emptyStateMarkup}
      ${gaps.map(g=>`<div class="planner-nightviz-gap" style="left:calc(${g.left}% + ${padPx}px);width:calc(${Math.max(g.width,3)}% - ${padPx*2}px);top:${gapRowTop}px;"></div>`).join('')}
      ${overlaps.map(g=>`<div class="planner-nightviz-overlap-zone" style="left:calc(${g.left}% + ${padPx}px);width:calc(${Math.max(g.width,3)}% - ${padPx*2}px);top:${laneTop}px;height:${lastLaneBottom-laneTop}px;"></div>`).join('')}
      ${overlaps.length?`<div class="planner-nightviz-overlap-row" style="left:${padPx}px;right:${padPx}px;top:${overlapRowTop-3}px;height:16px;"></div>`:''}
      ${overlaps.map(g=>`<div class="planner-nightviz-overlap" style="left:calc(${g.left}% + ${padPx}px);width:calc(${Math.max(g.width,3)}% - ${padPx*2}px);top:${overlapRowTop}px;"></div>`).join('')}
      ${itemPositions.map(pos=>{
        const color=TYPE_COLOR[pos.item.object.type]||'#90caf9';
        const fg=pos.item.status==='short'?'#fff5f3':'#061017';
        const winLabel=pos.item.isSchedulable?` · ${formatPlanningTime(pos.item.startDate)}→${formatPlanningTime(pos.item.endDate)}`:'';
        return `<div class="planner-nightviz-item ${pos.item.status}" title="${esc(pos.item.name)}${winLabel}" style="left:calc(${pos.left}% + ${padPx}px);width:calc(${Math.max(pos.width,4)}% - ${padPx*2}px);top:${laneTop+itemTopOffset+pos.lane*(laneH+laneGap)}px;background:${color};color:${fg};cursor:pointer;" data-scroll-id="${esc(pos.item.id)}"><span>${esc(pos.item.name)}</span></div>`;
      }).join('')}
    </div>
    </div>
    <div class="planner-nightviz-legend">
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:linear-gradient(90deg,rgba(105,240,174,.2),rgba(105,240,174,.34));"></span>${lightLegendLabels['glow-off']}</div>
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:linear-gradient(90deg,rgba(255,213,79,.12),rgba(255,213,79,.24));"></span>${lightLegendLabels['glow-mid']}</div>
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:linear-gradient(90deg,rgba(255,107,107,.12),rgba(255,107,107,.26));"></span>${lightLegendLabels['glow-high']}</div>
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:rgba(255,255,255,.32);"></span>creux entre 2 cibles</div>
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:linear-gradient(90deg,#ff8a80,#ffd54f);"></span>zone de chevauchement</div>
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:#69f0ae;"></span>OK</div>
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:#ffd54f;"></span>limite</div>
      <div class="planner-nightviz-legend-item"><span class="planner-nightviz-dot" style="background:#ff8a80;"></span>trop court</div>
      <div class="planner-nightviz-legend-item"><span style="font-size:11px;line-height:1;">🌙↑↓</span>lever / coucher de lune</div>
    </div>
  </div>`;
}
