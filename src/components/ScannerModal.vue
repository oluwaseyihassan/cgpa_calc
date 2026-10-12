<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  X,
  Upload,
  Camera,
  Loader2,
  Trash2,
  AlertCircle,
  Plus,
  MoveHorizontal,
  RotateCcw,
  Sparkles,
} from 'lucide-vue-next'
import { parseZones, parseResultSlip } from '@/services/ocr'

const props = defineProps({
  isOpen: Boolean,
})

const emit = defineEmits(['close', 'add-courses'])

// States: 'upload' | 'crop' | 'zones' | 'processing' | 'review'
const step = ref('upload')
const progress = ref(0)
const statusText = ref('Initializing...')
const scannedCourses = ref([])
const error = ref(null)

// File & Preview State
const fileInput = ref(null)
const originalFile = ref(null)
const originalPreviewUrl = ref(null)
const activeFile = ref(null)
const activePreviewUrl = ref(null)

// Current Preset: 'new-portal' | 'classic'
const currentPreset = ref('new-portal')

// Zone Editor State - Positions as percentages (0 to 1)
// Defaults calibrated for university portal tables:
// [Course Code ~0-12%] [Course Title ~12-46%] [Credit Unit ~46-54%] [Scores ~54-81%] [Grade ~81-88%] [Status ~88-100%]
const codeEnd = ref(0.12)
const unitStart = ref(0.46)
const unitEnd = ref(0.54)
const gradeStart = ref(0.81)
const gradeEnd = ref(0.88)

// Crop State
const cropRect = ref({ x: 0, y: 0, w: 100, h: 100 }) // Percentages
const activeHandle = ref(null) // 'move' | 'nw' | 'ne' | 'sw' | 'se'
const dragStart = ref({ clientX: 0, clientY: 0, x: 0, y: 0, w: 0, h: 0 })

const handleClose = () => {
  setTimeout(resetState, 300)
  emit('close')
}

const resetState = () => {
  step.value = 'upload'
  scannedCourses.value = []
  progress.value = 0
  error.value = null
  originalFile.value = null
  activeFile.value = null

  if (originalPreviewUrl.value) {
    URL.revokeObjectURL(originalPreviewUrl.value)
    originalPreviewUrl.value = null
  }
  if (activePreviewUrl.value && activePreviewUrl.value !== originalPreviewUrl.value) {
    URL.revokeObjectURL(activePreviewUrl.value)
  }
  activePreviewUrl.value = null
}

onUnmounted(() => {
  if (originalPreviewUrl.value) URL.revokeObjectURL(originalPreviewUrl.value)
  if (activePreviewUrl.value && activePreviewUrl.value !== originalPreviewUrl.value) {
    URL.revokeObjectURL(activePreviewUrl.value)
  }
})

const triggerFileInput = () => {
  if (fileInput.value) fileInput.value.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) prepareCropEditor(file)
}

const loadSampleSlip = async () => {
  try {
    error.value = null
    const res = await fetch('/test_slip.png')
    if (!res.ok) throw new Error('Sample slip not found')
    const blob = await res.blob()
    const file = new File([blob], 'sample_result_slip.png', { type: 'image/png' })
    prepareCropEditor(file)
  } catch (err) {
    console.error('Failed to load sample slip:', err)
    error.value = 'Failed to load sample slip: ' + err.message
  }
}

const prepareCropEditor = (file) => {
  if (!file.type.startsWith('image/')) {
    error.value = 'Invalid file type. Please upload an image.'
    return
  }
  error.value = null
  originalFile.value = file
  if (originalPreviewUrl.value) URL.revokeObjectURL(originalPreviewUrl.value)
  originalPreviewUrl.value = URL.createObjectURL(file)

  activeFile.value = file
  activePreviewUrl.value = originalPreviewUrl.value

  step.value = 'crop'
  cropRect.value = { x: 0, y: 0, w: 100, h: 100 }
}

const applyPreset = (preset) => {
  currentPreset.value = preset
  if (preset === 'new-portal') {
    codeEnd.value = 0.12
    unitStart.value = 0.46
    unitEnd.value = 0.54
    gradeStart.value = 0.81
    gradeEnd.value = 0.88
  } else if (preset === 'classic') {
    codeEnd.value = 0.22
    unitStart.value = 0.68
    unitEnd.value = 0.78
    gradeStart.value = 0.84
    gradeEnd.value = 0.94
  }
}

