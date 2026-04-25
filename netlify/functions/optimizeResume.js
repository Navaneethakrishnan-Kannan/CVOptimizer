const { optimizeResume } = require('./optimizeService.js')
const { normalizeText, tokenize } = require('./textUtils.js')
const { atsProfiles } = require('./atsProfilesConfig.js')
const { scoreATS } = require('./scoringEngine.js')
const { extractJDAnalysis } = require('./jdEngine.js')

function basicResumeJsonFromText(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const resumeJson = { name: lines[0] || '', experience: [], skills: [], education: [], certifications: [] }
  let currentSection = ''
  for (const line of lines) {
    if (/^experience\b/i.test(line)) currentSection = 'experience'
    else if (/^skills?\b/i.test(line)) currentSection = 'skills'
    else if (/^education\b/i.test(line)) currentSection = 'education'
    else if (/^certifications?\b/i.test(line)) currentSection = 'certifications'
    else if (currentSection) resumeJson[currentSection].push(line)
  }
  return resumeJson
}

function computeAddressed({ optimizedText, atsType, missingSkills = [], missingKeywords = [] }) {
  const normalizedOptimized = normalizeText(optimizedText)
  const addressedSkills = (missingSkills || []).filter((skill) => normalizedOptimized.includes(normalizeText(skill)))
  const addressedKeywords = (missingKeywords || []).filter((kw) => {
    const normalizedKw = normalizeText(kw)
    if (!normalizedKw) return false
    if (String(atsType || '').toLowerCase() === 'taleo') {
      return tokenize(normalizedOptimized).includes(normalizedKw)
    }
    return normalizedOptimized.includes(normalizedKw)
  })
  return { addressedSkills, addressedKeywords }
}

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }
  try {
    const { cvText, jdText, atsType, missingSkills, missingKeywords } = JSON.parse(event.body || '{}')
    if (!cvText) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'cvText is required' }) }
    if (!jdText) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'jdText is required' }) }
    if (!atsType) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'atsType is required' }) }
    const originalMissingSkills = missingSkills || []
    const originalMissingKeywords = missingKeywords || []

    // Round 1
    let result = await optimizeResume({
      cvText,
      jdText,
      atsType,
      missingSkills: originalMissingSkills,
      missingKeywords: originalMissingKeywords
    })
    let { addressedSkills, addressedKeywords } = computeAddressed({
      optimizedText: result.optimizedText,
      atsType,
      missingSkills: originalMissingSkills,
      missingKeywords: originalMissingKeywords
    })

    // Optional Round 2 if any are still missing (pushes Groq to include remaining terms verbatim).
    const remainingSkills = originalMissingSkills.filter((s) => !addressedSkills.includes(s))
    const remainingKeywords = originalMissingKeywords.filter((k) => !addressedKeywords.includes(k))
    if (remainingSkills.length || remainingKeywords.length) {
      result = await optimizeResume({
        cvText: result.optimizedText,
        jdText,
        atsType,
        missingSkills: remainingSkills,
        missingKeywords: remainingKeywords
      })
      ;({ addressedSkills, addressedKeywords } = computeAddressed({
        optimizedText: result.optimizedText,
        atsType,
        missingSkills: originalMissingSkills,
        missingKeywords: originalMissingKeywords
      }))
    }

    // Provide an internal “targeted” score so the UI can see if it truly hit 100 in our rubric.
    let targetedScore = null
    try {
      const atsProfile = atsProfiles[atsType]
      if (atsProfile) {
        const resumeJson = basicResumeJsonFromText(result.optimizedText)
        const jdAnalysis = extractJDAnalysis(jdText, atsProfile.synonyms || {})
        targetedScore = scoreATS({ resumeText: result.optimizedText, resumeJson, jdAnalysis, atsProfile })
      }
    } catch (_) {
      targetedScore = null
    }
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ...result, addressedSkills, addressedKeywords, targetedScore })
    }
  } catch (error) {
    const statusCode = error.statusCode || 500
    return { statusCode, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }
}
