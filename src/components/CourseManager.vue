<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useSemesterStore } from '@/stores/semesterStore'
import {
  Trash2,
  Plus,
  BookOpen,
  GraduationCap,
  GripVertical,
  Camera,
  Pencil,
  Check,
  X as XIcon,
} from 'lucide-vue-next'
import VueDraggable from 'vuedraggable'
import ScannerModal from './ScannerModal.vue'

const semesterStore = useSemesterStore()

// Form State
const newSemesterName = ref('')
const activeSemesterId = ref(null)
const courseCode = ref('')
const courseUnit = ref(null)
const courseGrade = ref('A')
const isScannerOpen = ref(false)

const grades = ['A', 'B', 'C', 'D', 'E', 'F']

const semestersList = computed({
  get: () => semesterStore.semesters,
  set: (value) => semesterStore.reorderSemesters(value),
})

const loadData = async () => {
  await semesterStore.loadAll()
  if (semesterStore.semesters.length > 0 && !activeSemesterId.value) {
    activeSemesterId.value = semesterStore.semesters[0].id // Default to first
  }
}

// Rename Logic
const isEditingName = ref(false)
const editingName = ref('')
const nameInput = ref(null)

const startEditingName = () => {
  const sem = semesterStore.semesters.find((s) => s.id === activeSemesterId.value)
  if (sem) {
    editingName.value = sem.name
    isEditingName.value = true
    nextTick(() => nameInput.value?.focus())
  }
}

const saveSemesterName = async () => {
  if (!editingName.value.trim()) return
  await semesterStore.renameSemester(activeSemesterId.value, editingName.value)
  isEditingName.value = false
}

const cancelEditName = () => {
  isEditingName.value = false
}

// Course Edit Logic
const editingCourseId = ref(null)
const editingCourseData = ref({ code: '', unit: 0, grade: 'A' })

const startEditingCourse = (course) => {
  editingCourseId.value = course.id
  editingCourseData.value = { ...course }
}

const cancelEditCourse = () => {
  editingCourseId.value = null
  editingCourseData.value = { code: '', unit: 0, grade: 'A' }
}

const saveCourseEdit = async () => {
  if (!editingCourseId.value || !activeSemesterId.value) return

  await semesterStore.updateCourse(activeSemesterId.value, {
    id: editingCourseId.value,
    ...editingCourseData.value,
    code: editingCourseData.value.code.toUpperCase(),
    unit: Number(editingCourseData.value.unit),
  })

  editingCourseId.value = null
}

const handleAddSemester = async () => {
  if (!newSemesterName.value.trim()) return
  const id = await semesterStore.addSemester(newSemesterName.value)
  activeSemesterId.value = id
  newSemesterName.value = ''
}

const handleDeleteSemester = async (id) => {
  if (!confirm('Are you sure you want to delete this semester?')) return
  await semesterStore.deleteSemester(id)
  if (activeSemesterId.value === id) {
    activeSemesterId.value =
      semesterStore.semesters.length > 0 ? semesterStore.semesters[0].id : null
  }
}

const handleAddCourse = async () => {
  if (!activeSemesterId.value || !courseCode.value || courseUnit.value === null) return

  await semesterStore.addCourse(activeSemesterId.value, {
    code: courseCode.value.toUpperCase(),
    unit: Number(courseUnit.value),
    grade: courseGrade.value,
  })

  // Reset Course Form (keep grade as A or last selected?)
  courseCode.value = ''
  courseUnit.value = null
  courseGrade.value = 'A'
}

const handleAddCoursesFromScan = async (courses) => {
  if (!activeSemesterId.value) return

  for (const course of courses) {
    await semesterStore.addCourse(activeSemesterId.value, {
      code: course.code,
      unit: course.unit,
      grade: course.grade,
    })
  }
}

