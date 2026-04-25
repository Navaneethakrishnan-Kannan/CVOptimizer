exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }

  const defaultModel = 'openai/gpt-oss-120b'
  const model = process.env.GROQ_MODEL || defaultModel

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      model,
      defaultModel
    })
  }
}

