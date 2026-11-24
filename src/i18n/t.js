import en from './en.json';

/** Current locale key – extend later for 'hi' etc. */
export let currentLocale = 'en';

const strings = { en };

/**
 * Translate a UI chrome key, e.g. t('ui.loading')
 * @param {string} key  dot-separated path into the locale object
 */
export function t(key) {
  const parts = key.split('.');
  let node = strings[currentLocale] ?? strings.en;
  for (const p of parts) {
    if (node == null) break;
    node = node[p];
  }
  if (node == null) {
    // Fall back to English
    node = strings.en;
    for (const p of parts) {
      if (node == null) break;
      node = node[p];
    }
  }
  return typeof node === 'string' ? node : key;
}

/**
 * Translate a user-facing string from topic/part data.
 * Those are locale objects: { "en": "...", "hi": "..." }
 * @param {object|string} localeObj
 */
export function tl(localeObj) {
  if (typeof localeObj === 'string') return localeObj;
  if (!localeObj) return '';
  return localeObj[currentLocale] ?? localeObj.en ?? '';
}

