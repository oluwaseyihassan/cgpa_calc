<script setup>
import { ref, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSemesterStore } from '@/stores/semesterStore'
import { X, Save, Settings, Trash2 } from 'lucide-vue-next'
import StudentIdCard from '@/components/StudentIdCard.vue'

const props = defineProps(['open'])
const emit = defineEmits(['update:open'])

const userStore = useUserStore()
const semesterStore = useSemesterStore()

const form = ref({
  name: '',
  department: '',
})

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = { ...userStore.profile }
    }
  },
)

const handleSave = async () => {
  await userStore.updateProfile(form.value)
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
      <div class="glass-card w-full max-w-md p-6 relative bg-zinc-900 border border-white/10">
        <button
          @click="$emit('update:open', false)"
          class="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-xl font-bold text-white mb-6 flex items-center">
          <Settings class="w-5 h-5 mr-2 text-emerald-500" />
          Settings & Profile
        </h3>

        <div class="mb-8">
          <StudentIdCard />
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs text-zinc-500 mb-1">Full Name</label>
            <input
              v-model="form.name"
              class="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label class="block text-xs text-zinc-500 mb-1">Department</label>
            <input
              v-model="form.department"
              class="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          <div class="pt-4 border-t border-white/10">
            <h4 class="text-sm font-bold text-red-500 mb-2 flex items-center">
              <Trash2 class="w-4 h-4 mr-1" /> Data Management
            </h4>
            <button
              @click="handleReset"
              class="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Reset All Semester Data
            </button>
          </div>
        </div>

        <button
          @click="handleSave"
          class="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center"
        >
          <Save class="w-4 h-4 mr-2" /> Save Changes
        </button>
      </div>
    </div>
  </Transition>
</template>
