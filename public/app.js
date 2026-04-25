const els = {
  atsType: document.getElementById('atsType'),
  resumeText: document.getElementById('resumeText'),
  resumeFile: document.getElementById('resumeFile'),
  fileHint: document.getElementById('fileHint'),
  jdText: document.getElementById('jdText'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  resetBtn: document.getElementById('resetBtn'),
  status: document.getElementById('status'),
  groqBanner: document.getElementById('groqBanner'),
  totalScore: document.getElementById('totalScore'),
  scoreBar: document.getElementById('scoreBar'),
  breakdown: document.getElementById('breakdown'),
  missingSkills: document.getElementById('missingSkills'),
  missingKeywords: document.getElementById('missingKeywords'),
  optimizeBtn: document.getElementById('optimizeBtn'),
  downloadTxtBtn: document.getElementById('downloadTxtBtn'),
  downloadDocxBtn: document.getElementById('downloadDocxBtn'),
  downloadPdfBtn: document.getElementById('downloadPdfBtn'),
  beforeText: document.getElementById('beforeText'),
  afterText: document.getElementById('afterText'),
  optimizedScoreWrap: document.getElementById('optimizedScoreWrap'),
  optimizedTotalScore: document.getElementById('optimizedTotalScore'),
  optimizedScoreBar: document.getElementById('optimizedScoreBar'),
  targetScoreNote: document.getElementById('targetScoreNote')
}

let groqConfigured = false
let state = {
  resumeText: '',
  resumeJson: null,
  originalPdfBase64: '',
  jdText: '',
  atsType: '',
  scoreData: null,
  optimizedText: '',
  addressedSkills: [],
  addressedKeywords: [],
  optimizedScore: null
}

function setStatus(msg) {
  els.status.textContent = msg || ''
}

function setButtonsEnabled(enabled) {
  els.downloadTxtBtn.disabled = !enabled
  els.downloadDocxBtn.disabled = !enabled
  els.downloadPdfBtn.disabled = !enabled
}

function renderScore(scoreData) {
  if (!scoreData) return
  const total = Number(scoreData.totalScore || 0)
  els.totalScore.textContent = total.toFixed(1) + '%'
  els.scoreBar.style.width = Math.max(0, Math.min(100, total)) + '%'

  els.breakdown.innerHTML = ''
  for (const [k, v] of Object.entries(scoreData.breakdown || {})) {
    const row = document.createElement('div')
    row.className = 'kvRow'
    row.innerHTML = `<div class="kvKey">${k}</div><div class="kvVal">${Number(v).toFixed(1)}%</div>`
    els.breakdown.appendChild(row)
  }
}

function renderMissing(listEl, items, addressed) {
  listEl.innerHTML = ''
  for (const item of items || []) {
    const li = document.createElement('li')
    const isAddressed = (addressed || []).includes(item)
    li.className = isAddressed ? 'ok' : 'bad'
    li.textContent = isAddressed ? `${item} (addressed)` : item
    listEl.appendChild(li)
  }
}

function renderOptimizedScore(scoreData) {
  if (!scoreData) return
  const total = Number(scoreData.totalScore || 0)
  els.optimizedTotalScore.textContent = total.toFixed(1) + '%'
  els.optimizedScoreBar.style.width = Math.max(0, Math.min(100, total)) + '%'
  els.optimizedScoreWrap.classList.remove('hidden')
}

async function loadProfiles() {
  const res = await fetch('/.netlify/functions/atsProfiles')
  if (!res.ok) throw new Error('Failed to load ATS profiles')
  const data = await res.json()
  const list = data.supportedAts || []
  els.atsType.innerHTML = ''
  for (const item of list) {
    const opt = document.createElement('option')
    opt.value = item.key
    opt.textContent = item.displayName
    els.atsType.appendChild(opt)
  }
  state.atsType = els.atsType.value
}

async function loadConfig() {
  const res = await fetch('/.netlify/functions/config')
  if (!res.ok) return
  const data = await res.json()
  groqConfigured = Boolean(data.groqConfigured)
  if (!groqConfigured) els.groqBanner.classList.remove('hidden')
  els.optimizeBtn.disabled = !groqConfigured
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function analyze() {
  const atsType = els.atsType.value
  const jdText = els.jdText.value.trim()
  const resumePaste = els.resumeText.value.trim()
  const file = els.resumeFile.files && els.resumeFile.files[0]

  if (!jdText) throw new Error('Please paste the job description.')
  if (!file && !resumePaste) throw new Error('Please paste your resume text or upload a file.')

  setStatus('Parsing resume...')
  els.analyzeBtn.disabled = true
  els.optimizeBtn.disabled = true

  let parsePayload
  if (file) {
    const base64 = await readFileAsBase64(file)
    parsePayload = { file: { name: file.name, mimeType: file.type, base64 } }
    state.originalPdfBase64 = (String(file.type || '').includes('pdf') || String(file.name || '').toLowerCase().endsWith('.pdf')) ? base64 : ''
  } else {
    parsePayload = { text: resumePaste }
    state.originalPdfBase64 = ''
  }

  const parseRes = await fetch('/.netlify/functions/parseResume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsePayload)
  })
  const parseData = await parseRes.json()
  if (!parseRes.ok) throw new Error(parseData.error || 'Failed to parse resume')

  setStatus('Extracting job description...')
  const jdRes = await fetch('/.netlify/functions/extractJD', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jdText, atsType })
  })
  const jdData = await jdRes.json()
  if (!jdRes.ok) throw new Error(jdData.error || 'Failed to extract JD')

  setStatus('Scoring...')
  const scoreRes = await fetch('/.netlify/functions/scoreATS', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText: parseData.text, resumeJson: parseData.resumeJson, jdText, atsType })
  })
  const scoreData = await scoreRes.json()
  if (!scoreRes.ok) throw new Error(scoreData.error || 'Failed to score')

  state = {
    ...state,
    resumeText: parseData.text,
    resumeJson: parseData.resumeJson,
    jdText,
    atsType,
    scoreData,
    optimizedText: '',
    addressedSkills: [],
    addressedKeywords: [],
    optimizedScore: null
  }

  els.beforeText.textContent = state.resumeText || ''
  els.afterText.textContent = ''
  renderScore(state.scoreData)
  renderMissing(els.missingSkills, state.scoreData.missingSkills, [])
  renderMissing(els.missingKeywords, state.scoreData.missingKeywords, [])
  els.optimizedScoreWrap.classList.add('hidden')
  els.targetScoreNote.textContent = ''

  setButtonsEnabled(true)
  els.optimizeBtn.disabled = !groqConfigured
  setStatus('Done.')
}

