// tests/astro.test.js — Tests unitaires des calculs astronomiques (js/astro/*)
//
// Exécution :  node tests/astro.test.js   (Node ≥ 18, aucune dépendance)
//
// Les fichiers js/astro/* sont des scripts navigateur à globales partagées :
// on les charge dans un contexte vm commun, comme des balises <script>.

// Les calculs de nuit dépendent du fuseau local — on fixe Paris pour des tests déterministes
process.env.TZ = 'Europe/Paris';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const rel of ['js/config.js', 'js/astro/core.js', 'js/astro/night.js', 'js/astro/planets.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

// `function f(){}` devient une propriété du global du contexte ; `let S` reste
// dans la portée lexicale globale, accessible via une évaluation dans le contexte.
const sf = name => vm.runInContext(name, sandbox);
const S = sf('S');
const approx = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} attendu ${expected}±${tol}, obtenu ${actual}`);

// ---------------------------------------------------------------- core.js

test('jd : dates juliennes de référence', () => {
  const jd = sf('jd');
  assert.equal(jd(new Date(Date.UTC(2000, 0, 1, 12))), 2451545.0); // époque J2000
  assert.equal(jd(new Date(Date.UTC(2025, 0, 1, 0))), 2460676.5);
});

test('lst : temps sidéral de Greenwich à J2000', () => {
  const lst = sf('lst');
  approx(lst(2451545.0, 0), 280.46061837, 0.01, 'GMST J2000');
  // Décalage en longitude : +10° de longitude = +10° de temps sidéral local
  approx((lst(2451545.0, 10) - lst(2451545.0, 0) + 360) % 360, 10, 1e-9, 'décalage longitude');
});

test('altaz : pôle céleste et zénith', () => {
  const altaz = sf('altaz');
  // Le pôle nord céleste culmine à une altitude égale à la latitude
  approx(altaz(123, 90, 45, 48.8566).alt, 48.8566, 0.01, 'pôle céleste');
  // Un objet à déclinaison = latitude passant au méridien (HA=0) est au zénith
  approx(altaz(200, 48.8566, 200, 48.8566).alt, 90, 0.01, 'zénith');
});

test('isAcc : limites altitude/azimut et obstacle horizon', () => {
  const isAcc = sf('isAcc');
  const saved = { ...S };
  try {
    Object.assign(S, { altMin: 20, azMin: 0, azMax: 360, horizonConstraint: true, azBord: 180, kBord: 1, kBordEst: 0 });
    assert.equal(isAcc(10, 90), false, 'sous altMin');
    assert.equal(isAcc(44, 180), true, 'sous l\'obstacle de 45° plein sud');
    assert.equal(isAcc(46, 180), false, 'au-dessus de l\'obstacle de 45°');
    assert.equal(isAcc(46, 0), true, 'pas d\'obstacle au nord (cos signé)');
  } finally {
    Object.assign(S, saved);
  }
});

test('moon : phases connues (avril 2024)', () => {
  const moon = sf('moon');
  assert.ok(moon(new Date(Date.UTC(2024, 3, 8, 18))).ill < 8, 'nouvelle lune du 8 avril 2024');
  assert.ok(moon(new Date(Date.UTC(2024, 3, 23, 23))).ill > 92, 'pleine lune du 23 avril 2024');
});

// --------------------------------------------------------------- night.js

test('sunAlt : altitudes solaires aux solstices à Paris', () => {
  const sunAlt = sf('sunAlt');
  const jd = sf('jd');
  const lat = 48.8566, lon = 2.3522;
  // Midi solaire ≈ 90 − lat + 23.44 au solstice d'été
  approx(sunAlt(jd(new Date(Date.UTC(2024, 5, 21, 12))), lat, lon), 64.6, 1.5, 'solstice été midi');
  approx(sunAlt(jd(new Date(Date.UTC(2024, 11, 21, 12))), lat, lon), 17.7, 1.5, 'solstice hiver midi');
  assert.ok(sunAlt(jd(new Date(Date.UTC(2024, 5, 21, 0))), lat, lon) < -10, 'minuit UTC sous l\'horizon');
});

test('getNightBounds : nuit du 15 janvier 2026 à Paris (TZ Europe/Paris)', () => {
  const nb = sf('getNightBounds')(new Date(2026, 0, 15, 12));
  // Ordre chronologique complet du crépuscule à l'aube
  const order = ['sunset', 'civilDusk', 'nautDusk', 'astroDusk', 'astroDawn', 'nautDawn', 'civilDawn', 'sunrise'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(nb[order[i]] > nb[order[i - 1]], `${order[i]} après ${order[i - 1]}`);
  }
  approx(nb.sunset, 17.3, 0.7, 'coucher ~17h20');
  approx(nb.sunrise, 32.6, 0.7, 'lever ~8h40 (+24)');
  // Invariant : le soleil est bien à −0.833° à l'heure de coucher trouvée
  const d = sf('getDateForNightHour')(nb.sunset, new Date(2026, 0, 15, 12));
  approx(sf('sunAlt')(sf('jd')(d), S.lat, S.lon), -0.833, 0.2, 'altitude au coucher');
});

test('getDateForNightHour : heures de nuit continues (>24 = lendemain)', () => {
  const g = sf('getDateForNightHour');
  const base = new Date(2026, 0, 15, 21, 0);
  assert.equal(g(20.5, base).getTime(), new Date(2026, 0, 15, 20, 30).getTime());
  assert.equal(g(24, base).getTime(), new Date(2026, 0, 16, 0, 0).getTime());
  assert.equal(g(27.25, base).getTime(), new Date(2026, 0, 16, 3, 15).getTime());
});

test('getNightBaseDate : la nuit en cours commence la veille après minuit', () => {
  const nb = { sunrise: 32.6 }; // lever ~8h36 le lendemain
  sandbox.getOrComputeNightBounds = () => nb;
  try {
    // En soirée : la base est le jour même (régression : sunrise>24 faisait toujours reculer d'un jour)
    sandbox.getBaseDate = () => new Date(2026, 0, 15, 21, 0);
    assert.equal(sf('getNightBaseDate')().getDate(), 15, 'soirée → même jour');
    // Après minuit, avant le lever : la nuit a commencé la veille
    sandbox.getBaseDate = () => new Date(2026, 0, 16, 3, 0);
    assert.equal(sf('getNightBaseDate')().getDate(), 15, 'après minuit → veille');
    // Après le lever du soleil : on prépare la nuit suivante
    sandbox.getBaseDate = () => new Date(2026, 0, 16, 10, 0);
    assert.equal(sf('getNightBaseDate')().getDate(), 16, 'matinée → même jour');
  } finally {
    delete sandbox.getOrComputeNightBounds;
    delete sandbox.getBaseDate;
  }
});

test('fmtH : formatage heures décimales (arrondi 60 min)', () => {
  const fmtH = sf('fmtH');
  assert.equal(fmtH(20.999), '21h00'); // pas de "20h60"
  assert.equal(fmtH(25.5), '01h30');   // repli sur 24h
  assert.equal(fmtH(0), '00h00');
});

test('moonRaDec : la Lune reste près de l\'écliptique', () => {
  const moonRaDec = sf('moonRaDec');
  const jd = sf('jd');
  for (let m = 0; m < 12; m++) {
    const { ra, dec } = moonRaDec(jd(new Date(Date.UTC(2026, m, 10))));
    assert.ok(ra >= 0 && ra < 360, `RA dans [0,360) (mois ${m})`);
    assert.ok(Math.abs(dec) < 30, `déclinaison < 30° (mois ${m})`);
  }
});

// ------------------------------------------------------------- planets.js

test('planetRaDec : positions plausibles et mouvement continu', () => {
  const planetRaDec = sf('planetRaDec');
  const jd = sf('jd');
  const j0 = jd(new Date(Date.UTC(2026, 5, 10)));
  for (const p of ['Mars', 'Jupiter', 'Saturn']) {
    const a = planetRaDec(p, j0);
    const b = planetRaDec(p, j0 + 1);
    assert.ok(a.ra >= 0 && a.ra < 360 && Number.isFinite(a.dec), `${p} : coordonnées finies`);
    assert.ok(Math.abs(a.dec) < 30, `${p} : proche de l'écliptique`);
    const dra = Math.abs(((b.ra - a.ra + 540) % 360) - 180);
    assert.ok(dra < 1.5, `${p} : déplacement < 1.5°/jour (obtenu ${dra.toFixed(3)}°)`);
  }
  // Pas de deepEqual : l'objet vient du contexte vm (Object.prototype différent)
  const unknown = planetRaDec('Pluto', j0);
  assert.equal(unknown.ra, 0, 'planète inconnue → ra 0');
  assert.equal(unknown.dec, 0, 'planète inconnue → dec 0');
});

// -------------------------------------------------------------- config.js

test('escapeHtml / escapeJsAttr : neutralisation des caractères actifs', () => {
  const escapeHtml = sf('escapeHtml');
  const escapeJsAttr = sf('escapeJsAttr');
  assert.equal(escapeHtml(`<img src=x onerror="a('b')">`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;');
  assert.equal(escapeHtml(null), '');
  const js = escapeJsAttr(`'); alert(1); ('`);
  assert.ok(!/['"<>&\\]/.test(js.replace(/\\u[0-9a-f]{4}/g, '')), 'aucun caractère actif restant');
});

test('isLightsOff : fenêtre d\'extinction nocturne', () => {
  const isLightsOff = sf('isLightsOff');
  const saved = { ...S };
  try {
    Object.assign(S, { lightingMode: 'scheduled', lightingOffTime: '22:30', lightingOnTime: '06:00' });
    assert.equal(isLightsOff(23), true, '23h : éteint');
    assert.equal(isLightsOff(26), true, '2h du matin (26h) : éteint');
    assert.equal(isLightsOff(21), false, '21h : allumé');
    assert.equal(isLightsOff(12), false, 'midi : allumé');
  } finally {
    Object.assign(S, saved);
  }
});
