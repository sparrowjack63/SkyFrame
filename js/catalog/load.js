// État global catalogue
let CATALOG = CATALOG_FALLBACK;
let CATALOG_RUNTIME_STATE = {
  source: 'fallback',
  mode: 'fallback',
  primaryCount: CATALOG_FALLBACK.length,
  cacheState: 'unavailable',
  cacheTs: null,
  lastRefreshTs: null,
  error: null
};

// js/catalog/load.js — Parsing et chargement catalogue OpenNGC

function _parseRA(s) {
  if (!s) return null;
  const p = s.split(':').map(Number);
  return (p[0] + p[1]/60 + (p[2]||0)/3600) * 15;
}

function _parseDec(s) {
  if (!s) return null;
  const sign = s[0] === '-' ? -1 : 1;
  const p = s.replace(/^[+-]/,'').split(':').map(Number);
  return sign * (p[0] + p[1]/60 + (p[2]||0)/3600);
}

function _angDist(ra1, dec1, ra2, dec2) {
  const d1=toR(dec1), d2=toR(dec2), dra=toR(ra2-ra1);
  const a=Math.sin((d2-d1)/2)**2 + Math.cos(d1)*Math.cos(d2)*Math.sin(dra/2)**2;
  return toD(2*Math.asin(Math.min(1,Math.sqrt(a))));
}

function _isEverVisible(ra, dec) {
  for (let m=0; m<12; m++) {
    for (let h=21; h<=29; h++) { // 21h→5h local CET (UTC+1)
      const hUTC = h-1;
      const day  = hUTC>=24 ? 16 : 15;
      const tc   = new Date(Date.UTC(2026, m, day, hUTC%24, 0, 0));
      const l    = lst(jd(tc), S.lon);
      const {alt,az} = altaz(ra, dec, l, S.lat);
      if (isAcc(alt,az)) return true;
    }
  }
  return false;
}

function _calcVisibleMonths(ra, dec) {
  const months=[];
  for (let m=0; m<12; m++) {
    let vis=false;
    for (let h=21; h<=29 && !vis; h++) {
      const hUTC = h-1;
      const day  = hUTC>=24 ? 16 : 15;
      const tc   = new Date(Date.UTC(2026, m, day, hUTC%24, 0, 0));
      const l    = lst(jd(tc), S.lon);
      const {alt,az} = altaz(ra, dec, l, S.lat);
      if (isAcc(alt,az)) vis=true;
    }
    if (vis) months.push(m);
  }
  return months;
}

function _setCatalogStatus(state, count) {
  const el = document.getElementById('chip-catalog');
  if (!el) return;
  if (state==='loading') { el.textContent='⏳ OpenNGC…'; el.className='chip warn'; }
  else if (state==='ok')  { el.textContent=`📡 ${count} obj`; el.className='chip ok'; }
  else                    { el.textContent='📡 offline'; el.className='chip warn'; }
  renderCatalogStatsPanel();
}

