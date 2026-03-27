// js/chart/hover.js — Interaction hover/touch canvas

function hideMobileActionBar(){
  const bar=document.getElementById('chart-mobile-action-bar');
  if(bar) bar.style.display='none';
}

function updateMobileActionBar(o){
  if(window.innerWidth>768){hideMobileActionBar();return;}
  const bar=document.getElementById('chart-mobile-action-bar');
  if(!bar) return;
  if(!o){bar.style.display='none';return;}
  const inPlan=isInPlanning(o.id);
  const nameEl=document.getElementById('chart-mobile-action-name');
  if(nameEl) nameEl.textContent=formatDisplayName(o);
  const btn=document.getElementById('chart-mobile-plan-btn');
  if(btn){
    btn.textContent=inPlan?'✅ Déjà planifié':'➕ Planifier';
    btn.className='chart-mobile-plan-btn'+(inPlan?' in-plan':'');
    btn.onclick=()=>{addToPlannerById(o.id,'courbes');updateMobileActionBar(o);};
  }
  bar.style.display='flex';
}

function setupChartHover(){
  const tip=document.getElementById('chart-tooltip');
  if(tip && !tip.dataset.hoverBound){
    tip.dataset.hoverBound='1';
    tip.addEventListener('mouseleave', ()=>{
      hoveredId=null;
      tip.style.display='none';
      drawChart();
    });
  }
  ['altChart','altChartFS'].forEach(cid=>{
    const c=document.getElementById(cid);
    if(!c) return;
    c.addEventListener('mousemove', e=>onChartHover(e,c));
    c.addEventListener('mouseleave', e=>{
      const next=e.relatedTarget;
      if(tip && next && tip.contains(next)) return;
      hoveredId=null;
      tip.style.display='none';
      hideMobileActionBar();
      drawChart();
    });
    // Touch drag-to-scroll + tap-for-info (mobile)
    // glisser horizontalement = naviguer ; appui bref = afficher infos
    if(!c.dataset.touchDragBound){
      c.dataset.touchDragBound='1';
      const isMain=cid==='altChart';
      let _tx0=0,_ty0=0,_sl0=0,_drag=false;
      const getWrap=()=>isMain?document.querySelector('.chart-container.chart-wrap'):null;
      c.addEventListener('touchstart',e=>{
        const t=e.touches[0];
        _tx0=t.clientX;_ty0=t.clientY;_drag=false;
        const w=getWrap();if(w) _sl0=w.scrollLeft;
      },{passive:true});
      c.addEventListener('touchmove',e=>{
        const t=e.touches[0];
        const dx=_tx0-t.clientX,dy=_ty0-t.clientY;
        const w=getWrap();
        // Seuil : mouvement horizontal dominant > 8px → c'est un drag
        if(!_drag&&w&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){
          _drag=true;
          // Masquer popup et barre d'action pendant le défilement
          hoveredId=null;
          const tp=document.getElementById('chart-tooltip');
          if(tp) tp.style.display='none';
          hideMobileActionBar();
          drawChart();
        }
        if(_drag&&w){
          e.preventDefault(); // empêche le scroll page pendant drag horizontal
          w.scrollLeft=_sl0+dx;
        }
      },{passive:false});
      c.addEventListener('touchend',e=>{
        if(!_drag){
          // Tap court = afficher infos objet
          const t=e.changedTouches[0];
          onChartHover({clientX:t.clientX,clientY:t.clientY,target:c},c);
        }
        _drag=false;
      },{passive:true});
    }
  });
  // Masquer le tooltip quand l'utilisateur défile horizontalement le canvas
  const chartWrap=document.querySelector('.chart-container.chart-wrap');
  if(chartWrap && !chartWrap.dataset.scrollBound){
    chartWrap.dataset.scrollBound='1';
    chartWrap.addEventListener('scroll',()=>{
      if(window.innerWidth>768) return;
      hoveredId=null;
      const t=document.getElementById('chart-tooltip');
      if(t) t.style.display='none';
      hideMobileActionBar();
    },{passive:true});
  }
}

