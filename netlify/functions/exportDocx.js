const { Document, Packer, Paragraph, TextRun } = require('docx')

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }

  try {
    const { text, filename } = JSON.parse(event.body || '{}')
    const content = String(text || '')
    if (!content.trim()) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'text is required' }) }

    const doc = new Document({
      sections: [{
        properties: {},
        children: content.split('\n').map((line) => new Paragraph({ children: [new TextRun(line)] }))
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    const safeName = String(filename || 'optimized_resume').replace(/[^\w\-]+/g, '_')

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`
      },
      isBase64Encoded: true,
      body: buffer.toString('base64')
    }
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }
}