const prepareZoneEditor = (fileOrBlob) => {
  activeFile.value = fileOrBlob
  if (activePreviewUrl.value && activePreviewUrl.value !== originalPreviewUrl.value) {
    URL.revokeObjectURL(activePreviewUrl.value)
  }
  activePreviewUrl.value = URL.createObjectURL(fileOrBlob)
  step.value = 'zones'
  applyPreset('new-portal')
}

const skipCrop = () => {
  if (!originalFile.value) return
  prepareZoneEditor(originalFile.value)
}

const backToCrop = () => {
  step.value = 'crop'
}

// Dragging Logic for 5 Boundary Lines
const activeLine = ref(null) // 'codeEnd' | 'unitStart' | 'unitEnd' | 'gradeStart' | 'gradeEnd'

const startDrag = (line, e) => {
  e.preventDefault()
  activeLine.value = line
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onTouchDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

const updateLinePos = (clientX) => {
  if (!activeLine.value) return
  const container = document.getElementById('zone-image-container')
  if (!container) return

  const rect = container.getBoundingClientRect()
  let x = clientX - rect.left
  let pct = x / rect.width
  pct = Math.max(0, Math.min(1, pct))

  const minGap = 0.02

  if (activeLine.value === 'codeEnd') {
    pct = Math.max(0.04, Math.min(pct, unitStart.value - minGap))
    codeEnd.value = pct
  } else if (activeLine.value === 'unitStart') {
    pct = Math.max(codeEnd.value + minGap, Math.min(pct, unitEnd.value - minGap))
    unitStart.value = pct
  } else if (activeLine.value === 'unitEnd') {
    pct = Math.max(unitStart.value + minGap, Math.min(pct, gradeStart.value - minGap))
    unitEnd.value = pct
  } else if (activeLine.value === 'gradeStart') {
    pct = Math.max(unitEnd.value + minGap, Math.min(pct, gradeEnd.value - minGap))
    gradeStart.value = pct
  } else if (activeLine.value === 'gradeEnd') {
    pct = Math.max(gradeStart.value + minGap, Math.min(1.0, pct))
    gradeEnd.value = pct
  }
}

const onDrag = (e) => updateLinePos(e.clientX)
const onTouchDrag = (e) => {
  e.preventDefault()
  updateLinePos(e.touches[0].clientX)
}

const stopDrag = () => {
  activeLine.value = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onTouchDrag)
  document.removeEventListener('touchend', stopDrag)
}

// Crop Logic & Dragging
const startCropDrag = (handle, e) => {
  e.preventDefault()
  e.stopPropagation()
  activeHandle.value = handle
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY

  dragStart.value = {
    clientX,
    clientY,
    x: cropRect.value.x,
    y: cropRect.value.y,
    w: cropRect.value.w,
    h: cropRect.value.h,
  }

  document.addEventListener('mousemove', onCropDrag)
  document.addEventListener('mouseup', stopCropDrag)
  document.addEventListener('touchmove', onTouchCropDrag, { passive: false })
  document.addEventListener('touchend', stopCropDrag)
}

const updateCropRect = (clientX, clientY) => {
  if (!activeHandle.value) return
  const container = document.getElementById('crop-image-container')
  if (!container) return
  const rect = container.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const deltaX = ((clientX - dragStart.value.clientX) / rect.width) * 100
  const deltaY = ((clientY - dragStart.value.clientY) / rect.height) * 100
  const minSize = 5

  if (activeHandle.value === 'move') {
    let newX = dragStart.value.x + deltaX
    let newY = dragStart.value.y + deltaY
    newX = Math.max(0, Math.min(newX, 100 - cropRect.value.w))
    newY = Math.max(0, Math.min(newY, 100 - cropRect.value.h))
    cropRect.value.x = newX
    cropRect.value.y = newY
    return
  }

  const { x: startX, y: startY, w: startW, h: startH } = dragStart.value

  if (activeHandle.value === 'nw') {
    let newX = Math.min(startX + deltaX, startX + startW - minSize)
    let newY = Math.min(startY + deltaY, startY + startH - minSize)
    newX = Math.max(0, newX)
    newY = Math.max(0, newY)
    cropRect.value.x = newX
    cropRect.value.y = newY
    cropRect.value.w = startX + startW - newX
    cropRect.value.h = startY + startH - newY
  } else if (activeHandle.value === 'ne') {
    let newW = Math.max(minSize, startW + deltaX)
    let newY = Math.min(startY + deltaY, startY + startH - minSize)
    newY = Math.max(0, newY)
    cropRect.value.y = newY
    cropRect.value.w = Math.min(newW, 100 - startX)
    cropRect.value.h = startY + startH - newY
  } else if (activeHandle.value === 'sw') {
    let newX = Math.min(startX + deltaX, startX + startW - minSize)
    let newH = Math.max(minSize, startH + deltaY)
    newX = Math.max(0, newX)
    cropRect.value.x = newX
    cropRect.value.w = startX + startW - newX
    cropRect.value.h = Math.min(newH, 100 - startY)
  } else if (activeHandle.value === 'se') {
    let newW = Math.max(minSize, startW + deltaX)
    let newH = Math.max(minSize, startH + deltaY)
    cropRect.value.w = Math.min(newW, 100 - startX)
    cropRect.value.h = Math.min(newH, 100 - startY)
  }
}

