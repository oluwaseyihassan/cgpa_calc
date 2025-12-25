<script setup>
import { ref, onMounted } from 'vue'
import { Download, X } from 'lucide-vue-next'

const deferredPrompt = ref(null)
const showInstall = ref(false)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstall.value = true
  })
})

const installPWA = async () => {
  if (!deferredPrompt.value) return

  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    deferredPrompt.value = null
    showInstall.value = false
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="showInstall"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
    >
      <div
        class="glass flex items-center p-4 rounded-xl border border-emerald-500/30 shadow-2xl bg-black/80"
      >
        <div class="p-3 bg-emerald-500/20 rounded-lg mr-4">
          <Download class="w-6 h-6 text-emerald-400" />
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-white text-sm">Install App</h4>
          <p class="text-xs text-zinc-400">Install for offline access and better experience.</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="showInstall = false"
            class="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
          <button
            @click="installPWA"
            class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
