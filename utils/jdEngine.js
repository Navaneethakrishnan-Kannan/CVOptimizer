const { normalizeText, tokenize, unique } = require('./textUtils.js')
const { extractSkills, normalizeSkills } = require('./skillsEngine.js')

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'will', 'your', 'you', 'our', 'are', 'was', 'were',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'as', 'is', 'be', 'or', 'it', 'we', 'they', 'their', 'them',
  'job', 'role', 'work', 'working', 'skills', 'experience', 'years', 'required', 'requirements', 'responsibilities'
])

function extractExperienceYears(jdText) {
  const text = String(jdText || '')
  const matches = Array.from(text.matchAll(/\b(\d+)\s*(?:\+?\s*)years?\b/gi))
  const years = matches.map((m) => Number(m[1])).filter((n) => Number.isFinite(n))
  if (years.length === 0) return 0
  return Math.max(...years)
}

function extractKeywords(jdText) {
  const tokens = tokenize(jdText)
  const keywords = tokens
    .filter((t) => t.length > 3)
    .filter((t) => !STOPWORDS.has(t))
  return unique(keywords)
}

function extractJDAnalysis(jdText, synonyms = {}) {
  const rawSkills = extractSkills(jdText)
  const skills = normalizeSkills(rawSkills, synonyms)
  const keywords = extractKeywords(jdText)
  const experienceRequirements = extractExperienceYears(jdText)
  return { skills, keywords, experienceRequirements }
}

module.exports = { extractJDAnalysis, extractKeywords, extractExperienceYears }
