<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { User, Fingerprint, Building2 } from 'lucide-vue-next'

const userStore = useUserStore()

const isToggling = ref(false)

const toggleBiometrics = async () => {
  isToggling.value = true
  try {
    if (!userStore.profile.biometricsEnabled) {
      if (confirm('Are you sure you want to enable biometric authentication?')) {
        await userStore.toggleBiometrics(true)
      }
    } else {
      await userStore.toggleBiometrics(false)
    }
  } finally {
    isToggling.value = false
  }
}
</script>

<template>
  <div class="glass-card p-6 w-full max-w-md mx-auto relative overflow-hidden group">
    <div class="relative z-10 flex flex-col items-center text-center">
      <!-- Photo -->
      <div class="relative mb-6">
        <div
          class="w-20 h-20 rounded-full border-4 border-white/10 overflow-hidden shadow-xl bg-black/50 flex items-center justify-center"
        >
          <User class="w-12 h-12 text-zinc-500" />
        </div>
      </div>

      <!-- Details -->
      <h2 class="text-2xl font-bold text-white mb-1">{{ userStore.profile.name }}</h2>
      <p class="text-emerald-400 font-medium text-sm mb-6 uppercase tracking-wider">Student</p>

      <div class="w-full space-y-3 mb-8 text-left">
        <div class="flex items-center p-3 rounded-lg bg-white/5 border border-white/5">
          <Building2 class="w-5 h-5 text-zinc-400 mr-3" />
          <div>
            <p class="text-xs text-zinc-500">Department</p>
            <p class="text-zinc-200">{{ userStore.profile.department }}</p>
          </div>
        </div>
      </div>

      <!-- Biometric Toggle -->
      <div
        class="w-full flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5"
      >
        <div class="flex items-center">
          <div class="p-2 rounded-lg bg-emerald-500/20 mr-3">
            <Fingerprint class="w-5 h-5 text-emerald-400" />
          </div>
          <div class="text-left">
            <p class="text-sm font-medium text-white">Biometrics</p>
            <p class="text-xs text-zinc-500">
              {{ userStore.profile.biometricsEnabled ? 'Enabled' : 'Disabled' }}
            </p>
          </div>
        </div>

        <button
          @click="toggleBiometrics"
          :disabled="isToggling"
          class="relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
          :class="userStore.profile.biometricsEnabled ? 'bg-emerald-600' : 'bg-zinc-700'"
        >
          <div
            v-if="!isToggling"
            class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200"
            :class="userStore.profile.biometricsEnabled ? 'translate-x-5' : 'translate-x-0'"
          ></div>
          <div v-else class="absolute top-1 left-[14px] w-5 h-5 flex items-center justify-center">
            <div
              class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"
            ></div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
