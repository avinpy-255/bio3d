/**
 * main-category.js — Entry point for category.html
 */

import { fetchCatalog } from './data/content.js';
import { LevelToggle } from './ui/levelToggle.js';
import { tl } from './i18n/t.js';
import './styles/base.css';

const CATEGORY_META = {
  cells:        { emoji: '🔬', label: 'Cells',       desc: 'Animal cell, plant cell, bacteria, and more' },
  plants:       { emoji: '🌿', label: 'Plants',      desc: 'Leaf, flower, root, seed, and plant systems' },
  animals:      { emoji: '🦎', label: 'Animals',     desc: 'Body parts and organ systems' },
  'human-body': { emoji: '🫀', label: 'Human Body',  desc: 'Heart, lungs, brain, kidney, and more' },
};

async function main() {
  const params = new URLSearchParams(location.search);
  const catId = params.get('c') ?? 'cells';
  const meta = CATEGORY_META[catId] ?? { emoji: '🧬', label: catId, desc: '' };

  // Set page header
  document.title = `${meta.label} — Bio3D`;
  document.getElementById('category-title').textContent = `${meta.emoji} ${meta.label}`;
  document.getElementById('category-desc').textContent = meta.desc;

  // Level toggle
  const toggleEl = document.getElementById('level-toggle-cat');
  new LevelToggle(toggleEl);

  let topics = [];
  try {
    topics = await fetchCatalog();
  } catch (e) {
    console.error('Failed to load catalog:', e);
  }

  const filtered = topics.filter(t => t.category === catId && t.status === 'published');
  const grid = document.getElementById('topic-grid');
  const empty = document.getElementById('empty-state');

  grid.innerHTML = '';
  if (filtered.length === 0) {
    grid.hidden = true;
    empty.hidden = false;
    return;
  }

  for (const topic of filtered) {
    const a = document.createElement('a');
    a.className = 'topic-card';
    a.href = `/viewer.html?topic=${topic.id}`;
    const thumbHtml = topic.thumbnail
      ? `<img src="${topic.thumbnail}" alt="${tl(topic.title)}" loading="lazy" />`
      : meta.emoji;
    a.innerHTML = `
      <div class="topic-thumb">${thumbHtml}</div>
      <div class="topic-info">
        <div class="topic-title">${tl(topic.title)}</div>
        <div class="topic-meta"><span class="badge badge-${catId}">${meta.label}</span></div>
      </div>
    `;
    grid.appendChild(a);
  }
}

main().catch(console.error);

