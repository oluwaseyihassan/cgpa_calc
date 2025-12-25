import { openDB } from 'idb'

const DB_NAME = 'cgpa_calc_db'
const DB_VERSION = 1

export const dbService = {
  async getDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store 1: Semesters
        if (!db.objectStoreNames.contains('semesters')) {
          const semesterStore = db.createObjectStore('semesters', {
            keyPath: 'id',
            autoIncrement: true,
          })
          semesterStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store 2: User Profile
        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', { keyPath: 'id' })
        }
      },
    })
  },

  // Semester Operations
  async getAllSemesters() {
    const db = await this.getDB()
    return db.getAll('semesters')
  },

  async addSemester(semester) {
    const db = await this.getDB()
    return db.add('semesters', {
      ...semester,
      timestamp: new Date(),
    })
  },

  async deleteSemester(id) {
    const db = await this.getDB()
    return db.delete('semesters', id)
  },

  async updateSemester(semester) {
    const db = await this.getDB()
    return db.put('semesters', semester)
  },

  // User Profile Operations
  async getUserProfile() {
    const db = await this.getDB()
    const profile = await db.get('user_profile', 1)
    return profile || null
  },

  async saveUserProfile(profile) {
    const db = await this.getDB()
    // Always ID 1 for single user
    const profileToSave = { ...profile, id: 1 }
    return db.put('user_profile', profileToSave)
  },

  async clearSemesters() {
    const db = await this.getDB()
    return db.clear('semesters')
  },
}
