const { normalizeText, tokenize } = require('./textUtils.js')

async function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    const error = new Error('Missing GROQ_API_KEY. Set it in Netlify Site settings -> Environment variables.')
    error.statusCode = 400
    throw error
  }

  const mod = await import('groq-sdk')
  const Groq = mod.default || mod.Groq || mod
  return new Groq({ apiKey })
}

async function optimizeResume(cvText, jdText, atsType, missingSkills = [], missingKeywords = []) {
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

  const prompt =
`You are an ATS resume optimizer.
Goal: rewrite the resume to better match the job description for the ${atsType} ATS.
Rules:
- Preserve truth. Do not invent employers, titles, dates, degrees, certifications, or projects.
- Keep a single-column, plain-text resume. No tables. No graphics.
- Incorporate missing skills/keywords only if credible; if not, add them in a Skills section as "Familiar with".

Job Description:
${jdText}

Original Resume:
${cvText}

Missing skills to incorporate if possible:
${(missingSkills || []).join(', ')}

Missing keywords to include:
${(missingKeywords || []).join(', ')}

Return ONLY the optimized resume in plain text.`

  const groq = await getGroqClient()
  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.2
  })

  const optimizedText = completion?.choices?.[0]?.message?.content || ''
  if (!optimizedText) throw new Error('Groq API returned empty response')

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

  return { optimizedText, addressedSkills, addressedKeywords }
}

module.exports = { optimizeResume }