function _parseOpenNGC(text) {
  // Types OpenNGC supportés → type app
  const TYPE_MAP = {
    'G':'galaxy','GPair':'galaxy','GTrpl':'galaxy','GGroup':'galaxy',
    'GCl':'cluster','OC':'cluster','OCl':'cluster','GC':'cluster',
    'EmN':'nebula','EmNeb':'nebula','HII':'nebula','Neb':'nebula',
    'RfNeb':'nebula','Cl+N':'nebula',
    'SNR':'snr','SNR?':'snr',
    'PN':'planetary','PN?':'planetary',
  };
  // Détection émission par type (Ha/OIII dominant)
  const EMISSION_MAP = {
    'EmN':true,'EmNeb':true,'HII':true,'SNR':true,'SNR?':true,'PN':true,'PN?':true,
    'Neb':true,'Cl+N':false,'RfNeb':false,
    'G':false,'GPair':false,'GTrpl':false,'GGroup':false,
    'GCl':false,'OC':false,'OCl':false,'GC':false,
  };

  const lines = text.split('\n');
  const hdr   = lines[0].split(';');
  const iName = hdr.indexOf('Name');
  const iType = hdr.indexOf('Type');
  const iRA   = hdr.indexOf('RA');
  const iDec  = hdr.indexOf('Dec');
  const iMaj  = hdr.indexOf('MajAx');
  const iMin  = hdr.indexOf('MinAx');
  const iVmag = hdr.indexOf('V-Mag');
  const iBmag = hdr.indexOf('B-Mag');
  const iMess = hdr.indexOf('Messier');

  // Passe 1 : parser toutes les lignes valides
  const allRows = [];
  for (let i=1; i<lines.length; i++) {
    const c = lines[i].split(';');
    if (c.length < 5) continue;
    const rawType = (c[iType]||'').trim();
    if (!TYPE_MAP[rawType]) continue;
    const ra  = _parseRA(c[iRA]);
    const dec = _parseDec(c[iDec]);
    if (ra===null || dec===null) continue;
    const maj  = parseFloat(c[iMaj]) || 0;
    const minA = parseFloat(c[iMin]) || maj; // fallback circulaire
    const vmag = parseFloat(c[iVmag]);
    const bmag = parseFloat(c[iBmag]);
    const mag  = !isNaN(vmag) ? vmag : (!isNaN(bmag) ? bmag : null);
    const mess = (c[iMess]||'').trim() ? parseInt(c[iMess].trim(),10) : null;
    const ngcName = (c[iName]||'').trim();
    // Surface brillance pour les galaxies (mag/arcsec²)
    let sb = null;
    if (TYPE_MAP[rawType]==='galaxy' && mag!==null && maj>0) {
      const a=maj*60/2, b=minA*60/2; // demi-axes en arcsec
      sb = mag + 2.5*Math.log10(Math.PI*a*b);
    }
    allRows.push({_ngcName:ngcName,_mess:mess,_rawType:rawType,_maj:maj,_minA:minA,_sb:sb,
                  ra,dec,mag,type:TYPE_MAP[rawType],
                  emission:EMISSION_MAP[rawType]!==undefined?EMISSION_MAP[rawType]:false});
  }

  // Passe 2 : détection de groupes via grille spatiale 2°×2°
  // Un objet est "en groupe" si ≥2 autres objets sont dans 1.5°
  const CELL=2.0, RADIUS=1.5;
  const grid=new Map();
  allRows.forEach(r=>{
    const ci=Math.floor(((r.ra%360)+360)%360/CELL);
    const cj=Math.floor((r.dec+90)/CELL);
    const k=`${ci},${cj}`;
    if(!grid.has(k)) grid.set(k,[]);
    grid.get(k).push(r);
  });
  allRows.forEach(r=>{
    const ci=Math.floor(((r.ra%360)+360)%360/CELL);
    const cj=Math.floor((r.dec+90)/CELL);
    let cnt=0;
    for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++){
      const cell=grid.get(`${ci+di},${cj+dj}`)||[];
      for(const o of cell) if(o!==r && _angDist(r.ra,r.dec,o.ra,o.dec)<=RADIUS) cnt++;
    }
    r._inGroup=(cnt>=2);
  });

  // Passe 3 : filtrer par taille ou appartenance à un groupe, puis SB et déclinaison
  const candidates=allRows.filter(r=>{
    if(r.type==='galaxy' && r._sb!==null && r._sb>25.5) return false; // trop diffuse
    if(r.dec<-15) return false;                                      // pré-filtre géométrique
    return r._maj>=3.4 || r._inGroup;
  });

  // Passe 4 : vérification visibilité balcon (mois par mois)
  const visible=candidates.filter(r=>_isEverVisible(r.ra,r.dec));

  // Passe 5 : construire les objets catalogue avec IDs canoniques + CUSTOM_META
  const catalog=visible.map(r=>{
    let appId, cat;
    if(r._mess){
      appId='M'+r._mess; cat='Messier';
    } else if(r._ngcName.startsWith('NGC')){
      appId='NGC'+parseInt(r._ngcName.slice(3),10); cat='NGC';
    } else if(r._ngcName.startsWith('IC')){
      appId='IC'+parseInt(r._ngcName.slice(2),10); cat='IC';
    } else {
      appId=r._ngcName||'UNK'; cat='Other';
    }
    const cm=CUSTOM_META[appId];
    const emission=cm&&cm.emission!==undefined ? cm.emission : r.emission;
    return {
      id:      appId,
      secondaryId: r._mess ? r._ngcName : null,
      name:    cm?.name || appId,
      cat,
      type:    r.type,
      ra:      r.ra,
      dec:     r.dec,
      mag:     r.mag!==null ? r.mag : 99,
      size:    r._maj>0 ? r._maj : 1,
      filter:  cm?.filter  || (emission?'lextreme':'rgb'),
      emission,
      desc:    cm?.desc  || '',
      notes:   cm?.notes || '',
      astrobinQuery: cm?.astrobinQuery || null,
      groupMembers: cm?.groupMembers || null,
      months:  _calcVisibleMonths(r.ra,r.dec),
      sb:      r._sb,
    };
  });

  // Passe 6 : détection de groupes dans le catalogue final
  const catGrid=new Map();
  catalog.forEach(o=>{
    const ci=Math.floor(((o.ra%360)+360)%360/CELL);
    const cj=Math.floor((o.dec+90)/CELL);
    const k=`${ci},${cj}`;
    if(!catGrid.has(k)) catGrid.set(k,[]);
    catGrid.get(k).push(o);
  });
  catalog.forEach(o=>{
    const ci=Math.floor(((o.ra%360)+360)%360/CELL);
    const cj=Math.floor((o.dec+90)/CELL);
    const nbrs=[];
    for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++){
      const cell=catGrid.get(`${ci+di},${cj+dj}`)||[];
      for(const ot of cell) if(ot!==o && _angDist(o.ra,o.dec,ot.ra,ot.dec)<=RADIUS) nbrs.push(ot.id);
    }
    if(nbrs.length) o.group=nbrs;
  });

  return catalog;
}

