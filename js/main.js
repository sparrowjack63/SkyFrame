// ═══════════════════════════════════════════════════════════════════
// main.js — Bootstrap et état global SkyFrame
// Tous les modules métier sont chargés avant ce fichier (voir astrobalcon.html)
// ═══════════════════════════════════════════════════════════════════

// ── Thème ────────────────────────────────────────────────────────────
let currentTheme = 'night';

function localStorage_get_safe(k) {
  try { return localStorage.getItem(k); } catch(e) { return null; }
}

function setTheme(t) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.th-btn').forEach(b => {
    b.classList.toggle('active', b.id === 'th-' + t);
  });
  if (currentPage === 'chart') setTimeout(drawChart, 30);
  try { localStorage.setItem('astro_theme', t); } catch(e) {}
}

// ── État global nuit / temps → voir js/ui/clock.js

// ── État global UI ───────────────────────────────────────────────────
// currentFilter → voir js/ui/targets.js
// currentPage → voir js/ui/settings.js
// fsOpen → voir js/ui/modal.js

// ── État global chart ────────────────────────────────────────────────
// chart state moved to js/chart/render.js

// ── État global planner ──────────────────────────────────────────────
let PLANNED_TARGET_IDS = loadPlannedTargetIds();

// ── Listeners globaux ────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (fsOpen) closeFullscreen();
    if (document.getElementById('schema-modal').classList.contains('open')) closeSchemaModal();
  }
});

window.addEventListener('resize', () => {
  if (currentPage === 'chart') drawChart();
});

// ── Bootstrap ────────────────────────────────────────────────────────
// ── Profil de site ───────────────────────────────────────────────────
async function loadSiteProfile(){
  const urls = ['profiles/example.json'];
  for(const url of urls){
    try {
      const r = await fetch(url);
      if(!r.ok) continue;
      const p = await r.json();
      applySiteProfile(p);
      console.log('[SkyFrame] Profil chargé:', url, p.name || '');
      return;
    } catch(e) { /* essayer le suivant */ }
  }
}

