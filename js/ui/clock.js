// État global temps/nuit
let nightBounds = null;
let nightBoundsDate = null;
let dateOffset = 0;   // 0 = ce soir, +1 = nuit prochaine, etc.
let simTime = null;   // null = heure réelle, sinon timestamp simulé

// js/ui/clock.js — Horloge, slider temps, date

function updateClock(){
  const t = getViewTime();
  const h=String(t.getHours()).padStart(2,'0');
  const m=String(t.getMinutes()).padStart(2,'0');
  const s=String(t.getSeconds()).padStart(2,'0');
  document.getElementById('clock').textContent=`${h}:${m}:${s}`;
  const days=getClockDays(), months=getClockMonths();
  document.getElementById('clock-date').textContent=`${days[t.getDay()]} ${t.getDate()} ${months[t.getMonth()]} ${t.getFullYear()}`;
  const j=jd(t);
  const lstD=lst(j,S.lon);
  const lh=Math.floor(lstD/15),lm=Math.floor((lstD/15-lh)*60);
  document.getElementById('clock-lst').textContent=`${String(lh).padStart(2,'0')}h${String(lm).padStart(2,'0')}m`;

  // Moon
  const mp=moon(t);
  const imp=moonImpact(mp.ill);
  document.getElementById('moon-icon').textContent=mp.icon;
  document.getElementById('moon-phase').textContent=mp.name;
  document.getElementById('moon-details').textContent=`${t('common.moonIllumination',{value:mp.ill})} · ${imp.txt}`;
  document.getElementById('moon-chip').textContent=`${mp.icon} ${mp.ill}%`;
  document.getElementById('moon-chip').className=`chip ${imp.cls}`;
  document.getElementById('chip-moon').textContent=`${mp.icon} ${mp.ill}%`;
  document.getElementById('chip-moon').className=`chip ${imp.cls}`;
  // Score pollution lumineuse
  const lps = lightPollutionScore(t);
  const starsStr = '★'.repeat(lps.stars) + '☆'.repeat(5-lps.stars);
  const pollEl = document.getElementById('chip-pollution');
  if(pollEl){
    pollEl.textContent = `💡 ${starsStr}`;
    pollEl.className = `chip ${lps.cls}`;
    pollEl.title = `${lps.label} · Lune ${lps.ill}% · présente ${lps.moonFrac}% de la nuit noire`;
  }
  drawNightTimeline();
}

