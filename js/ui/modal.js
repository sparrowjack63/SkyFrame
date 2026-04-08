let fsOpen = false;
let currentModalObjectId = null;

function modalTranslate(key, fallback, params){
  return window.SkyFrameI18n ? window.SkyFrameI18n.translate(key, params) : fallback;
}

// js/ui/modal.js — Modal détail objet + fullscreen

function openModal(id){
  currentModalObjectId = id;
  const t=getViewTime();
  const o=resolveObjectById(id,t);
  if(!o) return;
  const lstD=lst(jd(t),S.lon);
  const{alt,az}=altaz(o.ra,o.dec,lstD,S.lat);
  const acc=isAcc(alt,az);
  const mp=moon(t);
  const rec=recFilter(o,mp.ill);
  const f=field();
  const color=TYPE_COLOR[o.type]||'#fff';
  const poseMin=o.emission?8:4;
  const sc=o.cat!=='Planet'?calcScore(o):null;

  // Compute 12h window from 18h tonight
  const base=new Date(t);base.setHours(18,0,0,0);
  if(base>t) base.setDate(base.getDate()-1);
  let winStart=null,winEnd=null,inW=false;
  for(let i=0;i<=16*4;i++){
    const tc=new Date(base.getTime()+i*15*60000);
    const ld=lst(jd(tc),S.lon);
    const{alt:a,az:z}=altaz(o.ra,o.dec,ld,S.lat);
    const ac=isAcc(a,z);
    if(ac&&!inW){winStart=tc;inW=true;}
    if(!ac&&inW){winEnd=tc;break;}
  }
  if(inW&&!winEnd) winEnd=new Date(base.getTime()+16*3600000);
  const ft=d=>d?`${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`:'--';

  // Timeline bar
  let tlHTML='';
  if(winStart&&winEnd){
    const nightStart=18,nightEnd=34; // 18h → 10h+24
    const ws=winStart.getHours()+winStart.getMinutes()/60;
    const we=winEnd.getHours()+winEnd.getMinutes()/60;
    const wsAdj=ws<12?ws+24:ws,weAdj=we<12?we+24:we;
    const x1=Math.max(0,Math.min(100,(wsAdj-nightStart)/(nightEnd-nightStart)*100));
    const x2=Math.max(0,Math.min(100,(weAdj-nightStart)/(nightEnd-nightStart)*100));
    const dur=weAdj-wsAdj;
    tlHTML=`<div class="window-timeline">
      <div class="window-bar" style="left:${x1}%;width:${x2-x1}%;background:${color}">
        <span class="window-label">${modalTranslate('modal.window.availableHours','{{hours}}h disponible', { hours: dur.toFixed(1) })}</span>
      </div>
      <span class="window-tick" style="left:0%">18h</span>
      <span class="window-tick" style="left:37.5%">24h</span>
      <span class="window-tick" style="left:75%">04h</span>
    </div>`;
  }

  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title" style="color:${color}">${formatDisplayName(o)}</div>
    <div class="modal-subtitle">${o.cat} · ${TYPE_LABEL[o.type]} · ${modalTranslate('modal.mag','Mag')} ${o.mag} · ${modalTranslate('modal.size','Taille')} ${o.size}'</div>

    <div class="modal-section">
      <div class="modal-section-title">📍 ${modalTranslate('modal.section.positionAt','Position à {{time}}',{ time: ft(t) })}</div>
      <div class="modal-grid">
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.altitude','Altitude')}</div><div class="modal-stat-value" style="color:${acc?color:'#ff6b6b'}">${Math.round(alt)}°</div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.azimuth','Azimut')}</div><div class="modal-stat-value">${Math.round(az)}°</div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.raDec','AR / Déc')}</div><div class="modal-stat-value" style="font-size:10px">${(o.ra/15).toFixed(2)}h / ${o.dec.toFixed(1)}°</div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.accessible','Accessible')}</div><div class="modal-stat-value" style="color:${acc?'#69f0ae':'#ff6b6b'};font-size:12px">${acc?modalTranslate('modal.value.accessibleYes','✅ OUI'):modalTranslate('modal.value.accessibleNo','❌ NON')}</div></div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">⏰ ${modalTranslate('modal.section.windowTonight','Fenêtre cette nuit')}</div>
      ${winStart?`<div class="modal-grid" style="margin-bottom:8px">
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.start','Début')}</div><div class="modal-stat-value" style="color:#69f0ae">${ft(winStart)}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.end','Fin')}</div><div class="modal-stat-value" style="color:#ff6b6b">${ft(winEnd)}</div></div>
      </div>${tlHTML}`:`<div style="color:#ff6b6b;font-size:12px;padding:8px">${modalTranslate('modal.window.unavailable','Pas accessible cette nuit depuis votre site.')}</div>`}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">🔬 ${modalTranslate('modal.section.recommendedSettings','Réglages recommandés')}</div>
      <div class="modal-grid">
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.filter','Filtre')}</div><div class="modal-stat-value" style="color:#ffd54f;font-size:11px">${rec.name}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.reason','Raison')}</div><div class="modal-stat-value" style="font-size:9px;color:#8899cc">${rec.reason}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.subExposure','Pose unitaire')}</div><div class="modal-stat-value">${poseMin} min</div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.gainOffset','Gain / Offset')}</div><div class="modal-stat-value">100 / 50</div></div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">📐 ${modalTranslate('modal.section.framing','Cadrage')} (${f.w.toFixed(1)}° × ${f.h.toFixed(1)}°)</div>
      <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.objectFieldSize','Taille objet / champ')}</div>
      <div class="modal-stat-value" style="font-size:11px">${o.size}' (${(o.size/60).toFixed(2)}°) — ${o.size/60<f.h?modalTranslate('modal.framing.fitsField','✅ Entre dans le champ'):modalTranslate('modal.framing.mosaicNeeded','⚠️ Mosaïque nécessaire')}</div></div>
    </div>

    ${o.groupMembers&&o.groupMembers.length?`<div class="modal-section">
      <div class="modal-section-title">🧩 ${modalTranslate('modal.section.composition','Composition')} (${o.groupMembers.length} ${modalTranslate('modal.member','membre')}${o.groupMembers.length>1?modalTranslate('modal.memberPluralSuffix','s'):''})</div>
      <div style="font-size:11px;color:var(--accent2);line-height:1.8">${o.groupMembers.join(' · ')}</div>
    </div>`:''}
    ${o.group&&o.group.length?`<div class="modal-section">
      <div class="modal-section-title">🔗 ${modalTranslate('modal.section.group','Groupe')} (${o.group.length} ${modalTranslate('modal.neighbor','voisin')}${o.group.length>1?modalTranslate('modal.neighborPluralSuffix','s'):''})</div>
      <div style="font-size:11px;color:var(--accent2);line-height:1.8">${o.group.join(' · ')}</div>
    </div>`:''}
    <div class="modal-section">
      <div class="modal-section-title">ℹ️ ${modalTranslate('modal.section.info','Infos')}</div>
      <p style="font-size:11px;color:#aabbdd;line-height:1.6">${o.desc||'—'}</p>
      <p style="font-size:10px;color:#667799;margin-top:5px;font-style:italic">${o.notes||''}</p>
      ${o.months&&o.months.length?`<p style="font-size:9px;color:var(--text3);margin-top:4px;font-family:var(--mono)">${modalTranslate('modal.visibleMonths','Visible')} : ${o.months.map(m=>MONTHS[m]).join(' · ')}</p>`:''}
    </div>
    ${sc?`<div class="modal-section">
      <div class="modal-section-title">🏆 ${modalTranslate('modal.section.qualityScore','Score qualité')} — ${sc.total}/100</div>
      <div class="modal-grid">
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.surfaceBrightness','Brillance surface')}</div><div class="modal-stat-value" style="color:var(--accent)">${sc.sA}<span style="font-size:9px;opacity:.5">/40</span></div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.angularSize','Taille angulaire')}</div><div class="modal-stat-value" style="color:var(--accent)">${sc.sB}<span style="font-size:9px;opacity:.5">/35</span></div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.groupBonus','Bonus groupe')}</div><div class="modal-stat-value" style="color:var(--accent)">${sc.sC}<span style="font-size:9px;opacity:.5">/25</span></div></div>
        <div class="modal-stat"><div class="modal-stat-label">${modalTranslate('modal.stat.totalScore','Score total')}</div><div class="modal-stat-value" style="color:var(--accent2);font-size:18px">${sc.total}<span style="font-size:9px;opacity:.5">/100</span></div></div>
      </div>
      <div style="margin-top:8px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden"><div style="height:100%;width:${sc.total}%;background:var(--accent2);border-radius:2px;"></div></div>
    </div>`:''}`;


  const ov=document.getElementById('modal');
  ov.style.display='flex';
  setTimeout(()=>ov.classList.add('open'),10);
}

function closeModal(e){if(e.target===document.getElementById('modal'))closeModalBtn();}

function closeModalBtn(){const ov=document.getElementById('modal');currentModalObjectId=null;ov.classList.remove('open');setTimeout(()=>ov.style.display='none',350);}

function openFullscreen(){
  fsOpen = true;
  document.getElementById('chart-fullscreen').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Prevent scroll on iOS
  document.addEventListener('touchmove', preventScroll, {passive:false});
  setTimeout(()=>{setupChartHover();drawChart();}, 60);
}

function closeFullscreen(){
  fsOpen = false;
  document.getElementById('chart-fullscreen').classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('touchmove', preventScroll);
  setTimeout(drawChart, 30);
}

function preventScroll(e){ e.preventDefault(); }

let schemaZoom = 1;

function applySchemaZoom(){
  const inner = document.getElementById('schema-modal-inner');
  const svg = inner?.querySelector('svg');
  if(!svg) return;
  svg.style.width = `${Math.round(1200 * schemaZoom)}px`;
  svg.style.height = 'auto';
}

function adjustSchemaZoom(delta){
  schemaZoom = Math.max(0.6, Math.min(2.4, +(schemaZoom + delta).toFixed(2)));
  applySchemaZoom();
}

function resetSchemaZoom(){
  schemaZoom = 1;
  applySchemaZoom();
}

function openSchemaModal() {
  const modal = document.getElementById('schema-modal');
  const inner = document.getElementById('schema-modal-inner');
  inner.innerHTML = '';
  const origSvg = document.querySelector('#schema-container svg');
  if (origSvg) {
    const clone = origSvg.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    inner.appendChild(clone);
    if (window.SkyFrameInfoI18n && typeof window.SkyFrameInfoI18n.applyTranslations === 'function') {
      window.SkyFrameInfoI18n.applyTranslations();
    }
    schemaZoom = window.innerWidth <= 768 ? 1.35 : 1.1;
    applySchemaZoom();
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSchemaModal() {
  document.getElementById('schema-modal').classList.remove('open');
  document.body.style.overflow = '';
}


document.addEventListener('skyframe:languagechange', function() {
  const overlay=document.getElementById('modal');
  if(overlay && overlay.classList.contains('open') && currentModalObjectId){
    openModal(currentModalObjectId);
  }
});
