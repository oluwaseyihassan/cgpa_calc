<script setup>
import { computed } from 'vue'
import { useSemesterStore } from '@/stores/semesterStore'

const semesterStore = useSemesterStore()
const heatmapData = computed(() => semesterStore.heatmapData)

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
        :class="getGradeColor(item.grade)"
      >
        <!-- Tooltip -->
        <div
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-black/90 border border-white/10 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 backdrop-blur-md shadow-xl"
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

    <div
      v-else
      class="text-center py-12 text-zinc-600 border border-dashed border-zinc-800 rounded-xl"
    >
      <p>No courses added yet.</p>
      <p class="text-xs mt-2">Add semesters and courses to see visibility.</p>
    </div>
  </div>
</template>
