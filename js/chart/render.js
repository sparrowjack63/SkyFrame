// État global chart
let chartZoom = 'all';
let chartDrawn = false;
let chartData = [];
let hoveredId = null;
let mobileChartLimit = 10; // Limite mobile par défaut (0 = tous)

const CHART_PALETTE = [
  '#FF6B6B','#FF9F43','#ffd54f','#69f0ae','#4fc3f7','#A29BFE','#ff6b9d','#ff9f43',
  '#1DD1A1','#48DBFB','#ff7675','#a29bfe','#fd79a8','#fdcb6e','#6c5ce7','#00cec9',
  '#e17055','#74b9ff','#55efc4','#dfe6e9','#b2bec3','#636e72','#fab1a0','#81ecec',
];

// js/chart/render.js — Rendu canvas altitude + timeline nuit

function skyFrameChartTranslate(key, params){
  return window.SkyFrameI18n ? window.SkyFrameI18n.translate(key, params) : key;
}

function getChartObjs(){
  // Source = planètes dynamiques + liste catalogue visible cohérente avec l'onglet Cibles
  // La recherche n'exclut pas les courbes : elle sert à mettre en avant les matches.
  const t=getViewTime();
  const lstD=lst(jd(t),S.lon);
  const mp=moon(t);
  const nb=getOrComputeNightBounds();
  const planetList=Object.keys(PLANETS_META).map(n=>getPlanetObj(n,t)).filter(o=>{
    if(currentFilter!=='accessible') return matchesObjectFilter(o,currentFilter,lstD,mp);
    return isAccessibleAtAnyNightMoment(o,nb,mp);
  });
  const catList=getVisibleCatalogList(currentFilter,lstD,mp,'chart');
  const entries=[...planetList,...catList]
    .map((o,i)=>({
      id:    o.id,
      cat:   o.cat,
      ref:   o,
      // Label = ID catalogue + nom court lisible, priorité au nom Messier si dispo
      label: (()=>{
        const displayName=formatDisplayName(o);
        const sep = displayName.match(/[—–-]/);
        if(sep){
          const parts = displayName.split(/[—–-]/);
          const catId = parts[0].trim().substring(0,14);
          const shortName = parts.slice(1).join(' ').trim().substring(0,16)||'';
          return shortName ? catId+' '+shortName : displayName.substring(0,24);
        }
        return displayName.substring(0,24);
      })(),
      fullName: formatDisplayName(o),
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      type:  o.type,
    }));
  // Limite mobile : configurable via contrôle (défaut 10), 0 = tous
  if(!fsOpen && typeof window!=='undefined' && window.innerWidth<=768 && mobileChartLimit>0){
    const MOBILE_MAX=mobileChartLimit;
    const pl=entries.filter(e=>e.cat==='Planet');
    const ot=entries.filter(e=>e.cat!=='Planet');
    return [...pl,...ot.slice(0,Math.max(0,MOBILE_MAX-pl.length))];
  }
  return entries;
}

function setZoom(z){
  chartZoom=z;
  // Highlight both normal and fullscreen zoom buttons
  document.querySelectorAll('[id^="zoom-"],[id^="fs-zoom-"]').forEach(b=>{
    b.style.color=''; b.style.borderColor='';
  });
  ['zoom-'+z, 'fs-zoom-'+z].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.style.color='var(--accent)';el.style.borderColor='var(--accent)';}
  });
  drawChart();
}

function setMobileChartLimit(n){
  mobileChartLimit=n;
  const ids={10:'cml-btn-10',20:'cml-btn-20',50:'cml-btn-50',0:'cml-btn-all'};
  Object.entries(ids).forEach(([v,id])=>{
    const btn=document.getElementById(id);
    if(btn) btn.classList.toggle('active', parseInt(v)===n);
  });
  drawChart();
}

function getZoomBounds(nb){
  if(chartZoom==='astro')  return {s:nb.astroDusk-0.3, e:nb.astroDawn+0.3};
  const mid=(nb.astroDusk+nb.astroDawn)/2;
  if(chartZoom==='first')  return {s:nb.sunset, e:mid};
  if(chartZoom==='second') return {s:mid, e:nb.sunrise};
  return {s:nb.sunset, e:nb.sunrise};
}

function getChartEntryWindows(entry, nb=getOrComputeNightBounds()){
  if(!entry||!entry.pts||!entry.pts.length) return {accessible:'—',optimal:'—'};
  const spanH=nb.sunrise-nb.sunset;
  const build=(predicate)=>{
    const wins=[]; let inW=false, startIdx=0;
    entry.pts.forEach((p,i)=>{
      if(predicate(p,i)&&!inW){inW=true;startIdx=i;}
      if(!predicate(p,i)&&inW){inW=false;wins.push([startIdx,i-1]);}
    });
    if(inW) wins.push([startIdx,entry.pts.length-1]);
    return wins.map(([a,b])=>{
      const ha=nb.sunset+a/entry.pts.length*spanH;
      const hb=nb.sunset+b/entry.pts.length*spanH;
      return fmtH(ha)+'→'+fmtH(hb);
    }).join(', ')||'—';
  };
  const moonIll=moon(getViewTime()).ill;
  return {
    accessible: build(p=>p.acc),
    optimal: build((p,i)=>{
      const hL=nb.sunset+i/entry.pts.length*spanH;
      const lightsOff=isLightsOff(hL);
      const darkAstro=(hL>=nb.astroDusk && hL<=nb.astroDawn);
      const tc=new Date(getViewTime().getTime());
      const hActual=((hL%24)+24)%24;
      tc.setHours(Math.floor(hActual),Math.round((hActual%1)*60),0,0);
      if(hL>=24) tc.setDate(tc.getDate()+1);
      const moonLow=(moonIll<30)||(moonAltAtTime(tc)<=0);
      return p.acc && darkAstro && lightsOff && moonLow;
    })
  };
}

