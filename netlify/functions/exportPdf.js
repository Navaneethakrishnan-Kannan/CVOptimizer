function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (next.length > maxChars) {
      if (line) lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' }

  try {
    const { PDFDocument, StandardFonts } = require('pdf-lib')
    const { originalPdfBase64, text, filename } = JSON.parse(event.body || '{}')
    const content = String(text || '')
    if (!content.trim()) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'text is required' }) }

    let pdfDoc
    if (originalPdfBase64) {
      const bytes = Buffer.from(String(originalPdfBase64), 'base64')
      pdfDoc = await PDFDocument.load(bytes)
    } else {
      pdfDoc = await PDFDocument.create()
    }

    // Append a new page with optimized text (keeps the original PDF intact).
    const page = pdfDoc.addPage()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontSize = 11
    const { width, height } = page.getSize()
    const marginX = 48
    const marginY = 48
    const lineHeight = 14

    const maxChars = 95
    const lines = wrapText(content, maxChars)
    let y = height - marginY

    for (const line of lines) {
      if (y < marginY) {
        y = height - marginY
        const nextPage = pdfDoc.addPage()
        nextPage.drawText(line, { x: marginX, y, size: fontSize, font })
        y -= lineHeight
        continue
      }
      page.drawText(line, { x: marginX, y, size: fontSize, font })
      y -= lineHeight
    }

    const pdfBytes = await pdfDoc.save()
    const safeName = String(filename || 'optimized_resume').replace(/[^\w\-]+/g, '_')
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`
      },
      isBase64Encoded: true,
      body: Buffer.from(pdfBytes).toString('base64')
    }
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) }
  }
}
