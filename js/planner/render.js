// js/planner/render.js — Rendu et export planification

function plannerCardDomId(id){
  return 'planner-card-'+String(id).replace(/[^a-zA-Z0-9_-]+/g,'-');
}

function scrollToPlannerCard(id){
  const el=document.getElementById(plannerCardDomId(id));
  if(!el) return;
  const content=document.getElementById('content');
  if(content){
    const containerTop=content.getBoundingClientRect().top;
    const elTop=el.getBoundingClientRect().top;
    const target=content.scrollTop+(elTop-containerTop)-16;
    content.scrollTo({top:Math.max(0,target),behavior:'smooth'});
  } else {
    window.scrollTo({top:Math.max(0,window.scrollY+el.getBoundingClientRect().top-90),behavior:'smooth'});
  }
  el.classList.add('planner-card-focus');
  setTimeout(()=>el.classList.remove('planner-card-focus'),1800);
}

function renderPlanner(){
  const wrap=document.getElementById('planner-content');
  const state=buildPlanningState();
  const mp=moon(getViewTime());
  const f=field();
  const alerts=[...state.conflicts,...state.tooShort,...state.unavailable];
  let html=`<div class="planner-session" style="padding:12px 14px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
      <div>
        <div style="font-size:16px;font-weight:800;">${t('planner.title')}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px;">Fenêtre nuit utile ${fmtH(state.nb.sunset)} → ${fmtH(state.nb.sunrise)} · poses de ${PLAN_EXPOSURE_MIN} min · marge fixe −${PLAN_TARGET_OVERHEAD_MIN} min / cible</div>
      </div>
      <div style="font-size:11px;color:${state.totalPlanned?(alerts.length?'#ffd54f':'#69f0ae'):'var(--text2)'};font-weight:700;">${state.totalPlanned?(alerts.length?`⚠️ ${alerts.length} alerte${alerts.length>1?'s':''}`:'✅ Nuit cohérente'):t('planner.nonePlanned')}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px;">
      ${[['Cibles planifiées',state.totalPlanned],['Exploitables cette nuit',state.totalSchedulable],['Temps brut',formatDurationMinutes(state.totalRaw)],['Temps exploitable',formatDurationMinutes(state.totalUsable)],['Poses estimées',state.totalExposures],['Fin conseillée',formatPlanningTime(state.endAdvice)],['Lune',`${mp.icon} ${mp.ill}%`]].map(([k,v])=>`<div style="border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.02);"><div style="font:700 10px var(--mono);letter-spacing:.06em;color:var(--text3);margin-bottom:4px;">${k}</div><div style="font-size:14px;font-weight:700;color:var(--text);">${v}</div></div>`).join('')}
    </div>
    ${state.totalPlanned?`${alerts.length?`<div style="margin-top:12px;border:1px solid rgba(255,213,79,.25);background:rgba(255,213,79,.06);border-radius:10px;padding:10px 12px;"><div style="font:700 10px var(--mono);letter-spacing:.06em;color:#ffd54f;margin-bottom:6px;">VALIDATION GLOBALE</div><div style="font-size:11px;color:var(--text2);line-height:1.6;">${alerts.map(a=>`• ${a}`).join('<br>')}</div></div>`:''}`:`<div style="margin-top:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:10px;padding:10px 12px;"><div style="font:700 10px var(--mono);letter-spacing:.06em;color:var(--text3);margin-bottom:6px;">${t('planner.emptyState')}</div><div style="font-size:11px;color:var(--text2);line-height:1.6;">${t('planner.emptyHelp')}</div></div>`}
  </div>`;
  html+=buildPlannerNightTimeline(state);
  const sortedItems=[
    ...state.plannedItems.filter(it=>it.isSchedulable).sort((a,b)=>a.startDate-b.startDate),
    ...state.plannedItems.filter(it=>!it.isSchedulable)
  ];
  sortedItems.forEach((it,idx)=>{
    const color=TYPE_COLOR[it.object.type]||'#fff';
    const statusColor=it.status==='ok'?'#69f0ae':(it.status==='limit'?'#ffd54f':(it.status==='short'?'#ff8a80':'#b0bec5'));
    const timeLine=it.isSchedulable?`Fenêtre utile ${formatPlanningTime(it.startDate)} → ${formatPlanningTime(it.endDate)} · ${it.typeLabel}`:`${it.statusLabel} · ${it.typeLabel}`;
    const cardId=plannerCardDomId(it.id);
    html+=`<div class="planner-session" id="${cardId}">
      <div class="planner-header" style="background:${color}18;border-left:3px solid ${color};align-items:flex-start;gap:10px;">
        <div>
          <div class="planner-name">${idx+1}. ${it.name}</div>
          <div class="planner-time">${timeLine}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          <span class="chip" style="background:${statusColor}22;border-color:${statusColor};color:${statusColor};">${it.statusLabel}</span>
          <button class="night-btn" type="button" onclick="removeFromPlannerById('${it.id}')" style="font-size:10px;padding:6px 10px;">${t('planner.remove')}</button>
        </div>
      </div>
      <div class="planner-body">
        <div class="planner-row"><span class="planner-label">Filtre recommandé</span><span class="planner-val" style="color:#ffd54f">${it.filter}</span></div>
        <div class="planner-row"><span class="planner-label">Note étoiles</span><span class="planner-val">${it.stars?`${'★'.repeat(it.stars)}${'☆'.repeat(5-it.stars)} ${it.tag||''}`:'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Statut détaillé</span><span class="planner-val" style="max-width:60%;text-align:right;color:${statusColor};">${it.statusDetail}</span></div>
        <div class="planner-row"><span class="planner-label">Début fenêtre utile</span><span class="planner-val">${it.isSchedulable?formatPlanningTime(it.startDate):'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Fin fenêtre utile</span><span class="planner-val">${it.isSchedulable?formatPlanningTime(it.endDate):'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Durée brute</span><span class="planner-val">${it.isSchedulable?formatDurationMinutes(it.rawMinutes):'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Marge session</span><span class="planner-val" style="color:#ff8a80">${it.isSchedulable?`−${PLAN_TARGET_OVERHEAD_MIN} min`:'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Durée exploitable</span><span class="planner-val">${it.isSchedulable?formatDurationMinutes(it.usableMinutes):'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Poses de 5 min</span><span class="planner-val">${it.isSchedulable?it.exposures:'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Compagnons / groupe</span><span class="planner-val">${it.companions||'—'}</span></div>
        <div class="planner-row"><span class="planner-label">Note utile</span><span class="planner-val" style="max-width:60%;text-align:right;font-size:10px;color:var(--text2);">${it.note||'—'}</span></div>
      </div>
    </div>`;
  });
  html+=`<div class="planner-session" style="padding:10px 12px;">
    <div style="font-size:9px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${t('planner.setupNotes')}</div>
    <div class="planner-row"><span class="planner-label">${t('planner.field')}</span><span class="planner-val">${f.w.toFixed(1)}° × ${f.h.toFixed(1)}°</span></div>
    <div class="planner-row"><span class="planner-label">${t('planner.referenceExposure')}</span><span class="planner-val">${PLAN_EXPOSURE_MIN} min</span></div>
    <div class="planner-row"><span class="planner-label">${t('planner.overhead')}</span><span class="planner-val">${PLAN_TARGET_OVERHEAD_MIN} min</span></div>
  </div>`;
  wrap.innerHTML=html;
  wrap.querySelectorAll('[data-scroll-id]').forEach(el=>{
    el.addEventListener('click',()=>scrollToPlannerCard(el.dataset.scrollId));
  });
}

