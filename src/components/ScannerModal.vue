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
} from 'lucide-vue-next'
import { parseZones } from '@/services/ocr'

const props = defineProps({
  isOpen: Boolean,
})

const emit = defineEmits(['close', 'add-courses'])

// States: 'upload' | 'crop' | 'zones' | 'processing' | 'review'
const step = ref('upload')
const isDragging = ref(false)
const progress = ref(0)
const statusText = ref('Initializing...')
const scannedCourses = ref([])
const error = ref(null)

// File Input
const fileInput = ref(null)
const selectedFile = ref(null)
const previewUrl = ref(null)

// Zone Editor State
const zoneContainerInfo = ref(null) // { width, height }
// Positions as percentages (0 to 1)
const codeEnd = ref(0.25)
const unitStart = ref(0.7)
const unitEnd = ref(0.8)
const gradeStart = ref(0.85)

// Crop State
const cropRect = ref({ x: 10, y: 10, w: 80, h: 80 }) // Percentages

const handleClose = () => {
  setTimeout(resetState, 300)
  emit('close')
}

const resetState = () => {
  step.value = 'upload'
  scannedCourses.value = []
  progress.value = 0
  error.value = null
  selectedFile.value = null
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) prepareCropEditor(file)
}

const prepareCropEditor = (file) => {
  if (!file.type.startsWith('image/')) {
    error.value = 'Invalid file type'
    return
  }
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  step.value = 'crop'
  // Reset crop rect
  cropRect.value = { x: 10, y: 10, w: 80, h: 80 }
}

const prepareZoneEditor = (file) => {
  if (!file.type.startsWith('image/')) {
    error.value = 'Invalid file type'
    return
  }
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  step.value = 'zones'

  // Reset lines to defaults
  codeEnd.value = 0.25
  unitStart.value = 0.7
  unitEnd.value = 0.8
  gradeStart.value = 0.85
}

// Dragging Logic
const activeLine = ref(null) // 'A', 'B', 'C'

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

  // Constraints
  pct = Math.max(0, Math.min(1, pct))

  const minGap = 0.02

  if (activeLine.value === 'codeEnd') {
    pct = Math.min(pct, unitStart.value - minGap)
    codeEnd.value = pct
  } else if (activeLine.value === 'unitStart') {
    pct = Math.max(codeEnd.value + minGap, Math.min(pct, unitEnd.value - minGap))
    unitStart.value = pct
  } else if (activeLine.value === 'unitEnd') {
    pct = Math.max(unitStart.value + minGap, Math.min(pct, gradeStart.value - minGap))
    unitEnd.value = pct
  } else if (activeLine.value === 'gradeStart') {
    pct = Math.max(unitEnd.value + minGap, pct)
    gradeStart.value = pct
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
const activeHandle = ref(null) // 'nw', 'ne', 'sw', 'se', 'drag'

const startCropDrag = (handle, e) => {
  e.preventDefault()
  activeHandle.value = handle
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

  const x = ((clientX - rect.left) / rect.width) * 100
  const y = ((clientY - rect.top) / rect.height) * 100

  const c = cropRect.value
  const minSize = 5

  if (activeHandle.value === 'drag') {
    // Not implementing drag move for now to keep it simple, or maybe later
  } else if (activeHandle.value === 'nw') {
    const newX = Math.min(x, c.x + c.w - minSize)
    const newY = Math.min(y, c.y + c.h - minSize)
    c.w = c.x + c.w - newX
    c.h = c.y + c.h - newY
    c.x = newX
    c.y = newY
  } else if (activeHandle.value === 'ne') {
    const newX = Math.max(x, c.x + minSize)
    const newY = Math.min(y, c.y + c.h - minSize)
    c.w = newX - c.x
    c.h = c.y + c.h - newY
    c.y = newY
  } else if (activeHandle.value === 'sw') {
    const newX = Math.min(x, c.x + c.w - minSize)
    const newY = Math.max(y, c.y + minSize)
    c.w = c.x + c.w - newX
    c.h = newY - c.y
    c.x = newX
  } else if (activeHandle.value === 'se') {
    c.w = Math.max(x - c.x, minSize)
    c.h = Math.max(y - c.y, minSize)
  }

  // Clamping at 0-100
  if (c.x < 0) {
    c.w += c.x
    c.x = 0
  }
  if (c.y < 0) {
    c.h += c.y
    c.y = 0
  }
  if (c.x + c.w > 100) c.w = 100 - c.x
  if (c.y + c.h > 100) c.h = 100 - c.y
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
    // Calculate actual pixel coordinates
    const sx = (cropRect.value.x / 100) * img.width
    const sy = (cropRect.value.y / 100) * img.height
    const sw = (cropRect.value.w / 100) * img.width
    const sh = (cropRect.value.h / 100) * img.height

    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

    canvas.toBlob((blob) => {
      prepareZoneEditor(blob)
    }, 'image/png')
  }
  img.src = previewUrl.value
}
const startScan = async () => {
  if (!selectedFile.value) return

  step.value = 'processing'
  error.value = null
  progress.value = 0
  statusText.value = 'Analyzing zones...'

  try {
    const zones = {
      codeEnd: codeEnd.value,
      unitStart: unitStart.value,
      unitEnd: unitEnd.value,
      gradeStart: gradeStart.value,
    }

    const courses = await parseZones(selectedFile.value, zones, (p) => {
      progress.value = Math.round(p)
      statusText.value = `Processing Columns: ${Math.round(p)}%`
    })

    if (courses.length === 0) {
      error.value = 'No courses found. Adjust zones and try again.'
      step.value = 'zones'
      return
    }

    scannedCourses.value = courses
    step.value = 'review'
  } catch (err) {
    console.error(err)
    error.value = 'Scan failed: ' + err.message
    step.value = 'zones'
  }
}

