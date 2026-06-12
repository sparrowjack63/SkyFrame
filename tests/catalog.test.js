// tests/catalog.test.js — Régressions catalogue / IDs canoniques fallback
//
// Exécution : node --test tests/catalog.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const storage = new Map();
const sandbox = {
  console,
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  window: { SkyFrameI18n: null }
};

vm.createContext(sandbox);
for (const rel of [
  'js/data/catalog.js',
  'js/data/ratings.js',
  'js/catalog/meta.js',
  'js/catalog/search.js',
  'js/catalog/scoring.js',
  'js/catalog/filter.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const sf = name => vm.runInContext(name, sandbox);

test('fallback uses canonical IDs for curated aliases', () => {
  const ids = sf('CATALOG_FALLBACK.map(o => o.id)');
  assert.ok(ids.includes('IC1396'));
  assert.ok(ids.includes('NGC281'));
  assert.ok(ids.includes('NGC7635'));
  assert.ok(!ids.includes('Elephant'));
  assert.ok(!ids.includes('PacMan'));
  assert.ok(!ids.includes('Bubble'));
  assert.ok(!ids.includes('Sh132'));
});

test('top-N guaranteed layer keeps curated fallback objects with ratings metadata', () => {
  vm.runInContext('CATALOG = CATALOG_FALLBACK; updateCatalogTopNList();', sandbox);
  const ids = sf('CATALOG_TOPN_LIST.map(o => o.id)');
  assert.ok(ids.includes('IC1396'));
  assert.ok(ids.includes('NGC281'));
  assert.ok(ids.includes('NGC7635'));
  assert.ok(ids.includes('NGC7023'));
  assert.ok(ids.includes('IC5070'));
  assert.ok(ids.includes('NGC6960'));
  assert.ok(ids.includes('IC1318'));
  assert.ok(ids.includes('NGC6914'));
});

test('IC1396 remains searchable via canonical id and human aliases', () => {
  vm.runInContext('CATALOG = CATALOG_FALLBACK; updateCatalogTopNList();', sandbox);
  const result = sf(`
    (() => {
      const o = CATALOG_TOPN_LIST.find(x => x.id === 'IC1396');
      return {
        byCanonical: objectMatchesSearch(o, 'IC1396'),
        bySpacedCanonical: objectMatchesSearch(o, 'IC 1396'),
        byAlias: objectMatchesSearch(o, 'Elephant')
      };
    })()
  `);
  assert.equal(result.byCanonical, true);
  assert.equal(result.bySpacedCanonical, true);
  assert.equal(result.byAlias, true);
});

test('summer gaps remain searchable via curated aliases', () => {
  vm.runInContext('CATALOG = CATALOG_FALLBACK; updateCatalogTopNList();', sandbox);
  const result = sf(`
    (() => {
      const veilWest = CATALOG_TOPN_LIST.find(x => x.id === 'NGC6960');
      const iris = CATALOG_TOPN_LIST.find(x => x.id === 'NGC7023');
      const pelican = CATALOG_TOPN_LIST.find(x => x.id === 'IC5070');
      return {
        sh2103: objectMatchesSearch(veilWest, 'Sh2-103'),
        witchsBroom: objectMatchesSearch(veilWest, "Witch's Broom"),
        iris: objectMatchesSearch(iris, 'Iris'),
        pelican: objectMatchesSearch(pelican, 'Pelican')
      };
    })()
  `);
  assert.equal(result.sh2103, true);
  assert.equal(result.witchsBroom, true);
  assert.equal(result.iris, true);
  assert.equal(result.pelican, true);
});

test('new dark and reflection targets stay searchable via canonical ids and aliases', () => {
  vm.runInContext('CATALOG = CATALOG_FALLBACK; updateCatalogTopNList();', sandbox);
  const result = sf(`
    (() => {
      const darkShark = CATALOG_TOPN_LIST.find(x => x.id === 'LDN1235');
      const seahorse = CATALOG_TOPN_LIST.find(x => x.id === 'Barnard150');
      const ghost = CATALOG_TOPN_LIST.find(x => x.id === 'VdB141');
      const gammaCas = CATALOG_TOPN_LIST.find(x => x.id === 'IC59_IC63');
      const eNebula = CATALOG_TOPN_LIST.find(x => x.id === 'B142_B143');
      return {
        darkSharkById: objectMatchesSearch(darkShark, 'LDN1235'),
        darkSharkByAlias: objectMatchesSearch(darkShark, 'Dark Shark'),
        seahorseByAlias: objectMatchesSearch(seahorse, 'Seahorse'),
        ghostByAlias: objectMatchesSearch(ghost, 'Ghost Nebula'),
        ghostBySharpless: objectMatchesSearch(ghost, 'Sh2-136'),
        gammaCasByAlias: objectMatchesSearch(gammaCas, 'Ghost of Cassiopeia'),
        gammaCasByCompact: objectMatchesSearch(gammaCas, 'IC59/63'),
        eNebulaByAlias: objectMatchesSearch(eNebula, 'Barnards E'),
        eNebulaByMembers: objectMatchesSearch(eNebula, 'B142')
      };
    })()
  `);
  assert.equal(result.darkSharkById, true);
  assert.equal(result.darkSharkByAlias, true);
  assert.equal(result.seahorseByAlias, true);
  assert.equal(result.ghostByAlias, true);
  assert.equal(result.ghostBySharpless, true);
  assert.equal(result.gammaCasByAlias, true);
  assert.equal(result.gammaCasByCompact, true);
  assert.equal(result.eNebulaByAlias, true);
  assert.equal(result.eNebulaByMembers, true);
});

test('dynamic catalog merge preserves fallback aliases for search', () => {
  vm.runInContext(`
    CATALOG = CATALOG_FALLBACK.map(o => {
      if (o.id !== 'NGC6960') return o;
      const clone = { ...o };
      delete clone.aliases;
      return clone;
    });
    updateCatalogTopNList();
  `, sandbox);
  const result = sf(`
    (() => {
      const merged = getCatalogById()['NGC6960'];
      return {
        hasAlias: Array.isArray(merged.aliases) && merged.aliases.includes('Sh2-103'),
        matchesAlias: objectMatchesSearch(merged, 'Sh2-103')
      };
    })()
  `);
  assert.equal(result.hasAlias, true);
  assert.equal(result.matchesAlias, true);
});

test('suggestion ranking keeps editorial 5-star entries at the top and filters by family', () => {
  vm.runInContext(`
    CATALOG = CATALOG_FALLBACK;
    updateCatalogTopNList();
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = o => o.id !== 'M42';
  `, sandbox);
  const result = sf(`
    (() => {
      const top = getSuggestionCandidates({ limit: 12 }).map(o => ({ id: o.id, stars: o.suggestionStars }));
      const galaxies = getSuggestionCandidates({ filter: 'galaxy', limit: 6 });
      const compositions = getSuggestionCandidates({ filter: 'composition', limit: 6 });
      return {
        top,
        topAreFiveStars: top.every(o => o.stars === 5),
        excludedInaccessible: !top.some(o => o.id === 'M42'),
        galaxyOnly: galaxies.every(o => getSuggestionFamily(o) === 'galaxy'),
        compositionOnly: compositions.every(o => getSuggestionFamily(o) === 'composition')
      };
    })()
  `);
  assert.equal(result.topAreFiveStars, true);
  assert.equal(result.excludedInaccessible, true);
  assert.equal(result.galaxyOnly, true);
  assert.equal(result.compositionOnly, true);
});

test('suggestion image URL uses CDS HiPS cutouts when coordinates exist', () => {
  vm.runInContext('CATALOG = CATALOG_FALLBACK; updateCatalogTopNList();', sandbox);
  const result = sf(`
    (() => {
      const m31 = CATALOG_FALLBACK.find(o => o.id === 'M31');
      const url = getSuggestionImageUrl(m31);
      return {
        hasService: typeof url === 'string' && url.includes('hips2fits'),
        hasCoords: url.includes('ra=10.680000') && url.includes('dec=41.270000'),
        nullWhenMissing: getSuggestionImageUrl({ id: 'X' }) === null
      };
    })()
  `);
  assert.equal(result.hasService, true);
  assert.equal(result.hasCoords, true);
  assert.equal(result.nullWhenMissing, true);
});

test('suggestions dedupe alternate catalog entries for the same target', () => {
  vm.runInContext(`
    CATALOG = CATALOG_FALLBACK;
    updateCatalogTopNList();
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = () => true;
  `, sandbox);
  const result = sf(`
    (() => {
      const ids = getSuggestionCandidates({ limit: 200 }).map(o => o.id);
      return {
        hasNgc7635: ids.includes('NGC7635'),
        hasSh2162: ids.includes('Sh2-162'),
        count: ids.filter(id => id === 'NGC7635' || id === 'Sh2-162').length
      };
    })()
  `);
  assert.equal(result.hasNgc7635, true);
  assert.equal(result.hasSh2162, false);
  assert.equal(result.count, 1);
});

test('suggestions collapse same-field companion duplicates like North America/Pelican and Veil pair', () => {
  vm.runInContext(`
    CATALOG = CATALOG_FALLBACK;
    updateCatalogTopNList();
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = () => true;
  `, sandbox);
  const result = sf(`
    (() => {
      const ids = getSuggestionCandidates({ limit: 200 }).map(o => o.id);
      return {
        northAmericaPairCount: ids.filter(id => id === 'NGC7000' || id === 'IC5070').length,
        veilPairCount: ids.filter(id => id === 'NGC6960' || id === 'NGC6992').length,
        keepsHeartAndSoulSeparate: ids.includes('IC1805') && ids.includes('IC1848')
      };
    })()
  `);
  assert.equal(result.northAmericaPairCount, 1);
  assert.equal(result.veilPairCount, 1);
  assert.equal(result.keepsHeartAndSoulSeparate, true);
});

test('suggestions can sort by usable night time', () => {
  vm.runInContext(`
    CATALOG = CATALOG_FALLBACK;
    updateCatalogTopNList();
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = () => true;
    getPlanningWindowForObject = o => ({
      isSchedulable: true,
      usableMinutes: o.id === 'NGC7000' ? 240 : (o.id === 'IC5070' ? 120 : 30),
      exposures: o.id === 'NGC7000' ? 48 : (o.id === 'IC5070' ? 24 : 6)
    });
  `, sandbox);
  const result = sf(`
    (() => {
      const top = getSuggestionCandidates({ limit: 5, sortBy: 'time' }).map(o => o.id);
      return {
        first: top[0],
        includesNorthAmerica: top.includes('NGC7000')
      };
    })()
  `);
  assert.equal(result.first, 'NGC7000');
  assert.equal(result.includesNorthAmerica, true);
});

test('editorial suggestions stop expensive accessibility/window checks once the limit is reached', () => {
  vm.runInContext(`
    __origGetMergedSuggestionSource = getMergedSuggestionSource;
    var __suggestionSourceEditorial = [
      { id:'A', name:'A', cat:'NGC', type:'nebula', ra:10, dec:20, mag:5, size:80, filter:'rgb', emission:false, desc:'' },
      { id:'B', name:'B', cat:'NGC', type:'nebula', ra:20, dec:25, mag:6, size:70, filter:'rgb', emission:false, desc:'' },
      { id:'C', name:'C', cat:'NGC', type:'nebula', ra:30, dec:30, mag:7, size:60, filter:'rgb', emission:false, desc:'' },
      { id:'D', name:'D', cat:'NGC', type:'nebula', ra:40, dec:35, mag:8, size:50, filter:'rgb', emission:false, desc:'' }
    ];
    getMergedSuggestionSource = () => __suggestionSourceEditorial;
    __accessChecks = 0;
    __windowChecks = 0;
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = () => { __accessChecks += 1; return true; };
    getPlanningWindowForObject = o => ({ isSchedulable: true, usableMinutes: 60, exposures: 12, id: o.id, __windowChecks: (++__windowChecks) });
  `, sandbox);
  const result = sf(`
    (() => {
      const ids = getSuggestionCandidates({ limit: 2, sortBy: 'editorial' }).map(o => o.id);
      getMergedSuggestionSource = __origGetMergedSuggestionSource;
      return { ids, accessChecks: __accessChecks, windowChecks: __windowChecks };
    })()
  `);
  assert.equal(result.ids.join(','), 'A,B');
  assert.equal(result.accessChecks, 2);
  assert.equal(result.windowChecks, 2);
});

test('time-sorted suggestions reuse planning windows as the accessibility gate', () => {
  vm.runInContext(`
    __origGetMergedSuggestionSource = getMergedSuggestionSource;
    var __suggestionSourceTime = [
      { id:'A', name:'A', cat:'NGC', type:'nebula', ra:10, dec:20, mag:5, size:40, filter:'rgb', emission:false, desc:'' },
      { id:'B', name:'B', cat:'NGC', type:'nebula', ra:20, dec:25, mag:6, size:30, filter:'rgb', emission:false, desc:'' }
    ];
    getMergedSuggestionSource = () => __suggestionSourceTime;
    __accessChecks = 0;
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = () => { __accessChecks += 1; return true; };
    getPlanningWindowForObject = o => ({
      isSchedulable: true,
      usableMinutes: o.id === 'A' ? 120 : 60,
      exposures: o.id === 'A' ? 24 : 12
    });
  `, sandbox);
  const result = sf(`
    (() => {
      const ids = getSuggestionCandidates({ limit: 2, sortBy: 'time' }).map(o => o.id);
      getMergedSuggestionSource = __origGetMergedSuggestionSource;
      return { ids, accessChecks: __accessChecks };
    })()
  `);
  assert.equal(result.ids.join(','), 'A,B');
  assert.equal(result.accessChecks, 0);
});

test('suggestions drop sub-objects contained inside a larger parent object', () => {
  vm.runInContext(`
    CATALOG = CATALOG_FALLBACK.concat([
      { id:'M33', name:'M33 — Triangle', cat:'Messier', type:'galaxy', ra:23.46, dec:30.66, mag:5.7, size:73, filter:'rgb', emission:false, desc:'Galaxie spirale.' },
      { id:'IC131', name:'IC131', cat:'IC', type:'nebula', ra:23.3108, dec:30.7533, mag:12, size:0.3, filter:'rgb', emission:false, desc:'Région HII de M33.' },
      { id:'NGC588', name:'NGC588', cat:'NGC', type:'nebula', ra:23.1914, dec:30.6475, mag:12, size:0.6, filter:'rgb', emission:false, desc:'Région HII de M33.' },
      { id:'NGC595', name:'NGC595', cat:'NGC', type:'nebula', ra:23.4133, dec:30.6919, mag:12, size:0.8, filter:'rgb', emission:false, desc:'Région HII de M33.' },
      { id:'NGC604', name:'NGC604', cat:'NGC', type:'nebula', ra:24.1746, dec:30.7833, mag:12, size:1.5, filter:'rgb', emission:false, desc:'Région HII de M33.' }
    ]);
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = () => true;
    getPlanningWindowForObject = () => ({ isSchedulable: true, usableMinutes: 60, exposures: 12 });
  `, sandbox);
  const result = sf(`
    (() => {
      const ids = getSuggestionCandidates({ limit: 200, onlyAccessible: false }).map(o => o.id);
      return {
        hasParent: ids.includes('M33'),
        has131: ids.includes('IC131'),
        has588: ids.includes('NGC588'),
        has595: ids.includes('NGC595'),
        has604: ids.includes('NGC604')
      };
    })()
  `);
  assert.equal(result.hasParent, true);
  assert.equal(result.has131, false);
  assert.equal(result.has588, false);
  assert.equal(result.has595, false);
  assert.equal(result.has604, false);
});

test('suggestion family filters still exclude sub-objects when the parent is another family', () => {
  vm.runInContext(`
    CATALOG = CATALOG_FALLBACK.concat([
      { id:'M33', name:'M33 — Triangle', cat:'Messier', type:'galaxy', ra:23.46, dec:30.66, mag:5.7, size:73, filter:'rgb', emission:false, desc:'Galaxie spirale.' },
      { id:'IC131', name:'IC131', cat:'IC', type:'nebula', ra:23.3108, dec:30.7533, mag:12, size:0.3, filter:'rgb', emission:false, desc:'Région HII de M33.' },
      { id:'NGC588', name:'NGC588', cat:'NGC', type:'nebula', ra:23.1914, dec:30.6475, mag:12, size:0.6, filter:'rgb', emission:false, desc:'Région HII de M33.' },
      { id:'NGC595', name:'NGC595', cat:'NGC', type:'nebula', ra:23.4133, dec:30.6919, mag:12, size:0.8, filter:'rgb', emission:false, desc:'Région HII de M33.' },
      { id:'NGC604', name:'NGC604', cat:'NGC', type:'nebula', ra:24.1746, dec:30.7833, mag:12, size:1.5, filter:'rgb', emission:false, desc:'Région HII de M33.' }
    ]);
    getOrComputeNightBounds = () => ({ sunset: 20, sunrise: 30 });
    isAccessibleAtAnyNightMoment = () => true;
    getPlanningWindowForObject = () => ({ isSchedulable: true, usableMinutes: 60, exposures: 12 });
  `, sandbox);
  const result = sf(`
    (() => {
      const ids = getSuggestionCandidates({ filter:'nebula', limit: 200, onlyAccessible: false }).map(o => o.id);
      return {
        has131: ids.includes('IC131'),
        has588: ids.includes('NGC588'),
        has595: ids.includes('NGC595'),
        has604: ids.includes('NGC604')
      };
    })()
  `);
  assert.equal(result.has131, false);
  assert.equal(result.has588, false);
  assert.equal(result.has595, false);
  assert.equal(result.has604, false);
});
