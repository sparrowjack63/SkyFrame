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
