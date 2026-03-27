// js/astro/night.js — Calculs soleil, crépuscule, nuit astronomique, Lune (profil + événements)
// Pas de dépendance au DOM — fonctions pures

function sunAlt(jdv, lat, lon){
  const n=jdv-2451545.0;
  const L=(280.460+0.9856474*n)%360;
  const g=toR((357.528+0.9856003*n)%360);
  const lam=toR(L+1.915*Math.sin(g)+0.020*Math.sin(2*g));
  const ep=toR(23.439-0.0000004*n);
  const ra=Math.atan2(Math.cos(ep)*Math.sin(lam),Math.cos(lam));
  const dec=Math.asin(Math.sin(ep)*Math.sin(lam));
  const T=(jdv-2451545.0)/36525.0;
  const gmst=280.46061837+360.98564736629*(jdv-2451545.0)+0.000387933*T*T;
  const lstR=toR(((gmst+lon)%360+360)%360);
  const ha=lstR-ra;
  const sinAlt=Math.sin(toR(lat))*Math.sin(dec)+Math.cos(toR(lat))*Math.cos(dec)*Math.cos(ha);
  return toD(Math.asin(Math.max(-1,Math.min(1,sinAlt))));
}

function findSunCrossing(date, altTarget, searchStartH, searchEndH){
  // Binary search in local hours for sun crossing altTarget
  // Auto-detects direction: descending (evening) or ascending (dawn)
  const midnight=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
  let lo=searchStartH, hi=searchEndH;
  const j0=jd(new Date(midnight+(searchStartH-1)*3600000));
  const descending=sunAlt(j0,S.lat,S.lon)>altTarget;
  for(let i=0;i<40;i++){
    const mid=(lo+hi)/2;
    const h_ut=mid-1; // UTC+1 (France hiver)
    const j=jd(new Date(midnight+h_ut*3600000)); // overflow géré nativement
    const a=sunAlt(j,S.lat,S.lon);
    if(descending ? a>altTarget : a<altTarget) lo=mid; else hi=mid;
  }
  return (lo+hi)/2; // local hour decimal
}

function getNightBounds(date){
  // For given date, compute sunset (civil) and astronomical dawn next day
  // Returns {sunset, civilDusk, nautDusk, astroDusk, astroDawn, civilDawn, sunrise} in local hours (can be >24)
  const y=date.getFullYear(),mo=date.getMonth()+1,d=date.getDate();
  const sunset   = findSunCrossing(date, -0.833, 14, 22);
  const civilDusk= findSunCrossing(date, -6,     sunset, 23);
  const nautDusk = findSunCrossing(date, -12,    civilDusk, 24);
  const astroDusk= findSunCrossing(date, -18,    nautDusk, 26);
  // Dawn = next day, search 0h→12h local = 24h→36h
  const astroDawn= findSunCrossing(date, -18,    26, 34);
  const nautDawn = findSunCrossing(date, -12,    astroDawn, 36);
  const civilDawn= findSunCrossing(date, -6,     nautDawn, 37);
  const sunrise  = findSunCrossing(date, -0.833, civilDawn, 38);
  return {sunset,civilDusk,nautDusk,astroDusk,astroDawn,nautDawn,civilDawn,sunrise};
}

function fmtH(h){
  // Convertir en minutes totales pour éviter le bug "60min"
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return `${String(hh).padStart(2,'0')}h${String(mm).padStart(2,'0')}`;
}

function getDateForNightHour(hLocal, baseDate=getBaseDate()){
  const d=new Date(baseDate);
  const hWrapped=((hLocal%24)+24)%24;
  const totalMin=Math.round(hWrapped*60);
  const hh=Math.floor(totalMin/60)%24;
  const mm=totalMin%60;
  d.setHours(hh,mm,0,0);
  if(hLocal>=24) d.setDate(d.getDate()+1);
  return d;
}

function moonRaDec(jdv){
  const T=(jdv-2451545.0)/36525.0;
  // Longitude écliptique moyenne
  const L0=218.3164477+481267.88123421*T;
  const M =357.5291092+35999.0502909*T;   // anomalie soleil
  const Mm=134.9633964+477198.8675055*T;  // anomalie lune
  const D =297.8501921+445267.1114034*T;  // élongation
  const F =93.2720950+483202.0175233*T;   // arg latitude
  // Termes principaux longitude (en degrés*1e-6)
  const lam = L0
    +6.288774*Math.sin(toR(Mm))
    +1.274027*Math.sin(toR(2*D-Mm))
    +0.658314*Math.sin(toR(2*D))
    +0.213618*Math.sin(toR(2*Mm))
    -0.185116*Math.sin(toR(M))
    -0.114332*Math.sin(toR(2*F));
  // Latitude écliptique
  const bet=5.128122*Math.sin(toR(F))
    +0.280602*Math.sin(toR(Mm+F))
    +0.277693*Math.sin(toR(Mm-F))
    +0.173237*Math.sin(toR(2*D-F));
  // Obliquité + conversion équatoriale
  const eps=23.439291-0.013004*T;
  const lamR=toR(lam), betR=toR(bet), epsR=toR(eps);
  const ra=((toD(Math.atan2(Math.sin(lamR)*Math.cos(epsR)-Math.tan(betR)*Math.sin(epsR),Math.cos(lamR))))%360+360)%360;
  const dec=toD(Math.asin(Math.sin(betR)*Math.cos(epsR)+Math.cos(betR)*Math.sin(epsR)*Math.sin(lamR)));
  return {ra,dec};
}

