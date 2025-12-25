<script setup>
import { useUserStore } from '@/stores/userStore'
import { Fingerprint, Lock, Unlock } from 'lucide-vue-next'
import { ref } from 'vue'

const userStore = useUserStore()
const isLoading = ref(false)
const error = ref('')

const handleUnlock = async () => {
  isLoading.value = true
  error.value = ''

  // Tiny delay for UX
  await new Promise((r) => setTimeout(r, 300))

  const success = await userStore.authenticate()
  if (!success) {
    error.value = 'Authentication failed. Please try again.'
  }
  isLoading.value = false
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-500 ease-in-out"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-500 ease-in-out"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div
      v-if="!userStore.isAuthenticated"
      class="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-4"
    >
      <!-- Background Effects -->
      <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          class="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px]"
        ></div>
        <div
          class="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px]"
        ></div>
      </div>

      <div class="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        <div
          class="mb-8 p-6 rounded-full bg-white/5 border border-white/10 shadow-2xl relative group"
        >
          <div
            class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          ></div>
          <Lock class="w-12 h-12 text-white" />
        </div>

        <h2 class="text-3xl font-display font-bold text-white mb-2">Welcome Back</h2>
        <p class="text-zinc-400 mb-12">Identify yourself to access your dashboard</p>

        <button
          @click="handleUnlock"
          :disabled="isLoading"
          class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg shadow-lg shadow-emerald-900/50 hover:shadow-emerald-900/80 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div
            v-if="isLoading"
            class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"
          ></div>
          <Fingerprint v-else class="w-6 h-6 mr-3" />

          {{ isLoading ? 'Verifying...' : 'Unlock Dashboard' }}
        </button>

        <p v-if="error" class="mt-4 text-red-500 text-sm animate-pulse">{{ error }}</p>

        <div class="mt-12 flex items-center text-xs text-zinc-600">
          <Lock class="w-3 h-3 mr-1" /> Secured by WebAuthn
        </div>
      </div>
    </div>
  </Transition>
</template>