const onCropDrag = (e) => updateCropRect(e.clientX, e.clientY)
const onTouchCropDrag = (e) => {
  e.preventDefault()
  updateCropRect(e.touches[0].clientX, e.touches[0].clientY)
}

const stopCropDrag = () => {
  activeHandle.value = null
  document.removeEventListener('mousemove', onCropDrag)
  document.removeEventListener('mouseup', stopCropDrag)
  document.removeEventListener('touchmove', onTouchCropDrag)
  document.removeEventListener('touchend', stopCropDrag)
}

const confirmCrop = () => {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const sx = (cropRect.value.x / 100) * img.width
    const sy = (cropRect.value.y / 100) * img.height
    const sw = (cropRect.value.w / 100) * img.width
    const sh = (cropRect.value.h / 100) * img.height

    canvas.width = Math.max(1, sw)
    canvas.height = Math.max(1, sh)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

    canvas.toBlob((blob) => {
      prepareZoneEditor(blob)
    }, 'image/png')
  }
  img.src = originalPreviewUrl.value
}

const scanAuto = async () => {
  if (!activeFile.value) return
  step.value = 'processing'
  error.value = null
  progress.value = 0
  statusText.value = 'Analyzing table rows with OCR...'

  try {
    const courses = await parseResultSlip(activeFile.value, (p) => {
      progress.value = Math.round(p)
      statusText.value = `Analyzing Rows: ${Math.round(p)}%`
    })

    if (courses.length === 0) {
      error.value = 'No courses detected automatically. Please adjust column zones.'
      step.value = 'zones'
      return
    }

    scannedCourses.value = courses
    step.value = 'review'
  } catch (err) {
    console.error('Auto scan error:', err)
    error.value = 'Auto scan failed: ' + err.message
    step.value = 'zones'
  }
}

const confirmCropAndAutoScan = () => {
  if (
    cropRect.value.x === 0 &&
    cropRect.value.y === 0 &&
    cropRect.value.w === 100 &&
    cropRect.value.h === 100
  ) {
    activeFile.value = originalFile.value
    scanAuto()
    return
  }

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const sx = (cropRect.value.x / 100) * img.width
    const sy = (cropRect.value.y / 100) * img.height
    const sw = (cropRect.value.w / 100) * img.width
    const sh = (cropRect.value.h / 100) * img.height

    canvas.width = Math.max(1, sw)
    canvas.height = Math.max(1, sh)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

    canvas.toBlob(async (blob) => {
      activeFile.value = blob
      if (activePreviewUrl.value && activePreviewUrl.value !== originalPreviewUrl.value) {
        URL.revokeObjectURL(activePreviewUrl.value)
      }
      activePreviewUrl.value = URL.createObjectURL(blob)
      await scanAuto()
    }, 'image/png')
  }
  img.src = originalPreviewUrl.value
}

