import { createWorker } from 'tesseract.js'

/**
 * Creates a cropped, upscaled, and preprocessed image strip.
 * Implements "Super-Resolution" by scaling 3x.
 * @param {HTMLImageElement} img - The source image
 * @param {Number} x - Start X (original scale)
 * @param {Number} width - Width of strip (original scale)
 * @returns {Promise<Blob>}
 */
const createStrip = (img, x, width) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // 1. Super-Resolution: 300% Scaling
    // We scale the dimensions by 3 to separate pixelated text
    const scale = 3
    canvas.width = width * scale
    canvas.height = img.height * scale

    // Draw slice at 3x scale
    ctx.drawImage(img, x, 0, width, img.height, 0, 0, canvas.width, canvas.height)

    // 2. Aggressive Binarization
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    // Hard threshold > 120 (User specified) to remove grey rows
    const threshold = 120

    for (let i = 0; i < data.length; i += 4) {
      // Simple Average Grayscale
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      // Binarize
      const val = avg > threshold ? 255 : 0

      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
      // Alpha remains unchanged
    }

    ctx.putImageData(imageData, 0, 0)
    canvas.toBlob(resolve, 'image/png')
  })
}

/**
 * Fixes specific OCR artifacts found in user data.
 * "Leetspeak" Post-Processor.
 * @param {String} text
 * @param {String} type - 'code', 'unit', 'grade'
 */
const fixCommonErrors = (text, type) => {
  if (!text) return ''
  let fixed = text.trim()

  if (type === 'grade') {
    // Fix Score/Grade specific artifacts
    // e.g. "TE" -> "76", "E" -> "6" (if looking for score), "A" -> "4" (in score context)
    // Since we whitelist A-F coverage for Grades, we might miss numbers if we don't whitelist them.
    // Assuming we scan for Grade AND Score to support fixes.
    fixed = fixed
      .replace(/TE/g, '76')
      .replace(/\bE\b/g, '6') // Isolated E is likely 6
      .replace(/T/g, '7')
      // A -> 4 is dangerous for Grade "A", only do it if it looks like a number pattern?
      // For safe side, let's stick to the prompt's explicit replacements
      .replace(/A(?=\d)/g, '4') // A followed by digit
      .replace(/(?<=\d)A/g, '4') // Digit followed by A (but A could be grade)
    // Let's rely on strict parsing later
  }

  if (type === 'unit') {
    // Fix I/l -> 1 is handled by whitelist, but just in case
    fixed = fixed.replace(/[lI|]/g, '1').replace(/[O]/g, '0')
  }

  return fixed
}

/**
 * Parses zones from the image.
 * Matches rows by index.
 * @param {File} file - Original image file
 * @param {Object} zones - { lineA, lineB, lineC } (Percentages 0-1)
 * @param {Function} onProgress
 */
export const parseZones = async (file, zones, onProgress) => {
  // 1. Load Image
  const img = await new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.src = URL.createObjectURL(file)
  })

  const w = img.width
  const xA = Math.floor(zones.lineA * w)
  const xB = Math.floor(zones.lineB * w)
  const xC = Math.floor(zones.lineC * w)

  // define widths
  const wCode = xA
  const wUnit = xC - xB
  const wGrade = w - xC

  // Create Strips (Upscaled 3x)
  const codeStripBlob = await createStrip(img, 0, wCode)
  const unitStripBlob = await createStrip(img, xB, wUnit)
  const gradeStripBlob = await createStrip(img, xC, wGrade)

  // 2. Run Tesseract Jobs
  const progress1 = { val: 0 }
  const progress2 = { val: 0 }
  const progress3 = { val: 0 }

  const updateProgress = () => {
    const total = (progress1.val + progress2.val + progress3.val) / 3
    onProgress(total)
  }

  const runJob = async (blob, whitelist, pObj, type) => {
    // PSM 6: Assume a single uniform block of text.
    // PSM 10 (Single Char) is bad for a vertical strip of multiple rows.
    // We use PSM 6 but rely on the whitelist.
    const worker = await createWorker(['eng'], 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          pObj.val = m.progress * 100
          updateProgress()
        }
      },
    })

    await worker.setParameters({
      tessedit_char_whitelist: whitelist,
      tessedit_pageseg_mode: '6',
    })

    const {
      data: { text },
    } = await worker.recognize(blob)
    await worker.terminate()

    // Split and clean
    console.log(`Job [${type}] Raw:`, text)
    return text.split('\n')
  }

  // Define Whitelists
  // Unit: Numbers only
  // Grade: A-F + Numbers (to support Score "67B" or "76" fixes) + T (to allow capturing "TE" artifact to fix)
  const gradeWhitelist = 'ABCDEF0123456789T'

  const [codeLines, unitLines, gradeLines] = await Promise.all([
    runJob(codeStripBlob, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ', progress1, 'code'),
    runJob(unitStripBlob, '0123456789', progress2, 'unit'),
    runJob(gradeStripBlob, gradeWhitelist, progress3, 'grade'),
  ])

  // 3. Stitch Results
  const courses = []
  const maxLines = Math.max(codeLines.length, unitLines.length, gradeLines.length)

  // Alignment heuristic: Tesseract skips empty lines often.
  // We assume the rows align roughly. If huge mismatch, user verifies.

  for (let i = 0; i < maxLines; i++) {
    let c = (codeLines[i] || '').trim()
    let u = (unitLines[i] || '').trim()
    let g = (gradeLines[i] || '').trim()

    // Apply Leetspeak Fixes
    g = fixCommonErrors(g, 'grade')

    // Grade Parsing: extract 'A-F' from potentially '76B'
    // If we have numbers, we might optionally want to keep them, but app mostly needs Grade letter.
    let gradeChar = 'A'
    const gradeMatch = g.match(/[A-F]$/) // Last letter
    if (gradeMatch) {
      gradeChar = gradeMatch[0]
    } else {
      // Fallback: Check if g is just a Grade letter
      if (/^[A-F]$/.test(g)) gradeChar = g
    }

    // Code Formatting: "CSC101" -> "CSC 101"
    if (c.length >= 6 && !c.includes(' ')) {
      c = c.replace(/(\d{3})$/, ' $1')
    }

    if (c || u || g) {
      courses.push({
        id: crypto.randomUUID(),
        code: c,
        unit: Number(u) || 0,
        grade: gradeChar,
      })
    }
  }

  return courses
}
