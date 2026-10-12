import { createWorker } from 'tesseract.js'

/**
 * Applies a convolution filter to sharpen the image.
 * Kernel: High contrast edge detection.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} width
 * @param {Number} height
 */
const applySharpenFilter = (ctx, width, height) => {
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
  const weight = 1

  const side = Math.round(Math.sqrt(kernel.length))
  const halfSide = Math.floor(side / 2)
  const sw = width
  const sh = height
  const output = new Uint8ClampedArray(data.length)

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const sy = y
      const sx = x
      const dstOff = (y * sw + x) * 4
      let r = 0,
        g = 0,
        b = 0

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = sy + cy - halfSide
          const scx = sx + cx - halfSide
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            const srcOff = (scy * sw + scx) * 4
            const wt = kernel[cy * side + cx]
            r += data[srcOff] * wt
            g += data[srcOff + 1] * wt
            b += data[srcOff + 2] * wt
          }
        }
      }
      output[dstOff] = r / weight
      output[dstOff + 1] = g / weight
      output[dstOff + 2] = b / weight
      output[dstOff + 3] = 255
    }
  }

  const finalImageData = new ImageData(output, width, height)
  ctx.putImageData(finalImageData, 0, 0)
}

/**
 * Creates a cropped, upscaled, and filtered image strip with white margins.
 * @param {HTMLImageElement} img - The source image
 * @param {Number} x - Start X (original scale)
 * @param {Number} width - Width of strip (original scale)
 * @param {Object} options - { scale, sharpen, padding }
 * @returns {Promise<Blob>}
 */
const createStrip = (img, x, width, options = {}) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const scale = options.scale ?? 2.5
    const padding = options.padding ?? 24
    const doSharpen = options.sharpen ?? false

    const innerW = Math.max(1, Math.round(width * scale))
    const innerH = Math.max(1, Math.round(img.height * scale))

    canvas.width = innerW + padding * 2
    canvas.height = innerH + padding * 2

    // Fill with clean white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Gentle contrast without pixel degradation
    ctx.filter = 'contrast(1.3) grayscale(1)'
    ctx.drawImage(
      img,
      Math.max(0, x),
      0,
      Math.max(1, width),
      img.height,
      padding,
      padding,
      innerW,
      innerH,
    )
    ctx.filter = 'none'

    if (doSharpen) {
      applySharpenFilter(ctx, canvas.width, canvas.height)
    }

    canvas.toBlob(resolve, 'image/png')
  })
}

/**
 * Converts a numeric score to a letter grade based on standard university grading scale.
 * @param {Number} score
 * @returns {String}
 */
export const getGradeFromScore = (score) => {
  if (score >= 70) return 'A'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  if (score >= 45) return 'D'
  if (score >= 40) return 'E'
  return 'F'
}

/**
 * Normalizes course codes into the standard format: e.g. "EEE 550", "TPD 502", "AEE 302"
 * Handles common OCR artifacts and prefix/suffix character confusions.
 * @param {String} text
 * @returns {String}
 */
export const normalizeCourseCode = (text) => {
  if (!text) return ''
  let clean = text.trim().replace(/[.,;:_|\-]+$/, '').trim()
  if (!clean) return ''

  // Common OCR substitutions at word start
  clean = clean.replace(/^Age/i, 'AEE')
  clean = clean.replace(/^[eE]{2,3}/i, (m) => 'EEE'.slice(0, m.length))
  clean = clean.replace(/^TPDS/i, 'TPD5')

  // Match 2-4 letters followed by 3-4 digits/substitutions (ignores trailing title noise like "ST", "TE")
  const match = clean.match(/([A-Za-z]{2,4})\s*([0-9SOIZBE]{3,4})/i)
  if (match) {
    let prefix = match[1].toUpperCase()
    let suffixRaw = match[2]

    // If prefix is 4 chars and 4th char is a digit confusion (e.g. EEES -> EEE 5...)
    if (prefix.length === 4 && /[SOIZB0-9]/i.test(prefix[3])) {
      suffixRaw = prefix[3] + suffixRaw
      prefix = prefix.slice(0, 3)
    }

    let suffix = suffixRaw
      .replace(/[Ss]/g, '5')
      .replace(/[Oo]/g, '0')
      .replace(/[Iil|]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Bb]/g, '8')
      .replace(/[Aa]/g, '4')

    if (suffix.length > 3) {
      suffix = suffix.slice(0, 3)
    }

    return `${prefix} ${suffix}`
  }

  // Fallback: If it's 6 or more characters and ends with 3-4 digits
  if (clean.length >= 6 && !clean.includes(' ')) {
    return clean.replace(/(\d{3,4})$/, ' $1').toUpperCase()
  }

  return clean.toUpperCase()
}