const startScan = async () => {
  if (!activeFile.value) return

  step.value = 'processing'
  error.value = null
  progress.value = 0
  statusText.value = 'Analyzing portal table with AI OCR...'

  try {
    // 1. Try high-precision full table parse
    let courses = await parseResultSlip(activeFile.value, (p) => {
      progress.value = Math.round(p)
      statusText.value = `Analyzing Rows: ${Math.round(p)}%`
    })

    // 2. If table parse succeeded with courses, use them directly
    if (courses && courses.length > 0) {
      scannedCourses.value = courses
      step.value = 'review'
      return
    }

    // 3. Fallback to column zone isolation if full table found nothing
    statusText.value = 'Analyzing column zones...'
    const zones = {
      codeStart: 0,
      codeEnd: codeEnd.value,
      unitStart: unitStart.value,
      unitEnd: unitEnd.value,
      gradeStart: gradeStart.value,
      gradeEnd: gradeEnd.value,
    }

    courses = await parseZones(activeFile.value, zones, (p) => {
      progress.value = Math.round(p)
      statusText.value = `Scanning Columns: ${Math.round(p)}%`
    })

    if (!courses || courses.length === 0) {
      error.value = 'No courses detected. Please adjust the column lines and try again.'
      step.value = 'zones'
      return
    }

    scannedCourses.value = courses
    step.value = 'review'
  } catch (err) {
    console.error('Scan error:', err)
    error.value = 'Scan failed: ' + err.message
    step.value = 'zones'
  }
}

const addRow = () => {
  scannedCourses.value.push({
    id: crypto.randomUUID(),
    code: '',
    unit: 2,
    grade: 'A',
  })
}

const removeCourse = (id) => {
  scannedCourses.value = scannedCourses.value.filter((c) => c.id !== id)
}

const addAllCourses = () => {
  const cleanCourses = scannedCourses.value
    .filter((c) => c.code && c.code.trim().length > 0)
    .map((c) => ({
      code: c.code.toUpperCase().trim(),
      unit: Number(c.unit) || 0,
      grade: (c.grade || 'F').toUpperCase(),
    }))
  emit('add-courses', cleanCourses)
  handleClose()
}
</script>

