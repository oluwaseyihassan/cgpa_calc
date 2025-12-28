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

  // Weights: Center pixel is 5 (strong), neighbors are -1.
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
  const weight = 1 // Divide result by this

  const side = Math.round(Math.sqrt(kernel.length))
  const halfSide = Math.floor(side / 2)
  const src = data
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
            r += src[srcOff] * wt
            g += src[srcOff + 1] * wt
            b += src[srcOff + 2] * wt
          }
        }
      }
      output[dstOff] = r / weight
      output[dstOff + 1] = g / weight
      output[dstOff + 2] = b / weight
      output[dstOff + 3] = 255 // Alpha
    }
  }

  // Write back to canvas
  const finalImageData = new ImageData(output, width, height)
  ctx.putImageData(finalImageData, 0, 0)
}

/**
 * Creates a cropped, upscaled, and filtered image strip.
 * Pipeline: 2x Upscale -> Contrast Boost -> Sharpening.
 * @param {HTMLImageElement} img - The source image
 * @param {Number} x - Start X (original scale)
 * @param {Number} width - Width of strip (original scale)
 * @returns {Promise<Blob>}
 */
const createStrip = (img, x, width) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // 1. 2x Upscaling (Preserve details)
    const scale = 2
    canvas.width = width * scale
    canvas.height = img.height * scale

    // 2. Contrast Boost (Before drawing)
    ctx.filter = 'contrast(2.0) grayscale(1)'
    // Draw slice
    ctx.drawImage(img, x, 0, width, img.height, 0, 0, canvas.width, canvas.height)

    // Reset filter so it doesn't affect future operations (though putImageData overwrites it anyway)
    ctx.filter = 'none'

    // 3. Sharpening Pass (Convolution)
    applySharpenFilter(ctx, canvas.width, canvas.height)

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
  const xCodeEnd = Math.floor(zones.codeEnd * w)
  const xUnitStart = Math.floor(zones.unitStart * w)
  const xUnitEnd = Math.floor(zones.unitEnd * w)
  const xGradeStart = Math.floor(zones.gradeStart * w)

  // define widths
  const wCode = xCodeEnd
  const wUnit = xUnitEnd - xUnitStart
  const wGrade = w - xGradeStart

  // Create Strips (Upscaled & Filtered)
  const codeStripBlob = await createStrip(img, 0, wCode)
  const unitStripBlob = await createStrip(img, xUnitStart, wUnit)
  const gradeStripBlob = await createStrip(img, xGradeStart, wGrade)

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
  // Grade: A-F + Numbers + T + . (for decimals like 77.5)
  const gradeWhitelist = 'ABCDEF0123456789T.'

  const [codeLines, unitLines, gradeLines] = await Promise.all([
    runJob(codeStripBlob, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ', progress1, 'code'),
    runJob(unitStripBlob, '0123456789', progress2, 'unit'),
    runJob(gradeStripBlob, gradeWhitelist, progress3, 'grade'),
  ])

  // 3. Stitch Results
  const courses = []
  const maxLines = Math.max(codeLines.length, unitLines.length, gradeLines.length)

  const getGradeFromScore = (score) => {
    if (score >= 70) return 'A'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C'
    if (score >= 45) return 'D'
    if (score >= 40) return 'E'
    return 'F'
  }

  for (let i = 0; i < maxLines; i++) {
    let c = (codeLines[i] || '').trim()
    let u = (unitLines[i] || '').trim()
    let g = (gradeLines[i] || '').trim()

    // Apply Leetspeak Fixes
    g = fixCommonErrors(g, 'grade')

    // Grade Parsing strategy:
    // 1. Look for explicit letter grade (A-F) at the end
    // 2. If not found, look for a numeric score and convert it
    let gradeChar = null

    const gradeMatch = g.match(/[A-F]$/) // Last letter
    if (gradeMatch) {
      gradeChar = gradeMatch[0]
    } else {
      // Fallback: Check if g is a number (Score only) e.g. "77.5"
      // Remove potential noise but keep digits and dots
      const scoreMatch = g.match(/(\d+(?:\.\d+)?)/)
      if (scoreMatch) {
        const score = parseFloat(scoreMatch[0])
        if (!isNaN(score)) {
          gradeChar = getGradeFromScore(score)
        }
      }

      // Secondary Fallback: Check if g is just a Grade letter (isolated)
      if (!gradeChar && /^[A-F]$/.test(g)) gradeChar = g
    }

    // Default to 'F' or skip? Current logic implies skipping if no data.
    // If we have a code and unit but no grade, maybe better to warn?
    // For now, let's assume if gradeChar is resolved, we use it.

    // Code Formatting: "CSC101" -> "CSC 101"
    if (c.length >= 6 && !c.includes(' ')) {
      c = c.replace(/(\d{3})$/, ' $1')
    }

    if (c || u || gradeChar) {
      courses.push({
        id: crypto.randomUUID(),
        code: c,
        unit: Number(u) || 0,
        grade: gradeChar || 'F', // Default to F if unrecognized but row exists
      })
    }
  }
  console.log(courses)
  return courses
}
