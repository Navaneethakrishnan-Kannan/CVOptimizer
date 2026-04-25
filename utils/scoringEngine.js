const { extractSkills, normalizeSkills } = require('./skillsEngine.js')
const { normalizeText, tokenize, unique } = require('./textUtils.js')

function validateWeights(weights) {
  const keys = ['skillMatch', 'skillFrequency', 'context', 'keywordMatch', 'formatting', 'experienceRelevance']
  const total = keys.reduce((sum, key) => sum + Number(weights?.[key] || 0), 0)
  return Math.abs(total - 1) < 1e-6
}

function scoreATS({ resumeText, resumeJson, jdAnalysis, atsProfile }) {
  const { weights, expectations, synonyms } = atsProfile || {}
  if (!validateWeights(weights)) {
    throw new Error('Invalid ATS weights (must sum to 1.0)')
  }

  const normalizedResumeText = normalizeText(resumeText)
  const breakdown = {}

  const resumeSkills = normalizeSkills(extractSkills(resumeText), synonyms)
  const jdSkills = normalizeSkills(jdAnalysis?.skills || [], synonyms)
  const matchedSkills = jdSkills.filter((skill) => resumeSkills.includes(skill))

  breakdown.skillMatch = jdSkills.length ? (matchedSkills.length / jdSkills.length) * 100 : 0

  const skillFreq = resumeSkills.reduce((acc, skill) => {
    if (!skill) return acc
    return acc + (normalizedResumeText.split(skill).length - 1)
  }, 0)
  breakdown.skillFrequency = Math.min((skillFreq / 10) * 100, 100)

  let contextScore = 0
  if (expectations?.contextRules?.requireSkillInExperience) {
    const experienceText = normalizeText((resumeJson?.experience || []).join(' '))
    const contextMatches = matchedSkills.filter((skill) => experienceText.includes(skill))
    contextScore = matchedSkills.length ? (contextMatches.length / matchedSkills.length) * 100 : 0
  }
  breakdown.context = contextScore

  const jdKeywords = unique((jdAnalysis?.keywords || []).map((k) => normalizeText(k))).filter(Boolean)
  const resumeTokens = tokenize(resumeText)
  let keywordMatches = 0
  if (expectations?.keywordMode === 'exact') {
    keywordMatches = jdKeywords.filter((kw) => resumeTokens.includes(kw)).length
  } else {
    keywordMatches = jdKeywords.filter((kw) => normalizedResumeText.includes(kw)).length
  }
  breakdown.keywordMatch = jdKeywords.length ? (keywordMatches / jdKeywords.length) * 100 : 0

  let formattingScore = 100
  if (expectations?.formatRules?.disallowTables && /\|/.test(resumeText)) formattingScore -= 20
  if (expectations?.formatRules?.disallowTwoColumn && resumeText.split('\n').some((line) => line.length > 100)) formattingScore -= 20
  const maxBulletChar = expectations?.formatRules?.maxBulletChar || 180
  const longBullets = resumeText
    .split('\n')
    .filter((line) => /^\s*[-*•]/.test(line) && line.length > maxBulletChar).length
  formattingScore -= longBullets * 5
  breakdown.formatting = Math.max(formattingScore, 0)

  const expReq = Number(jdAnalysis?.experienceRequirements || 0)
  if (!expReq) {
    breakdown.experienceRelevance = 100
  } else {
    const resumeExpSignals = (resumeJson?.experience || []).length
    breakdown.experienceRelevance = Math.min((resumeExpSignals / expReq) * 100, 100)
  }

  const totalScore = Object.keys(weights).reduce((sum, key) => sum + (Number(breakdown[key] || 0) * Number(weights[key] || 0)), 0)

  const missingSkills = jdSkills.filter((skill) => !resumeSkills.includes(skill))
  const missingKeywords = jdKeywords.filter((kw) => {
    if (expectations?.keywordMode === 'exact') return !resumeTokens.includes(kw)
    return !normalizedResumeText.includes(kw)
  })

  const warnings = []
  if (breakdown.formatting < 50) warnings.push('Formatting issues detected')
  if ((expectations?.minSkillCoverage || 0) > 0 && jdSkills.length) {
    const coverage = matchedSkills.length / jdSkills.length
    if (coverage < expectations.minSkillCoverage) warnings.push('Skill coverage below ATS expectation')
  }
  if ((expectations?.minKeywordCoverage || 0) > 0 && jdKeywords.length) {
    const coverage = keywordMatches / jdKeywords.length
    if (coverage < expectations.minKeywordCoverage) warnings.push('Keyword coverage below ATS expectation')
  }

  return { totalScore, breakdown, missingSkills, missingKeywords, warnings }
}

module.exports = { scoreATS }