async function optimize() {
  if (!groqConfigured) return
  setStatus('Optimizing with Groq...')
  els.optimizeBtn.disabled = true

  const res = await fetch('/.netlify/functions/optimizeResume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cvText: state.resumeText,
      jdText: state.jdText,
      atsType: state.atsType,
      missingSkills: state.scoreData.missingSkills,
      missingKeywords: state.scoreData.missingKeywords
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to optimize')

  state.optimizedText = data.optimizedText
  state.addressedSkills = data.addressedSkills || []
  state.addressedKeywords = data.addressedKeywords || []
  if (data.targetedScore && typeof data.targetedScore.totalScore === 'number') {
    const s = data.targetedScore.totalScore
    els.targetScoreNote.textContent = `Optimizer target score (internal rubric): ${s.toFixed(1)}%`
  } else {
    els.targetScoreNote.textContent = ''
  }

  els.afterText.textContent = state.optimizedText
  renderMissing(els.missingSkills, state.scoreData.missingSkills, state.addressedSkills)
  renderMissing(els.missingKeywords, state.scoreData.missingKeywords, state.addressedKeywords)

  setStatus('Re-scoring optimized resume...')
  const scoreRes = await fetch('/.netlify/functions/scoreATS', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText: state.optimizedText, resumeJson: state.resumeJson, jdText: state.jdText, atsType: state.atsType })
  })
  const scoreData = await scoreRes.json()
  if (!scoreRes.ok) throw new Error(scoreData.error || 'Failed to score optimized resume')
  state.optimizedScore = scoreData
  renderOptimizedScore(state.optimizedScore)

  setStatus('Optimized.')
  els.optimizeBtn.disabled = !groqConfigured
}

