<script setup>
import { ref, watch, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSemesterStore } from '@/stores/semesterStore'
import { X, Save, Settings, Trash2, Calculator } from 'lucide-vue-next'
import StudentIdCard from '@/components/StudentIdCard.vue'
import DataBackup from '@/components/DataBackup.vue'

const props = defineProps(['open'])
const emit = defineEmits(['update:open'])

const userStore = useUserStore()
const semesterStore = useSemesterStore()

const form = ref({
  name: '',
  department: '',
  decimalPlaces: 2,
})

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = {
        name: userStore.profile.name || '',
        department: userStore.profile.department || '',
        decimalPlaces: userStore.profile.decimalPlaces ?? 2,
      }
    }
  },
  { immediate: true }
)

const sampleCgpaPreview = computed(() => {
  const current = Number(semesterStore.cgpa) || 3.75
  const dec = Number(form.value.decimalPlaces) || 2
  return current.toFixed(dec)
})

const precisionOptions = [
  { value: 1, label: '0.0', desc: '1 Decimal' },
  { value: 2, label: '0.00', desc: '2 Decimals (Standard)' },
  { value: 3, label: '0.000', desc: '3 Decimals' },
  { value: 4, label: '0.0000', desc: '4 Decimals' },
]

const handleSave = async () => {
  await userStore.updateProfile({
    name: form.value.name,
    department: form.value.department,
    decimalPlaces: Number(form.value.decimalPlaces),
  })
  emit('update:open', false)
}

const handleReset = async () => {
  if (confirm('Are you sure you want to delete ALL semester data? This cannot be undone.')) {
    await semesterStore.clearAllSemesters()
    emit('update:open', false)
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        class="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar p-6 relative bg-zinc-900 border border-white/10"
      >
        <button
          id="close-settings-btn"
          @click="$emit('update:open', false)"
          class="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-xl font-bold text-white mb-6 flex items-center">
          <Settings class="w-5 h-5 mr-2 text-emerald-500" />
          Settings & Profile
        </h3>

        <div class="mb-6">
          <StudentIdCard />
        </div>

        <div class="space-y-5">
          <!-- Profile Fields -->
          <div>
            <label class="block text-xs text-zinc-400 font-medium mb-1.5">Full Name</label>
            <input
              id="settings-name-input"
              v-model="form.name"
              class="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label class="block text-xs text-zinc-400 font-medium mb-1.5">Department</label>
            <input
              id="settings-department-input"
              v-model="form.department"
              class="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          <!-- CGPA Decimal Precision Setting -->
          <div class="pt-4 border-t border-white/10">
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Calculator class="w-4 h-4 text-emerald-400" />
                CGPA Decimal Precision
              </label>
              <span
                id="cgpa-preview-badge"
                class="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
              >
                Preview: {{ sampleCgpaPreview }}
              </span>
            </div>
            <p class="text-[11px] text-zinc-400 mb-3">
              Choose how many decimal places to calculate and display for your GPA & CGPA.
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                v-for="opt in precisionOptions"
                :key="opt.value"
                :id="`decimal-opt-${opt.value}`"
                type="button"
                @click="form.decimalPlaces = opt.value"
                :class="
                  form.decimalPlaces === opt.value
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-md shadow-emerald-500/10'
                    : 'bg-black/40 border-zinc-700/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                "
                class="py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer group"
              >
                <span class="text-base font-mono font-bold">{{ opt.label }}</span>
                <span class="text-[10px] text-zinc-500 group-hover:text-zinc-400 mt-0.5">
                  {{ opt.value }} {{ opt.value === 1 ? 'place' : 'places' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Data Management -->
          <div class="pt-4 border-t border-white/10">
            <h4 class="text-sm font-bold text-red-500 mb-2 flex items-center">
              <Trash2 class="w-4 h-4 mr-1" /> Data Management
            </h4>

            <div class="mb-4">
              <DataBackup />
            </div>

            <button
              id="reset-semester-data-btn"
              @click="handleReset"
              class="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer"
            >
              Reset All Semester Data
            </button>
          </div>
        </div>

        <button
          id="save-settings-btn"
          @click="handleSave"
          class="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center cursor-pointer active:scale-98"
        >
          <Save class="w-4 h-4 mr-2" /> Save Changes
        </button>
      </div>
    </div>
  </Transition>
</template>
