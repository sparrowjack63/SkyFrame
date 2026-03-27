let currentPage = 'targets';

// js/ui/settings.js — Paramètres, navigation, toasts

function saveSettings(){
  S.lat=parseFloat(document.getElementById('s-lat').value)||S.lat;
  S.lon=parseFloat(document.getElementById('s-lon').value)||S.lon;
  S.focal=parseFloat(document.getElementById('s-focal').value)||S.focal;
  S.sensor=document.getElementById('s-sensor').value;
  S.azCenter=parseFloat(document.getElementById('s-az-center').value)??S.azCenter;
  S.azMin=parseFloat(document.getElementById('s-az-min').value)??S.azMin;
  S.azMax=parseFloat(document.getElementById('s-az-max').value)??S.azMax;
  S.altMin=parseFloat(document.getElementById('s-alt-min').value)??S.altMin;
  S.altMax=parseFloat(document.getElementById('s-alt-max').value)??S.altMax;
  S.azAltMaxRef=parseFloat(document.getElementById('s-az-altmax-ref').value)??S.azAltMaxRef;
  // Recompute K from single calibration point (azBord fixed at 26°)
  const cosCalib=Math.abs(Math.cos(toR(S.azAltMaxRef-S.azBord)));
  S.kBord=Math.tan(toR(S.altMax))*cosCalib;
  S.availableFilters=['neutral','lightpollution','dualband','narrowband'].filter(k=>!!TOGSTATES[k]);
  // Éclairage
  const selMode=document.getElementById('s-lighting-mode');
  if(selMode) S.lightingMode=selMode.value;
  const elLabel=document.getElementById('s-lighting-label');
  if(elLabel) S.lightingLabel=elLabel.value||S.lightingLabel;
  const elOff=document.getElementById('s-lighting-off');
  if(elOff) S.lightingOffTime=elOff.value||S.lightingOffTime;
  const elOn=document.getElementById('s-lighting-on');
  if(elOn) S.lightingOnTime=elOn.value||S.lightingOnTime;
  document.getElementById('chip-loc').textContent=`📍 ${S.lat.toFixed(3)}°N`;
  nightBounds=null; nightBoundsDate=null;
  chartDrawn=false;
  renderTargets();
  if(currentPage==='chart') drawChart();
  if(currentPage==='planner') renderPlanner();
  showToast(t('settings.applied'));
}

function applyCatalogTopN(){
  const v=parseInt(document.getElementById('s-catalog-top-n').value,10);
  if(!isNaN(v)&&v>=10&&v<=500){
    CATALOG_TOP_N=v;
    try{localStorage.setItem('catalog_top_n',String(v));}catch(e){}
    updateCatalogTopNList();
    renderTargets();
    renderCatalogStatsPanel();
    showToast(t('settings.topApplied',{value:v}));
  }
}

function getGPS(){
  if(!navigator.geolocation){showToast(t('settings.gpsUnavailable'));return;}
  document.getElementById('gps-status').textContent=t('settings.locating');
  navigator.geolocation.getCurrentPosition(p=>{
    const la=p.coords.latitude.toFixed(4),lo=p.coords.longitude.toFixed(4);
    document.getElementById('s-lat').value=la;
    document.getElementById('s-lon').value=lo;
    document.getElementById('gps-status').textContent=`${la}°N, ${lo}°E`;
    document.getElementById('chip-loc').textContent=`📍 GPS ✅`;
    showToast(`📡 ${la}°N, ${lo}°E`);
  },()=>showToast(t('settings.gpsError')));
}

function tog(k,el){
  if(k==='horizon_constraint'){
    S.horizonConstraint=!S.horizonConstraint;
    el.classList.toggle('on',S.horizonConstraint);
    try{localStorage.setItem('horizon_constraint',S.horizonConstraint?'1':'0');}catch(e){}
    renderTargets();
    return;
  }
  TOGSTATES[k]=!TOGSTATES[k];el.classList.toggle('on',TOGSTATES[k]);
}

function onLightingModeChange(){
  const mode=(document.getElementById('s-lighting-mode')||{}).value||S.lightingMode;
  const showTimes=mode==='night_off';
  const elOff=document.getElementById('s-lighting-off-row');
  const elOn=document.getElementById('s-lighting-on-row');
  if(elOff) elOff.style.display=showTimes?'':'none';
  if(elOn)  elOn.style.display=showTimes?'':'none';
}

function showPage(name){
  currentPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
  document.getElementById('nav-'+name).classList.add('active');
  if(name==='chart'){setTimeout(drawChart,50);}
  if(name==='planner') renderPlanner();
  if(name==='targets') renderTargets();
}

function showToast(m){
  const t=document.getElementById('toast');
  t.textContent=m;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

function importSiteProfile(input){
  if(!input.files||!input.files[0]) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try {
      const p=JSON.parse(e.target.result);
      applySiteProfile(p);
      try{localStorage.setItem('skyframe_site_profile',JSON.stringify(p));}catch(err){}
      showToast('✅ Profil chargé : '+(p.name||'sans nom'));
    } catch(err){
      alert('Erreur lecture JSON : '+err.message);
    }
  };
  reader.readAsText(input.files[0]);
  input.value='';
}

