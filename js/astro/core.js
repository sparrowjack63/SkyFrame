// js/astro/core.js — Calculs de coordonnées, accessibilité, Lune, pollution lumineuse
// Pas de dépendance au DOM — fonctions pures (sauf S global)

function toR(d){return d*Math.PI/180;}

function toD(r){return r*180/Math.PI;}

function jd(date){
  let y=date.getUTCFullYear(),m=date.getUTCMonth()+1;
  const d=date.getUTCDate();
  const h=(date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600);
  if(m<=2){y--;m+=12;}
  const A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+h/24+B-1524.5;
}

function lst(jdv, lon){
  const T=(jdv-2451545.0)/36525.0;
  let g=280.46061837+360.98564736629*(jdv-2451545.0)+0.000387933*T*T;
  return((g+lon)%360+360)%360;
}

function altaz(ra,dec,lstD,lat){
  const ha=toR(((lstD-ra)%360+360)%360);
  const d=toR(dec),l=toR(lat);
  const sa=Math.sin(l)*Math.sin(d)+Math.cos(l)*Math.cos(d)*Math.cos(ha);
  const alt=toD(Math.asin(Math.max(-1,Math.min(1,sa))));
  const ca=(Math.sin(d)-Math.sin(l)*Math.sin(toR(alt)))/(Math.cos(l)*Math.cos(toR(alt)));
  let az=toD(Math.acos(Math.max(-1,Math.min(1,ca))));
  if(Math.sin(ha)>0) az=360-az;
  return{alt,az};
}

function isAcc(alt,az){
  if(alt<S.altMin) return false;
  if(az<S.azMin || az>S.azMax) return false;
  if(S.horizonConstraint !== false){
    // Obstacle principal (azBord) — s'applique si kBord > 0
    if(S.kBord > 0){
      const cos1 = Math.abs(Math.cos(toR(az - S.azBord)));
      const effMax1 = cos1 < 0.05 ? 90 : toD(Math.atan(S.kBord / cos1));
      if(alt > effMax1) return false;
    }
    // Obstacle secondaire (azBordEst) — générique, s'applique si kBordEst > 0
    // et si az est dans la moitié du champ proche de azBordEst
    if(S.kBordEst > 0){
      const halfChamp = (S.azMax - S.azMin) / 2;
      const dBordEst = Math.abs(az - S.azBordEst);
      if(dBordEst <= halfChamp){
        const cos2 = Math.abs(Math.cos(toR(az - S.azBordEst)));
        const effMax2 = cos2 < 0.05 ? 90 : toD(Math.atan(S.kBordEst / cos2));
        if(alt > effMax2) return false;
      }
    }
  }
  return true;
}

function moon(date){
  const j=jd(date);
  const k=((j-2451550.1)/29.53058867%1+1)%1;
  const ill=Math.round((1-Math.cos(2*Math.PI*k))/2*100);
  let name,icon;
  if(k<0.03||k>0.97){name="Nouvelle Lune";icon="🌑";}
  else if(k<0.22){name="Croissant croissant";icon="🌒";}
  else if(k<0.28){name="1er Quartier";icon="🌓";}
  else if(k<0.47){name="Gibbeuse croissante";icon="🌔";}
  else if(k<0.53){name="Pleine Lune";icon="🌕";}
  else if(k<0.72){name="Gibbeuse décroissante";icon="🌖";}
  else if(k<0.78){name="Dernier Quartier";icon="🌗";}
  else{name="Croissant décroissant";icon="🌘";}
  return{ill,name,icon};
}

function moonImpact(ill){
  if(ill<20) return{cls:'ok',txt:'Ciel sombre — idéal'};
  if(ill<50) return{cls:'warn',txt:'Filtre conseillé'};
  if(ill<80) return{cls:'warn',txt:'Double bande recommandé'};
  return{cls:'bad',txt:'Double bande obligatoire'};
}

function lightPollutionScore(t){
  const mp = moon(t);
  const ill = mp.ill; // 0-100
  const nb = getOrComputeNightBounds();
  // Calculer durée lune visible pendant nuit astronomique (astroDusk→astroDawn)
  const darkStart = nb.astroDusk, darkEnd = nb.astroDawn;
  const darkSpan = Math.max(0, darkEnd - darkStart);
  let moonVisibleH = 0;
  if(darkSpan > 0){
    const MSTEPS = 24;
    for(let i=0;i<=MSTEPS;i++){
      const hL = darkStart + i/MSTEPS*darkSpan;
      const h_ut = (hL - 1 + 24) % 24;
      const bd = hL < 24
        ? new Date(t.getFullYear(),t.getMonth(),t.getDate())
        : new Date(t.getFullYear(),t.getMonth(),t.getDate()+1);
      bd.setHours(Math.floor(h_ut), Math.round((h_ut%1)*60), 0, 0);
      if(moonAltAtTime(bd) > 0) moonVisibleH += darkSpan/MSTEPS;
    }
  }
  // Fraction lune visible sur nuit noire (0→1)
  const moonFrac = darkSpan > 0 ? moonVisibleH / darkSpan : 0;
  // Score composite : poids 60% phase, 40% présence lune
  const pollution = (ill/100 * 0.6) + (moonFrac * 0.4);
  // Convertir en 1-5 étoiles (pollution=0 → 5★, pollution=1 → 1★)
  const stars = Math.max(1, Math.min(5, Math.round(5 - pollution * 4)));
  let label, cls;
  if(stars >= 5){ label='Nuit optimale'; cls='ok'; }
  else if(stars === 4){ label='Très bonne nuit'; cls='ok'; }
  else if(stars === 3){ label='Bonne nuit'; cls='warn'; }
  else if(stars === 2){ label='Nuit dégradée'; cls='warn'; }
  else { label='Pleine lune'; cls='bad'; }
  return { stars, label, cls, moonFrac: Math.round(moonFrac*100), ill };
}

function hasFilterFamily(key){
  return Array.isArray(S.availableFilters) && S.availableFilters.includes(key);
}

function recFilter(obj,ill){
  if(obj.emission){
    if(hasFilterFamily('dualband')) return {name:FILTER_LABELS.dualband,reason:'Nébuleuse Hα/OIII'};
    if(hasFilterFamily('narrowband')) return {name:FILTER_LABELS.narrowband,reason:'Imagerie émission spécialisée'};
  }
  if(!obj.emission){
    if(hasFilterFamily('lightpollution')) return {name:FILTER_LABELS.lightpollution,reason:ill>70?'Continuum sous pollution lumineuse':'Continuum optimisé'};
    if(hasFilterFamily('neutral')) return {name:FILTER_LABELS.neutral,reason:'Galaxie / amas / réflexion'};
  }
  return{name:'Aucun disponible',reason:'—'};
}

function canShoot(obj,ill){
  if(obj.filter==='lextreme') return hasFilterFamily('dualband') || hasFilterFamily('narrowband');
  if(obj.filter==='rgb') return hasFilterFamily('lightpollution') || hasFilterFamily('neutral');
  return true;
}

function field(){const s=SENSORS[S.sensor];return{w:2*Math.atan(s.w/(2*S.focal))*180/Math.PI,h:2*Math.atan(s.h/(2*S.focal))*180/Math.PI};}
