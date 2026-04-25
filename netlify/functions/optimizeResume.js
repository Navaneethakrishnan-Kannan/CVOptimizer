const { optimizeResume } = require('../utils/llmService.js')

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
    const result = await optimizeResume(cvText, jdText, atsType, missingSkills, missingKeywords)
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    }
  } catch (error) {
    const statusCode = error.statusCode || 500
    return { statusCode, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }
}
