const { extractJDAnalysis } = require('../../utils/jdEngine.js')
const { atsProfiles } = require('../../config/atsProfiles.js')

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }
  try {
    const { jdText, atsType } = JSON.parse(event.body || '{}')
    if (!jdText) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'jdText is required' }) }

    const synonyms = (atsProfiles[atsType] && atsProfiles[atsType].synonyms) || {}
    const { skills, keywords, experienceRequirements } = extractJDAnalysis(jdText, synonyms)
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ skills, keywords, experienceRequirements })
    }
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }
}
