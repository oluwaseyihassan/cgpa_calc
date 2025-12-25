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

// States: 'upload' | 'zones' | 'processing' | 'review'
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
const lineA = ref(0.25) // Code / Title separator
const lineB = ref(0.75) // Title / Unit separator
const lineC = ref(0.85) // Unit / Grade separator

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
  if (file) prepareZoneEditor(file)
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
  lineA.value = 0.25
  lineB.value = 0.7
  lineC.value = 0.85
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

  if (activeLine.value === 'A') {
    pct = Math.min(pct, lineB.value - 0.05)
    lineA.value = pct
  } else if (activeLine.value === 'B') {
    pct = Math.max(lineA.value + 0.05, Math.min(pct, lineC.value - 0.05))
    lineB.value = pct
  } else if (activeLine.value === 'C') {
    pct = Math.max(lineB.value + 0.05, pct)
    lineC.value = pct
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

const startScan = async () => {
  if (!selectedFile.value) return

  step.value = 'processing'
  error.value = null
  progress.value = 0
  statusText.value = 'Analyzing zones...'

  try {
    const zones = {
      lineA: lineA.value,
      lineB: lineB.value,
      lineC: lineC.value,
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

        <!-- Step 2: Zone Editor -->
        <div v-if="step === 'zones'" class="flex-1 flex flex-col">
          <div
            class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-4 text-xs text-blue-300"
          >
            <strong>Instruction:</strong> Drag the vertical lines to separate the columns.
            <ul class="list-disc list-inside mt-1 ml-1 text-blue-200/70">
              <li>Line 1: Right side of COURSE CODE</li>
              <li>Line 2: Left side of UNIT</li>
              <li>Line 3: Left side of GRADE</li>
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

              <!-- Line A -->
              <div
                class="absolute inset-y-0 w-1 bg-emerald-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(16,185,129,0.8)] flex flex-col items-center z-10"
                :style="{ left: `${lineA * 100}%` }"
                @mousedown="startDrag('A', $event)"
                @touchstart="startDrag('A', $event)"
              >
                <div
                  class="bg-emerald-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none"
                >
                  CODE
                </div>
              </div>

              <!-- Line B -->
              <div
                class="absolute inset-y-0 w-1 bg-amber-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(245,158,11,0.8)] flex flex-col items-center z-20"
                :style="{ left: `${lineB * 100}%` }"
                @mousedown="startDrag('B', $event)"
                @touchstart="startDrag('B', $event)"
              >
                <div
                  class="bg-amber-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none"
                >
                  UNIT
                </div>
              </div>

              <!-- Line C -->
              <div
                class="absolute inset-y-0 w-1 bg-purple-500 cursor-col-resize hover:shadow-[0_0_10px_rgba(168,85,247,0.8)] flex flex-col items-center z-30"
                :style="{ left: `${lineC * 100}%` }"
                @mousedown="startDrag('C', $event)"
                @touchstart="startDrag('C', $event)"
              >
                <div
                  class="bg-purple-500 text-black text-[10px] font-bold px-1 rounded-sm mt-2 select-none"
                >
                  GRADE
                </div>
              </div>

              <!-- Zone Labels (Overlays) -->
              <div
                class="absolute inset-y-0 bg-emerald-500/10 pointer-events-none border-r border-emerald-500/20"
                :style="{ left: 0, width: `${lineA * 100}%` }"
              ></div>
              <div
                class="absolute inset-y-0 bg-amber-500/10 pointer-events-none border-l border-amber-500/20 border-r border-purple-500/20"
                :style="{ left: `${lineB * 100}%`, width: `${(lineC - lineB) * 100}%` }"
              ></div>
              <div
                class="absolute inset-y-0 bg-purple-500/10 pointer-events-none border-l border-purple-500/20"
                :style="{ left: `${lineC * 100}%`, right: 0 }"
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
