<script setup>
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSemesterStore } from '@/stores/semesterStore'
import CourseManager from '@/components/CourseManager.vue'
import GpaChart from '@/components/GpaChart.vue'
import GradeHeatmap from '@/components/GradeHeatmap.vue'
import InstallPrompt from '@/components/InstallPrompt.vue'
import LockScreen from '@/components/LockScreen.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import CgpaOverview from '@/components/CgpaOverview.vue'
import { Activity, Settings } from 'lucide-vue-next'

const userStore = useUserStore()
const semesterStore = useSemesterStore()

const showSettings = ref(false)

onMounted(async () => {
  await userStore.loadProfile()
  await semesterStore.loadAll()
})
</script>

<template>
  <div
    class="min-h-screen relative overflow-hidden bg-zinc-950 dotted-bg selection:bg-emerald-500/30 selection:text-emerald-200"
  >
    <!-- Abstract Background -->
    <div class="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
      <div
        class="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[100px]"
      ></div>
      <div
        class="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]"
      ></div>
    </div>

    <!-- Main Container -->
    <div class="max-w-7xl mx-auto px-4 py-4 md:px-8">
      <!-- Header -->
      <header
        class="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b border-white/5 pb-2"
      >
        <div>
          <h1 class="text-2xl md:text-4xl font-bold text-white tracking-tighter">CGPA Calc</h1>
        </div>

        <div class="text-right flex items-end gap-6 justify-end">
          <button
            @click="showSettings = true"
            class="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <Settings class="w-6 h-6" />
          </button>
        </div>
      </header>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column: Identity & Heatmap -->
        <div class="lg:col-span-4 space-y-8">
          <CgpaOverview />
          <GpaChart />
          <GradeHeatmap />
        </div>

        <!-- Right Column: Course Management -->
        <div class="lg:col-span-8">
          <CourseManager />
        </div>
      </div>
    </div>

    <InstallPrompt />
    <SettingsModal v-model:open="showSettings" />
    <LockScreen />
  </div>
</template>

<style scoped>
/* Optional dot pattern */
.dotted-bg {
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}
</style>
