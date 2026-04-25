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

const MODEL_REQUEST_TOKEN_LIMIT = 8000
const REQUEST_SAFETY_GAP_TOKENS = 2000
const MAX_COMPLETION_TOKENS = 1200
const MAX_PROMPT_TOKENS = MODEL_REQUEST_TOKEN_LIMIT - REQUEST_SAFETY_GAP_TOKENS - MAX_COMPLETION_TOKENS

function estimateTokens(text) {
  const value = String(text || '')
  // Conservative heuristic: 1 token ~= 3.5 chars for typical English.
  return Math.ceil(value.length / 3.5)
}

function truncateToTokenBudget(text, budgetTokens) {
  if (budgetTokens <= 0) return ''
  const value = String(text || '')
  const approxMaxChars = Math.max(0, Math.floor(budgetTokens * 3.5))
  if (value.length <= approxMaxChars) return value
  const head = Math.floor(approxMaxChars * 0.65)
  const tail = approxMaxChars - head
  return value.slice(0, head) + '\n...\n' + value.slice(Math.max(0, value.length - tail))
}

function capList(items, maxItems) {
  const list = Array.isArray(items) ? items : []
  return list.slice(0, maxItems)
}

async function optimizeResume({ cvText, jdText, atsType, missingSkills = [], missingKeywords = [] }) {
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

  const safeMissingSkills = capList(missingSkills, 150)
  const safeMissingKeywords = capList(missingKeywords, 200)

  const basePrompt =
`You are an ATS resume optimizer.
Goal: rewrite the resume to better match the job description for the ${atsType} ATS.
Rules:
- Preserve truth. Do not invent employers, titles, dates, degrees, certifications, or projects.
- Keep a single-column, plain-text resume. No tables. No graphics.
- Ensure ALL provided missing skills/keywords appear verbatim somewhere in the resume text.
- If you cannot credibly place a skill/keyword inside Experience bullets, include it under Skills as "Familiar with: <term>".
- For Cornerstone: put skill terms inside Experience bullets where possible to help context-based matching.

Job Description:
{{JD_TEXT}}


Original Resume:
{{CV_TEXT}}

Missing skills to incorporate if possible:
{{MISSING_SKILLS}}

Missing keywords to include:
{{MISSING_KEYWORDS}}

Return ONLY the optimized resume in plain text.`

  const missingSkillsText = safeMissingSkills.join(', ')
  const missingKeywordsText = safeMissingKeywords.join(', ')

  const fixedPartsTokens = estimateTokens(
    basePrompt
      .replace('{{JD_TEXT}}', '')
      .replace('{{CV_TEXT}}', '')
      .replace('{{MISSING_SKILLS}}', missingSkillsText)
      .replace('{{MISSING_KEYWORDS}}', missingKeywordsText)
  )

  const remainingPromptTokens = Math.max(0, MAX_PROMPT_TOKENS - fixedPartsTokens)
  const cvBudget = Math.floor(remainingPromptTokens * 0.6)
  const jdBudget = remainingPromptTokens - cvBudget

  const cvSnippet = truncateToTokenBudget(cvText, cvBudget)
  const jdSnippet = truncateToTokenBudget(jdText, jdBudget)

  const prompt = basePrompt
    .replace('{{JD_TEXT}}', jdSnippet)
    .replace('{{CV_TEXT}}', cvSnippet)
    .replace('{{MISSING_SKILLS}}', missingSkillsText)
    .replace('{{MISSING_KEYWORDS}}', missingKeywordsText)

  const groq = await getGroqClient()
  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: MAX_COMPLETION_TOKENS,
    temperature: 0.2
  })

  const optimizedText = completion?.choices?.[0]?.message?.content || ''
  if (!optimizedText) throw new Error('Groq API returned empty response')

  return { optimizedText }
}

module.exports = { optimizeResume }
