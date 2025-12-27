<script setup>
import { ref } from 'vue'
import { openDB } from 'idb'
import { Download, Upload, AlertCircle } from 'lucide-vue-next'

const DB_NAME = 'cgpa_calc_db'
const fileInput = ref(null)
const isExporting = ref(false)
const isImporting = ref(false)

const getDB = async () => {
  return openDB(DB_NAME, 1)
}

const exportBackup = async () => {
  try {
    isExporting.value = true
    const db = await getDB()
    const stores = ['semesters', 'user_profile']
    const backupData = {}

    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        backupData[storeName] = await db.getAll(storeName)
      }
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cgpa_backup_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export failed:', error)
    alert('Failed to export data.')
  } finally {
    isExporting.value = false
  }
}

const triggerImport = () => {
  fileInput.value.click()
}

const handleImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const confirmed = window.confirm(
    'WARNING: This will overwrite ALL your current data (courses, grades, profile). This action cannot be undone.\n\nAre you sure you want to proceed?',
  )

  if (!confirmed) {
    fileInput.value.value = '' // Reset input
    return
  }

  isImporting.value = true
  const reader = new FileReader()

  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result)
      const db = await getDB()

      const storesToImport = Object.keys(data).filter((store) =>
        db.objectStoreNames.contains(store),
      )

      if (storesToImport.length === 0) {
        throw new Error('Invalid backup file: No matching data found.')
      }

      const tx = db.transaction(storesToImport, 'readwrite')

      for (const storeName of storesToImport) {
        const store = tx.objectStore(storeName)
        await store.clear()

        for (const item of data[storeName]) {
          await store.put(item)
        }
      }

      await tx.done
      alert('Data restored successfully! App will reload.')
      window.location.reload()
    } catch (error) {
      console.error('Import failed:', error)
      alert('Failed to import data: ' + error.message)
    } finally {
      isImporting.value = false
      fileInput.value.value = '' // Reset input
    }
  }

  reader.readAsText(file)
}
</script>

<template>
  <div class="pt-4 border-t border-white/10">
    <h4 class="text-sm font-bold text-zinc-400 mb-2 flex items-center">
      <Download class="w-4 h-4 mr-1" /> Backup & Restore
    </h4>

    <div class="grid grid-cols-2 gap-3">
      <button
        @click="exportBackup"
        :disabled="isExporting"
        class="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
      >
        <Download class="w-4 h-4" />
        {{ isExporting ? 'Exporting...' : 'Backup' }}
      </button>

      <button
        @click="triggerImport"
        :disabled="isImporting"
        class="flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
      >
        <Upload class="w-4 h-4" />
        {{ isImporting ? 'Restoring...' : 'Restore' }}
      </button>
    </div>

    <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleImport" />

    <div class="mt-2 text-xs text-zinc-600 flex items-start gap-1">
      <AlertCircle class="w-3 h-3 mt-0.5 shrink-0" />
      <p>Restoring a backup will verify overwrite your existing data.</p>
    </div>
  </div>
</template>