const removeCourse = (id) => {
  scannedCourses.value = scannedCourses.value.filter((c) => c.id !== id)
}

const addAllCourses = () => {
  const cleanCourses = scannedCourses.value.map((c) => ({
    code: c.code.toUpperCase().trim(),
    unit: Number(c.unit),
    grade: c.grade.toUpperCase(),
  }))
  emit('add-courses', cleanCourses)
  handleClose()
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
  >
    <div
      class="bg-zinc-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-white/5">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <Camera class="w-5 h-5 text-emerald-400" />
          Scan Result Slip
        </h3>
        <button
          @click="handleClose"
          class="p-1 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
        <!-- Error Alert -->
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center"
        >
          <AlertCircle class="w-4 h-4 mr-2" />
          {{ error }}
        </div>

        <!-- Step 1: Upload -->
        <div v-if="step === 'upload'" class="space-y-4 my-auto">
          <div
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
            <p class="text-zinc-500 text-sm">Tap here to select image</p>
          </div>
          <input
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
            <strong>Crop Image:</strong> Drag the corners to select only the table area.
            <div class="mt-1 text-blue-200/70">
              For best results, please <strong>crop out table headers</strong> and keep only the
              data rows.
            </div>
          </div>

          <div
            class="relative flex-1 bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-700 select-none"
            style="min-height: 300px"
          >
            <div id="crop-image-container" class="relative inline-block max-h-full max-w-full">
              <img :src="previewUrl" class="max-h-[50vh] object-contain pointer-events-none" />

              <!-- Dim Overlay -->
              <div class="absolute inset-0 bg-black/50"></div>

              <!-- Crop Box -->
              <div
                class="absolute border-2 border-emerald-500 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] box-content"
                :style="{
                  top: `${cropRect.y}%`,
                  left: `${cropRect.x}%`,
                  width: `${cropRect.w}%`,
                  height: `${cropRect.h}%`,
                }"
              >
                <!-- Grid Lines or Center Marker (Optional) -->

                <!-- Handles -->
                <!-- NW -->
                <div
                  class="absolute -top-2 -left-2 w-4 h-4 bg-emerald-500 rounded-full cursor-nw-resize z-20 hover:scale-125 transition-transform"
                  @mousedown="startCropDrag('nw', $event)"
                  @touchstart="startCropDrag('nw', $event)"
                ></div>
                <!-- NE -->
                <div
                  class="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full cursor-ne-resize z-20 hover:scale-125 transition-transform"
                  @mousedown="startCropDrag('ne', $event)"
                  @touchstart="startCropDrag('ne', $event)"
                ></div>
                <!-- SW -->
                <div
                  class="absolute -bottom-2 -left-2 w-4 h-4 bg-emerald-500 rounded-full cursor-sw-resize z-20 hover:scale-125 transition-transform"
                  @mousedown="startCropDrag('sw', $event)"
                  @touchstart="startCropDrag('sw', $event)"
                ></div>
                <!-- SE -->
                <div
                  class="absolute -bottom-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full cursor-se-resize z-20 hover:scale-125 transition-transform"
                  @mousedown="startCropDrag('se', $event)"
                  @touchstart="startCropDrag('se', $event)"
                ></div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex gap-3">
            <button
              @click="step = 'upload'"
              class="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium"
            >
              Cancel
            </button>
            <button
              @click="confirmCrop"
              class="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
            >
              Confirm Crop & Continue
            </button>
          </div>
        </div>

        <!-- Step 2: Zone Editor -->
        <div v-if="step === 'zones'" class="flex-1 flex flex-col">
          <div
            class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-4 text-xs text-blue-300"
          >
            <strong>Instruction:</strong> Adjust the 4 separation lines to define your columns.
            <ul class="list-disc list-inside mt-1 ml-1 text-blue-200/70">
              <li><strong>Line 1 (Green):</strong> End of Course Code</li>
              <li><strong>Lines 2 & 3 (Amber):</strong> Start & End of Unit</li>
              <li><strong>Line 4 (Purple):</strong> Start of Grade (to End of Row)</li>
            </ul>
          </div>

          <div
            class="relative flex-1 bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-700"
            style="min-height: 300px"
          >
            <div id="zone-image-container" class="relative inline-block max-h-full max-w-full">
              <img
                :src="previewUrl"
                class="max-h-[50vh] object-contain select-none"
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
                  class="bg-emerald-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none whitespace-nowrap"
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
                  class="bg-amber-500 text-black text-[10px] font-bold px-1 rounded-sm mt-8 select-none whitespace-nowrap"
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
                  class="bg-amber-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none whitespace-nowrap"
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
                  class="bg-purple-500 text-black text-[10px] font-bold px-1 rounded-sm mt-8 select-none whitespace-nowrap"
                >
                  &rarr; GRADE
                </div>
              </div>

              <!-- Zone Overlays -->
              <!-- Code Zone -->
              <div
                class="absolute inset-y-0 bg-emerald-500/10 pointer-events-none border-r border-emerald-500/20"
                :style="{ left: 0, width: `${codeEnd * 100}%` }"
              ></div>

              <!-- Gap between Code & Unit (Grayed out) -->
              <div
                class="absolute inset-y-0 bg-black/40 pointer-events-none"
                :style="{ left: `${codeEnd * 100}%`, width: `${(unitStart - codeEnd) * 100}%` }"
              ></div>

              <!-- Unit Zone -->
              <div
                class="absolute inset-y-0 bg-amber-500/10 pointer-events-none border-l border-r border-amber-500/20"
                :style="{ left: `${unitStart * 100}%`, width: `${(unitEnd - unitStart) * 100}%` }"
              ></div>

              <!-- Gap between Unit & Grade (Grayed out) -->
              <div
                class="absolute inset-y-0 bg-black/40 pointer-events-none"
                :style="{ left: `${unitEnd * 100}%`, width: `${(gradeStart - unitEnd) * 100}%` }"
              ></div>

              <!-- Grade Zone -->
              <div
                class="absolute inset-y-0 bg-purple-500/10 pointer-events-none border-l border-purple-500/20"
                :style="{ left: `${gradeStart * 100}%`, right: 0 }"
              ></div>
            </div>
          </div>

          <div class="mt-4 flex gap-3">
            <button
              @click="step = 'upload'"
              class="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium"
            >
              Back
            </button>
            <button
              @click="startScan"
              class="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
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
          <h4 class="text-lg font-medium text-white mb-2">Reading Zones</h4>
          <p class="text-zinc-400 text-sm animate-pulse">{{ statusText }}</p>
        </div>

        <!-- Step 4: Review -->
        <div v-if="step === 'review'" class="space-y-4">
          <div
            class="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200 flex items-center"
          >
            <AlertCircle class="w-4 h-4 mr-2 shrink-0 mt-0.5" />
            <p>
              Please <strong>cross-check</strong> the scanned data below. OCR errors may occur. Click any field to edit.
            </p>
          </div>

          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-zinc-400">Review Scanned Data</h4>
            <span
              class="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20"
            >
              {{ scannedCourses.length }} Courses Found
            </span>
          </div>

          <div class="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            <div
              v-for="course in scannedCourses"
              :key="course.id"
              class="grid grid-cols-12 gap-2 bg-white/5 p-2 rounded-lg border border-white/5 items-center"
            >
              <!-- Code -->
              <div class="col-span-4">
                <input
                  v-model="course.code"
                  class="w-full bg-black/30 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none uppercase font-mono"
                  placeholder="CODE"
                />
              </div>

              <!-- Unit -->
              <div class="col-span-3">
                <input
                  v-model.number="course.unit"
                  type="number"
                  class="w-full bg-black/30 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none text-center"
                  placeholder="Unit"
                />
              </div>

              <!-- Grade -->
              <div class="col-span-4">
                <select
                  v-model="course.grade"
                  class="w-full bg-black/30 border border-zinc-700 rounded px-1 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none appearance-none text-center font-bold"
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
                  class="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-4 border-t border-white/10 mt-4">
            <button
              @click="step = 'zones'"
              class="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
            >
              Adjust Zones
            </button>
            <button
              @click="addAllCourses"
              class="flex-[2] py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm font-bold flex items-center justify-center gap-2"
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
