const { normalizeText, unique } = require('./textUtils.js')

const skillPatterns = [
  /\b(?:JavaScript|Python|React|Node\.js|SQL|AWS|Docker|Kubernetes|PMP|CCNA)\b/gi,
  /\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\b/g // short capitalized phrases
]

const certPatterns = /\b(?:aws|microsoft|pmp|ccna|cissp|itil)\b/i
const toolPatterns = /\b(?:excel|word|powerpoint|hysys|aspen|jira|git|github)\b/i

function extractSkills(text) {
  const input = String(text || '')
  const skills = new Set()
  for (const pattern of skillPatterns) {
    const matches = input.match(pattern)
    if (!matches) continue
    for (const match of matches) skills.add(match.trim())
  }
  return Array.from(skills).filter(Boolean)
}

function normalizeSkills(skills, synonyms = {}) {
  const normalized = (skills || []).map((skill) => {
    const key = normalizeText(skill)
    return synonyms[key] || key
  })
  return unique(normalized).filter(Boolean)
}

function groupSkills(skills) {
  const technical = []
  const tools = []
  const domain = []
  const certifications = []

  for (const skill of skills || []) {
    const value = String(skill || '').trim()
    if (!value) continue

    if (certPatterns.test(value)) certifications.push(value)
    else if (toolPatterns.test(value)) tools.push(value)
    else if (/\b(?:engineering|process|chemical|mechanical|petrochemical)\b/i.test(value)) domain.push(value)
    else technical.push(value)
  }

  return { technical, tools, domain, certifications }
}

module.exports = { extractSkills, normalizeSkills, groupSkills }

