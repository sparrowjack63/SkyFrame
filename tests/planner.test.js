// tests/planner.test.js — Régressions planification / nuit utile
//
// Exécution : node --test tests/planner.test.js

process.env.TZ = 'Europe/Paris';

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
  }
};

vm.createContext(sandbox);
for (const rel of [
  'js/config.js',
  'js/astro/core.js',
  'js/astro/night.js',
  'js/data/ratings.js',
  'js/catalog/meta.js',
  'js/planner/core.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const sf = source => vm.runInContext(source, sandbox);

test('planning window uses a practical sun-altitude cutoff instead of pure geometric visibility', () => {
  const result = sf(`
    (() => {
      S.lat = 45.684;
      S.lon = 2.906;
      S.altMin = 22;
      S.azMin = 55;
      S.azMax = 284;
      S.horizonConstraint = false;
      S.availableFilters = ['neutral', 'lightpollution', 'dualband', 'narrowband'];
      S.lightingMode = 'scheduled';
      S.lightingOffTime = '22:30';
      S.lightingOnTime = '06:00';
      getViewTime = () => new Date('2026-06-15T22:00:00+02:00');
      getBaseDate = () => new Date('2026-06-15T22:00:00+02:00');
      altaz = () => ({ alt: 45, az: 180 });
      const cutoffJd = jd(new Date('2026-06-16T02:05:00+02:00'));
      sunAlt = currentJd => currentJd < cutoffJd ? -15 : -8;
      const nb = {
        sunset: 20,
        civilDusk: 20.5,
        nautDusk: 21,
        astroDusk: 22,
        astroDawn: 26,
        nautDawn: 27,
        civilDawn: 27.5,
        sunrise: 28
      };
      getOrComputeNightBounds = () => nb;
      const item = getPlanningWindowForObject({
        id: 'NGC6992',
        name: 'NGC 6992',
        cat: 'NGC',
        type: 'nebula',
        ra: 0,
        dec: 0,
        filter: 'rgb',
        emission: false,
        notes: '',
        desc: ''
      }, nb, 5);
      return {
        isSchedulable: item.isSchedulable,
        startHour: item.startDate.getHours() + item.startDate.getMinutes() / 60,
        endHour: item.endDate.getHours() + item.endDate.getMinutes() / 60,
        rawMinutes: item.rawMinutes
      };
    })()
  `);
  assert.equal(result.isSchedulable, true);
  assert.equal(result.startHour, 22.5);
  assert.ok(result.endHour <= 2.2, `fin attendue vers 02h05, obtenu ${result.endHour}`);
  assert.ok(result.rawMinutes <= 220, `durée ne doit pas courir jusqu'au lever du soleil, obtenu ${result.rawMinutes}`);
});