/**
 * Normalizes Credit Units into a clean integer.
 * @param {String} text
 * @returns {Number}
 */
export const normalizeUnit = (text) => {
  if (!text) return 0
  let clean = text.trim()
  clean = clean
    .replace(/[lI|!]/g, '1')
    .replace(/[O]/gi, '0')
    .replace(/[S]/gi, '5')
  const num = parseInt(clean, 10)
  return isNaN(num) ? 0 : num
}

/**
 * Normalizes Grade letter.
 * Supports Grade characters (A, B, C, D, E, F) and score fallbacks.
 * In bold sans-serif portal fonts, '8' frequently recognizes as 'B'.
 * @param {String} text
 * @returns {String}
 */
export const normalizeGrade = (text) => {
  if (!text) return 'F'
  let clean = text.trim().toUpperCase()

  // In a Grade column, an '8' is virtually always a 'B'
  if (clean === '8' || clean === 'B') return 'B'

  // Look for direct letter grade A-F
  const gradeMatch = clean.match(/[A-F]/)
  if (gradeMatch) {
    return gradeMatch[0]
  }

  // If OCR gave a score number (e.g. Total score)
  const num = parseInt(clean, 10)
  if (!isNaN(num) && num > 0) {
    return getGradeFromScore(num)
  }

  return 'F'
}

/**
 * Parses raw table text line-by-line into structured course objects.
 * Accurately extracts Course Code, Credit Unit, and Grade row by row.
 * @param {String} text
 * @returns {Array<{ id: string, code: string, unit: number, grade: string }>}
 */
export const parseSlipText = (text) => {
  if (!text) return []
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const results = []

  for (const line of lines) {
    const upper = line.toUpperCase()
    if (
      upper.includes('COURSE CODE') ||
      upper.includes('CREDIT UNIT') ||
      upper.includes('TOTAL GRADE') ||
      (upper.includes('STATUS') && upper.includes('EXAM'))
    ) {
      continue
    }

    // 1. Extract Course Code
    const codeMatch = line.match(/^([A-Za-z]{2,4})\s*([0-9SOIZBE]{3,4})/i)
    if (!codeMatch) continue

    let prefix = codeMatch[1].toUpperCase()
    let suffixRaw = codeMatch[2]

    if (prefix.length === 4 && /[SOIZB0-9]/i.test(prefix[3])) {
      suffixRaw = prefix[3] + suffixRaw
      prefix = prefix.slice(0, 3)
    }

    let suffix = suffixRaw
      .replace(/[Ss]/g, '5')
      .replace(/[Oo]/g, '0')
      .replace(/[Iil|]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Bb]/g, '8')
      .replace(/[Aa]/g, '4')

    if (suffix.length > 3) {
      suffix = suffix.slice(0, 3)
    }

    const code = `${prefix} ${suffix}`

    // 2. Extract Grade:
    // Look for Grade before "Passed"/"Failed" or near end of line
    let grade = 'F'
    const statusMatch = line.match(/([A-Fa-f8])\s+(?:Passed|Failed)/i)
    if (statusMatch) {
      grade = statusMatch[1].toUpperCase()
      if (grade === '8') grade = 'B'
    } else {
      const gradeEndMatch = line.match(/\b([A-Fa-f8])\b(?:\s+\w+)?$/)
      if (gradeEndMatch) {
        grade = gradeEndMatch[1].toUpperCase()
        if (grade === '8') grade = 'B'
      }
    }

    // 3. Extract Credit Unit:
    let unit = 0
    const rest = line.slice(codeMatch[0].length).trim()
    const unitMatch = rest.match(/[a-zA-Z]\s+([1-6])\b/)
    if (unitMatch) {
      unit = parseInt(unitMatch[1], 10)
    }

    results.push({
      id: crypto.randomUUID(),
      code,
      unit,
      grade,
    })
  }

  return results
}

/**
 * High-speed full-table scan.
 * @param {File|Blob} fileOrBlob
 * @param {Function} onProgress
 * @returns {Promise<Array<{ id: string, code: string, unit: number, grade: string }>>}
 */
export const parseResultSlip = async (fileOrBlob, onProgress = null) => {
  const workerOptions = {
    logger: () => {},
  }
  if (typeof window !== 'undefined' && window.location) {
    workerOptions.langPath = window.location.origin
    workerOptions.gzip = false
  }

  const worker = await createWorker('eng', 1, workerOptions)

  try {
    if (typeof onProgress === 'function') onProgress(30)
    const {
      data: { text },
    } = await worker.recognize(fileOrBlob)
    if (typeof onProgress === 'function') onProgress(90)
    const courses = parseSlipText(text)
    if (typeof onProgress === 'function') onProgress(100)
    return courses
  } finally {
    await worker.terminate()
  }
}

