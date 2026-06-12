function getSuggestionStorageValue(key){
  try { return localStorage.getItem(key); } catch(e) { return null; }
}

let currentSuggestionFilter = getSuggestionStorageValue('suggestion_filter') || 'all';
let SUGGESTION_TOP_N = parseInt(getSuggestionStorageValue('suggestion_top_n') || '100', 10);
let currentSuggestionSort = getSuggestionStorageValue('suggestion_sort') || 'editorial';
if(!Number.isFinite(SUGGESTION_TOP_N) || SUGGESTION_TOP_N < 10) SUGGESTION_TOP_N = 100;

function skyFrameSuggestionsTranslate(key, params){
  return window.SkyFrameI18n ? window.SkyFrameI18n.translate(key, params) : key;
}

function clampSuggestionTopN(value){
  const num=parseInt(value,10);
  if(Number.isNaN(num)) return SUGGESTION_TOP_N;
  return Math.max(10, Math.min(300, num));
}

function persistSuggestionState(){
  try{ localStorage.setItem('suggestion_filter', currentSuggestionFilter); }catch(e){}
  try{ localStorage.setItem('suggestion_top_n', String(SUGGESTION_TOP_N)); }catch(e){}
  try{ localStorage.setItem('suggestion_sort', currentSuggestionSort); }catch(e){}
}

function syncSuggestionFilterButtons(){
  document.querySelectorAll('#page-suggestions [data-suggestion-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.suggestionFilter === currentSuggestionFilter);
  });
  const label=document.getElementById('mft-active-suggestions');
  if(label){
    label.textContent=skyFrameSuggestionsTranslate(`suggestions.filter.${currentSuggestionFilter}`);
  }
}

function setSuggestionFilter(filter){
  currentSuggestionFilter=filter;
  persistSuggestionState();
  syncSuggestionFilterButtons();
  renderSuggestions();
}

function setSuggestionSort(sort){
  currentSuggestionSort=(sort==='time') ? 'time' : 'editorial';
  const select=document.getElementById('suggestion-sort-select');
  if(select) select.value=currentSuggestionSort;
  persistSuggestionState();
  renderSuggestions();
}

function setSuggestionTopN(value){
  SUGGESTION_TOP_N=clampSuggestionTopN(value);
  const input=document.getElementById('suggestion-top-n-input');
  if(input) input.value=String(SUGGESTION_TOP_N);
  persistSuggestionState();
  renderSuggestions();
}

function stepSuggestionTopN(delta){
  setSuggestionTopN(SUGGESTION_TOP_N + delta);
}

function handleSuggestionImageError(img){
  const frame=img && img.closest ? img.closest('.suggestion-thumb') : null;
  if(!frame) return;
  frame.classList.add('suggestion-thumb-fallback');
  img.remove();
}

function renderSuggestionFact(value){
  return `<span class="suggestion-fact">${escapeHtml(value)}</span>`;
}

function formatSuggestionDuration(mins){
  if(typeof formatDurationMinutes === 'function') return formatDurationMinutes(mins);
  if(!isFinite(mins)||mins<=0) return '0 min';
  const h=Math.floor(mins/60), m=Math.round(mins%60);
  if(h&&m) return `${h}h${String(m).padStart(2,'0')}`;
  if(h) return `${h}h00`;
  return `${m} min`;
}

