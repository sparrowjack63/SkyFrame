// Configuration et constantes stables extraites de main.js

let S = {
  lat:48.8566, lon:2.3522, focal:450, sensor:'apsc',
  azMin:0, azMax:360, azCenter:90, altMin:20, altMax:90, azAltMaxRef:90,
  azBord:0, kBord:0,
  azBordEst:90, kBordEst:0,
  zenith:false,
  availableFilters:['neutral','lightpollution','dualband'], horizonConstraint:false,
  lightingMode:'none', lightingOffTime:'22:30', lightingOnTime:'06:00', lightingLabel:'Éclairage public'
};

function parseHHMM(str){
  const parts=(str||'').split(':');
  return parseInt(parts[0]||0,10)+(parseInt(parts[1]||0,10)/60);
}

function isLightsOff(h){
  if(S.lightingMode==='none') return true;
  if(S.lightingMode==='always_on') return false;
  const offH=parseHHMM(S.lightingOffTime||'22:30');
  const onH=parseHHMM(S.lightingOnTime||'06:00');
  const hh=((h%24)+24)%24;
  return hh>=offH||hh<=onH;
}
const SENSORS = {apsc:{w:23.5,h:15.7},mft:{w:17.3,h:13.0},ff:{w:36.0,h:24.0}};
const TOGSTATES = {zenith:true,neutral:true,lightpollution:true,dualband:true,narrowband:false};
const FILTER_LABELS = {
  neutral:'Neutre / sans filtre',
  lightpollution:'Anti-pollution',
  dualband:'Double bande',
  narrowband:'Bande étroite'
};
const FILTER_EXAMPLES = {
  neutral:'sans filtre, UV/IR cut, filtre L',
  lightpollution:'L-Pro, IDAS LPS, Antlia broadband / light-pollution',
  dualband:'L-eXtreme, ALP-T, NBZ, D1/D2',
  narrowband:'Hα, OIII, SII'
};
const TYPE_COLOR={nebula:'#ff6b9d',galaxy:'#4fc3f7',cluster:'#69f0ae',planetary:'#ffd54f',snr:'#ff9f43',planet:'#FFD090'};
const TYPE_LABEL={nebula:'Nébuleuse',galaxy:'Galaxie',cluster:'Amas ouvert',planetary:'Nébuleuse planétaire',snr:'Rémanent SN'};
const DAYS=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTHS=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const PLAN_STORAGE_KEY='skyframe_planning';
const PLAN_TARGET_OVERHEAD_MIN=5;
const PLAN_EXPOSURE_MIN=5;
