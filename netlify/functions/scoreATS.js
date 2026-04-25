const { scoreATS } = require('../../utils/scoringEngine.js')
const { atsProfiles } = require('../../config/atsProfiles.js')
const { extractJDAnalysis } = require('../../utils/jdEngine.js')

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }
  try {
    const { resumeText, resumeJson, jdText, atsType } = JSON.parse(event.body || '{}')
    const atsProfile = atsProfiles[atsType]
    if (!atsProfile) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid ATS type' }) }
    if (!resumeText) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'resumeText is required' }) }
    if (!jdText) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'jdText is required' }) }

    const jdAnalysis = extractJDAnalysis(jdText, atsProfile.synonyms || {})
    const result = scoreATS({ resumeText, resumeJson: resumeJson || {}, jdAnalysis, atsProfile })
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    }
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }
}