function applySiteProfile(p){
  if(!p) return;
  // Nouveau format structuré
  if(p.site){
    if(p.site.lat !== undefined) S.lat = p.site.lat;
    if(p.site.lon !== undefined) S.lon = p.site.lon;
  }
  if(p.instrument){
    if(p.instrument.focal !== undefined) S.focal = p.instrument.focal;
    if(p.instrument.sensor !== undefined) S.sensor = p.instrument.sensor;
  }
  if(p.horizon){
    if(p.horizon.enabled !== undefined) S.horizonConstraint = p.horizon.enabled;
    if(p.horizon.azMin !== undefined) S.azMin = p.horizon.azMin;
    if(p.horizon.azMax !== undefined) S.azMax = p.horizon.azMax;
    if(p.horizon.altMin !== undefined) S.altMin = p.horizon.altMin;
    if(p.horizon.altMax !== undefined) S.altMax = p.horizon.altMax;
    if(p.horizon.azAltMaxRef !== undefined) S.azAltMaxRef = p.horizon.azAltMaxRef;
    if(p.horizon.azBord !== undefined) S.azBord = p.horizon.azBord;
    if(p.horizon.kBord !== undefined) S.kBord = p.horizon.kBord;
    if(p.horizon.azBordEst !== undefined) S.azBordEst = p.horizon.azBordEst;
    if(p.horizon.kBordEst !== undefined) S.kBordEst = p.horizon.kBordEst;
    if(p.horizon.azCenter !== undefined) S.azCenter = p.horizon.azCenter;
  }
  if(p.lighting){
    if(p.lighting.mode !== undefined) S.lightingMode = p.lighting.mode;
    if(p.lighting.offTime !== undefined) S.lightingOffTime = p.lighting.offTime;
    if(p.lighting.onTime !== undefined) S.lightingOnTime = p.lighting.onTime;
    if(p.lighting.label !== undefined) S.lightingLabel = p.lighting.label;
  }
  if(p.filters){
    if(Array.isArray(p.filters.available)){
      S.availableFilters = [...p.filters.available];
    } else {
      // Compat ancien format: { hasLex: true, hasRgb: true }
      const f = [];
      if(p.filters.hasLex) f.push('dualband');
      if(p.filters.hasRgb) f.push('lightpollution');
      if(f.length > 0) S.availableFilters = f;
    }
  }
  // Nom du site
  if(p.name !== undefined){
    const elName = document.getElementById('s-site-name');
    if(elName) elName.value = p.name;
  }
  // Mettre à jour les champs UI localisation/optique/horizon
  const fieldMap = {
    'S.lat':'s-lat','S.lon':'s-lon','S.focal':'s-focal',
    'S.azMin':'s-az-min','S.azMax':'s-az-max','S.altMin':'s-alt-min','S.azBord':'s-az-bord'
  };
  const setEl = (id, val) => { const el=document.getElementById(id); if(el&&val!==undefined) el.value=val; };
  setEl('s-lat', S.lat); setEl('s-lon', S.lon); setEl('s-focal', S.focal);
  setEl('s-az-center', S.azCenter); setEl('s-az-min', S.azMin); setEl('s-az-max', S.azMax);
  setEl('s-alt-min', S.altMin); setEl('s-alt-max', S.altMax); setEl('s-az-altmax-ref', S.azAltMaxRef); setEl('s-az-bord', S.azBord);
  const selSensor = document.getElementById('s-sensor');
  if(selSensor) selSensor.value = S.sensor;
  // Toggle horizon constraint
  const togHC = document.getElementById('tog-horizon-constraint');
  if(togHC) togHC.classList.toggle('on', !!S.horizonConstraint);
  // Champs éclairage
  const selMode = document.getElementById('s-lighting-mode');
  if(selMode) selMode.value = S.lightingMode;
  setEl('s-lighting-label', S.lightingLabel);
  setEl('s-lighting-off', S.lightingOffTime);
  setEl('s-lighting-on', S.lightingOnTime);
  ['neutral','lightpollution','dualband','narrowband'].forEach(k=>{
    TOGSTATES[k] = Array.isArray(S.availableFilters) && S.availableFilters.includes(k);
    const el = document.getElementById('tog-'+k);
    if(el) el.classList.toggle('on', !!TOGSTATES[k]);
  });
  if(typeof onLightingModeChange === 'function') onLightingModeChange();
  // Recalculer
  nightBounds = null; nightBoundsDate = null;
  if(typeof renderTargets === 'function') renderTargets();
}

window.addEventListener('load', async () => {
  syncObjectSearchUI();
  const st = localStorage_get_safe('astro_theme') || 'night';
  setTheme(st);
  // Charger le profil site avant les calculs (écrase les valeurs par défaut)
  await loadSiteProfile();
  const hcStored = localStorage_get_safe('horizon_constraint');
  if(hcStored !== null){ S.horizonConstraint = hcStored !== '0'; }
  const togHC = document.getElementById('tog-horizon-constraint');
  if(togHC) togHC.classList.toggle('on', S.horizonConstraint);
  nightBounds = getNightBounds(new Date());

  updateSliderUI();
  syncSliderToNow();
  updateDateNavUI();

  setZoom('all');
  syncFilterButtons(currentFilter);
  renderTargets();
  renderCatalogStatsPanel();

  setInterval(() => {
    if (!simTime && currentPage === 'targets') renderTargets();
    getOrComputeNightBounds();
  }, 15000);

  setupChartHover();
  window.addEventListener('resize', () => { if (currentPage === 'chart') drawChart(); });

  const topNInput = document.getElementById('s-catalog-top-n');
  if (topNInput) topNInput.value = CATALOG_TOP_N;

  // Chargement catalogue OpenNGC (async, non-bloquant — fallback déjà actif)
  updateCatalogTopNList();
  _loadOpenNGCCatalog().then(cat => {
    if (cat) {
      CATALOG = cat;
      updateCatalogTopNList();
      renderCatalogStatsPanel();
      renderTargets();
      if (currentPage === 'chart') drawChart();
    }
  });
});
