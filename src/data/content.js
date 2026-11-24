/**
 * content.js — fetch, validate shape, and filter topic data by level.
 */

const BASE = '/content';

/** Fetch and return the full catalog index.json */
export async function fetchCatalog() {
  const res = await fetch(`${BASE}/index.json`);
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const data = await res.json();
  return data.topics ?? [];
}

/** Fetch a single topic's full JSON */
export async function fetchTopicData(topicId) {
  const res = await fetch(`${BASE}/topics/${topicId}.json`);
  if (!res.ok) throw new Error(`Topic "${topicId}" not found (${res.status})`);
  const data = await res.json();
  validateTopicShape(data);
  return data;
}

/** Minimal client-side validation — guards against bad data */
function validateTopicShape(data) {
  const required = ['id', 'title', 'model', 'camera', 'parts', 'quiz'];
  for (const key of required) {
    if (data[key] == null) throw new Error(`Topic JSON missing field: "${key}"`);
  }
}

/**
 * Filter parts by level.
 * 'basic' → only level==='basic' parts
 * 'neet'  → all parts (basic + neet)
 */
export function filterParts(parts, level) {
  if (level === 'neet') return parts;
  return parts.filter(p => p.level === 'basic');
}

/**
 * Filter quiz items by level.
 * 'basic' → only basic questions
 * 'neet'  → all questions
 */
export function filterQuiz(quiz, level) {
  if (level === 'neet') return quiz;
  return quiz.filter(q => q.level === 'basic');
}

/**
 * Find the part that owns the given mesh name, respecting level.
 * In NEET mode, neet-specific parts take precedence over basic ones.
 */
export function findPartByMesh(meshName, parts, level) {
  const activeParts = filterParts(parts, level);

  // In NEET mode, prefer the neet-level part first (more specific)
  if (level === 'neet') {
    const neetMatch = activeParts.find(
      p => p.level === 'neet' && p.meshNames.includes(meshName)
    );
    if (neetMatch) return neetMatch;
  }

  return activeParts.find(p => p.meshNames.includes(meshName)) ?? null;
}

/**
 * Client-side search over the catalog.
 * Returns topics whose title, aliases, or keywords match the query.
 */
export function searchTopics(topics, query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return topics.filter(topic => {
    const title = (topic.title?.en ?? '').toLowerCase();
    const aliases = (topic.aliases ?? []).map(a => a.toLowerCase());
    const keywords = (topic.keywords ?? []).map(k => k.toLowerCase());
    return title.includes(q) || aliases.some(a => a.includes(q)) || keywords.some(k => k.includes(q));
  });
}