<template>
  <div
    v-if="isOpen"
    id="scanner-modal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
  >
    <div
      class="bg-zinc-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-white/5">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <Camera class="w-5 h-5 text-emerald-400" />
          Scan Result Slip
        </h3>
        <button
          id="scanner-close-btn"
          @click="handleClose"
          class="p-1 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
        <!-- Error Alert -->
        <div
          v-if="error"
          id="scanner-error-alert"
          class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center"
        >
          <AlertCircle class="w-4 h-4 mr-2 shrink-0" />
          {{ error }}
        </div>

        <!-- Step 1: Upload -->
        <div v-if="step === 'upload'" class="space-y-4 my-auto">
          <div
            id="scanner-upload-box"
            @click="triggerFileInput"
            class="border-2 border-dashed border-zinc-700 bg-zinc-800/30 hover:border-emerald-500 hover:bg-zinc-800/50 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group"
          >
            <div
              class="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
            >
              <Upload
                class="w-8 h-8 text-zinc-400 group-hover:text-emerald-400 transition-colors"
              />
            </div>
            <p class="text-zinc-200 font-medium mb-1">Upload Result Slip</p>
            <p class="text-zinc-500 text-sm">Tap here to select portal screenshot</p>
          </div>
          <div class="flex items-center justify-center gap-2 pt-2">
            <span class="text-xs text-zinc-500">or</span>
            <button
              id="load-sample-slip-btn"
              type="button"
              @click="loadSampleSlip"
              class="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4 cursor-pointer"
            >
              Try with sample result slip
            </button>
          </div>
          <input
            id="scanner-file-input"
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />
        </div>

        <!-- Step 1.5: Crop -->
        <div v-if="step === 'crop'" class="flex-1 flex flex-col">
          <div
            class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-4 text-xs text-blue-300"
          >
            <strong>Crop Table:</strong> Drag handles to resize, or drag inside the box to reposition.
            <div class="mt-1 text-blue-200/70">
              For optimal accuracy, crop tightly to the table rows containing your course grades.
            </div>
          </div>

          <div
            class="relative flex-1 bg-black/60 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-700 select-none"
            style="min-height: 280px"
          >
            <div
              id="crop-image-container"
              class="relative inline-block max-h-full max-w-full overflow-hidden"
            >
              <img
                :src="originalPreviewUrl"
                class="max-h-[48vh] object-contain pointer-events-none select-none block"
              />

              <!-- Crop Box with Outer Dim Shadow & Move Cursor -->
              <div
                id="crop-box"
                class="absolute border-2 border-emerald-500 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] box-content cursor-move"
                :style="{
                  top: `${cropRect.y}%`,
                  left: `${cropRect.x}%`,
                  width: `${cropRect.w}%`,
                  height: `${cropRect.h}%`,
                }"
                @mousedown="startCropDrag('move', $event)"
                @touchstart="startCropDrag('move', $event)"
              >
                <!-- Subtle grid guide inside crop box -->
                <div class="w-full h-full border border-emerald-500/20 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div class="border-r border-b border-emerald-500/20"></div>
                  <div class="border-r border-b border-emerald-500/20"></div>
                  <div class="border-b border-emerald-500/20"></div>
                  <div class="border-r border-b border-emerald-500/20"></div>
                  <div class="border-r border-b border-emerald-500/20"></div>
                  <div class="border-b border-emerald-500/20"></div>
                  <div class="border-r border-b border-emerald-500/20"></div>
                  <div class="border-r border-b border-emerald-500/20"></div>
                  <div></div>
                </div>

                <!-- Resize Handles -->
                <div
                  id="crop-handle-nw"
                  class="absolute -top-2 -left-2 w-4 h-4 bg-emerald-500 rounded-full cursor-nw-resize z-20 hover:scale-125 transition-transform shadow"
                  @mousedown.stop="startCropDrag('nw', $event)"
                  @touchstart.stop="startCropDrag('nw', $event)"
                ></div>
                <div
                  id="crop-handle-ne"
                  class="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full cursor-ne-resize z-20 hover:scale-125 transition-transform shadow"
                  @mousedown.stop="startCropDrag('ne', $event)"
                  @touchstart.stop="startCropDrag('ne', $event)"
                ></div>
                <div
                  id="crop-handle-sw"
                  class="absolute -bottom-2 -left-2 w-4 h-4 bg-emerald-500 rounded-full cursor-sw-resize z-20 hover:scale-125 transition-transform shadow"
                  @mousedown.stop="startCropDrag('sw', $event)"
                  @touchstart.stop="startCropDrag('sw', $event)"
                ></div>
                <div
                  id="crop-handle-se"
                  class="absolute -bottom-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full cursor-se-resize z-20 hover:scale-125 transition-transform shadow"
                  @mousedown.stop="startCropDrag('se', $event)"
                  @touchstart.stop="startCropDrag('se', $event)"
                ></div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-3 items-center">
            <button
              id="crop-cancel-btn"
              @click="step = 'upload'"
              class="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              id="skip-crop-btn"
              @click="skipCrop"
              class="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-white/5 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Skip Crop
            </button>
            <button
              id="confirm-crop-btn"
              @click="confirmCrop"
              class="px-4 py-2.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Columns class="w-4 h-4" />
              Adjust Column Lines
            </button>
            <button
              id="confirm-crop-scan-btn"
              @click="confirmCropAndAutoScan"
              class="flex-1 min-w-[140px] px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles class="w-4 h-4" />
              Scan Now
            </button>
          </div>
        </div>

        <!-- Step 2: Zone Editor -->
        <div v-if="step === 'zones'" class="flex-1 flex flex-col">
          <!-- Preset Controls & Hint -->
          <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-zinc-400 font-medium">Layout:</span>
              <button
                id="preset-new-portal-btn"
                type="button"
                @click="applyPreset('new-portal')"
                :class="[
                  'px-2.5 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                  currentPreset === 'new-portal'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/5',
                ]"
              >
                <Sparkles class="w-3 h-3" />
                New Portal (8-Col)
              </button>
              <button
                id="preset-classic-btn"
                type="button"
                @click="applyPreset('classic')"
                :class="[
                  'px-2.5 py-1 text-xs rounded-md font-semibold transition-all cursor-pointer',
                  currentPreset === 'classic'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/5',
                ]"
              >
                Classic Portal
              </button>
            </div>
            <button
              id="reset-lines-btn"
              type="button"
              @click="applyPreset(currentPreset)"
              class="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 cursor-pointer"
            >
              <RotateCcw class="w-3 h-3" />
              Reset Lines
            </button>
          </div>

          <div
            class="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg mb-3 text-xs text-blue-300"
          >
            <strong>Portal Columns Isolated:</strong>
            <span class="text-blue-200/80 ml-1">
              Green = <strong>Code</strong>, Amber = <strong>Unit</strong>, Purple = <strong>Grade</strong>. Scores and Status are excluded.
            </span>
          </div>

          <div
            class="relative flex-1 bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-700"
            style="min-height: 280px"
          >
            <div id="zone-image-container" class="relative inline-block max-h-full max-w-full">
              <img
                :src="activePreviewUrl"
                class="max-h-[46vh] object-contain select-none"
                draggable="false"
              />

              <!-- CODE END (Green) -->
              <div
                class="absolute inset-y-0 w-1 bg-emerald-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(16,185,129,0.8)] flex flex-col items-center z-10"
                :style="{ left: `${codeEnd * 100}%` }"
                @mousedown="startDrag('codeEnd', $event)"
                @touchstart="startDrag('codeEnd', $event)"
              >
                <div
                  class="bg-emerald-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none whitespace-nowrap shadow"
                >
                  CODE &larr;
                </div>
              </div>

              <!-- UNIT START (Amber) -->
              <div
                class="absolute inset-y-0 w-1 bg-amber-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(245,158,11,0.8)] flex flex-col items-center z-20"
                :style="{ left: `${unitStart * 100}%` }"
                @mousedown="startDrag('unitStart', $event)"
                @touchstart="startDrag('unitStart', $event)"
              >
                <div
                  class="bg-amber-500 text-black text-[10px] font-bold px-1 rounded-sm mt-8 select-none whitespace-nowrap shadow"
                >
                  &rarr; UNIT
                </div>
              </div>

              <!-- UNIT END (Amber) -->
              <div
                class="absolute inset-y-0 w-1 bg-amber-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(245,158,11,0.8)] flex flex-col items-center z-20"
                :style="{ left: `${unitEnd * 100}%` }"
                @mousedown="startDrag('unitEnd', $event)"
                @touchstart="startDrag('unitEnd', $event)"
              >
                <div
                  class="bg-amber-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none whitespace-nowrap shadow"
                >
                  UNIT &larr;
                </div>
              </div>

              <!-- GRADE START (Purple) -->
              <div
                class="absolute inset-y-0 w-1 bg-purple-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(168,85,247,0.8)] flex flex-col items-center z-30"
                :style="{ left: `${gradeStart * 100}%` }"
                @mousedown="startDrag('gradeStart', $event)"
                @touchstart="startDrag('gradeStart', $event)"
              >
                <div
                  class="bg-purple-500 text-black text-[10px] font-bold px-1 rounded-sm mt-8 select-none whitespace-nowrap shadow"
                >
                  &rarr; GRADE
                </div>
              </div>

              <!-- GRADE END (Purple) -->
              <div
                class="absolute inset-y-0 w-1 bg-purple-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(168,85,247,0.8)] flex flex-col items-center z-30"
                :style="{ left: `${gradeEnd * 100}%` }"
                @mousedown="startDrag('gradeEnd', $event)"
                @touchstart="startDrag('gradeEnd', $event)"
              >
                <div
                  class="bg-purple-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none whitespace-nowrap shadow"
                >
                  GRADE &larr;
                </div>
              </div>

              <!-- Zone Overlays -->
              <!-- 1. Code Zone -->
              <div
                class="absolute inset-y-0 bg-emerald-500/15 pointer-events-none border-r border-emerald-500/30 flex items-start justify-center pt-1"
                :style="{ left: 0, width: `${codeEnd * 100}%` }"
              >
                <span class="text-[9px] font-bold uppercase tracking-wider text-emerald-300 opacity-60">Code</span>
              </div>

              <!-- 2. Course Title (Dimmed / Excluded) -->
              <div
                class="absolute inset-y-0 bg-black/60 pointer-events-none flex items-center justify-center"
                :style="{ left: `${codeEnd * 100}%`, width: `${(unitStart - codeEnd) * 100}%` }"
              >
                <span class="text-[9px] text-zinc-500 font-mono select-none">Title</span>
              </div>

              <!-- 3. Unit Zone -->
              <div
                class="absolute inset-y-0 bg-amber-500/15 pointer-events-none border-l border-r border-amber-500/30 flex items-start justify-center pt-1"
                :style="{ left: `${unitStart * 100}%`, width: `${(unitEnd - unitStart) * 100}%` }"
              >
                <span class="text-[9px] font-bold uppercase tracking-wider text-amber-300 opacity-60">Unit</span>
              </div>

              <!-- 4. Scores Zone CA/Exam/Total (Dimmed / Excluded) -->
              <div
                class="absolute inset-y-0 bg-black/60 pointer-events-none flex items-center justify-center"
                :style="{ left: `${unitEnd * 100}%`, width: `${(gradeStart - unitEnd) * 100}%` }"
              >
                <span class="text-[9px] text-zinc-500 font-mono select-none">Scores</span>
              </div>

              <!-- 5. Grade Zone -->
              <div
                class="absolute inset-y-0 bg-purple-500/15 pointer-events-none border-l border-r border-purple-500/30 flex items-start justify-center pt-1"
                :style="{ left: `${gradeStart * 100}%`, width: `${(gradeEnd - gradeStart) * 100}%` }"
              >
                <span class="text-[9px] font-bold uppercase tracking-wider text-purple-300 opacity-60">Grade</span>
              </div>

              <!-- 6. Status Zone ("Passed") (Dimmed / Excluded) -->
              <div
                class="absolute inset-y-0 bg-black/60 pointer-events-none flex items-center justify-center"
                :style="{ left: `${gradeEnd * 100}%`, right: 0 }"
              >
                <span class="text-[9px] text-zinc-500 font-mono select-none">Status</span>
              </div>
            </div>
          </div>

          <div class="mt-4 flex gap-3">
            <button
              id="zones-back-btn"
              @click="backToCrop"
              class="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              id="scan-columns-btn"
              @click="startScan"
              class="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-colors cursor-pointer"
            >
              Scan Columns
            </button>
          </div>
        </div>

        <!-- Step 3: Processing -->
        <div v-if="step === 'processing'" class="flex flex-col items-center justify-center py-12">
          <div class="relative mb-6">
            <div
              class="w-20 h-20 rounded-full border-4 border-white/10 border-t-emerald-500 animate-spin"
            ></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xs font-bold text-emerald-400">{{ progress }}%</span>
            </div>
          </div>
          <h4 class="text-lg font-medium text-white mb-2">Reading Portal Zones</h4>
          <p class="text-zinc-400 text-sm animate-pulse">{{ statusText }}</p>
        </div>

        <!-- Step 4: Review -->
        <div v-if="step === 'review'" class="space-y-4">
          <div
            class="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200 flex items-center"
          >
            <AlertCircle class="w-4 h-4 mr-2 shrink-0 mt-0.5" />
            <p>
              Please <strong>cross-check</strong> the scanned data below. Click any field to edit or adjust before saving.
            </p>
          </div>

          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-zinc-400">Review Scanned Data</h4>
            <div class="flex items-center gap-2">
              <button
                id="add-row-btn"
                @click="addRow"
                type="button"
                class="text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus class="w-3 h-3" />
                Add Row
              </button>
              <span
                class="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20 font-medium"
              >
                {{ scannedCourses.length }} Courses Found
              </span>
            </div>
          </div>

          <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            <div
              v-for="course in scannedCourses"
              :key="course.id"
              class="grid grid-cols-12 gap-2 bg-white/5 p-2 rounded-lg border border-white/5 items-center hover:border-white/10 transition-colors"
            >
              <!-- Code -->
              <div class="col-span-5">
                <input
                  v-model="course.code"
                  class="w-full bg-black/40 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none uppercase font-mono font-medium"
                  placeholder="COURSE CODE"
                />
              </div>

              <!-- Unit -->
              <div class="col-span-3">
                <input
                  v-model.number="course.unit"
                  type="number"
                  min="0"
                  max="12"
                  class="w-full bg-black/40 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none text-center font-medium"
                  placeholder="Unit"
                />
              </div>

              <!-- Grade -->
              <div class="col-span-3">
                <select
                  v-model="course.grade"
                  class="w-full bg-black/40 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none appearance-none text-center font-bold cursor-pointer"
                >
                  <option v-for="g in ['A', 'B', 'C', 'D', 'E', 'F']" :key="g" :value="g">
                    {{ g }}
                  </option>
                </select>
              </div>

              <!-- Delete -->
              <div class="col-span-1 flex justify-center">
                <button
                  @click="removeCourse(course.id)"
                  class="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                  title="Remove course"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-4 border-t border-white/10 mt-4">
            <button
              id="adjust-zones-btn"
              @click="step = 'zones'"
              class="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium cursor-pointer"
            >
              Adjust Zones
            </button>
            <button
              id="add-all-courses-btn"
              @click="addAllCourses"
              class="flex-[2] py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer"
            >
              <Plus class="w-4 h-4" />
              Add All to Semester
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}
</style>