function exportSiteProfile(){
  const siteName=document.getElementById('s-site-name')?.value||'Mon site';
  const profile={
    name: siteName,
    site:{ lat:S.lat, lon:S.lon },
    instrument:{ focal:S.focal, sensor:S.sensor },
    horizon:{
      enabled:S.horizonConstraint,
      azMin:S.azMin, azMax:S.azMax, altMin:S.altMin,
      altMax:S.altMax, azAltMaxRef:S.azAltMaxRef,
      azBord:S.azBord, kBord:S.kBord,
      azBordEst:S.azBordEst, kBordEst:S.kBordEst
    },
    lighting:{
      mode:S.lightingMode,
      offTime:S.lightingOffTime,
      onTime:S.lightingOnTime,
      label:S.lightingLabel
    },
    filters:{ available:[...S.availableFilters] }
  };
  const blob=new Blob([JSON.stringify(profile,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='skyframe-profile.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Recherche de lieu via Nominatim (OpenStreetMap) ──────────────────────────

let _siteSearchTimer = null;

function _debounceSearch(fn, ms) {
  return function(val) {
    clearTimeout(_siteSearchTimer);
    _siteSearchTimer = setTimeout(() => fn(val), ms);
  };
}

const _debouncedSiteSearch = _debounceSearch(_doSiteSearch, 350);

function onSiteSearchInput(val) {
  const trimmed = val.trim();
  if (trimmed.length < 2) {
    const el = document.getElementById('site-search-results');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    clearTimeout(_siteSearchTimer);
    return;
  }
  _debouncedSiteSearch(trimmed);
}

function _doSiteSearch(query) {
  const el = document.getElementById('site-search-results');
  if (!el) return;
  el.innerHTML = '<div class="site-search-item site-search-loading">Recherche…</div>';
  el.style.display = 'block';
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&q=' + encodeURIComponent(query);
  fetch(url)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => _renderSiteSearchResults(data))
    .catch(() => {
      el.innerHTML = '<div class="site-search-item site-search-error">Erreur réseau — réessayer</div>';
    });
}

function _renderSiteSearchResults(results) {
  const el = document.getElementById('site-search-results');
  if (!el) return;
  if (!results || results.length === 0) {
    el.innerHTML = '<div class="site-search-item site-search-empty">Aucun résultat</div>';
    el.style.display = 'block';
    return;
  }
  el.innerHTML = results.map((r, i) => {
    const label = _formatNominatimLabel(r);
    return '<div class="site-search-item" data-idx="' + i + '" onclick="_selectSiteResult(' + i + ')">' + label + '</div>';
  }).join('');
  el._nominatimData = results;
  el.style.display = 'block';
}

function _formatNominatimLabel(r) {
  const parts = (r.display_name || '').split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length <= 3) return parts.join(', ');
  // Keep first 3 parts for compact display, add last part (country) if different
  const country = parts[parts.length - 1];
  const short = parts.slice(0, 3).join(', ');
  if (parts.length > 3 && country && !short.includes(country)) return short + ', ' + country;
  return short;
}

function _selectSiteResult(idx) {
  const el = document.getElementById('site-search-results');
  if (!el || !el._nominatimData) return;
  const r = el._nominatimData[idx];
  if (!r) return;
  const lat = parseFloat(r.lat);
  const lon = parseFloat(r.lon);
  if (isNaN(lat) || isNaN(lon)) return;

  // Fill lat/lon fields
  const elLat = document.getElementById('s-lat');
  const elLon = document.getElementById('s-lon');
  if (elLat) elLat.value = lat.toFixed(4);
  if (elLon) elLon.value = lon.toFixed(4);

  // Fill site name from selected place
  const elName = document.getElementById('s-site-name');
  if (elName) {
    const nameParts = (r.display_name || '').split(',');
    elName.value = nameParts[0].trim() || _formatNominatimLabel(r);
  }

  // Update search input to show selected label
  const elInput = document.getElementById('site-search-input');
  if (elInput) elInput.value = _formatNominatimLabel(r);

  // Close dropdown
  el.style.display = 'none';
  el.innerHTML = '';

  // Apply to live state and rerender
  S.lat = lat;
  S.lon = lon;
  nightBounds = null; nightBoundsDate = null;
  document.getElementById('chip-loc').textContent = '📍 ' + lat.toFixed(3) + '°N';
  chartDrawn = false;
  if (typeof renderTargets === 'function') renderTargets();
  if (currentPage === 'chart' && typeof drawChart === 'function') drawChart();
  if (currentPage === 'planner' && typeof renderPlanner === 'function') renderPlanner();
  showToast('📍 ' + _formatNominatimLabel(r));
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const el = document.getElementById('site-search-results');
  const inp = document.getElementById('site-search-input');
  if (el && inp && !inp.contains(e.target) && !el.contains(e.target)) {
    el.style.display = 'none';
  }
});

function geolocateSite(){
  if(!navigator.geolocation){alert('Géolocalisation non disponible');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=Math.round(pos.coords.latitude*1000)/1000;
    const lon=Math.round(pos.coords.longitude*1000)/1000;
    S.lat=lat; S.lon=lon;
    const elLat=document.getElementById('s-lat');
    const elLon=document.getElementById('s-lon');
    if(elLat) elLat.value=lat;
    if(elLon) elLon.value=lon;
    nightBounds=null; nightBoundsDate=null;
    if(typeof renderTargets==='function') renderTargets();
    showToast('📍 Position : '+lat+', '+lon);
  },err=>{
    showToast('❌ Erreur GPS : '+err.message);
  });
}
