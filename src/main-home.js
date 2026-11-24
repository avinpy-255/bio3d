/**
 * main-home.js — Entry point for index.html (home page).
 * Fetches the topic catalog, renders category cards + topic grid, and sets up search.
 */

import { fetchCatalog } from './data/content.js';
import { LevelToggle } from './ui/levelToggle.js';
import { initSearch } from './ui/search.js';
import { tl } from './i18n/t.js';
import './styles/base.css';

const CATEGORY_META = {
  cells:        { emoji: '🔬', label: 'Cells' },
  plants:       { emoji: '🌿', label: 'Plants' },
  animals:      { emoji: '🦎', label: 'Animals' },
  'human-body': { emoji: '🫀', label: 'Human Body' },
};

async function main() {
  // Level toggle
  const toggleEl = document.getElementById('level-toggle-home');
  new LevelToggle(toggleEl);

  // Fetch catalog
  let topics = [];
  try {
    topics = await fetchCatalog();
  } catch (e) {
    console.error('Failed to load catalog:', e);
  }

  // Render topic grid
  renderTopicGrid(topics, document.getElementById('topic-grid'));

  // Search
  initSearch({
    inputEl: document.getElementById('search'),
    resultsEl: document.getElementById('search-results'),
    topics,
  });
}

function renderTopicGrid(topics, container) {
  if (!container) return;
  const published = topics.filter(t => t.status === 'published');
  if (published.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:20px">No topics available yet.</p>';
    return;
  }
  container.innerHTML = '';
  for (const topic of published) {
    container.appendChild(createTopicCard(topic));
  }
}

function createTopicCard(topic) {
  const a = document.createElement('a');
  a.className = 'topic-card';
  a.href = `/viewer.html?topic=${topic.id}`;

  const meta = CATEGORY_META[topic.category] ?? { emoji: '🧬', label: topic.category };
  const badgeClass = `badge-${topic.category}`;

  const thumbHtml = topic.thumbnail
    ? `<img src="${topic.thumbnail}" alt="${tl(topic.title)}" loading="lazy" />`
    : meta.emoji;

  a.innerHTML = `
    <div class="topic-thumb">${thumbHtml}</div>
    <div class="topic-info">
      <div class="topic-title">${tl(topic.title)}</div>
      <div class="topic-meta">
        <span class="badge ${badgeClass}">${meta.label}</span>
      </div>
    </div>
  `;
  return a;
}

main().catch(console.error);

