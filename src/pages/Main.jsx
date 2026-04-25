import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { supportedAts, atsProfiles } from '../config/atsProfiles.js'

function Main() {
  const [cvText, setCvText] = useState('')
  const [jdText, setJdText] = useState('')
  const [atsType, setAtsType] = useState(supportedAts[0])
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) {
      setFileName(f.name)
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        setFile({ name: f.name, mimeType: f.type, base64 })
      }
      reader.readAsDataURL(f)
    }
  }

  const handleSubmit = async () => {
    try {
      if (!file && !cvText.trim()) {
        alert('Please paste your resume text or upload a file.')
        return
      }
      if (!jdText.trim()) {
        alert('Please paste the job description.')
        return
      }

      setLoading(true)
      let resumeText, resumeJson
      if (file) {
        const res = await axios.post('/.netlify/functions/parseResume', { file })
        resumeText = res.data.text
        resumeJson = res.data.resumeJson
      } else {
        const res = await axios.post('/.netlify/functions/parseResume', { text: cvText })
        resumeText = res.data.text
        resumeJson = res.data.resumeJson
      }
      const jdRes = await axios.post('/.netlify/functions/extractJD', { jdText, atsType })
      const jdAnalysis = jdRes.data
      const scoreRes = await axios.post('/.netlify/functions/scoreATS', { resumeText, resumeJson, jdText, atsType })
      const scoreData = scoreRes.data
      navigate('/results', { state: { resumeText, resumeJson, jdText, jdAnalysis, atsType, scoreData } })
    } catch (error) {
      const message = error?.response?.data?.error || error.message
      alert('Error: ' + message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center mb-8">ATS Resume Optimizer</h1>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Resume</label>
          <textarea
            className="w-full p-2 border rounded"
            rows="10"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Paste your resume text or upload file"
          />
          <input
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFile}
            className="mt-2"
          />
          {fileName && <div className="text-sm text-gray-600 mt-1">Selected: {fileName}</div>}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Job Description</label>
          <textarea
            className="w-full p-2 border rounded"
            rows="10"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the job description"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">ATS Platform</label>
          <select
            className="w-full p-2 border rounded"
            value={atsType}
            onChange={(e) => setAtsType(e.target.value)}
          >
            {supportedAts.map(ats => <option key={ats} value={ats}>{atsProfiles[ats].displayName}</option>)}
          </select>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </div>
    </div>
  )
}

export default Main