function onChartHover(e, canvas){
  if(!chartData.length) return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left;
  const my=e.clientY-rect.top;

  // Trouver l'objet le plus proche de la souris (distance min à la courbe)
  let bestId=null, bestDist=28; // seuil en px
  chartData.forEach(({co,pts})=>{
    pts.forEach(p=>{
      const d=Math.hypot(p.x-mx,p.y-my);
      if(d<bestDist){bestDist=d;bestId=co.id;}
    });
  });

  const tip=document.getElementById('chart-tooltip');
  if(bestId!==hoveredId){
    hoveredId=bestId;
    drawChart();
  }

  if(bestId){
    const entry=chartData.find(e=>e.co.id===bestId);
    const co=entry?.co;
    const o=resolveObjectById(bestId,getViewTime());
    if(co&&o){
      // Trouver point sous la souris pour afficher alt/az
      const closestPt=entry.pts.reduce((m,p)=>Math.hypot(p.x-mx,p.y-my)<Math.hypot(m.x-mx,m.y-my)?p:m,entry.pts[0]);
      const {accessible:winStr, optimal:optStr}=getChartEntryWindows(entry);

      const rt=getRating(o.id);
      const astroBinUrl=getAstroBinSearchUrl(o);
      const starsHtml=rt.stars
        ? `<span style="letter-spacing:1px;">${'★'.repeat(rt.stars)}<span style="opacity:.25">${'★'.repeat(5-rt.stars)}</span></span> <span style="font-size:9px;opacity:.8">${rt.tag}</span>`
        : '';
      const compHtml=rt.comp?`<div style="color:var(--accent2);margin-top:2px;font-size:9px;">🔗 ${rt.comp}</div>`:'';
      const reasonHtml=rt.reason&&rt.stars>=3?`<div style="opacity:.65;font-style:italic;margin-top:2px;font-size:9px;line-height:1.3">${rt.reason}</div>`:'';
      const astroBinHtml=astroBinUrl
        ? `<div style="margin-top:6px;font-size:10px;"><a href="${astroBinUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:none;border-bottom:1px dashed rgba(79,195,247,.45);padding-bottom:1px;pointer-events:auto;">🔗 Voir des images AstroBin</a></div>`
        : '';
      const tipIsMobile=window.innerWidth<=768;
      const tipInPlan=isInPlanning(o.id);
      const planHtml=(o.cat!=='Planet')
        ? `<div style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.12);">
            <button id="chart-tip-plan-btn" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid ${tipInPlan?'rgba(105,240,174,.4)':'rgba(255,213,79,.35)'};background:rgba(255,255,255,.04);color:${tipInPlan?'#69f0ae':'var(--gold)'};font:600 12px/1 var(--mono);cursor:pointer;min-height:38px;text-align:center;">
              ${tipInPlan?'✅ Déjà planifié':'➕ Planifier'}
            </button></div>`
        : '';
      tip.innerHTML=
        `<div style="color:${co.color};font-weight:700;margin-bottom:3px">${o.name}</div>`+
        (starsHtml?`<div style="color:#ffd54f;font-size:13px;margin-bottom:3px">${starsHtml}</div>`:'')+
        reasonHtml+compHtml+
        `<div style="margin-top:4px;opacity:.7;font-size:9px">${o.type} · ${o.filter||''}</div>`+
        `<div style="opacity:.7;font-size:9px">Alt: ${Math.round(closestPt.alt)}° · Az: ${Math.round(closestPt.az)}°</div>`+
        `<div style="opacity:.7;font-size:9px">Fenêtre: ${winStr}</div>`+
        (optStr!=='—'
          ? `<div style="color:#69f0ae;font-size:9px;margin-top:3px">✨ Optimal: ${optStr}</div>`
          : `<div style="opacity:.45;font-size:9px;margin-top:3px">✨ Optimal: pas de créneau idéal</div>`)+
        astroBinHtml+planHtml;
      // Lier le bouton planifier du tooltip
      if(o.cat!=='Planet'){
        const planBtn=document.getElementById('chart-tip-plan-btn');
        if(planBtn){
          planBtn.onclick=()=>{
            addToPlannerById(o.id,'courbes');
            if(tipIsMobile) updateMobileActionBar(o);
            const ip=isInPlanning(o.id);
            planBtn.textContent=ip?'✅ Déjà planifié':'➕ Planifier';
            planBtn.style.color=ip?'#69f0ae':'var(--gold)';
            planBtn.style.borderColor=ip?'rgba(105,240,174,.4)':'rgba(255,213,79,.35)';
          };
        }
      }
      tip.style.display='block';
      // Position tooltip
      if(tipIsMobile){
        const tipW=240;
        const left=Math.max(8,Math.min(window.innerWidth-tipW-8,e.clientX-Math.round(tipW/2)));
        const topPos=e.clientY>window.innerHeight/2
          ? Math.max(60,e.clientY-280)
          : e.clientY+10;
        tip.style.left=left+'px';
        tip.style.top=topPos+'px';
      } else {
        const tx=e.clientX+14, ty=e.clientY-10;
        const tipW=tip.offsetWidth||200;
        tip.style.left=(tx+tipW>window.innerWidth?e.clientX-tipW-10:tx)+'px';
        tip.style.top=Math.max(0,ty)+'px';
      }
      // Barre d'action mobile (tap)
      updateMobileActionBar(o);
    }
  } else {
    tip.style.display='none';
    hideMobileActionBar();
  }
}
