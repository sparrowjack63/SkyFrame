(function(global) {
  const TEXT_BINDINGS = [
    ['#page-info > #info-page-inner > h2:nth-of-type(1)', 'info.guide.title'],
    ['#page-info > #info-page-inner > p:nth-of-type(1)', 'info.guide.intro'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(1) > div:first-child', 'info.guide.step1.title'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(2) > div:first-child', 'info.guide.step2.title'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(3) > div:first-child', 'info.guide.step3.title'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(4) > div:first-child', 'info.guide.step4.title'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(5) > div:first-child', 'info.guide.step5.title'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(6) > div:first-child', 'info.guide.step6.title'],
    ['#page-info > #info-page-inner > h2:nth-of-type(2)', 'info.schema.title'],
    ['#page-info > #info-page-inner > p:nth-of-type(2)', 'info.schema.intro'],
    ['#page-info > #info-page-inner > h3:nth-of-type(1)', 'info.params.title'],
    ['#page-info .info-card-grid--params .info-card:nth-child(1) > div:first-child', 'info.params.location.title'],
    ['#page-info .info-card-grid--params .info-card:nth-child(2) > div:first-child', 'info.params.azimuth.title'],
    ['#page-info .info-card-grid--params .info-card:nth-child(3) > div:first-child', 'info.params.compass.title'],
    ['#page-info .info-card-grid--params .info-card:nth-child(4) > div:first-child', 'info.params.altitude.title'],
    ['#page-info .info-card-grid--params .info-card:nth-child(5) > div:first-child', 'info.params.obstacle.title'],
    ['#page-info > #info-page-inner > h3:nth-of-type(2)', 'info.profile.title'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(1) > div:first-child', 'info.profile.howto.title'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(2) > div:first-child', 'info.profile.json.title'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(3) > div:first-child', 'info.profile.filters.title'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(4) > div:first-child', 'info.profile.lighting.title'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(5) > div:first-child', 'info.profile.importExport.title'],
    ['#page-info > #info-page-inner > h3:nth-of-type(3)', 'info.license.title'],
    ['#page-info > #info-page-inner > .info-card-grid:last-of-type .info-card > div:first-child', 'info.license.cardTitle'],
    ['#schema-modal-bar > span', 'info.modal.title'],
    ['#schema-modal-bar button:last-child', 'info.modal.close']
  ];

  const HTML_BINDINGS = [
    ['#page-info .info-card-grid--guide .info-card:nth-child(1) > div:last-child', 'info.guide.step1.body'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(2) > div:last-child', 'info.guide.step2.body'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(3) > div:last-child', 'info.guide.step3.body'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(4) > div:last-child', 'info.guide.step4.body'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(5) > div:last-child', 'info.guide.step5.body'],
    ['#page-info .info-card-grid--guide .info-card:nth-child(6) > div:last-child', 'info.guide.step6.body'],
    ['#page-info .info-schema-head > div:first-child', 'info.schema.note'],
    ['#page-info .info-schema-head > button', 'info.schema.open'],
    ['#page-info .info-card-grid--params .info-card:nth-child(1) > div:last-child', 'info.params.location.body'],
    ['#page-info .info-card-grid--params .info-card:nth-child(2) > div:last-child', 'info.params.azimuth.body'],
    ['#page-info .info-card-grid--params .info-card:nth-child(3) > div:last-child', 'info.params.compass.body'],
    ['#page-info .info-card-grid--params .info-card:nth-child(4) > div:last-child', 'info.params.altitude.body'],
    ['#page-info .info-card-grid--params .info-card:nth-child(5) > div:last-child', 'info.params.obstacle.body'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(1) > div:last-child', 'info.profile.howto.body'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(3) > div:last-child', 'info.profile.filters.body'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(4) > div:last-child', 'info.profile.lighting.body'],
    ['#page-info .info-card-grid--profiles .info-card:nth-child(5) > div:last-child', 'info.profile.importExport.body'],
    ['#page-info > #info-page-inner > .info-card-grid:last-of-type .info-card > div:last-child', 'info.license.body']
  ];

  function applySchemaTranslations() {
    if (!global.document || !global.SkyFrameI18n || typeof global.SkyFrameI18n.translate !== 'function') return;

    global.document.querySelectorAll('#schema-container [data-schema-i18n], #schema-modal-inner [data-schema-i18n]').forEach(function(node) {
      const key = node.getAttribute('data-schema-i18n');
      if (!key) return;
      node.textContent = global.SkyFrameI18n.translate(key);
    });
  }

  function applyInfoTranslations() {
    if (!global.document || !global.SkyFrameI18n || typeof global.SkyFrameI18n.translate !== 'function') return;

    TEXT_BINDINGS.forEach(function(binding) {
      const node = global.document.querySelector(binding[0]);
      if (!node) return;
      node.textContent = global.SkyFrameI18n.translate(binding[1]);
    });

    HTML_BINDINGS.forEach(function(binding) {
      const node = global.document.querySelector(binding[0]);
      if (!node) return;
      node.innerHTML = global.SkyFrameI18n.translate(binding[1]);
    });

    applySchemaTranslations();
  }

  function setStaticJsonSample() {
    const sampleNode = global.document && global.document.querySelector('#page-info .info-card-grid--profiles .info-card:nth-child(2) pre');
    if (!sampleNode || !global.SkyFrameI18n || typeof global.SkyFrameI18n.translate !== 'function') return;
    sampleNode.textContent = '{\n' +
      '  "name": "' + global.SkyFrameI18n.translate('info.profile.json.sampleName') + '",\n' +
      '  "site": { "lat": 48.8566, "lon": 2.3522 },\n' +
      '  "instrument": { "focal": 450, "sensor": "apsc" },\n' +
      '  "horizon": {\n' +
      '    "enabled": false,\n' +
      '    "azMin": 0, "azMax": 360, "altMin": 20,\n' +
      '    "azBord": 0, "kBord": 0,\n' +
      '    "azBordEst": 90, "kBordEst": 0\n' +
      '  },\n' +
      '  "lighting": {\n' +
      '    "mode": "none",\n' +
      '    "offTime": "22:30",\n' +
      '    "onTime": "06:00",\n' +
      '    "label": "' + global.SkyFrameI18n.translate('info.profile.json.sampleLightingLabel') + '"\n' +
      '  },\n' +
      '  "filters": { "available": ["neutral", "lightpollution", "dualband"] }\n' +
      '}';
  }

  if (global.document) {
    global.document.addEventListener('DOMContentLoaded', function() {
      setStaticJsonSample();
      applyInfoTranslations();
    });

    global.document.addEventListener('skyframe:languagechange', function() {
      setStaticJsonSample();
      applyInfoTranslations();
    });
  }

  global.SkyFrameInfoI18n = {
    applyTranslations: applyInfoTranslations
  };
})(window);
