function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
}

function tokenize(text) {
  return normalizeText(text).split(' ').filter(Boolean)
}

function unique(items) {
  return Array.from(new Set(items))
}

module.exports = { normalizeText, tokenize, unique }
