const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const { extractSkills } = require('../utils/skillsEngine.js')

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }
  try {
    const { text, file } = JSON.parse(event.body || '{}')
    let resumeText = text || ''
    if (file) {
      const { name, mimeType, base64 } = file || {}
      if (!base64) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'file.base64 is required' }) }
      const buffer = Buffer.from(base64, 'base64')
      const lowerName = String(name || '').toLowerCase()
      const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf')
      const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx')
      const isTxt = mimeType === 'text/plain' || lowerName.endsWith('.txt') || !mimeType

      if (isPdf) {
        const data = await pdfParse(buffer)
        resumeText = data.text
      } else if (isDocx) {
        const result = await mammoth.extractRawText({ buffer })
        resumeText = result.value
      } else if (isTxt) {
        resumeText = buffer.toString('utf-8')
      } else {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unsupported file type' }) }
      }
    }

    if (!resumeText || !String(resumeText).trim()) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Resume text is empty' }) }
    }
    // Parse to JSON
    const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line)
    const resumeJson = {
      name: lines[0] || '',
      experience: [],
      skills: [],
      education: [],
      certifications: []
    }
    let currentSection = ''
    lines.forEach(line => {
      if (/^experience/i.test(line)) currentSection = 'experience'
      else if (/^skills/i.test(line)) currentSection = 'skills'
      else if (/^education/i.test(line)) currentSection = 'education'
      else if (/^certifications/i.test(line)) currentSection = 'certifications'
      else if (currentSection && line) resumeJson[currentSection].push(line)
    })
    resumeJson.skills = extractSkills(resumeText)
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ text: resumeText, resumeJson })
    }
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }
}