function updateDateNavUI(){
  ['date-forecast-label', 'date-forecast-label-chart'].forEach(id => {
    const label = document.getElementById(id);
    if(!label) return;
    if(dateOffset === 0){
      label.textContent = t('common.tonight');
      label.className = 'date-nav-label';
    } else {
      const d = getBaseDate();
      const days=getClockDays(), months=getClockMonths();
      label.textContent = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} 📅`;
      label.className = 'date-nav-label forecast';
    }
  });
}

function toggleDatePicker(scope){
  const id = scope === 'chart' ? 'date-picker-chart' : 'date-picker-targets';
  const el = document.getElementById(id);
  if(!el) return;
  if(el.style.display === 'none'){
    // Pre-remplir avec la date courante
    const d = getBaseDate();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    el.value = `${yyyy}-${mm}-${dd}`;
    el.style.display = 'inline-block';
    el.focus();
    el.showPicker && el.showPicker();
    // Cacher si on clique ailleurs
    el.onblur = () => { setTimeout(()=>{ el.style.display='none'; }, 200); };
  } else {
    el.style.display = 'none';
  }
}

function setDateFromPicker(value){
  if(!value) return;
  const [yyyy,mm,dd] = value.split('-').map(Number);
  const target = new Date(yyyy, mm-1, dd);
  const today = new Date();
  today.setHours(0,0,0,0);
  target.setHours(0,0,0,0);
  const diffDays = Math.round((target - today) / 86400000);
  dateOffset = diffDays;
  nightBounds = null;
  nightBoundsDate = null;
  getOrComputeNightBounds();
  const nb = nightBounds;
  const base = getBaseDate();
  base.setHours(Math.floor(nb.sunset)%24, Math.round((nb.sunset%1)*60), 0, 0);
  simTime = base.getTime();
  document.getElementById('btn-now')?.classList.remove('active-now');
  const slider = document.getElementById('time-slider');
  if(slider) slider.value = 0;
  const sliderLabel = document.getElementById('slider-label');
  if(sliderLabel) sliderLabel.textContent = fmtH(nb.sunset);
  // Cacher les deux pickers
  ['date-picker-targets','date-picker-chart'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });
  updateDateNavUI();
  renderTargets();
  if(currentPage === 'chart') drawChart();
}

function changeDate(delta){
  dateOffset += delta;
  nightBounds = null;
  nightBoundsDate = null;
  getOrComputeNightBounds();
  // Position slider at sunset of the new night
  const nb = nightBounds;
  const base = getBaseDate();
  base.setHours(Math.floor(nb.sunset)%24, Math.round((nb.sunset%1)*60), 0, 0);
  simTime = base.getTime();
  document.getElementById('btn-now').classList.remove('active-now');
  document.getElementById('time-slider').value = 0;
  document.getElementById('slider-label').textContent = fmtH(nb.sunset);
  updateDateNavUI();
  renderTargets();
  if(currentPage === 'chart') drawChart();
}

function updateSliderUI(){
  if(!nightBounds) return;
  const nb=nightBounds;
  const sliderStart=nb.sunset;       // slider min = coucher soleil
  const sliderEnd=nb.sunrise;        // slider max = lever soleil
  const totalMins=Math.round((sliderEnd-sliderStart)*60);

  const slider=document.getElementById('time-slider');
  slider.max=totalMins;

  document.getElementById('slider-start-label').textContent=`☀️ ${fmtH(nb.sunset)}`;
  document.getElementById('slider-end-label').textContent=`☀️ ${fmtH(nb.sunrise)}`;
  document.getElementById('twilight-info').textContent=
    `${t('common.astroNight')} ${fmtH(nb.astroDusk)}→${fmtH(nb.astroDawn)}`;
  drawNightTimeline();

  // Quick-jump buttons removed: slider is now the primary night navigation control.
}

function getViewTime(){return simTime?new Date(simTime):new Date();}

function setNow(){
  if(dateOffset !== 0){
    dateOffset = 0;
    nightBounds = null;
    nightBoundsDate = null;
    getOrComputeNightBounds();
    updateDateNavUI();
  }
  simTime=null;
  document.getElementById('btn-now').classList.add('active-now');
  document.getElementById('slider-label').textContent=t('common.live');
  // Reset slider to current position in night
  syncSliderToNow();
  renderTargets();
}

function syncSliderToNow(){
  if(!nightBounds) return;
  if(dateOffset !== 0){
    // On a forecast night, position slider at sunset
    document.getElementById('time-slider').value = 0;
    return;
  }
  const now=new Date();
  const nowH=now.getHours()+now.getMinutes()/60+(now.getHours()<12?24:0);
  const nb=nightBounds;
  const sliderStart=nb.sunset;
  const mins=Math.max(0,Math.round((nowH-sliderStart)*60));
  document.getElementById('time-slider').value=mins;
}

function onSlider(val){
  if(!nightBounds) return;
  const nb=nightBounds;
  const mins=parseInt(val);
  const h=nb.sunset+mins/60; // local hour decimal (can be >24)
  document.getElementById('slider-label').textContent=fmtH(h);
  document.getElementById('btn-now').classList.remove('active-now');
  // Compute absolute Date using base date (handles forecast mode)
  const base=getBaseDate();
  base.setHours(Math.floor(nb.sunset)%24, Math.round((nb.sunset%1)*60), 0, 0);
  simTime=base.getTime()+mins*60000;
  renderTargets();
  if(currentPage==='chart') drawChart();
}

function jumpToH(hLocal){
  if(!nightBounds) return;
  const nb=nightBounds;
  const mins=Math.max(0,Math.round((hLocal-nb.sunset)*60));
  document.getElementById('time-slider').value=mins;
  onSlider(mins);
}

function getBaseDate(){
  if(dateOffset === 0) return new Date();
  const d = new Date();
  d.setDate(d.getDate() + dateOffset);
  d.setHours(12, 0, 0, 0);
  return d;
}

function getOrComputeNightBounds(){
  const today = getBaseDate();
  const dateKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if(nightBoundsDate !== dateKey || !nightBounds){
    nightBounds = getNightBounds(today);
    nightBoundsDate = dateKey;
    updateSliderUI();
  }
  return nightBounds;
}

function jumpTo(h,m){ jumpToH(h+(h<12?24:0)+m/60); }
