/**
 * main-about.js — Entry point for about.html
 * Loads model credits from the topic catalog.
 */

import { fetchCatalog, fetchTopicData } from './data/content.js';
import { tl } from './i18n/t.js';
import './styles/base.css';

async function main() {
  const creditsEl = document.getElementById('model-credits');
  if (!creditsEl) return;

  try {
    const topics = await fetchCatalog();
    const published = topics.filter(t => t.status === 'published');

    if (published.length === 0) {
      creditsEl.innerHTML = '<p>No topics published yet.</p>';
      return;
    }

    const rows = await Promise.allSettled(
      published.map(t => fetchTopicData(t.id).catch(() => null))
    );

    const creditsHtml = rows
      .map(r => r.value)
      .filter(Boolean)
      .map(topic => {
        const m = topic.model;
        const creditLine = m.credit || `${m.author} via ${m.source}`;
        return `
          <div style="margin-bottom:16px; padding:14px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius);">
            <strong style="color:var(--text-bright)">${tl(topic.title)}</strong><br>
            <span style="font-size:0.85rem; color:var(--text-muted)">
              ${creditLine} — 
              <a href="${m.sourceUrl}" target="_blank" rel="noopener">${m.source}</a><br>
              Licence: ${m.licence}
              ${m.modifications ? `<br><em>Modifications: ${m.modifications}</em>` : ''}
            </span>
          </div>`;
      })
      .join('');

    creditsEl.innerHTML = creditsHtml || '<p>No model credits to display.</p>';
  } catch (e) {
    creditsEl.innerHTML = `<p style="color:var(--error)">Failed to load credits: ${e.message}</p>`;
  }
}

main().catch(console.error);