function moonAltAtTime(tc){
  const jdv=jd(tc);
  const {ra,dec}=moonRaDec(jdv);
  const lstD=lst(jdv,S.lon);
  return altaz(ra,dec,lstD,S.lat).alt;
}

function moonNightProfile(nb, tbase, STEPS, spanH, startHour=nb.sunset){
  const illBase = moon(tbase).ill / 100;
  return Array.from({length:STEPS+1},(_,i)=>{
    const hLocal=startHour+i*(spanH/STEPS);
    const tc=new Date(tbase.getTime()+i*(spanH/STEPS)*3600000);
    const malt=moonAltAtTime(tc);
    // Gêne = illumination × facteur altitude (0 si sous horizon, atténuée à basse altitude)
    const altFactor = malt<=0 ? 0 : Math.min(1, malt/20);
    // Impact visuel = sin(alt) × illumination — formule physique pour le dégradé
    const impact = malt<=0 ? 0 : Math.sin(malt * Math.PI/180) * illBase;
    return {i, hLocal, moonAlt:malt, nuisance: illBase * altFactor, impact};
  });
}

function getMoonTimelineEvents(nb, tbase, startHour=nb.sunset, endHour=nb.sunrise, steps=120){
  const spanH=Math.max(0.01,endHour-startHour);
  const moonProfile=moonNightProfile(nb,tbase,steps,spanH,startHour);
  const events=[];
  const first=moonProfile[0], last=moonProfile[moonProfile.length-1];
  if(first && first.moonAlt>0) events.push({type:'moon-up', h:startHour, label:'🌙 déjà levée'});
  for(let i=1;i<moonProfile.length;i++){
    const prev=moonProfile[i-1], cur=moonProfile[i];
    const crossesRise = prev.moonAlt<=0 && cur.moonAlt>0;
    const crossesSet  = prev.moonAlt>0 && cur.moonAlt<=0;
    if(crossesRise || crossesSet){
      const denom = (cur.moonAlt - prev.moonAlt);
      const ratio = Math.abs(denom) < 1e-9 ? 1 : Math.max(0, Math.min(1, -prev.moonAlt / denom));
      const hCross = prev.hLocal + (cur.hLocal - prev.hLocal) * ratio;
      if(crossesRise) events.push({type:'moon-rise', h:hCross, label:'🌙↑ '+fmtH(hCross)});
      if(crossesSet)  events.push({type:'moon-set',  h:hCross, label:'🌙↓ '+fmtH(hCross)});
    }
  }
  if(last && last.moonAlt>0) events.push({type:'moon-up-end', h:endHour, label:'🌙 présente à l’aube'});
  return {events, moonProfile};
}

function getPlannerLightSegments(nb, tbase, axisStart=nb.sunset, axisEnd=nb.sunrise, steps=96){
  const span=Math.max(0.01,axisEnd-axisStart);
  const moonIll=moon(tbase).ill;
  const segments=[];
  let current=null;
  for(let i=0;i<=steps;i++){
    const h=axisStart + i/steps*span;
    const tc=getDateForNightHour(h, tbase);
    const astroDark=h>=nb.astroDusk && h<=nb.astroDawn;
    const lightsOff=isLightsOff(h);
    const lightsLabel=S.lightingMode==='none'?'sans éclairage':S.lightingMode==='always_on'?'éclairage actif':(S.lightingLabel||'lumières éteintes');
    const moonAlt=moonAltAtTime(tc);
    let cls='glow-high', label='gêne forte';
    if(lightsOff && astroDark && moonAlt<=0){ cls='glow-off'; label=lightsLabel+' · ciel sombre'; }
    else if(lightsOff && astroDark && moonIll<35 && moonAlt<=18){ cls='glow-low'; label=lightsLabel+' · gêne faible'; }
    else if(lightsOff && astroDark){ cls='glow-mid'; label=lightsLabel+' · gêne modérée'; }
    else if(lightsOff || astroDark){ cls='glow-mid'; label=lightsOff?lightsLabel+' partiel':'crépuscule / lune'; }
    if(!current || current.cls!==cls || current.label!==label){
      if(current) current.to=h;
      current={from:h,to:h,cls,label};
      segments.push(current);
    }
  }
  if(current) current.to=axisEnd;
  return segments.filter(seg=>seg.to>seg.from+0.05);
}
