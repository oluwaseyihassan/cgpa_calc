<script setup>
import { computed } from 'vue'
import { useSemesterStore } from '@/stores/semesterStore'
import { Trophy, Star, Award, TrendingUp } from 'lucide-vue-next'

const semesterStore = useSemesterStore()

const degreeClass = computed(() => {
  const cgpa = Number(semesterStore.cgpa)
  const totalUnits = semesterStore.totalUnits

  if (totalUnits === 0)
    return { label: 'No Grades Yet', color: 'text-zinc-500', bg: 'bg-zinc-500/10' }

  if (cgpa >= 4.5)
    return { label: 'First Class Honors', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
  if (cgpa >= 3.5)
    return { label: 'Second Class Upper', color: 'text-emerald-300', bg: 'bg-emerald-500/10' }
  if (cgpa >= 2.4)
    return { label: 'Second Class Lower', color: 'text-amber-400', bg: 'bg-amber-500/20' }
  if (cgpa >= 1.5) return { label: 'Third Class', color: 'text-amber-600', bg: 'bg-amber-600/20' }
  if (cgpa >= 1.0) return { label: 'Pass', color: 'text-zinc-400', bg: 'bg-zinc-500/20' }
  return { label: 'Fail', color: 'text-red-500', bg: 'bg-red-500/20' }
})

const cgpaColor = computed(() => {
  const cgpa = Number(semesterStore.cgpa)
  const totalUnits = semesterStore.totalUnits

  if (totalUnits === 0) return 'text-zinc-500'

  if (cgpa >= 4.5) return 'text-emerald-400'
  if (cgpa >= 3.5) return 'text-emerald-300'
  if (cgpa >= 2.5) return 'text-amber-400'
  return 'text-red-500'
})
</script>

<template>
  <div class="glass-card p-6 relative overflow-hidden group">
    <!-- Decorative BG -->
    <div
      class="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl transition-colors duration-700"
      :class="degreeClass.bg.replace('/20', '/10')"
    ></div>

    <div class="relative z-10">
      <div class="flex items-center justify-between mb-2">
        <h3
          class="text-zinc-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2"
        >
          <Trophy class="w-4 h-4 text-emerald-500" />
          Academic Standing
        </h3>
      </div>

      <div class="flex items-end gap-4 mt-4">
        <div class="text-6xl font-bold font-mono tracking-tighter" :class="cgpaColor">
          {{ semesterStore.cgpa }}
        </div>
        <div class="mb-2">
          <div
            class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/5 inline-flex items-center gap-2"
            :class="[degreeClass.text, degreeClass.bg, degreeClass.color]"
          >
            <component
              :is="
                Number(semesterStore.cgpa) >= 4.5
                  ? Star
                  : Number(semesterStore.cgpa) >= 3.5
                    ? Award
                    : TrendingUp
              "
              class="w-3 h-3"
            />
            {{ degreeClass.label }}
          </div>
        </div>
      </div>

      <!-- Progress Bar Visual -->
      <div class="w-full h-1.5 bg-zinc-800 rounded-full mt-6 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-1000 ease-out relative"
          :class="
            Number(semesterStore.cgpa) >= 2.5
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              : 'bg-red-500'
          "
          :style="{ width: `${(Number(semesterStore.cgpa) / 5) * 100}%` }"
        >
          <div class="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse"></div>
        </div>
      </div>
      <div class="flex justify-between text-[10px] text-zinc-600 mt-1 font-mono">
        <span>0.0</span>
        <span>5.0</span>
      </div>
    </div>
  </div>
</template>
