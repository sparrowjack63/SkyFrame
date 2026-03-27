(function(global){
  const STORAGE_KEY='skyframe_lang';
  const DEFAULT_LANGUAGE='fr';
  const locales={};
  let currentLanguage=DEFAULT_LANGUAGE;

  function registerLocale(lang, messages){ locales[lang]=messages||{}; }
  function getLocale(lang){ return locales[lang] || locales[DEFAULT_LANGUAGE] || {}; }
  function getByPath(obj, path){ return String(path||'').split('.').reduce((acc, key)=>acc&&acc[key]!==undefined?acc[key]:undefined, obj); }
  function interpolate(value, params){
    if(typeof value!=='string') return value;
    return value.replace(/\{(\w+)\}/g, (_, k)=> params && params[k]!==undefined ? params[k] : `{${k}}`);
  }
  function t(key, params){
    const value = getByPath(getLocale(currentLanguage), key) ?? getByPath(getLocale(DEFAULT_LANGUAGE), key) ?? key;
    return interpolate(value, params);
  }
  function getCurrentLanguage(){ return currentLanguage; }
  function detectPreferredLanguage(){
    const stored = safeGet(STORAGE_KEY);
    if(stored && locales[stored]) return stored;
    const nav = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language || navigator.userLanguage || ''];
    for(const entry of nav){
      const short=String(entry||'').toLowerCase().split('-')[0];
      if(locales[short]) return short;
    }
    return DEFAULT_LANGUAGE;
  }
  function safeGet(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
  function safeSet(key, value){ try { localStorage.setItem(key, value); } catch(e){} }
  function translateElement(el){
    const key=el.dataset.i18n;
    if(!key) return;
    const attr=el.dataset.i18nAttr;
    const html=el.dataset.i18nHtml === '1';
    const value=t(key);
    if(attr) el.setAttribute(attr, value);
    else if(html) el.innerHTML=value;
    else el.textContent=value;
  }
  function applyStaticMappings(dict){
    Object.entries(dict||{}).forEach(([selector, value])=>{
      document.querySelectorAll(selector).forEach(el=>{ el.textContent=value; });
    });
  }
  function applyHtmlMappings(dict){
    Object.entries(dict||{}).forEach(([selector, value])=>{
      const el=document.querySelector(selector);
      if(el) el.innerHTML=value;
    });
  }
  function updateLanguageButtons(){
    document.documentElement.setAttribute('lang', currentLanguage);
    document.querySelectorAll('[data-lang-btn]').forEach(btn=>{
      const active = btn.dataset.langBtn === currentLanguage;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  function applyI18n(root){
    const scope=root||document;
    scope.querySelectorAll('[data-i18n]').forEach(translateElement);
    const locale=getLocale(currentLanguage);
    applyStaticMappings(locale.selectors);
    applyHtmlMappings(locale.html);
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

  global.SkyFrameI18n={ registerLocale, t, setLanguage, getCurrentLanguage, detectPreferredLanguage, applyI18n, STORAGE_KEY };
  global.t=t; global.setLanguage=setLanguage; global.getCurrentLanguage=getCurrentLanguage; global.detectPreferredLanguage=detectPreferredLanguage; global.applyI18n=applyI18n;
})(window);
