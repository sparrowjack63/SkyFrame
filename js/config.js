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

function skyFrameTranslateConfig(key, fallback, params){
  return window.SkyFrameI18n ? window.SkyFrameI18n.translate(key, params) : fallback;
}

function createI18nLookupProxy(factory){
  return new Proxy({}, {
    get(_target, prop){
      if(typeof prop !== 'string') return undefined;
      return factory()[prop];
    },
    has(_target, prop){
      return Object.prototype.hasOwnProperty.call(factory(), prop);
    },
    ownKeys(){
      return Reflect.ownKeys(factory());
    },
    getOwnPropertyDescriptor(_target, prop){
      const value=factory()[prop];
      if(typeof value === 'undefined') return undefined;
      return { configurable:true, enumerable:true, value };
    }
  });
}

function createI18nArrayProxy(factory){
  return new Proxy([], {
    get(_target, prop){
      const values=factory();
      if(prop === 'length') return values.length;
      if(typeof prop === 'string' && /^\d+$/.test(prop)) return values[Number(prop)];
      const native=values[prop];
      return typeof native === 'function' ? native.bind(values) : native;
    },
    ownKeys(){
      return Reflect.ownKeys(factory());
    },
    getOwnPropertyDescriptor(_target, prop){
      const values=factory();
      if(prop === 'length') return { configurable:true, enumerable:false, value:values.length };
      if(typeof prop === 'string' && /^\d+$/.test(prop)) return { configurable:true, enumerable:true, value:values[Number(prop)] };
      return undefined;
    }
  });
}

function getFilterLabels(){
  return {
    neutral: skyFrameTranslateConfig('filter.family.neutral', 'Neutre / sans filtre'),
    lightpollution: skyFrameTranslateConfig('filter.family.lightpollution', 'Anti-pollution'),
    dualband: skyFrameTranslateConfig('filter.family.dualband', 'Double bande'),
    narrowband: skyFrameTranslateConfig('filter.family.narrowband', 'Bande étroite')
  };
}

const FILTER_LABELS = createI18nLookupProxy(getFilterLabels);
const FILTER_EXAMPLES = {
  neutral:'sans filtre, UV/IR cut, filtre L',
  lightpollution:'L-Pro, IDAS LPS, Antlia broadband / light-pollution',
  dualband:'L-eXtreme, ALP-T, NBZ, D1/D2',
  narrowband:'Hα, OIII, SII'
};
const TYPE_COLOR={nebula:'#ff6b9d',galaxy:'#4fc3f7',cluster:'#69f0ae',planetary:'#ffd54f',snr:'#ff9f43',planet:'#FFD090'};
function getTypeLabels(){
  return {
    nebula: skyFrameTranslateConfig('type.nebula', 'Nébuleuse'),
    galaxy: skyFrameTranslateConfig('type.galaxy', 'Galaxie'),
    cluster: skyFrameTranslateConfig('type.cluster', 'Amas ouvert'),
    planetary: skyFrameTranslateConfig('type.planetary', 'Nébuleuse planétaire'),
    snr: skyFrameTranslateConfig('type.snr', 'Rémanent SN'),
    planet: skyFrameTranslateConfig('type.planet', 'Planète')
  };
}
const TYPE_LABEL=createI18nLookupProxy(getTypeLabels);
function getDays(){
  return [
    skyFrameTranslateConfig('date.day.sun', 'Dim'),
    skyFrameTranslateConfig('date.day.mon', 'Lun'),
    skyFrameTranslateConfig('date.day.tue', 'Mar'),
    skyFrameTranslateConfig('date.day.wed', 'Mer'),
    skyFrameTranslateConfig('date.day.thu', 'Jeu'),
    skyFrameTranslateConfig('date.day.fri', 'Ven'),
    skyFrameTranslateConfig('date.day.sat', 'Sam')
  ];
}
function getMonths(){
  return [
    skyFrameTranslateConfig('date.month.jan', 'Jan'),
    skyFrameTranslateConfig('date.month.feb', 'Fév'),
    skyFrameTranslateConfig('date.month.mar', 'Mar'),
    skyFrameTranslateConfig('date.month.apr', 'Avr'),
    skyFrameTranslateConfig('date.month.may', 'Mai'),
    skyFrameTranslateConfig('date.month.jun', 'Jun'),
    skyFrameTranslateConfig('date.month.jul', 'Jul'),
    skyFrameTranslateConfig('date.month.aug', 'Aoû'),
    skyFrameTranslateConfig('date.month.sep', 'Sep'),
    skyFrameTranslateConfig('date.month.oct', 'Oct'),
    skyFrameTranslateConfig('date.month.nov', 'Nov'),
    skyFrameTranslateConfig('date.month.dec', 'Déc')
  ];
}
const DAYS=createI18nArrayProxy(getDays);
const MONTHS=createI18nArrayProxy(getMonths);
const PLAN_STORAGE_KEY='skyframe_planning';
const PLAN_TARGET_OVERHEAD_MIN=5;
const PLAN_EXPOSURE_MIN=5;
