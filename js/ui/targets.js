let currentFilter = 'all';

// js/ui/targets.js — Rendu grille cibles et filtres

function renderTargets(){
  updateClock();
  const t=getViewTime();
  const lstD=lst(jd(t),S.lon);
  const mp=moon(t);
  // Planètes dynamiques (positions recalculées)
  const planetObjs=Object.keys(PLANETS_META).map(n=>getPlanetObj(n,t));

  const planetList=planetObjs.filter(o=>matchesObjectFilter(o,currentFilter,lstD,mp));
  const catList=getVisibleCatalogList(currentFilter,lstD,mp,'targets');
  let objs=[...planetList,...catList].map(o=>withComputedState(o,lstD,mp));

  // Tri final : accessible => étoiles desc, score desc, altitude desc
  // Sinon, tri par accessibilité utile puis score
  sortVisibleObjects(objs,currentFilter);

  const totalBeforeSearch=objs.length;
  if(objectSearch) objs=objs.filter(o=>objectMatchesSearch(o));
  const accessible=objs.filter(o=>o.acc&&o.shoot).length;
  const companionCount=getTopNCompanionCount();
  const topNLabel=companionCount?`top ${CATALOG_TOP_N} + ${companionCount} compagnon${companionCount>1?'s':''}`:`top ${CATALOG_TOP_N}`;
  document.getElementById('count-label').textContent=
    `${objs.length} ${t('targets.objects')} (${topNLabel}) · ${accessible} ${t('targets.accessible')} · ${String(getViewTime().getHours()).padStart(2,'0')}h${String(getViewTime().getMinutes()).padStart(2,'0')}${simTime?` (${t('time.simulation')})`:` (${t('time.liveLower')})`}${objectSearch?` · ${t('search.label').toLowerCase()}: ${objs.length}/${totalBeforeSearch}`:''}`;
  renderCatalogStatsPanel();

  const grid=document.getElementById('objects-grid');
  if(!objs.length){grid.innerHTML=`<div class="no-results"><div style="font-size:40px">🔭</div>${objectSearch?`${t('targets.emptySearch')} “${objectSearch.replace(/</g,'&lt;')}”.`:t('targets.emptyFilter')}</div>`;return;}

  grid.innerHTML=objs.map(o=>{
    const color=TYPE_COLOR[o.type]||'#fff';
    const pct=Math.max(0,Math.min(100,(o.alt/90)*100));
    const rec=recFilter(o,mp.ill);
    let badge,badgeCls;
    if(o.cat==='Planet'){
      if(o.alt<=0)       {badge=`${t('targets.belowHorizon')} (${Math.round(o.alt)}°)`;badgeCls='bad';}
      else if(!o.acc)    {badge=`Az ${Math.round(o.az)}° — ${t('targets.outOfSiteWindow')}`;badgeCls='warn';}
      else               {badge=`✅ Alt ${Math.round(o.alt)}° · Az ${Math.round(o.az)}°`;badgeCls='ok';}
    } else if(o.alt<=0){badge=`${t('targets.belowHorizon')} (${Math.round(o.alt)}°)`;badgeCls='bad';}
    else if(!o.acc && o.alt>S.altMin){
      const cosBalcO=Math.abs(Math.cos(toR(o.az-S.azBord)));
      const effMaxO=cosBalcO<0.05?90:toD(Math.atan(S.kBord/cosBalcO));
      if(o.alt>effMaxO){badge=`Obstacle sup.: ${Math.round(o.alt)}° > ${Math.round(effMaxO)}° à az${Math.round(o.az)}°`;badgeCls='warn';}
      else{badge=`Az ${Math.round(o.az)}° — ${t('targets.outOfSiteWindow')}`;badgeCls='warn';}
    }
    else if(!o.shoot){badge=`${t('targets.accessibleLabel')} — ${t('targets.missingFilter')}`;badgeCls='warn';}
    else{badge=`✅ ${Math.round(o.alt)}° alt · Az ${Math.round(o.az)}°`;badgeCls='ok';}

    const rt=getRating(o.id);
    const inPlanning=isInPlanning(o.id);
    return `<div class="obj-card ${o.type} ${(!o.acc||!o.shoot)?'inaccessible':''}"
      onclick="openModal('${o.id}')" style="border-left-color:${color}">
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <button class="night-btn" type="button" onclick="event.stopPropagation();addToPlannerById('${o.id}','cibles')" style="font-size:10px;padding:6px 10px;${inPlanning?'opacity:.65;border-color:#69f0ae;color:#69f0ae;':''}">${inPlanning?t('planner.alreadyPlanned'):t('planner.add')}</button>
      </div>
      <div class="obj-header">
        <div>
          <div class="obj-name">${formatDisplayName(o)}</div>
          <div class="obj-cat">${o.cat} · ${getTypeLabel(o.type)}</div>
          <div class="obj-rating-row" style="margin-top:3px;display:flex;align-items:center;flex-wrap:wrap;gap:3px;">
            ${renderStars(rt.stars)}
            ${rt.stars?`<span class="rating-tag ${ratingTagCls(rt.stars)}">${rt.tag}</span>`:''}
            ${rt.comp?`<span class="rating-comp">🔗 ${rt.comp}</span>`:''}
          </div>
          ${rt.reason&&rt.stars>=3?`<div class="rating-reason">${rt.reason}</div>`:''}
        </div>
        <div>
          <div class="obj-alt-badge" style="color:${o.acc?color:'#555'}">${Math.round(o.alt)}°</div>
          <div class="obj-alt-label">${t('targets.altitude')}</div>
          ${o.cat!=='Planet'?`<div style="text-align:right;margin-top:4px;font-family:var(--mono);font-size:11px;color:var(--accent2);font-weight:700;line-height:1">${o.score}</div><div class="obj-alt-label">${t('targets.score')}</div>`:''}
        </div>
      </div>
      <div class="obj-meta">
        <span class="obj-tag">Mag ${o.mag}</span>
        <span class="obj-tag">${o.size}'</span>
        <span class="obj-tag" style="color:${color}">${rec.name}</span>
        <span class="obj-tag">Az ${Math.round(o.az)}°</span>
      </div>
      <div class="obj-bar"><div class="obj-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div><span class="obj-badge ${badgeCls}">${badge}</span></div>
    </div>`;
  }).join('');
}

function setFilter(f,el){
  currentFilter=f;
  syncFilterButtons(f, el);
  renderTargets();
  if(currentPage==='chart') drawChart();
}