/**
 * Multi-Zone column parser for result slips.
 * Isolates and processes the Course Code, Credit Unit, and Grade columns.
 * @param {File|Blob} fileOrBlob - Image file or blob of the result slip
 * @param {Object} zones - Boundary percentages: { codeStart, codeEnd, unitStart, unitEnd, gradeStart, gradeEnd }
 * @param {Function} onProgress - Progress callback (0 - 100)
 * @returns {Promise<Array<{ id: string, code: string, unit: number, grade: string }>>}
 */
export const parseZones = async (fileOrBlob, zones, onProgress = null) => {
  // If no zones or fallback, try full slip parse
  const img = await new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.src = URL.createObjectURL(fileOrBlob)
  })

  const w = img.width

  // Boundaries (Percentages converted to pixel coordinates)
  const xCodeStart = Math.floor((zones.codeStart ?? 0) * w)
  const xCodeEnd = Math.floor(zones.codeEnd * w)
  const xUnitStart = Math.floor(zones.unitStart * w)
  const xUnitEnd = Math.floor(zones.unitEnd * w)
  const xGradeStart = Math.floor(zones.gradeStart * w)
  const xGradeEnd = Math.floor((zones.gradeEnd ?? 1.0) * w)

  const wCode = Math.max(1, xCodeEnd - xCodeStart)
  const wUnit = Math.max(1, xUnitEnd - xUnitStart)
  const wGrade = Math.max(1, xGradeEnd - xGradeStart)

  const codeStripBlob = await createStrip(img, xCodeStart, wCode, {
    scale: 2.5,
    sharpen: false,
    padding: 24,
  })
  const unitStripBlob = await createStrip(img, xUnitStart, wUnit, {
    scale: 2.5,
    sharpen: false,
    padding: 24,
  })
  const gradeStripBlob = await createStrip(img, xGradeStart, wGrade, {
    scale: 2.5,
    sharpen: false,
    padding: 24,
  })

  const codeWhitelist =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
  const unitWhitelist = '0123456789'
  const gradeWhitelist = 'ABCDEFabcdef0123456789T.'

  const workerOptions = {
    logger: () => {},
  }
  if (typeof window !== 'undefined' && window.location) {
    workerOptions.langPath = window.location.origin
    workerOptions.gzip = false
  }

  const worker = await createWorker('eng', 1, workerOptions)

  const recognizeStrip = async (blob, whitelist, progressOffset, progressWeight, label) => {
    await worker.setParameters({
      tessedit_char_whitelist: whitelist,
      tessedit_pageseg_mode: '6',
    })

    if (typeof onProgress === 'function') {
      onProgress(progressOffset + progressWeight * 0.2)
    }

    const {
      data: { text },
    } = await worker.recognize(blob)

    if (typeof onProgress === 'function') {
      onProgress(progressOffset + progressWeight)
    }

    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  }

  let codeLines = []
  let unitLines = []
  let gradeLines = []

  try {
    codeLines = await recognizeStrip(codeStripBlob, codeWhitelist, 0, 33, 'code')
    unitLines = await recognizeStrip(unitStripBlob, unitWhitelist, 33, 33, 'unit')
    gradeLines = await recognizeStrip(gradeStripBlob, gradeWhitelist, 66, 34, 'grade')
  } finally {
    await worker.terminate()
  }

  // Header Filtering
  const isHeaderCode = (text) => {
    const u = text.toUpperCase().replace(/\s+/g, '')
    return u.includes('COURSE') || u.includes('CODE') || u.includes('TITLE') || u.includes('SN')
  }
  const isHeaderUnit = (text) => {
    const u = text.toUpperCase()
    return u.includes('CREDIT') || u.includes('UNIT') || u.includes('CU')
  }
  const isHeaderGrade = (text) => {
    const u = text.toUpperCase()
    return u.includes('GRADE') || u.includes('GRD') || u.includes('STATUS') || u.includes('REMARK')
  }

  if (codeLines.length > 0 && isHeaderCode(codeLines[0])) codeLines.shift()
  if (unitLines.length > 0 && isHeaderUnit(unitLines[0])) unitLines.shift()
  if (gradeLines.length > 0 && isHeaderGrade(gradeLines[0])) gradeLines.shift()

  const courses = []
  const maxLines = Math.max(codeLines.length, unitLines.length, gradeLines.length)

  for (let i = 0; i < maxLines; i++) {
    const rawC = codeLines[i] || ''
    const rawU = unitLines[i] || ''
    const rawG = gradeLines[i] || ''

    const c = normalizeCourseCode(rawC)
    const u = normalizeUnit(rawU)
    const g = normalizeGrade(rawG)

    if (c || u > 0 || rawG) {
      courses.push({
        id: crypto.randomUUID(),
        code: c || 'COURSE',
        unit: u,
        grade: g || 'F',
      })
    }
  }

  return courses
}
