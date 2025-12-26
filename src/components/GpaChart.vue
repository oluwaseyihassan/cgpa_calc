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

const data = computed(() => {
  const trend = semesterStore.gpaTrend
  return {
    labels: trend.map((t) => t.semester),
    datasets: [
      {
        label: 'GPA',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx
          const gradient = ctx.createLinearGradient(0, 0, 0, 400)
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)') // Emerald 500
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)')
          return gradient
        },
        borderColor: '#10b981',
        pointBackgroundColor: '#fff',
        pointBorderColor: '#10b981',
        pointHoverBackgroundColor: '#10b981',
        pointHoverBorderColor: '#fff',
        data: trend.map((t) => t.gpa),
        fill: true,
        tension: 0.4,
      },
    ],
  }
})

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    y: {
      min: 0,
      max: 5,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: '#a1a1aa',
      },
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#a1a1aa',
      },
    },
  },
}
</script>

<template>
  <div class="glass-card p-6 w-full h-[300px] flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-bold text-white">Performance Trend</h3>
      <button
        @click="isExpanded = true"
        class="text-zinc-500 hover:text-white transition-colors p-1"
        title="Maximize"
      >
        <Maximize2 class="w-5 h-5" />
      </button>
    </div>
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
          <button
            @click="isExpanded = false"
            class="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          >
            <X class="w-6 h-6" />
          </button>
          <h3 class="text-2xl font-bold text-white mb-6">Performance Trend</h3>
          <div class="flex-1 w-full min-h-0">
            <Line :data="data" :options="options" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
