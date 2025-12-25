import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbService } from '@/services/db'

export const useUserStore = defineStore('user', () => {
  const profile = ref({
    name: 'Guest User',
    name: 'Guest User',
    department: 'General',
    photoBlob: null,
    biometricsEnabled: false,
  })

  // Auth state - simplified for simulation
  const isAuthenticated = ref(!profile.value.biometricsEnabled)

  async function loadProfile() {
    try {
      const data = await dbService.getUserProfile()
      if (data) {
        profile.value = data
        // If biometrics enabled, lock initially
        isAuthenticated.value = !data.biometricsEnabled
      }
    } catch (err) {
      console.error('Failed to load profile', err)
    }
  }

  async function updateProfile(updates) {
    try {
      const newProfile = { ...profile.value, ...updates }
      await dbService.saveUserProfile(newProfile)
      profile.value = newProfile
    } catch (err) {
      console.error('Failed to save profile', err)
    }
  }

  // Biometric Auth Logic
  // Biometric Auth Logic
  // Biometric Auth Logic
  // We use navigator.credentials.create() (Make a Credential) as a "Verify User" prompt.
  // This triggers face/touch ID without needing to manage stored credentials.
  async function authenticate() {
    if (!profile.value.biometricsEnabled) {
      isAuthenticated.value = true
      return true
    }

    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32)
        window.crypto.getRandomValues(challenge)

        const userId = new Uint8Array(16)
        window.crypto.getRandomValues(userId)

        const publicKey = {
          challenge,
          rp: {
            name: 'CGPA Analyst',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: 'verify-user',
            displayName: 'User Verification',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        }

        // Trigger biometric prompt (FaceID/TouchID/Windows Hello)
        await navigator.credentials.create({ publicKey })

        isAuthenticated.value = true
        return true
      }

      // Fallback
      await new Promise((resolve) => setTimeout(resolve, 500))
      isAuthenticated.value = true
      return true
    } catch (e) {
      console.error('Biometric verification failed', e)
      return false
    }
  }

  async function toggleBiometrics(enabled) {
    // Just toggle the setting. Authentication will be forced on next load.
    // We no longer strip credentials because we generate them ephemerally.
    updateProfile({ biometricsEnabled: enabled })
  }

  return {
    profile,
    isAuthenticated,
    loadProfile,
    updateProfile,
    authenticate,
    toggleBiometrics,
  }
})
