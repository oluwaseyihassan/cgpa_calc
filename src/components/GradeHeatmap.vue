<script setup>
import { computed, ref } from 'vue'
import { useSemesterStore } from '@/stores/semesterStore'

const semesterStore = useSemesterStore()
const heatmapData = computed(() => semesterStore.heatmapData)
const selectedCourseId = ref(null)

const toggleTooltip = (id) => {
  selectedCourseId.value = selectedCourseId.value === id ? null : id
}

const gradePercentages = computed(() => {
  const total = heatmapData.value.length
  if (total === 0) return []

  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }

  heatmapData.value.forEach((item) => {
    if (gradeCounts.hasOwnProperty(item.grade)) {
      gradeCounts[item.grade]++
    }
  })

  return Object.entries(gradeCounts)
    .map(([grade, count]) => ({
      grade,
      count,
      percentage: ((count / total) * 100).toFixed(1),
    }))
    .filter((item) => item.count > 0)
})

const getGradeColor = (grade) => {
  switch (grade) {
    case 'A':
      return 'bg-emerald-500 hover:bg-emerald-400'
    case 'B':
      return 'bg-emerald-600/70 hover:bg-emerald-500/70'
    case 'C':
      return 'bg-amber-400 hover:bg-amber-300'
    case 'D':
      return 'bg-amber-600/70 hover:bg-amber-500/70'
    case 'F':
      return 'bg-red-600 hover:bg-red-500'
    default:
      return 'bg-zinc-800 hover:bg-zinc-700'
  }
}

const getGradeBadgeColor = (grade) => {
  switch (grade) {
    case 'A':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'B':
      return 'bg-emerald-600/20 text-emerald-500 border-emerald-600/30'
    case 'C':
      return 'bg-amber-400/20 text-amber-400 border-amber-400/30'
    case 'D':
      return 'bg-amber-600/20 text-amber-500 border-amber-600/30'
    case 'F':
      return 'bg-red-600/20 text-red-400 border-red-500/30'
    default:
      return 'bg-zinc-800/20 text-zinc-400 border-zinc-700/30'
  }
}
</script>

<template>
  <div class="glass-card p-6 w-full">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-bold text-white">Academic Performance</h3>
      <!-- <div class="flex gap-2 text-xs">
        <span class="flex items-center"
          ><div class="w-3 h-3 rounded-sm bg-emerald-500 mr-1"></div>
          Excellent</span
        >
        <span class="flex items-center"
          ><div class="w-3 h-3 rounded-sm bg-amber-400 mr-1"></div>
          Warning</span
        >
        <span class="flex items-center"
          ><div class="w-3 h-3 rounded-sm bg-red-600 mr-1"></div>
          Danger</span
        >
      </div> -->
    </div>

    <div v-if="heatmapData.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="item in heatmapData"
        :key="item.id"
        class="relative group w-10 h-10 rounded-md transition-all duration-300 cursor-pointer shadow-lg border border-white/5"
        :class="[
          getGradeColor(item.grade),
          selectedCourseId === item.id ? 'ring-2 ring-white/50' : '',
        ]"
        @click="toggleTooltip(item.id)"
      >
        <!-- Tooltip -->
        <div
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-black/90 border border-white/10 rounded-lg text-xs text-white transition-opacity z-20 backdrop-blur-md shadow-xl"
          :class="
            selectedCourseId === item.id
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 pointer-events-none'
          "
        >
          <p class="font-bold mb-1">{{ item.code }}</p>
          <div class="flex gap-2 text-zinc-400">
            <span>{{ item.semesterName }}</span>
            <span class="text-white">{{ item.unit }} Units</span>
            <span class="text-emerald-400">{{ item.grade }}</span>
          </div>
          <!-- Arrow -->
          <div
            class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"
          ></div>
        </div>

        <div
          class="w-full h-full flex items-center justify-center text-xs font-bold text-black/50 group-hover:text-black/80"
        >
          {{ item.grade }}
        </div>
      </div>
    </div>

    <!-- Grade Percentages -->
    <div v-if="gradePercentages.length > 0" class="mt-4 pt-4 border-t border-white/10">
      <p class="text-xs text-zinc-500 mb-3">Grade Distribution</p>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="item in gradePercentages"
          :key="item.grade"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm"
          :class="getGradeBadgeColor(item.grade)"
        >
          <span class="font-bold">{{ item.grade }}</span>
          <span class="opacity-70">{{ item.percentage }}%</span>
        </div>
      </div>
    </div>

    <div
      v-else
      class="text-center py-12 text-zinc-600 border border-dashed border-zinc-800 rounded-xl"
    >
      <p>No courses added yet.</p>
      <p class="text-xs mt-2">Add semesters and courses to see visibility.</p>
    </div>
  </div>
</template>
