(function(global){
  const STORAGE_KEY='skyframe_lang';
  const DEFAULT_LANGUAGE='fr';
  const locales={};
  let currentLanguage=DEFAULT_LANGUAGE;

  function safeGet(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
  function safeSet(key, value){ try { localStorage.setItem(key, value); } catch(e){} }
  function registerLocale(lang, messages){ locales[lang]=messages||{}; }
  function getLocale(lang){ return locales[lang] || locales[DEFAULT_LANGUAGE] || {}; }
  function getByPath(obj, path){ return String(path||'').split('.').reduce((acc, key)=>acc&&acc[key]!==undefined?acc[key]:undefined, obj); }
  function interpolate(value, params){
    if(typeof value!=='string') return value;
    return value.replace(/\{(\w+)\}/g, (_, key)=> params && params[key]!==undefined ? params[key] : `{${key}}`);
  }
  function t(key, params){
    const value = getByPath(getLocale(currentLanguage), key) ?? getByPath(getLocale(DEFAULT_LANGUAGE), key) ?? key;
    return interpolate(value, params);
  }
  function getCurrentLanguage(){ return currentLanguage; }
  function detectPreferredLanguage(){
    const stored=safeGet(STORAGE_KEY);
    if(stored && locales[stored]) return stored;
    const nav = Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for(const entry of nav){
      const short=String(entry||'').toLowerCase().split('-')[0];
      if(locales[short]) return short;
    }
    return DEFAULT_LANGUAGE;
  }
  function updateLanguageButtons(){
    document.documentElement.setAttribute('lang', currentLanguage);
    document.querySelectorAll('[data-lang-btn]').forEach(btn=>{
      const active = btn.dataset.langBtn === currentLanguage;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  function applyMappings(dict){
    Object.entries(dict||{}).forEach(([selector, value])=>{
      document.querySelectorAll(selector).forEach(el=>{ el.textContent=value; });
    });
  }
  function applyI18n(){
    applyMappings(getLocale(currentLanguage).selectors);
    updateLanguageButtons();
    if(typeof global.refreshI18nUI === 'function') global.refreshI18nUI();
  }
  function setLanguage(lang, options){
    if(!locales[lang]) lang=DEFAULT_LANGUAGE;
    currentLanguage=lang;
    if(!options || options.persist !== false) safeSet(STORAGE_KEY, lang);
    applyI18n();
    global.dispatchEvent(new CustomEvent('skyframe:language-changed', {detail:{lang}}));
    return currentLanguage;
  }

  global.SkyFrameI18n={registerLocale, setLanguage, getCurrentLanguage, detectPreferredLanguage, applyI18n, t, STORAGE_KEY};
  global.setLanguage=setLanguage;
  global.getCurrentLanguage=getCurrentLanguage;
  global.detectPreferredLanguage=detectPreferredLanguage;
  global.applyI18n=applyI18n;
  global.t=t;
})(window);
