import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import jsPDF from 'jspdf'

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state
  if (!state) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
          <h1 className="text-2xl font-bold mb-2">No results to display</h1>
          <p className="text-gray-700 mb-4">Please analyze a resume first.</p>
          <button onClick={() => navigate('/')} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Go to main page
          </button>
        </div>
      </div>
    )
  }

  const { resumeText, resumeJson, jdText, atsType, scoreData } = state
  const [optimizedText, setOptimizedText] = useState('')
  const [addressedSkills, setAddressedSkills] = useState([])
  const [addressedKeywords, setAddressedKeywords] = useState([])
  const [optimizedScore, setOptimizedScore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [groqConfigured, setGroqConfigured] = useState(true)

  useEffect(() => {
    let cancelled = false
    axios.get('/.netlify/functions/config')
      .then((res) => {
        if (!cancelled) setGroqConfigured(Boolean(res.data?.groqConfigured))
      })
      .catch(() => {
        if (!cancelled) setGroqConfigured(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleOptimize = async () => {
    try {
      setLoading(true)
      const res = await axios.post('/.netlify/functions/optimizeResume', {
        cvText: resumeText,
        jdText,
        atsType,
        missingSkills: scoreData.missingSkills,
        missingKeywords: scoreData.missingKeywords
      })
      setOptimizedText(res.data.optimizedText)
      setAddressedSkills(res.data.addressedSkills)
      setAddressedKeywords(res.data.addressedKeywords)
      // Re-score
      const scoreRes = await axios.post('/.netlify/functions/scoreATS', {
        resumeText: res.data.optimizedText,
        resumeJson, // assume same
        jdText,
        atsType
      })
      setOptimizedScore(scoreRes.data)
    } catch (error) {
      const message = error?.response?.data?.error || error.message
      alert('Error: ' + message)
    } finally {
      setLoading(false)
    }
  }

  const downloadTxt = () => {
    const blob = new Blob([optimizedText || resumeText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'optimized_resume.txt'
    a.click()
  }

  const downloadDocx = () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: (optimizedText || resumeText).split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
      }]
    })
    Packer.toBlob(doc).then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'optimized_resume.docx'
      a.click()
    })
  }

  const downloadPdf = () => {
    const pdf = new jsPDF()
    const marginX = 12
    const marginY = 14
    const pageHeight = pdf.internal.pageSize.getHeight()
    const maxWidth = pdf.internal.pageSize.getWidth() - marginX * 2
    const lines = pdf.splitTextToSize((optimizedText || resumeText) || '', maxWidth)
    let y = marginY
    for (const line of lines) {
      if (y > pageHeight - marginY) {
        pdf.addPage()
        y = marginY
      }
      pdf.text(line, marginX, y)
      y += 6
    }
    pdf.save('optimized_resume.pdf')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Analysis Results</h1>
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
        {!groqConfigured && (
          <div className="mb-4 p-3 rounded border border-amber-300 bg-amber-50 text-amber-900">
            Groq is not configured. Add <code>GROQ_API_KEY</code> in Netlify environment variables to enable optimization.
          </div>
        )}
        <div className="mb-4">
          <h2 className="text-xl font-semibold">ATS Score: {scoreData.totalScore.toFixed(1)}%</h2>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${scoreData.totalScore}%` }}></div>
          </div>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Breakdown</h3>
          {Object.entries(scoreData.breakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}</span>
              <span>{value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Missing Skills</h3>
          <ul className="list-disc pl-5">
            {scoreData.missingSkills.map(skill => (
              <li key={skill} className={addressedSkills.includes(skill) ? 'text-green-600' : 'text-red-600'}>
                {skill} {addressedSkills.includes(skill) ? '(addressed)' : ''}
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Missing Keywords</h3>
          <ul className="list-disc pl-5">
            {scoreData.missingKeywords.map(kw => (
              <li key={kw} className={addressedKeywords.includes(kw) ? 'text-green-600' : 'text-red-600'}>
                {kw} {addressedKeywords.includes(kw) ? '(addressed)' : ''}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={handleOptimize}
          disabled={loading || !groqConfigured}
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600 mb-4 disabled:opacity-50"
        >
          {loading ? 'Optimizing...' : 'Optimize with Groq'}
        </button>
        {optimizedText && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Optimized Resume</h3>
            <pre className="bg-gray-100 p-4 rounded">{optimizedText}</pre>
            {optimizedScore && (
              <div>
                <h4>Optimized Score: {optimizedScore.totalScore.toFixed(1)}%</h4>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="bg-green-500 h-4 rounded-full" style={{ width: `${optimizedScore.totalScore}%` }}></div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={downloadTxt} className="bg-blue-500 text-white p-2 rounded">Download TXT</button>
              <button onClick={downloadDocx} className="bg-blue-500 text-white p-2 rounded">Download DOCX</button>
              <button onClick={downloadPdf} className="bg-blue-500 text-white p-2 rounded">Download PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Results

