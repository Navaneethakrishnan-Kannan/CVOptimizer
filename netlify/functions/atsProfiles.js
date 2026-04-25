const { atsProfiles, supportedAts } = require('./lib/atsProfilesConfig.js')

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }

  const list = supportedAts.map((key) => ({
    key,
    displayName: atsProfiles[key]?.displayName || key
  }))

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ supportedAts: list })
  }
}
