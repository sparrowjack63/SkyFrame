// État global recherche
let objectSearch = (localStorage.getItem('object_search') || '').trim();

// js/catalog/search.js — Recherche textuelle et index

function parseCompanions(comp){
  if(!comp) return [];
  return String(comp)
    .split(/[+,;\/]|↔|&/)
    .map(s=>s.trim())
    .filter(Boolean);
}

function getTopNCompanionCount(){
  return Math.max(0, CATALOG_TOPN_LIST.length - CATALOG_TOP_N);
}

function normalizeSearchText(value){
  return String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/['’]/g,' ')
    .replace(/[^A-Z0-9+]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function isCatalogStyleQuery(value){
  return /^(?:M\s*\d+|NGC\s*\d+|IC\s*\d+|SH\s*2[\s-]*\d+|SH2[\s-]*\d+|LBN\s*\d+|LDN\s*\d+|BARNARD\s*\d+|B\s*\d+)$/i.test(String(value||'').trim());
}

function getObjectSearchAliases(o){
  const aliases=[];
  const push=v=>{
    if(v===null||v===undefined) return;
    if(Array.isArray(v)) return v.forEach(push);
    const s=String(v).trim();
    if(!s) return;
    aliases.push(s);
    s.split(/[—–]|\s*\/\s*|\s*\+\s*|\s*,\s*/).map(x=>x.trim()).filter(Boolean).forEach(part=>{
      if(part!==s) aliases.push(part);
    });
  };
  push(o.id);
  push(o.secondaryId);
  push(o.name);
  push(formatDisplayName(o));
  push(o.displayName);
  push(o.astrobinQuery);
  push(o.aliases);
  push(o.groupMembers);
  push(o.group);
  push(parseCompanions(getRating(o.id)?.comp || CUSTOM_META[o.id]?.rating?.comp));
  push(o.desc);
  push(o.notes);
  return [...new Set(aliases)];
}

function buildObjectSearchIndex(o){
  if(!o) return {text:'',compact:'',aliases:[],compactAliases:[]};
  if(o._searchIndex) return o._searchIndex;
  const aliases=getObjectSearchAliases(o);
  const normalized=[...new Set(aliases.map(normalizeSearchText).filter(Boolean))];
  const text=normalized.join(' · ');
  const compact=text.replace(/\s+/g,'');
  const compactAliases=[...new Set(normalized.map(v=>v.replace(/\s+/g,'')).filter(Boolean))];
  const index={text,compact,aliases:normalized,compactAliases};
  try{ o._searchIndex=index; }catch(e){}
  return index;
}

function objectMatchesSearch(o, query=objectSearch){
  const q=normalizeSearchText(query);
  if(!q) return true;
  if(!o) return false;
  const idx=buildObjectSearchIndex(o);
  if(!idx.text) return false;
  const compactQuery=q.replace(/\s+/g,'');
  if(isCatalogStyleQuery(query)){
    return idx.aliases.includes(q) || idx.compactAliases.includes(compactQuery);
  }
  if(idx.text.includes(q) || idx.compact.includes(compactQuery)) return true;
  const tokens=q.split(' ').filter(Boolean);
  return tokens.every(tok=>idx.text.includes(tok) || idx.compact.includes(tok));
}

function syncObjectSearchUI(){
  const value=objectSearch;
  document.querySelectorAll('.object-search-input').forEach(inp=>{
    if(inp.value!==value) inp.value=value;
  });
  ['targets','chart'].forEach(scope=>{
    const btn=document.getElementById('object-search-clear-'+scope);
    if(btn) btn.classList.toggle('visible', !!value);
  });
}

function setObjectSearch(value){
  objectSearch=String(value||'').trimStart();
  localStorage.setItem('object_search', objectSearch);
  syncObjectSearchUI();
  renderTargets();
  if(currentPage==='chart') drawChart();
}

function clearObjectSearch(){
  objectSearch='';
  localStorage.removeItem('object_search');
  syncObjectSearchUI();
  renderTargets();
  if(currentPage==='chart') drawChart();
}
