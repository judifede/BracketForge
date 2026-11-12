/**
 * Trim and collapse internal whitespace. Preserves letter casing (e.g. NovaStrike).
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeWhitespace(text) {
  if (typeof text !== 'string') return ''
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Soft title-style: uppercase first character only (does not lowercase the rest).
 * @param {unknown} text
 * @returns {string}
 */
export default function capitalize(text) {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return ''
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}