function renderSuggestions(){
  const grid=document.getElementById('suggestion-grid');
  const count=document.getElementById('suggestion-count-label');
  const input=document.getElementById('suggestion-top-n-input');
  const sortSelect=document.getElementById('suggestion-sort-select');
  if(!grid || !count) return;
  if(input) input.value=String(SUGGESTION_TOP_N);
  if(sortSelect) sortSelect.value=currentSuggestionSort;

  updateClock();
  const t=getViewTime();
  const lstD=lst(jd(t),S.lon);
  const mp=moon(t);
  const suggestions=getSuggestionCandidates({ filter: currentSuggestionFilter, limit: SUGGESTION_TOP_N, sortBy: currentSuggestionSort })
    .map(o => withComputedState(o, lstD, mp));

  syncSuggestionFilterButtons();
  count.textContent=skyFrameSuggestionsTranslate('suggestions.count', {
    count: suggestions.length,
    limit: SUGGESTION_TOP_N,
    filter: skyFrameSuggestionsTranslate(`suggestions.filter.${currentSuggestionFilter}`),
    sort: skyFrameSuggestionsTranslate(`suggestions.sort.${currentSuggestionSort}`)
  });

  if(!suggestions.length){
    grid.innerHTML=`<div class="suggestion-empty">${skyFrameSuggestionsTranslate('suggestions.empty')}</div>`;
    return;
  }

  grid.innerHTML=suggestions.map((o,index) => {
    const rt=getRating(o.id);
    const astroBinUrl=getAstroBinSearchUrl(o);
    const imageUrl=getSuggestionImageUrl(o);
    const rec=recFilter(o, mp.ill);
    const safeId=escapeJsAttr(o.id);
    const windowInfo=o.suggestionWindow || null;
    const usableMinutes=windowInfo && windowInfo.isSchedulable ? windowInfo.usableMinutes : 0;
    const exposureCount=windowInfo && windowInfo.isSchedulable ? windowInfo.exposures : 0;
    const usableLabel=formatSuggestionDuration(usableMinutes);
    const facts=[
      `${TYPE_LABEL[o.type] || o.type}`,
      `${o.size}'`,
      `${skyFrameSuggestionsTranslate('suggestions.scoreShort')} ${o.score}`,
      `${skyFrameSuggestionsTranslate('suggestions.altShort')} ${Math.round(o.alt)}°`,
      `${skyFrameSuggestionsTranslate('suggestions.exposureShort')} ${usableLabel}`,
      `${skyFrameSuggestionsTranslate('suggestions.subsShort')} ${exposureCount}`,
      rec.name
    ];
    return `<article class="suggestion-card">
      <div class="suggestion-thumb ${imageUrl?'':'suggestion-thumb-fallback'}">
        ${imageUrl?`<img src="${imageUrl}" alt="${escapeHtml(formatDisplayName(o))}" loading="lazy" referrerpolicy="no-referrer" onerror="handleSuggestionImageError(this)">`:''}
        <div class="suggestion-thumb-label">
          <div>
            <span class="suggestion-rank">#${index+1} · ${rt.tag || skyFrameSuggestionsTranslate('rating.tag.none')}</span>
            <span class="suggestion-time-chip">${skyFrameSuggestionsTranslate('suggestions.tonightShort')} ${usableLabel}</span>
          </div>
          <div class="suggestion-thumb-name">${escapeHtml(formatDisplayName(o))}</div>
          <div class="suggestion-thumb-sub">${escapeHtml(o.cat)} · ${escapeHtml(TYPE_LABEL[o.type] || o.type)}</div>
        </div>
      </div>
      <div class="suggestion-body">
        <div class="suggestion-meta-row">
          <div>
            <div class="suggestion-type">${skyFrameSuggestionsTranslate(`suggestions.filter.${getSuggestionFamily(o)}`)}</div>
            <div class="suggestion-rating-line">
              ${renderStars(rt.stars)}
              ${rt.stars?`<span class="rating-tag ${ratingTagCls(rt.stars)}">${rt.tag}</span>`:''}
            </div>
          </div>
          <div>
            <div class="suggestion-score">${o.score}</div>
            <div class="suggestion-score-sub">${skyFrameSuggestionsTranslate('suggestions.scoreLabel')}</div>
          </div>
        </div>
        <div class="suggestion-window-line">${skyFrameSuggestionsTranslate('suggestions.windowLine', { duration: usableLabel, exposures: exposureCount, count: exposureCount })}</div>
        <div class="suggestion-desc">${escapeHtml(rt.reason || o.desc || skyFrameSuggestionsTranslate('rating.reason.unrated'))}</div>
        <div class="suggestion-facts">${facts.map(renderSuggestionFact).join('')}</div>
        <div class="suggestion-actions">
          <button class="suggestion-btn primary" type="button" onclick="addToPlannerById('${safeId}','suggestions')">${skyFrameSuggestionsTranslate('planner.action.addToPlanner')}</button>
          ${astroBinUrl?`<a class="suggestion-btn secondary" href="${astroBinUrl}" target="_blank" rel="noopener noreferrer">🔗 ${skyFrameSuggestionsTranslate('chart.search.astrobin')}</a>`:''}
          <button class="suggestion-btn secondary" type="button" onclick="openModal('${safeId}')">${skyFrameSuggestionsTranslate('suggestions.details')}</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

document.addEventListener('skyframe:languagechange', function() {
  if(currentPage==='suggestions') renderSuggestions();
});