async function _loadOpenNGCCatalog() {
  const CACHE_KEY='openngc_catalog_v5';
  const CACHE_TTL=7*24*3600*1000;
  _setCatalogStatus('loading');
  try {
    // 1. Vérifier le cache
    const raw=localStorage_get_safe(CACHE_KEY);
    if(raw){
      const cached=JSON.parse(raw);
      if(Date.now()-cached.ts<CACHE_TTL){
        console.info('OpenNGC: cache utilisé,',cached.data.length,'objets');
        CATALOG_RUNTIME_STATE={source:'openngc',mode:'enriched',primaryCount:Math.max(0,cached.data.length-SHARPLESS_CATALOG.length),cacheState:'hit',cacheTs:cached.ts,lastRefreshTs:cached.ts};
        _setCatalogStatus('ok',cached.data.length);
        return cached.data;
      }
      CATALOG_RUNTIME_STATE.cacheState='stale';
      CATALOG_RUNTIME_STATE.cacheTs=cached.ts||null;
    }
    // 2. Fetch CSV
    const resp=await fetch('https://cdn.jsdelivr.net/gh/mattiaverga/OpenNGC@master/database_files/NGC.csv');
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const text=await resp.text();
    // 3. Parser + filtrer
    const ngcCat=_parseOpenNGC(text);
    // 4. Ajouter SHARPLESS_CATALOG (toujours inclus) avec calcul des mois
    const sharp=SHARPLESS_CATALOG.map(o=>({...o,months:_calcVisibleMonths(o.ra,o.dec)}));
    const fullCat=[...ngcCat,...sharp];
    const refreshTs=Date.now();
    // 5. Mise en cache
    try{ localStorage.setItem(CACHE_KEY,JSON.stringify({ts:refreshTs,data:fullCat})); }catch(e){}
    console.info('OpenNGC: catalogue construit,',fullCat.length,'objets (dont',ngcCat.length,'NGC/IC/Messier +',sharp.length,'Sh2)');
    CATALOG_RUNTIME_STATE={source:'openngc',mode:'enriched',primaryCount:ngcCat.length,cacheState:'refreshed',cacheTs:refreshTs,lastRefreshTs:refreshTs};
    _setCatalogStatus('ok',fullCat.length);
    return fullCat;
  } catch(e) {
    console.warn('OpenNGC fetch échoué, catalogue offline utilisé:',e.message);
    CATALOG_RUNTIME_STATE={source:'fallback',mode:'fallback',primaryCount:CATALOG_FALLBACK.length,cacheState:CATALOG_RUNTIME_STATE.cacheTs?'stale-error':'unavailable',cacheTs:CATALOG_RUNTIME_STATE.cacheTs||null,lastRefreshTs:CATALOG_RUNTIME_STATE.lastRefreshTs||null,error:e.message};
    _setCatalogStatus('offline');
    return null;
  }
}
