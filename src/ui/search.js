/**
 * search.js — client-side search over the catalog index.
 */

import { searchTopics } from '../data/content.js';
import { tl } from '../i18n/t.js';

export function initSearch({ inputEl, resultsEl, topics }) {
  if (!inputEl || !resultsEl) return;

  let timer = null;

  inputEl.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(inputEl.value), 160);
  });

  inputEl.addEventListener('focus', () => {
    if (inputEl.value.trim().length >= 2) runSearch(inputEl.value);
  });

  document.addEventListener('click', (e) => {
    if (!resultsEl.contains(e.target) && e.target !== inputEl) {
      resultsEl.hidden = true;
    }
  });

  function runSearch(query) {
    const results = searchTopics(topics, query);
    renderResults(results, query);
  }

  function renderResults(results, query) {
    resultsEl.innerHTML = '';
    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="search-empty">No results for "${query}"</div>`;
      resultsEl.hidden = false;
      return;
    }
    for (const topic of results.slice(0, 8)) {
      const item = document.createElement('a');
      item.className = 'search-result-item';
      item.href = `/viewer.html?topic=${topic.id}`;
      item.innerHTML = `
        <span style="font-size:1.2rem">${getCategoryEmoji(topic.category)}</span>
        <span>${tl(topic.title)}</span>
        <span class="badge badge-${topic.category}" style="margin-left:auto">${topic.category}</span>
      `;
      resultsEl.appendChild(item);
    }
    resultsEl.hidden = false;
  }
}

function getCategoryEmoji(cat) {
  return { cells: '🔬', plants: '🌿', animals: '🦎', 'human-body': '🫀' }[cat] ?? '🧬';
}