const handleRemoveCourse = async (courseId) => {
  await semesterStore.removeCourse(activeSemesterId.value, courseId)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="glass-card p-6 w-full min-h-[500px] flex flex-col">
    <div class="border-b border-white/10 pb-4 mb-4 flex items-center justify-between">
      <h3 class="text-xl font-bold text-white flex items-center">
        <GraduationCap class="w-6 h-6 mr-2 text-emerald-400" />
        Course Manager
      </h3>
      <div class="text-right">
        <p class="text-xs text-zinc-400">Total Units</p>
        <p class="text-lg font-mono text-emerald-400">{{ semesterStore.totalUnits }}</p>
      </div>
    </div>

    <!-- Semester Tabs/Selector -->
    <div
      class="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-thin flex-wrap justify-between"
    >
      <VueDraggable
        v-model="semestersList"
        item-key="id"
        class="flex items-center gap-2 flex-wrap"
        :animation="200"
      >
        <template #item="{ element: sem }">
          <button
            @click="activeSemesterId = sem.id"
            class="px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 border flex items-center group cursor-grab active:cursor-grabbing"
            :class="
              activeSemesterId === sem.id
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
            "
          >
            <GripVertical class="w-3 h-3 mr-1 opacity-50 group-hover:opacity-100" />
            {{ sem.name }}
            <span
              class="ml-2 text-[10px] px-1.5 py-0.5 rounded-md transition-colors"
              :class="
                activeSemesterId === sem.id
                  ? 'bg-black/20 text-black/70'
                  : 'bg-white/10 text-zinc-400'
              "
            >
              {{ semesterStore.getSemesterGpa(sem) }}
            </span>
          </button>
        </template>
      </VueDraggable>

      <!-- Add Semester Input (Inline for compactness) -->
      <div
        class="flex items-center bg-zinc-900/50 rounded-full border border-zinc-700 focus-within:border-emerald-500 transition-colors pl-3 pr-1 py-1 ml-2"
      >
        <input
          v-model="newSemesterName"
          placeholder="New Sem (e.g. Year 1)"
          class="bg-transparent text-sm w-32 focus:outline-none text-white placeholder-zinc-600"
          @keyup.enter="handleAddSemester"
        />
        <button
          @click="handleAddSemester"
          class="p-1 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Active Semester Content -->
    <div v-if="activeSemesterId" class="flex-1">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-2 flex-1">
          <div v-if="isEditingName" class="flex items-center gap-2">
            <input
              ref="nameInput"
              v-model="editingName"
              class="bg-black/30 border border-zinc-700 rounded px-2 py-1 text-white text-lg font-medium focus:border-emerald-500 focus:outline-none"
              @keyup.enter="saveSemesterName"
              @blur="saveSemesterName"
            />
            <button
              @click="saveSemesterName"
              class="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
            >
              <Check class="w-4 h-4" />
            </button>
            <button @click="cancelEditName" class="p-1 text-red-400 hover:bg-red-500/10 rounded">
              <XIcon class="w-4 h-4" />
            </button>
          </div>
          <h4 v-else class="text-zinc-300 font-medium flex items-center text-lg">
            {{ semesterStore.semesters.find((s) => s.id === activeSemesterId)?.name }}
            <button
              @click="startEditingName"
              class="ml-2 p-1 text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
          </h4>

          <span
            v-if="!isEditingName"
            class="text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20"
          >
            GPA:
            {{
              semesterStore.getSemesterGpa(
                semesterStore.semesters.find((s) => s.id === activeSemesterId),
              )
            }}
          </span>
        </div>

        <button
          @click="handleDeleteSemester(activeSemesterId)"
          class="text-xs text-red-500 hover:text-red-400 flex items-center"
        >
          <Trash2 class="w-3 h-3 mr-1" /> Remove Semester
        </button>
      </div>

      <div class="flex justify-end mb-4">
        <button
          @click="isScannerOpen = true"
          class="flex items-center text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors"
        >
          <Camera class="w-3.5 h-3.5 mr-1.5" />
          Scan Result Slip
        </button>
      </div>

      <!-- Add Course Form -->
      <div class="bg-zinc-900/40 p-4 rounded-xl mb-6 border border-white/5">
        <div class="grid grid-cols-12 gap-3 mb-3">
          <div class="col-span-12 md:col-span-5">
            <label class="block text-xs text-zinc-500 mb-1">Course Code</label>
            <input
              v-model="courseCode"
              placeholder="CSC 101"
              class="w-full bg-black/30 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm uppercase"
            />
          </div>
          <div class="col-span-12 md:col-span-3">
            <label class="block text-xs text-zinc-500 mb-1">Units</label>
            <input
              v-model="courseUnit"
              type="number"
              min="0"
              placeholder="3"
              class="w-full bg-black/30 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
            />
          </div>
          <div class="col-span-12 md:col-span-4 flex items-end">
            <button
              @click="handleAddCourse"
              class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center text-sm"
            >
              <Plus class="w-4 h-4 mr-1" /> Add Course
            </button>
          </div>
        </div>

        <!-- Grade Selector -->
        <div>
          <label class="block text-xs text-zinc-500 mb-2">Grade</label>
          <div class="relative">
            <select
              v-model="courseGrade"
              class="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-8 py-2 text-white focus:border-emerald-500 focus:outline-none transition-all cursor-pointer h-10"
            >
              <option v-for="grade in grades" :key="grade" :value="grade">{{ grade }}</option>
            </select>
            <div
              class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Course List -->
      <div class="space-y-2">
        <div
          v-for="course in semesterStore.semesters.find((s) => s.id === activeSemesterId)?.courses"
          :key="course.id"
          class="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
        >
          <div v-if="editingCourseId === course.id" class="flex-1 flex items-center gap-2 mr-2">
            <input
              v-model="editingCourseData.code"
              class="w-20 bg-black/30 border border-zinc-700 rounded px-2 py-1 text-white text-sm font-bold uppercase focus:border-emerald-500 focus:outline-none"
              placeholder="Code"
              @keyup.enter="saveCourseEdit"
            />
            <input
              v-model="editingCourseData.unit"
              type="number"
              min="0"
              class="w-12 bg-black/30 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none"
              @keyup.enter="saveCourseEdit"
            />
            <select
              v-model="editingCourseData.grade"
              class="w-14 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none"
            >
              <option v-for="grade in grades" :key="grade" :value="grade">{{ grade }}</option>
            </select>

            <button
              @click="saveCourseEdit"
              class="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded"
            >
              <Check class="w-4 h-4" />
            </button>
            <button @click="cancelEditCourse" class="text-red-400 hover:bg-red-500/10 p-1 rounded">
              <XIcon class="w-4 h-4" />
            </button>
          </div>

          <div
            v-else
            class="flex items-center flex-1 cursor-pointer"
            @click="startEditingCourse(course)"
          >
            <div
              class="w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm mr-3"
              :class="
                course.grade === 'A'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : course.grade === 'F'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
              "
            >
              {{ course.grade }}
            </div>
            <div>
              <p class="font-bold text-sm text-zinc-200">{{ course.code }}</p>
              <p class="text-xs text-zinc-500">{{ course.unit }} Units</p>
            </div>
            <Pencil class="w-3 h-3 ml-2 text-zinc-600 opacity-0 group-hover:opacity-50" />
          </div>

          <button
            v-if="editingCourseId !== course.id"
            @click.stop="handleRemoveCourse(course.id)"
            class="p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
        <p
          v-if="!semesterStore.semesters.find((s) => s.id === activeSemesterId)?.courses.length"
          class="text-center text-zinc-600 text-sm py-8"
        >
          No courses added to this semester yet.
        </p>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-zinc-500">
      <BookOpen class="w-12 h-12 mb-4 opacity-50" />
      <p>Create a semester to get started</p>
    </div>
  </div>

  <ScannerModal
    :is-open="isScannerOpen"
    @close="isScannerOpen = false"
    @add-courses="handleAddCoursesFromScan"
  />
</template>
