<script setup>
import { computed } from 'vue'
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
  <div class="glass-card p-6 w-full h-[300px]">
    <h3 class="text-xl font-bold text-white mb-4">Performance Trend</h3>
    <div class="h-[220px] w-full" v-if="semesterStore.gpaTrend.length > 0">
      <Line :data="data" :options="options" />
    </div>
    <div v-else class="h-full flex items-center justify-center text-zinc-500 text-sm">
      Add semesters to see your trend.
    </div>
  </div>
</template>