function getChartSearchInfoCandidate(entry){
  if(!entry||!entry.co) return null;
  const t=getViewTime();
  const o=resolveObjectById(entry.co.id,t) || entry.co.ref;
  if(!o) return null;
  const rt=getRating(o.id);
  const score=(o.cat==='Planet')?null:calcScore(o).total;
  return {entry,o,rt,score,rank:(entry.nowAccessible?1000:0)+(entry.hasNightAccess?300:0)+(rt.stars||0)*40+Math.round(score||0)};
}

function renderChartSearchInfoPanel(entries, searchHasMatch){
  const panel=document.getElementById('chart-search-info-panel');
  if(!panel) return;
  const q=objectSearch.trim();
  if(!q || !searchHasMatch){
    panel.style.display='none';
    panel.innerHTML='';
    return;
  }
  const candidates=entries.filter(e=>e.searchMatch).map(getChartSearchInfoCandidate).filter(Boolean).sort((a,b)=>b.rank-a.rank);
  const best=candidates[0];
  if(!best){
    panel.style.display='none';
    panel.innerHTML='';
    return;
  }
  const {entry,o,rt,score}=best;
  const windows=getChartEntryWindows(entry);
  const currentAlt=Math.round((o.alt??entry.pts.find(p=>p.acc)?.alt??entry.pts[0]?.alt??0));
  const currentAz=Math.round((o.az??entry.pts[0]?.az??0));
  const stars=rt.stars?`${'★'.repeat(rt.stars)}<span style="opacity:.22">${'★'.repeat(5-rt.stars)}</span>`:'—';
  const typeLabel={nebula:skyFrameChartTranslate('chart.type.nebula'),galaxy:skyFrameChartTranslate('chart.type.galaxy'),cluster:skyFrameChartTranslate('chart.type.cluster'),planetary:skyFrameChartTranslate('chart.type.planetary'),snr:skyFrameChartTranslate('chart.type.snr'),planet:skyFrameChartTranslate('chart.type.planet')}[o.type]||o.type||'—';
  const scoreLabel=score===null?'—':`${Math.round(score)}/100`;
  const filterLabel=o.cat==='Planet'?'—':(recFilter(o)||o.filter||'—');
  const planningBtnLabel=isInPlanning(o.id)?skyFrameChartTranslate('planner.action.alreadyInPlanner'):skyFrameChartTranslate('planner.action.addToPlanner');
  const planningBtnColor=isInPlanning(o.id)?'#69f0ae':'var(--gold)';
  const planningBtnBorder=isInPlanning(o.id)?'rgba(105,240,174,.4)':'rgba(255,213,79,.35)';
  const compParts=[];
  if(rt.comp) compParts.push(rt.comp);
  if(Array.isArray(o.group)&&o.group.length) compParts.push(o.group.slice(0,5).join(', ')+(o.group.length>5?'…':''));
  const compLabel=compParts.length?[...new Set(compParts)].join(' · '):'—';
  const astroBinUrl=getAstroBinSearchUrl(o);
  const chips=[
    [skyFrameChartTranslate('chart.info.type'), typeLabel],
    [skyFrameChartTranslate('chart.info.rating'), `${stars}${rt.tag?` <span style="font-size:10px;opacity:.8">${rt.tag}</span>`:''}`],
    [skyFrameChartTranslate('chart.info.score'), scoreLabel],
    [skyFrameChartTranslate('chart.info.filter'), filterLabel],
    [skyFrameChartTranslate('chart.info.altitude'), skyFrameChartTranslate('chart.info.altAzValue', { alt: currentAlt, az: currentAz })],
    [skyFrameChartTranslate('chart.info.window'), windows.accessible],
    [skyFrameChartTranslate('chart.info.optimal'), windows.optimal==='—'?skyFrameChartTranslate('chart.info.noOptimal'):windows.optimal],
    [skyFrameChartTranslate('chart.info.companions'), compLabel]
  ];
  panel.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px;">
      <div>
        <div style="font:700 11px var(--mono);letter-spacing:.08em;color:var(--accent);margin-bottom:4px;">${skyFrameChartTranslate('chart.search.mainMatch')}</div>
        <div style="font-size:18px;font-weight:800;color:var(--text);line-height:1.2;">${formatDisplayName(o)}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px;">${skyFrameChartTranslate('chart.search.summary', { query: q.replace(/</g,'&lt;'), count: candidates.length, suffix: candidates.length>1?'es':'' })}</div>
        ${(o.secondaryId&&o.secondaryId!==o.id)?`<div style="font-size:10px;color:var(--text3);margin-top:4px;">${skyFrameChartTranslate('chart.search.canonicalSecondary', { id: o.id, secondary: formatCatalogIdForSearch(o.secondaryId) })}</div>`:`<div style="font-size:10px;color:var(--text3);margin-top:4px;">${skyFrameChartTranslate('chart.search.canonicalOnly', { id: o.id })}</div>`}
      </div>
      <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">
        <button type="button" onclick="addToPlannerById('${o.id}','courbes')" style="align-self:flex-start;color:${planningBtnColor};background:rgba(255,255,255,.03);text-decoration:none;border:1px solid ${planningBtnBorder};border-radius:999px;padding:6px 10px;font:600 11px var(--mono);cursor:pointer;">${planningBtnLabel}</button>
        ${astroBinUrl?`<a href="${astroBinUrl}" target="_blank" rel="noopener noreferrer" style="align-self:flex-start;color:var(--accent);text-decoration:none;border:1px solid rgba(79,195,247,.35);border-radius:999px;padding:6px 10px;font:600 11px var(--mono);">🔗 ${skyFrameChartTranslate('chart.search.astrobin')}</a>`:''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
      ${chips.map(([k,v])=>`<div style="border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.02);"><div style="font:700 10px var(--mono);letter-spacing:.06em;color:var(--text3);margin-bottom:4px;">${k}</div><div style="font-size:12px;color:var(--text);line-height:1.45;">${v}</div></div>`).join('')}
    </div>
    ${rt.reason?`<div style="margin-top:10px;font-size:11px;color:var(--text2);line-height:1.45;"><span style="color:#ffd54f;">💡</span> ${rt.reason}</div>`:''}
  `;
  panel.style.display='block';
}

function drawChart(){
  // Calculer les objets D'ABORD pour adapter la hauteur du canvas
  const OBJS=getChartObjs();
  const fsEl=document.getElementById('chart-fullscreen');
  const canvas = fsOpen
    ? document.getElementById('altChartFS')
    : document.getElementById('altChart');
  if(!canvas) return;
  const isMobile = !fsOpen && window.innerWidth <= 768;
  const W = fsOpen
    ? window.innerWidth
    : isMobile
      ? Math.max(Math.round(window.innerWidth * 2.5), 800)
      : Math.max(200, canvas.parentElement.clientWidth-6);
  const H = fsOpen
    ? window.innerHeight - (document.getElementById('chart-fs-bar')?.offsetHeight||50) - (document.getElementById('chart-fs-legend')?.offsetHeight||60)
    : Math.max(380, Math.min(560, 220 + OBJS.length * 3));
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  const P={t:24,r:10,b:38,l:40};
  const cW=W-P.l-P.r, cH=H-P.t-P.b;

  const nb=getOrComputeNightBounds();
  const zb=getZoomBounds(nb);
  const spanH=zb.e-zb.s;

  const cs=getComputedStyle(document.documentElement);
  const cBg   =cs.getPropertyValue('--chart-bg').trim();
  const cGrid =cs.getPropertyValue('--chart-grid').trim();
  const cLabel=cs.getPropertyValue('--chart-label').trim();
  const cText =cs.getPropertyValue('--chart-text').trim();
  ctx.fillStyle=cBg; ctx.fillRect(0,0,W,H);

  // ── Fond dégradé : ciel de la nuit ──────────────────────────────────────────
  // Définition des couleurs par phase (sur fond chart-bg déjà posé)
  // Stratégie : gradient horizontal continu interpolé entre les points clés
  {
    const phases = [
      {h: zb.s,          r:40, g:30, b:10, a:.55},   // avant coucher : ambre très sombre
      {h: nb.sunset,     r:35, g:25, b: 8, a:.50},   // coucher
      {h: nb.civilDusk,  r:20, g:18, b:35, a:.42},   // crépuscule civil : violet
      {h: nb.nautDusk,   r:10, g:10, b:30, a:.38},   // nautique : bleu nuit
      {h: nb.astroDusk,  r: 3, g: 4, b:18, a:.30},   // début nuit astro : presque noir
      {h:(nb.astroDusk+nb.astroDawn)/2, r:1,g:2,b:10,a:.20}, // milieu nuit : noir pur
      {h: nb.astroDawn,  r: 3, g: 4, b:18, a:.30},   // fin nuit astro
      {h: nb.nautDawn,   r:10, g:10, b:30, a:.38},   // nautique aube
      {h: nb.civilDawn,  r:20, g:18, b:35, a:.42},   // civil aube
      {h: nb.sunrise,    r:35, g:25, b: 8, a:.50},   // lever
      {h: zb.e,          r:40, g:30, b:10, a:.55},   // après lever
    ].filter(p => p.h >= zb.s && p.h <= zb.e);

    // Construire un gradient horizontal linéaire
    if(phases.length >= 2){
      const grad = ctx.createLinearGradient(P.l, 0, P.l+cW, 0);
      phases.forEach(p=>{
        const t = Math.max(0, Math.min(1, (p.h - zb.s) / spanH));
        grad.addColorStop(t, `rgba(${p.r},${p.g},${p.b},${p.a})`);
      });
      ctx.fillStyle = grad;
      ctx.fillRect(P.l, P.t, cW, cH);
    }

    // Bordures verticales nettes aux transitions clés
    const transitions = [
      {h:nb.astroDusk, color:'rgba(100,120,255,.25)', w:1.5, lbl:'🌑', lblY:P.t+12},
      {h:nb.astroDawn, color:'rgba(100,120,255,.25)', w:1.5, lbl:'🌑', lblY:P.t+12},
      {h:nb.nautDusk,  color:'rgba(60,80,160,.18)',   w:1,   lbl:'',   lblY:0},
      {h:nb.nautDawn,  color:'rgba(60,80,160,.18)',   w:1,   lbl:'',   lblY:0},
    ];
    transitions.forEach(tr=>{
      const x = P.l + ((tr.h - zb.s)/spanH)*cW;
      if(x<P.l||x>P.l+cW) return;
      ctx.save();
      ctx.strokeStyle=tr.color; ctx.lineWidth=tr.w;
      ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(x,P.t); ctx.lineTo(x,P.t+cH); ctx.stroke();
      ctx.setLineDash([]);
      if(tr.lbl){
        ctx.fillStyle='rgba(120,140,255,.7)';
        ctx.font='10px "Space Mono"'; ctx.textAlign='center';
        ctx.fillText(tr.lbl, x, tr.lblY);
      }
      ctx.restore();
    });

    // Label "NUIT NOIRE" au centre de la nuit astronomique
    const xCenter = P.l + ((nb.astroDusk+nb.astroDawn)/2 - zb.s)/spanH*cW;
    if(xCenter>P.l+30 && xCenter<P.l+cW-30){
      ctx.save();
      ctx.fillStyle='rgba(80,100,200,.35)';
      ctx.font='bold 8px "Space Mono"'; ctx.textAlign='center';
      ctx.fillText(skyFrameChartTranslate('chart.nightLabel'), xCenter, P.t+cH-6);
      ctx.restore();
    }
  }

  // ── Zone éclairage local (piloté par S.lightingMode) ───────────────────────
  if(S.lightingMode === 'none'){
    // Aucun éclairage local — pas de bande
  } else if(S.lightingMode === 'always_on'){
    // Éclairage toute la nuit — bande ambre sur toute la plage
    const xLo = P.l;
    const xLoE = P.l + cW;
    ctx.save();
    ctx.fillStyle = 'rgba(255,160,50,0.13)';
    ctx.fillRect(xLo, P.t, xLoE-xLo, cH);
    ctx.strokeStyle = 'rgba(255,160,50,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,3]);
    ctx.beginPath(); ctx.moveTo(xLo, P.t); ctx.lineTo(xLo, P.t+cH); ctx.stroke();
    ctx.setLineDash([]);
    const xMid = (xLo + xLoE) / 2;
    ctx.fillStyle = 'rgba(255,180,80,0.90)';
    ctx.font = 'bold 10px "Space Mono"'; ctx.textAlign = 'center';
    ctx.fillText('💡 ' + (S.lightingLabel||skyFrameChartTranslate('chart.lightingLabel')), xMid, P.t+16);
    ctx.restore();
  } else {
    // night_off — bande verte entre offTime et onTime
    const offH = parseHHMM(S.lightingOffTime||'22:30');
    const onH  = parseHHMM(S.lightingOnTime||'06:00') + 24;
    const loS = Math.max(zb.s, offH);
    const loE = Math.min(zb.e, onH);
    if(loE > loS){
      const xLo = P.l + ((loS - zb.s)/spanH)*cW;
      const xLoE = P.l + ((loE - zb.s)/spanH)*cW;
      ctx.save();
      ctx.fillStyle = 'rgba(100,200,100,0.30)';
      ctx.fillRect(xLo, P.t, xLoE-xLo, cH);
      ctx.strokeStyle = 'rgba(100,200,100,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(xLo, P.t); ctx.lineTo(xLo, P.t+cH); ctx.stroke();
      if(loE < zb.e){
        ctx.beginPath(); ctx.moveTo(xLoE, P.t); ctx.lineTo(xLoE, P.t+cH); ctx.stroke();
      }
      ctx.setLineDash([]);
      const xMid = (xLo + Math.min(xLoE, P.l+cW)) / 2;
      if(xMid > P.l+10 && xMid < P.l+cW-10){
        ctx.fillStyle = 'rgba(130,230,130,0.95)';
        ctx.font = 'bold 10px "Space Mono"'; ctx.textAlign = 'center';
        ctx.fillText('🌃 ' + (S.lightingLabel||skyFrameChartTranslate('chart.lightsOffLabel')), xMid, P.t+16);
      }
      ctx.restore();
    }
  }

  // Grid Y
  for(let a=0;a<=90;a+=15){
    const y=P.t+cH*(1-a/90);
    ctx.strokeStyle=a===0?'rgba(255,80,80,.5)':cGrid;
    ctx.lineWidth=a===0?1:.5;
    ctx.beginPath();ctx.moveTo(P.l,y);ctx.lineTo(P.l+cW,y);ctx.stroke();
    ctx.fillStyle=cLabel;ctx.font='9px "Space Mono"';ctx.textAlign='right';
    ctx.fillText(a+'°',P.l-3,y+3);
  }

  // Min altitude line (rouge bas)
  if(S.altMin>0){
    const y=P.t+cH*(1-S.altMin/90);
    ctx.strokeStyle='rgba(255,107,107,.8)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(P.l,y);ctx.lineTo(P.l+cW,y);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,80,80,1)';ctx.font='9px "Space Mono"';ctx.textAlign='left';
    ctx.fillText('min '+S.altMin+'°',P.l+4,y+10);
  }
  // Max altitude line — balcon du dessus (N-S, dépend de l'az des objets en cours)
  // On trace une ligne horizontale à altMax pour info visuelle
  if(S.altMax<90){
    const yMax=P.t+cH*(1-S.altMax/90);
    ctx.strokeStyle='rgba(255,160,0,.7)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(P.l,yMax);ctx.lineTo(P.l+cW,yMax);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,150,0,1)';ctx.font='9px "Space Mono"';ctx.textAlign='left';
    ctx.fillText('🏠 site↑ '+S.altMax+'° @ az'+S.azAltMaxRef+'°',P.l+4,yMax-3);
    ctx.fillStyle='rgba(255,120,0,.05)';ctx.fillRect(P.l,P.t,cW,yMax-P.t);
  }

  // Grid X — denser when zoomed
  const stepH=spanH<=2?0.25:spanH<=5?0.5:1;
  for(let h=Math.ceil(zb.s/stepH)*stepH;h<=zb.e+0.01;h+=stepH){
    const x=P.l+((h-zb.s)/spanH)*cW;
    if(x<P.l-1||x>P.l+cW+1) continue;
    ctx.strokeStyle=cGrid;ctx.lineWidth=.5;
    ctx.beginPath();ctx.moveTo(x,P.t);ctx.lineTo(x,P.t+cH);ctx.stroke();
    const hh=Math.floor(h)%24;
    const mm=Math.round((h%1)*60);
    const lbl=String(hh).padStart(2,'0')+'h'+(mm?String(mm).padStart(2,'0'):'');
    ctx.fillStyle=cLabel;ctx.font='10px "Space Mono"';ctx.textAlign='center';
    ctx.fillText(lbl,x,H-P.b+13);
  }

  // Twilight event icons (top axis)
  [{h:nb.sunset,l:'☀️↓'},{h:nb.astroDusk,l:'🌑'},{h:nb.astroDawn,l:'🌑'},{h:nb.sunrise,l:'☀️↑'}]
  .forEach(m=>{
    if(m.h<zb.s-.05||m.h>zb.e+.05) return;
    const x=P.l+((m.h-zb.s)/spanH)*cW;
    ctx.fillStyle=cLabel;ctx.font='12px sans-serif';ctx.textAlign='center';
    ctx.fillText(m.l,x,P.t-4);
  });

  // Date label (top-right)
  {
    const d = getBaseDate();
    const dayStr = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const dateLabel = dateOffset === 0 ? skyFrameChartTranslate('chart.date.nightOf', { day: dayStr }) : skyFrameChartTranslate('chart.date.forecast', { day: dayStr, offset: `${dateOffset>0?'+':''}${dateOffset}` });
    ctx.fillStyle = dateOffset === 0 ? 'rgba(160,160,160,.5)' : 'rgba(0,230,150,.8)';
    ctx.font = '9px "Space Mono"';
    ctx.textAlign = 'right';
    ctx.fillText(dateLabel, P.l+cW, 12);
  }

  // NOW marker
  const tnow=getViewTime();
  const nowH=tnow.getHours()+tnow.getMinutes()/60+(tnow.getHours()<12?24:0);
  if(nowH>=zb.s&&nowH<=zb.e){
    const x=P.l+((nowH-zb.s)/spanH)*cW;
    ctx.strokeStyle='rgba(105,240,174,.95)';ctx.lineWidth=2;ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(x,P.t);ctx.lineTo(x,P.t+cH);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#69f0ae';ctx.font='bold 10px "Space Mono"';ctx.textAlign='center';
    ctx.fillText(skyFrameChartTranslate('chart.nowMarker'),x,P.t-5);
  }

  // Object curves
  const tbase=new Date(tnow);
  const startHLocal=Math.floor(zb.s)%24;
  const startMLocal=Math.round((zb.s%1)*60);
  // Correction nuit traversant minuit : si on est après minuit avant le lever, la nuit a commencé hier
  const _tbaseNowH = tbase.getHours() + tbase.getMinutes()/60;
  if(_tbaseNowH < nb.sunrise) tbase.setDate(tbase.getDate() - 1);
  tbase.setHours(startHLocal,startMLocal,0,0);
  const STEPS=Math.ceil(spanH*8)+1;
  const searchActive=!!normalizeSearchText(objectSearch);
  const searchMatchedIds=new Set(OBJS.filter(co=>objectMatchesSearch(co.ref||resolveObjectById(co.id,tbase), objectSearch)).map(co=>co.id));
  const searchHasMatch=searchActive && searchMatchedIds.size>0;

  // Update label and count
  const filterNames={'all':skyFrameChartTranslate('filter.all'),'nebula':skyFrameChartTranslate('filter.nebulaPlural'),'galaxy':skyFrameChartTranslate('filter.galaxyPlural'),'cluster':skyFrameChartTranslate('filter.clusterPlural'),
    'planetary':skyFrameChartTranslate('filter.planetaryPlural'),'snr':skyFrameChartTranslate('filter.snr'),'sh2':skyFrameChartTranslate('filter.sh2'),'planet':skyFrameChartTranslate('filter.planetPlural'),'dualband':skyFrameChartTranslate('filter.dualband'),'lightpollution':skyFrameChartTranslate('filter.family.lightpollution'),'lextreme':skyFrameChartTranslate('filter.dualband'),'rgb':skyFrameChartTranslate('filter.continuum'),'accessible':skyFrameChartTranslate('filter.accessiblePlural'),
    'spring':skyFrameChartTranslate('filter.spring'),'summer':skyFrameChartTranslate('filter.summer'),'autumn':skyFrameChartTranslate('filter.autumn'),'winter':skyFrameChartTranslate('filter.winter'),'stars1':'⭐ 1','stars2':'⭐⭐ 2','stars3':'⭐⭐⭐ 3','stars4':'⭐⭐⭐⭐ 4','stars5':'⭐⭐⭐⭐⭐ 5'};
  const matchedCount=searchMatchedIds.size;
  const lbl=document.getElementById('chart-filter-label');
  if(lbl) lbl.textContent=skyFrameChartTranslate('chart.filterLabel', { filter: filterNames[currentFilter]||currentFilter, count: OBJS.length, suffix: OBJS.length>1?'s':'', search: searchActive?skyFrameChartTranslate('chart.filterSearchSuffix', { count: matchedCount }):'' });
  const cnt=document.getElementById('chart-obj-count');
  if(cnt) cnt.textContent=searchActive
    ? (searchHasMatch
        ? skyFrameChartTranslate('chart.count.matchesVisible', { count: matchedCount, suffix: matchedCount>1?'s':'', pluralE: matchedCount>1?'s':'' })
        : skyFrameChartTranslate('chart.count.noMatch', { query: objectSearch }))
    : (OBJS.length>30?skyFrameChartTranslate('chart.count.tooMany', { count: OBJS.length }):'' );


  // ── Impact lunaire binaire style Stellarium ─────────────────────────────────
  {
    const moonProfile=moonNightProfile(nb,tbase,STEPS,spanH);
    const illBase=moon(tbase).ill/100;
    const tealOpacity=0.15+illBase*0.35; // pleine lune≈0.5, nouvelle lune≈0.15

    // Détecter lever et coucher de lune dans la fenêtre
    let moonRiseH=null, moonSetH=null;
    const moonUpAtStart=moonProfile.length>0 && moonProfile[0].moonAlt>0;
    for(let i=1;i<moonProfile.length;i++){
      const prev=moonProfile[i-1], cur=moonProfile[i];
      if(prev.moonAlt<=0 && cur.moonAlt>0 && moonRiseH===null) moonRiseH=cur.hLocal;
      if(prev.moonAlt>0 && cur.moonAlt<=0 && moonSetH===null) moonSetH=cur.hLocal;
    }
    const moonDownAtEnd=moonProfile[moonProfile.length-1].moonAlt<=0;

    // Plage teal : lever→coucher (ou bord de fenêtre si lune déjà levée/reste levée)
    const tealStartH=moonUpAtStart ? zb.s : moonRiseH;
    const tealEndH=moonDownAtEnd ? moonSetH : zb.e;

    // Dessiner rectangle teal unique si lune visible et illumination suffisante
    if(tealStartH!==null && tealEndH!==null && tealEndH>tealStartH && illBase>0.03){
      const x1=P.l+Math.max(0,(tealStartH-zb.s)/spanH)*cW;
      const x2=P.l+Math.min(1,(tealEndH-zb.s)/spanH)*cW;
      if(x2>x1){
        ctx.fillStyle=`rgba(20,120,150,${tealOpacity.toFixed(3)})`;
        ctx.fillRect(x1,P.t,x2-x1,cH);
      }
    }

    // Labels lever/coucher de lune dans le graphe
    for(let i=1;i<moonProfile.length;i++){
      const prev=moonProfile[i-1], cur=moonProfile[i];
      const hCross=cur.hLocal;
      if(hCross<zb.s||hCross>zb.e) continue;
      const x=P.l+((hCross-zb.s)/spanH)*cW;
      if(x<P.l+4||x>P.l+cW-4) continue;
      if(prev.moonAlt<=0 && cur.moonAlt>0){
        ctx.save();
        ctx.font='11px sans-serif'; ctx.textAlign='center';
        ctx.fillStyle='rgba(200,220,255,.9)';
        ctx.fillText('🌙↑',x,P.t+cH-18);
        ctx.restore();
      } else if(prev.moonAlt>0 && cur.moonAlt<=0){
        ctx.save();
        ctx.font='11px sans-serif'; ctx.textAlign='center';
        ctx.fillStyle='rgba(200,220,255,.9)';
        ctx.fillText('🌙↓',x,P.t+cH-18);
        ctx.restore();
      }
    }

    // Label illumination lune si significative
    if(illBase>0.15){
      ctx.save();
      ctx.font='bold 9px "Space Mono"';
      const moonAlpha=Math.min(0.95,0.4+illBase*0.6);
      ctx.fillStyle=`rgba(200,220,255,${moonAlpha.toFixed(2)})`;
      ctx.textAlign='right';
      ctx.fillText(`🌕 ${Math.round(illBase*100)}%`,P.l+cW-4,P.t+14);
      ctx.restore();
    }
  }

  // Calculer tous les points d'abord
  chartData = OBJS.map(co=>{
    const isPlanet=co.cat==='Planet'||!!PLANETS_META[co.id];
    const o=isPlanet?resolveObjectById(co.id,tbase):((co.ref&&co.ref.id===co.id)?co.ref:resolveObjectById(co.id,tbase));
    if(!o) return null;
    const pts=[];
    for(let i=0;i<=STEPS;i++){
      const tc=new Date(tbase.getTime()+i*(spanH/STEPS)*3600000);
      const ld=lst(jd(tc),S.lon);
      let pra=o.ra, pdec=o.dec;
      if(isPlanet){const pp=planetRaDec(co.id,jd(tc));pra=pp.ra;pdec=pp.dec;}
      const{alt,az}=altaz(pra,pdec,ld,S.lat);
      const x=P.l+(i/STEPS)*cW;
      const y=P.t+cH*(1-Math.max(-0.07,alt/90));
      const balconyAcc=isAcc(alt,az)&&alt>S.altMin;
      const shootable=balconyAcc&&canShoot(o,moon(tc).ill);
      pts.push({x,y,acc:shootable,balconyAcc,alt,az});
    }
    const ap=pts.filter(p=>p.acc&&p.x>=P.l&&p.x<=P.l+cW);
    const pk=ap.length?ap.reduce((m,p)=>p.y<m.y?p:m,ap[0]):null;
    const nowLd=lst(jd(tbase),S.lon);
    let nowObj=o;
    if(isPlanet) nowObj=getPlanetObj(co.id,tbase);
    const nowAccessible=!!(nowObj && matchesObjectFilter(nowObj,'accessible',nowLd,moon(tbase)));
    const hasNightAccess=pts.some(p=>p.acc);
    const searchMatch=searchMatchedIds.has(co.id);
    return {co,pts,pk,nowAccessible,hasNightAccess,searchMatch};
  }).filter(Boolean);

  // Dessiner toutes les courbes — non-hovered en premier (fond), hovered par-dessus
  const isHov = id => id===hoveredId;
  const drawCurve = (entry, hov)=>{
    const{co,pts,pk,nowAccessible,hasNightAccess,searchMatch}=entry;
    const deemphasized=searchHasMatch && !searchMatch;
    const highlightedBySearch=searchHasMatch && searchMatch;
    const lw    = hov ? 4.5 : (highlightedBySearch ? 3.2 : 2);
    const alpha = hov ? 1 : deemphasized ? (hoveredId?0.12:0.18) : (highlightedBySearch ? (hoveredId?0.7:0.96) : (hoveredId?0.15:1));
    const accessibleFilter=currentFilter==='accessible';
    const dashAcc = [];
    const dashInacc = accessibleFilter ? [] : (hov ? [4,3] : [6,5]);
    ctx.lineWidth=lw;
    for(let i=1;i<pts.length;i++){
      const[p,c]=[pts[i-1],pts[i]];
      ctx.strokeStyle=co.color;
      ctx.setLineDash(c.acc?dashAcc:dashInacc);
      if(accessibleFilter && hasNightAccess){
        ctx.globalAlpha=c.acc
          ? (hov?1:alpha)
          : (nowAccessible ? (hov?0.42:alpha*0.38) : (hov?0.6:alpha*0.52));
      }else{
        ctx.globalAlpha=c.acc?(hov?1:alpha):(hov?0.4:alpha*0.25);
      }
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(c.x,c.y);ctx.stroke();
      if(highlightedBySearch && !hov && c.acc){
        ctx.save();
        ctx.strokeStyle=co.color;
        ctx.lineWidth=lw+3.5;
        ctx.globalAlpha=.14;
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(c.x,c.y);ctx.stroke();
        ctx.restore();
      }
    }
    ctx.setLineDash([]);ctx.globalAlpha=1;

    // Label pill au pic accessible
    if(pk){
      const statusSuffix = accessibleFilter ? (nowAccessible ? ' • '+skyFrameChartTranslate('chart.status.now') : (hasNightAccess ? ' • '+skyFrameChartTranslate('chart.status.later') : '')) : '';
      const searchSuffix = highlightedBySearch ? ' • '+skyFrameChartTranslate('chart.status.match') : '';
      const baseLabel = hov ? co.fullName.substring(0,28) : co.label;
      const label = (baseLabel + statusSuffix + searchSuffix).substring(0, hov ? 34 : 28);
      const fsize = hov ? 9 : 8;
      ctx.font=`bold ${fsize}px "Space Mono"`;
      const tw=ctx.measureText(label).width+12;
      const th=hov?15:13;
      const pillBg=currentTheme==='day'?'rgba(245,248,255,.97)':'rgba(8,14,30,.95)';
      ctx.fillStyle=pillBg;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(pk.x-tw/2,pk.y-th-2,tw,th,3);
      else ctx.rect(pk.x-tw/2,pk.y-th-2,tw,th);
      ctx.fill();
      if(hov){
        ctx.strokeStyle=co.color;ctx.lineWidth=1.5;
        ctx.stroke();
      }
      ctx.fillStyle=co.color;ctx.textAlign='center';
      ctx.fillText(label,pk.x,pk.y-6);
    }
    // Halo glow si hover
    if(hov && pk){
      ctx.beginPath();
      ctx.arc(pk.x,pk.y,5,0,Math.PI*2);
      ctx.fillStyle=co.color;ctx.globalAlpha=0.8;ctx.fill();
      ctx.globalAlpha=1;
    }
  };

  chartData.forEach(entry=>{ if(!isHov(entry.co.id)) drawCurve(entry,false); });
  // Hovered par-dessus
  const hovEntry=chartData.find(e=>e.co.id===hoveredId);
  if(hovEntry) drawCurve(hovEntry,true);

  // Re-dessiner la limite basse en surcouche pour qu'elle reste visible au-dessus des courbes
  if(S.altMin>0){
    const y=P.t+cH*(1-S.altMin/90);
    ctx.save();
    ctx.strokeStyle='rgba(255,90,90,.95)';
    ctx.lineWidth=2;
    ctx.setLineDash([6,4]);
    ctx.beginPath();
    ctx.moveTo(P.l,y);
    ctx.lineTo(P.l+cW,y);
    ctx.stroke();
    ctx.setLineDash([]);
    const label=`min ${S.altMin}°`;
    ctx.font='700 10px "Space Mono"';
    const tw=ctx.measureText(label).width;
    ctx.fillStyle='rgba(10,14,20,.88)';
    ctx.fillRect(P.l+4,y-12,tw+10,14);
    ctx.strokeStyle='rgba(255,90,90,.95)';
    ctx.lineWidth=1;
    ctx.strokeRect(P.l+4,y-12,tw+10,14);
    ctx.fillStyle='rgba(255,120,120,1)';
    ctx.textAlign='left';
    ctx.fillText(label,P.l+9,y-2);
    ctx.restore();
  }

  renderChartSearchInfoPanel(chartData, searchHasMatch);
  const fs2=OBJS.length>20;const legendHTML = chartData.map(entry=>`<div class="legend-item" style="font-size:${fsOpen?'10px':'8px'};opacity:${searchHasMatch && !entry.searchMatch?'.45':'1'};font-weight:${entry.searchMatch?'700':'400'}"><div class="legend-dot" style="background:${entry.co.color};${fs2?'width:7px;height:7px':''};box-shadow:${entry.searchMatch?'0 0 0 3px rgba(79,195,247,.16)':'none'}"></div>${entry.co.label}${entry.searchMatch?' · 🔎':''}</div>`).join('');
  const lgEl = document.getElementById(fsOpen?'chart-fs-legend':'chart-legend');
  if(lgEl) lgEl.innerHTML = legendHTML;
  // Also sync fs-filter-label
  const fsLbl=document.getElementById('fs-filter-label');
  if(fsLbl) fsLbl.textContent=document.getElementById('chart-filter-label')?.textContent||'';
  chartDrawn=true;
}

document.addEventListener('skyframe:languagechange', function() {
  if(currentPage==='chart') drawChart();
});

function drawNightTimeline(){
  const nb = getOrComputeNightBounds();
  const now = getViewTime();
  const nowH = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  // Normaliser nowH pour la nuit (si < sunset, c'est le lendemain matin)
  const nowN = nowH < nb.sunset - 2 ? nowH + 24 : nowH;

  // Fenêtre affichée : 1h avant coucher → 1h après lever
  const winS = nb.sunset  - 0.5;
  const winE = nb.sunrise + 0.5;
  const span = winE - winS;

  function pct(h){ return Math.max(0, Math.min(100, (h - winS) / span * 100)); }

  // Segments de couleur
  const segs = [
    {from:winS,         to:nb.sunset,     cls:'day'},
    {from:nb.sunset,    to:nb.civilDusk,  cls:'civil'},
    {from:nb.civilDusk, to:nb.nautDusk,   cls:'naut'},
    {from:nb.nautDusk,  to:nb.astroDusk,  cls:'astro'},
    {from:nb.astroDusk, to:nb.astroDawn,  cls:'dark'},
    {from:nb.astroDawn, to:nb.nautDawn,   cls:'astro'},
    {from:nb.nautDawn,  to:nb.civilDawn,  cls:'naut'},
    {from:nb.civilDawn, to:nb.sunrise,    cls:'civil'},
    {from:nb.sunrise,   to:winE,          cls:'day'},
  ];

  const bar = document.getElementById('ntl-bar');
  if(!bar) return;
  bar.innerHTML = segs.map(s=>{
    const l=pct(s.from), r=pct(s.to);
    if(r<=l) return '';
    return `<div class="ntl-seg ${s.cls}" style="width:${r-l}%;"></div>`;
  }).join('');

  // Highlight fenêtre optimale (nuit astronomique complète)
  const opt = document.getElementById('ntl-optimal');
  if(opt){
    const ol=pct(nb.astroDusk), or2=pct(nb.astroDawn);
    opt.style.display='block';
    opt.style.left=ol+'%';
    opt.style.width=(or2-ol)+'%';
  }

  // Marqueur "maintenant"
  const nowEl = document.getElementById('ntl-now');
  if(nowEl){
    const np = pct(nowN);
    if(np>0 && np<100){
      nowEl.style.display='block';
      nowEl.style.left=np+'%';
    } else {
      nowEl.style.display='none';
    }
  }

  // Labels heure
  const lblCont = document.getElementById('ntl-labels');
  if(lblCont){
    // Étapes clés à afficher
    const keyTimes = [
      {h:nb.sunset,    lbl:fmtH(nb.sunset),    dark:false},
      {h:nb.astroDusk, lbl:'🌑 '+fmtH(nb.astroDusk), dark:true},
      {h:(nb.astroDusk+nb.astroDawn)/2, lbl:skyFrameChartTranslate('chart.midnightLabel'), dark:true, small:true},
      {h:nb.astroDawn, lbl:fmtH(nb.astroDawn)+' 🌑', dark:true},
      {h:nb.sunrise,   lbl:fmtH(nb.sunrise),   dark:false},
    ];
    // Labels heure clés
    const keyHtml = keyTimes.map(k=>{
      const p=pct(k.h);
      if(p<3||p>97) return '';
      return `<span class="ntl-lbl ${k.dark?'dark-lbl':''}"
        style="left:${p}%;${k.small?'font-size:7px;opacity:.7;':''}">
        ${k.lbl}
      </span>`;
    }).join('');
    // Marqueurs lune sur la barre
    // Utiliser une base temporelle alignée sur le début de la nuit (cohérence avec les courbes)
    // Correction : si on est après minuit mais avant le lever du soleil, la nuit a commencé hier
    const _tbaseNtl = getBaseDate();
    const _nowH = _tbaseNtl.getHours() + _tbaseNtl.getMinutes()/60;
    if(_nowH < nb.sunrise) _tbaseNtl.setDate(_tbaseNtl.getDate() - 1);
    _tbaseNtl.setHours(Math.floor(nb.sunset)%24, Math.round((nb.sunset%1)*60), 0, 0);
    const moonResult2 = getMoonTimelineEvents(nb, _tbaseNtl, nb.sunset, nb.sunrise, 240);
    const moonEvts2 = moonResult2 && Array.isArray(moonResult2.events) ? moonResult2.events : [];
    const moonHtml2 = moonEvts2
      .filter(ev=>ev.type==='moon-rise'||ev.type==='moon-set')
      .map(ev=>{
        const p=pct(ev.h);
        if(p<2||p>98) return '';
        return `<span class="ntl-lbl ntl-lbl-moon" style="left:${p}%;">${ev.label}</span>`;
      }).join('');
    lblCont.innerHTML = keyHtml + moonHtml2;
  }

  // Pastilles de phases sous la barre
  const phases = document.getElementById('ntl-phases');
  if(phases){
    const items = [
      {color:'#1e3060', lbl:`${skyFrameChartTranslate('chart.twilight.civil')}  ${fmtH(nb.sunset)}→${fmtH(nb.civilDusk)}`},
      {color:'#142050', lbl:`${skyFrameChartTranslate('chart.twilight.nautical')}  ${fmtH(nb.civilDusk)}→${fmtH(nb.nautDusk)}`},
      {color:'#0a0e22', lbl:`${skyFrameChartTranslate('chart.twilight.astronomical')}  ${fmtH(nb.nautDusk)}→${fmtH(nb.astroDusk)}`},
      {color:'#ffd54f', lbl:`✨ ${skyFrameChartTranslate('chart.nightLabel')}  ${fmtH(nb.astroDusk)}→${fmtH(nb.astroDawn)}`, bold:true},
    ];
    phases.innerHTML = items.map(it=>`
      <span class="ntl-phase">
        <span class="dot" style="background:${it.color};${it.bold?'box-shadow:0 0 4px rgba(255,213,79,.5)':''}"></span>
        <span style="${it.bold?'color:var(--gold);font-weight:700':''}"> ${it.lbl}</span>
      </span>`).join('');
  }

  // Durée nuit noire dans le titre
  // Canvas lune sur la barre header
  const moonCv=document.getElementById('ntl-moon-canvas');
  if(moonCv){
    const bw=moonCv.parentElement.clientWidth||300;
    moonCv.width=bw; moonCv.height=22;
    const mctx=moonCv.getContext('2d');
    mctx.clearRect(0,0,bw,22);
    const illBase=moon(now).ill/100;
    if(illBase>0.05){
      // Calculer position lune heure par heure sur la nuit
      const MSTEPS=48;
      for(let i=0;i<=MSTEPS;i++){
        const hL=winS+i/MSTEPS*span;
        const h_ut=(hL-1+24)%24;
        const day2=hL<24?new Date(now.getFullYear(),now.getMonth(),now.getDate()):new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
        day2.setHours(Math.floor(h_ut),Math.round((h_ut%1)*60),0,0);
        const malt=moonAltAtTime(day2);
        if(malt<=0) continue;
        const altF=Math.min(1,malt/25);
        const alpha=Math.min(0.55,illBase*altF*0.8);
        const x=i/MSTEPS*bw;
        const wSeg=bw/MSTEPS+1;
        mctx.fillStyle=`rgba(200,215,255,${alpha.toFixed(3)})`;
        mctx.fillRect(x,0,wSeg,22);
      }
    }
  }

  // ntl-moon-events nettoyé (marqueurs déjà sur la barre)
  const moonEventsEl = document.getElementById('ntl-moon-events');
  if(moonEventsEl) moonEventsEl.innerHTML = '';

  const darkRange = document.getElementById('ntl-dark-range');
  if(darkRange){
    const darkH = nb.astroDawn - nb.astroDusk;
    const dh = Math.floor(darkH), dm = Math.round((darkH%1)*60);
    darkRange.textContent = `${dh}h${String(dm).padStart(2,'0')} ${skyFrameChartTranslate('chart.darkNightDuration')}`;
  }
}
