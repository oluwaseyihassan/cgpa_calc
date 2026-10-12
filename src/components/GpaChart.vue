<script setup>
import { computed, ref } from 'vue'
import { useSemesterStore } from '@/stores/semesterStore'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { Maximize2, X } from 'lucide-vue-next'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const semesterStore = useSemesterStore()
const isExpanded = ref(false)

const showGpa = ref(true)
const showCgpa = ref(true)

const toggleDataset = (type) => {
  if (type === 'gpa') {
    if (showGpa.value && !showCgpa.value) return // Prevent hiding both
    showGpa.value = !showGpa.value
  } else if (type === 'cgpa') {
    if (showCgpa.value && !showGpa.value) return // Prevent hiding both
    showCgpa.value = !showCgpa.value
  }
}

const data = computed(() => {
  const trend = semesterStore.gpaTrend
  const datasets = []

  if (showGpa.value) {
    datasets.push({
      label: 'Semester GPA',
      backgroundColor: (context) => {
        const ctx = context.chart?.ctx
        if (!ctx) return 'rgba(16, 185, 129, 0.1)'
        const gradient = ctx.createLinearGradient(0, 0, 0, 320)
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)') // Emerald 500
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)')
        return gradient
      },
      borderColor: '#10b981',
      borderWidth: 2.5,
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: '#10b981',
      pointHoverBorderWidth: 2,
      data: trend.map((t) => t.gpa),
      fill: true,
      tension: 0.35,
    })
  }

  if (showCgpa.value) {
    datasets.push({
      label: 'Cumulative CGPA',
      backgroundColor: (context) => {
        const ctx = context.chart?.ctx
        if (!ctx) return 'rgba(56, 189, 248, 0.1)'
        const gradient = ctx.createLinearGradient(0, 0, 0, 320)
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)') // Sky 400
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)')
        return gradient
      },
      borderColor: '#38bdf8',
      borderWidth: 2.5,
      borderDash: showGpa.value ? [5, 4] : [],
      pointBackgroundColor: '#38bdf8',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: '#38bdf8',
      pointHoverBorderWidth: 2,
      data: trend.map((t) => t.cgpa),
      fill: !showGpa.value,
      tension: 0.35,
    })
  }

  return {
    labels: trend.map((t) => t.semester),
    datasets,
  }
})

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.95)',
      titleColor: '#ffffff',
      titleFont: { weight: 'bold', size: 12 },
      bodyColor: '#e4e4e7',
      bodyFont: { size: 12 },
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      usePointStyle: true,
      callbacks: {
        label: (context) => {
          const val = Number(context.raw).toFixed(2)
          return ` ${context.dataset.label}: ${val}`
        },
      },
    },
  },
  scales: {
    y: {
      min: 0,
      max: 5,
      grid: {
        color: 'rgba(255, 255, 255, 0.08)',
      },
      ticks: {
        color: '#a1a1aa',
        stepSize: 1,
        callback: (value) => value.toFixed(1),
      },
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#a1a1aa',
        maxRotation: 45,
        minRotation: 0,
      },
    },
  },
}
</script>

<template>
  <div class="glass-card p-6 w-full h-[320px] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div>
        <h3 class="text-xl font-bold text-white tracking-tight">Performance Trend</h3>
        <p class="text-[11px] text-zinc-400">Semester GPA vs. Cumulative CGPA</p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Dataset Legend & Toggles -->
        <div class="flex items-center bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
          <button
            id="toggle-gpa-btn"
            type="button"
            @click="toggleDataset('gpa')"
            :class="showGpa ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300 border-transparent'"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none"
            title="Toggle Semester GPA"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
            GPA
          </button>
          <button
            id="toggle-cgpa-btn"
            type="button"
            @click="toggleDataset('cgpa')"
            :class="showCgpa ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'text-zinc-500 hover:text-zinc-300 border-transparent'"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none"
            title="Toggle Cumulative CGPA"
          >
            <span class="w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50"></span>
            CGPA
          </button>
        </div>

        <!-- Maximize Button -->
        <button
          id="maximize-chart-btn"
          @click="isExpanded = true"
          class="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
          title="Maximize Chart"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Chart -->
    <div class="flex-1 w-full min-h-0" v-if="semesterStore.gpaTrend.length > 0">
      <Line :data="data" :options="options" />
    </div>
    <div v-else class="h-full flex items-center justify-center text-zinc-500 text-sm">
      Add semesters to see your trend.
    </div>

    <!-- Expanded Modal -->
    <Teleport to="body">
      <div
        v-if="isExpanded"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        @click.self="isExpanded = false"
      >
        <div
          class="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] p-6 flex flex-col shadow-2xl relative"
        >
          <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h3 class="text-2xl font-bold text-white">Performance Trend</h3>
              <p class="text-sm text-zinc-400">Semester GPA vs. Cumulative CGPA Progression</p>
            </div>

            <div class="flex items-center gap-3">
              <div class="flex items-center bg-zinc-800/80 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  @click="toggleDataset('gpa')"
                  :class="showGpa ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300 border-transparent'"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none"
                >
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  GPA
                </button>
                <button
                  type="button"
                  @click="toggleDataset('cgpa')"
                  :class="showCgpa ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'text-zinc-500 hover:text-zinc-300 border-transparent'"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none"
                >
                  <span class="w-2 h-2 rounded-full bg-sky-400"></span>
                  CGPA
                </button>
              </div>

              <button
                @click="isExpanded = false"
                class="text-zinc-400 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X class="w-6 h-6" />
              </button>
            </div>
          </div>

          <div class="flex-1 w-full min-h-0">
            <Line :data="data" :options="options" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