function downloadTxt() {
  const text = state.optimizedText || state.resumeText || ''
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = state.optimizedText ? 'optimized_resume.txt' : 'resume.txt'
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadDocx() {
  const text = state.optimizedText || state.resumeText || ''
  const res = await fetch('/.netlify/functions/exportDocx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename: state.optimizedText ? 'optimized_resume' : 'resume' })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to export DOCX')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = state.optimizedText ? 'optimized_resume.docx' : 'resume.docx'
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPdf() {
  const text = state.optimizedText || state.resumeText || ''
  const name = state.optimizedText ? 'optimized_resume' : 'resume'
  // If user uploaded a PDF, produce an "edited" PDF by appending optimized text to the original PDF server-side.
  if (state.originalPdfBase64) {
    fetch('/.netlify/functions/exportPdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalPdfBase64: state.originalPdfBase64, text, filename: name })
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to export edited PDF')
        }
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((e) => alert(e.message || String(e)))
    return
  }

  // Otherwise, fall back to client-side PDF generation.
  const { jsPDF } = window.jspdf
  const pdf = new jsPDF()
  const marginX = 12
  const marginY = 14
  const pageHeight = pdf.internal.pageSize.getHeight()
  const maxWidth = pdf.internal.pageSize.getWidth() - marginX * 2
  const lines = pdf.splitTextToSize(text, maxWidth)
  let y = marginY
  for (const line of lines) {
    if (y > pageHeight - marginY) {
      pdf.addPage()
      y = marginY
    }
    pdf.text(line, marginX, y)
    y += 6
  }
  pdf.save(`${name}.pdf`)
}

function reset() {
  els.resumeText.value = ''
  els.jdText.value = ''
  els.resumeFile.value = ''
  els.fileHint.textContent = ''
  els.totalScore.textContent = '—'
  els.scoreBar.style.width = '0%'
  els.breakdown.innerHTML = ''
  els.missingSkills.innerHTML = ''
  els.missingKeywords.innerHTML = ''
  els.beforeText.textContent = ''
  els.afterText.textContent = ''
  els.optimizedScoreWrap.classList.add('hidden')
  els.targetScoreNote.textContent = ''
  setButtonsEnabled(false)
  els.optimizeBtn.disabled = !groqConfigured
  setStatus('')
}

els.resumeFile.addEventListener('change', () => {
  const f = els.resumeFile.files && els.resumeFile.files[0]
  els.fileHint.textContent = f ? `Selected: ${f.name}` : ''
})

els.analyzeBtn.addEventListener('click', async () => {
  try {
    await analyze()
  } catch (e) {
    alert(e.message || String(e))
    setStatus('')
  } finally {
    els.analyzeBtn.disabled = false
  }
})

els.optimizeBtn.addEventListener('click', async () => {
  try {
    await optimize()
  } catch (e) {
    alert(e.message || String(e))
    setStatus('')
  }
})

els.downloadTxtBtn.addEventListener('click', () => downloadTxt())
els.downloadDocxBtn.addEventListener('click', () => downloadDocx().catch((e) => alert(e.message || String(e))))
els.downloadPdfBtn.addEventListener('click', () => downloadPdf())
els.resetBtn.addEventListener('click', () => reset())

Promise.allSettled([loadProfiles(), loadConfig()]).catch(() => {})
reset()