function exportPlanner(){
  const ids=[...PLANNED_TARGET_IDS];
  const data={
    version:1,
    app:'SkyFrame',
    exportedAt:new Date().toISOString(),
    plannedTargetIds:ids
  };
  const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const u=URL.createObjectURL(b);
  const a=document.createElement('a');
  a.href=u;
  const date=new Date().toISOString().slice(0,10);
  a.download=`planification_skyframe_${date}.json`;
  a.click();
  URL.revokeObjectURL(u);
  showToast(`${t('planner.exportedPrefix')} ${ids.length} cible${ids.length!==1?'s':''} exportée${ids.length!==1?'s':''}`);
}

function importPlannerJSON(input){
  const file=input.files&&input.files[0];
  if(!file){return;}
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=JSON.parse(e.target.result);
      if(!data||data.app!=='SkyFrame'||!Array.isArray(data.plannedTargetIds)){
        showToast('❌ Fichier JSON invalide');return;
      }
      const ids=data.plannedTargetIds.filter(id=>typeof id==='string'&&id.trim());
      const t=getViewTime();
      const known=ids.filter(id=>resolveObjectById(id,t));
      const skipped=ids.length-known.length;
      PLANNED_TARGET_IDS.length=0;
      known.forEach(id=>{if(!PLANNED_TARGET_IDS.includes(id))PLANNED_TARGET_IDS.push(id);});
      savePlannedTargetIds();
      renderPlanner();
      if(currentPage==='chart') drawChart();
      if(currentPage==='targets') renderTargets();
      const n=known.length;
      const msg=skipped>0
        ?`📥 ${n} cible${n!==1?'s':''} importée${n!==1?'s':''} · ${skipped} ID${skipped!==1?'s':''} inconnu${skipped!==1?'s':''}`
        :`📥 ${n} cible${n!==1?'s':''} importée${n!==1?'s':''}`;
      showToast(msg);
    }catch(err){
      showToast('❌ Erreur lecture JSON');
    }
    input.value='';
  };
  reader.readAsText(file);
}
