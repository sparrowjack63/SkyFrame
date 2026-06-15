// tests/load.test.js — Régressions parseur OpenNGC / visibilité site-dépendante
//
// Exécution : node --test tests/load.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  console,
  window: { SkyFrameI18n: null },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  localStorage_get_safe() { return null; },
  renderCatalogStatsPanel() {}
};

vm.createContext(sandbox);
for (const rel of [
  'js/config.js',
  'js/astro/core.js',
  'js/data/catalog.js',
  'js/data/ratings.js',
  'js/catalog/load.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const sf = source => vm.runInContext(source, sandbox);

test('OpenNGC parser accepts RfN reflection nebulae and keeps curated aliases', () => {
  const result = sf(`
    (() => {
      S.lat = 45.55;
      S.lon = 2.95;
      S.altMin = 20;
      S.azMin = 0;
      S.azMax = 360;
      S.horizonConstraint = false;
      const csv = [
        'Name;Type;RA;Dec;Const;MajAx;MinAx;PosAng;V-Mag;B-Mag;Messier',
        'IC4592;RfN;16:11:58.67;-19:27:16.8;Sco;60.00;40.00;;;3.90;'
      ].join('\\n');
      const catalog = _parseOpenNGC(csv);
      const object = catalog.find(o => o.id === 'IC4592');
      return object ? {
        id: object.id,
        name: object.name,
        emission: object.emission,
        aliases: object.aliases || []
      } : null;
    })()
  `);
  assert.ok(result);
  assert.equal(result.id, 'IC4592');
  assert.equal(result.name, 'IC 4592 — Blue Horsehead');
  assert.equal(result.emission, false);
  assert.ok(result.aliases.includes('Blue Horsehead'));
});

test('OpenNGC parser reads the modern M column and keeps Messier presentation names', () => {
  const result = sf(`
    (() => {
      S.lat = 45.55;
      S.lon = 2.95;
      S.altMin = 20;
      S.azMin = 0;
      S.azMax = 360;
      S.horizonConstraint = false;
      const csv = [
        'Name;Type;RA;Dec;Const;MajAx;MinAx;PosAng;B-Mag;V-Mag;J-Mag;H-Mag;K-Mag;SurfBr;Hubble;Pax;Pm-RA;Pm-Dec;RadVel;Redshift;Cstar U-Mag;Cstar B-Mag;Cstar V-Mag;M;NGC;IC;Cstar Names;Identifiers;Common names;NED notes;OpenNGC notes;Sources',
        'NGC6618;Neb;18:20:47.11;-16:10:17.5;Sgr;12.60;;;6.00;7.00;;;;;;0.6000;-0.040;-1.400;-45;-0.000149;;;;017;;;;LBN 60,MWSC 2896;Checkmark Nebula,Lobster Nebula,Swan Nebula,omega Nebula;;;'
      ].join('\\n');
      const catalog = _parseOpenNGC(csv);
      const object = catalog.find(o => o.id === 'M17');
      return object ? {
        id: object.id,
        secondaryId: object.secondaryId,
        name: object.name
      } : null;
    })()
  `);
  assert.ok(result);
  assert.equal(result.id, 'M17');
  assert.equal(result.secondaryId, 'NGC6618');
  assert.equal(result.name, 'M17 — Oméga');
});

test('site-dependent declination prefilter keeps reachable southern targets and rejects impossible ones', () => {
  const result = sf(`
    (() => {
      S.lat = 45.55;
      S.lon = 2.95;
      S.altMin = 20;
      return {
        lowSouthVisible: _canReachConfiguredSky(-19.4547),
        tooFarSouth: _canReachConfiguredSky(-50)
      };
    })()
  `);
  assert.equal(result.lowSouthVisible, true);
  assert.equal(result.tooFarSouth, false);
});
