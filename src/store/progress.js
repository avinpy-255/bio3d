/**
 * progress.js — localStorage wrapper for quiz and label scores.
 * All reads/writes are wrapped in try/catch so private-browsing never crashes the app.
 */

const PREFIX = 'bio3d_';

function safeGet(key) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

/** Get the user's preferred level ('basic' | 'neet'). Default: 'basic'. */
export function getLevel() {
  return safeGet('level') ?? 'basic';
}

/** Persist the user's chosen level. */
export function setLevel(level) {
  safeSet('level', level);
}

/**
 * Save a quiz score (only if it's better than the saved best).
 * @param {string} topicId
 * @param {'basic'|'neet'} level
 * @param {number} score   0–1 fraction
 */
export function saveQuizScore(topicId, level, score) {
  const key = `quiz_${topicId}_${level}`;
  const existing = safeGet(key) ?? 0;
  if (score > existing) safeSet(key, score);
}

/** Get the best quiz score for a topic+level, or null if never attempted. */
export function getQuizScore(topicId, level) {
  return safeGet(`quiz_${topicId}_${level}`);
}

/**
 * Save a label score (only if better than saved best).
 */
export function saveLabelScore(topicId, level, score) {
  const key = `label_${topicId}_${level}`;
  const existing = safeGet(key) ?? 0;
  if (score > existing) safeSet(key, score);
}

/** Get the best label score for a topic+level, or null if never attempted. */
export function getLabelScore(topicId, level) {
  return safeGet(`label_${topicId}_${level}`);
}

