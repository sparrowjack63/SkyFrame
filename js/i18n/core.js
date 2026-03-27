(function(global) {
  const STORAGE_KEY = 'skyframe_lang';
  const SUPPORTED_LANGUAGES = ['fr', 'en'];
  const DEFAULT_LANGUAGE = 'fr';
  const LOCALES = Object.create(null);
  let currentLanguage = DEFAULT_LANGUAGE;

  function normalizeLanguage(lang) {
    if (typeof lang !== 'string') return null;
    const normalized = lang.trim().toLowerCase();
    if (!normalized) return null;
    const short = normalized.split(/[-_]/)[0];
    return SUPPORTED_LANGUAGES.includes(short) ? short : null;
  }

  function getStoredLanguage() {
    try {
      return normalizeLanguage(global.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function updateDocumentLanguage(lang) {
    if (global.document && global.document.documentElement) {
      global.document.documentElement.lang = lang;
    }
  }

  function updateLanguageButtons() {
    if (!global.document) return;
    global.document.querySelectorAll('[data-lang-button]').forEach(function(button) {
      const buttonLang = normalizeLanguage(button.getAttribute('data-lang-button'));
      const isActive = buttonLang === currentLanguage;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function interpolate(template, params) {
    if (!params) return template;
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function(match, key) {
      return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
    });
  }

  function detectPreferredLanguage() {
    const stored = getStoredLanguage();
    if (stored) return stored;

    const candidates = [];
    if (Array.isArray(global.navigator && global.navigator.languages)) {
      candidates.push.apply(candidates, global.navigator.languages);
    }
    if (global.navigator && global.navigator.language) {
      candidates.push(global.navigator.language);
    }

    for (const candidate of candidates) {
      const normalized = normalizeLanguage(candidate);
      if (normalized) return normalized;
    }

    return DEFAULT_LANGUAGE;
  }

  function getCurrentLanguage() {
    return currentLanguage;
  }

  function setLanguage(lang) {
    const normalized = normalizeLanguage(lang) || DEFAULT_LANGUAGE;
    currentLanguage = normalized;

    try {
      global.localStorage.setItem(STORAGE_KEY, normalized);
    } catch (error) {
      // localStorage may be unavailable; ignore safely.
    }

    updateDocumentLanguage(normalized);
    updateLanguageButtons();

    if (global.document) {
      global.document.dispatchEvent(new CustomEvent('skyframe:languagechange', {
        detail: { language: normalized }
      }));
    }

    return currentLanguage;
  }

  function registerLocale(lang, messages) {
    const normalized = normalizeLanguage(lang);
    if (!normalized || !messages || typeof messages !== 'object') return;
    LOCALES[normalized] = Object.assign({}, messages);
  }

  function translate(key, params) {
    const locale = LOCALES[currentLanguage] || LOCALES[DEFAULT_LANGUAGE] || {};
    const fallbackLocale = LOCALES[DEFAULT_LANGUAGE] || {};
    const message = locale[key] ?? fallbackLocale[key] ?? key;
    return interpolate(String(message), params);
  }

  function init() {
    setLanguage(detectPreferredLanguage());
  }

  global.SkyFrameI18n = {
    STORAGE_KEY: STORAGE_KEY,
    SUPPORTED_LANGUAGES: SUPPORTED_LANGUAGES.slice(),
    DEFAULT_LANGUAGE: DEFAULT_LANGUAGE,
    getCurrentLanguage: getCurrentLanguage,
    setLanguage: setLanguage,
    detectPreferredLanguage: detectPreferredLanguage,
    translate: translate,
    registerLocale: registerLocale,
    updateLanguageButtons: updateLanguageButtons,
    init: init
  };

  init();
})(window);
