import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbService } from '@/services/db'

export const useSemesterStore = defineStore('semester', () => {
  const semesters = ref([])

  // Load all semesters from DB (Force HMR)
  async function loadAll() {
    const rawSemesters = await dbService.getAllSemesters()
    semesters.value = rawSemesters.sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id))
  }

  // Add a new semester
  async function addSemester(name) {
    const newSem = {
      name,
      courses: [],
      order: semesters.value.length,
    }
    const id = await dbService.addSemester(newSem)
    // Reload to get the ID and correct object shape
    await loadAll()
    return id // Return ID for navigation or confirmation
  }

  // Reorder semesters
  async function reorderSemesters(newSemesters) {
    semesters.value = newSemesters

    // Update order in DB
    const updates = newSemesters.map((sem, index) => {
      // Clone to avoid reactivity issues
      const updatedSem = JSON.parse(JSON.stringify(sem))
      updatedSem.order = index
      return dbService.updateSemester(updatedSem)
    })

    await Promise.all(updates)
  }

  // Delete a semester
  async function deleteSemester(id) {
    await dbService.deleteSemester(id)
    semesters.value = semesters.value.filter((s) => s.id !== id)
  }

  // Rename a semester
  async function renameSemester(id, newName) {
    const semester = semesters.value.find((s) => s.id === id)
    if (!semester) return

    const updatedSemester = JSON.parse(JSON.stringify(semester))
    updatedSemester.name = newName

    await dbService.updateSemester(updatedSemester)
    semester.name = newName
  }

  // Add a course to a semester
  async function addCourse(semesterId, course) {
    const semester = semesters.value.find((s) => s.id === semesterId)
    if (!semester) return

    // Use a clean copy to avoid reactivity issues during DB write
    const updatedSemester = JSON.parse(JSON.stringify(semester))
    updatedSemester.courses.push({
      ...course,
      id: crypto.randomUUID(), // Generate UUID for the course
    })

    await dbService.updateSemester(updatedSemester)
    // Update local state
    semester.courses = updatedSemester.courses
  }

  // Remove a course from a semester
  async function removeCourse(semesterId, courseId) {
    const semester = semesters.value.find((s) => s.id === semesterId)
    if (!semester) return

    const updatedSemester = JSON.parse(JSON.stringify(semester))
    updatedSemester.courses = updatedSemester.courses.filter((c) => c.id !== courseId)

    semester.courses = updatedSemester.courses
  }

  // Update a course
  async function updateCourse(semesterId, updatedCourse) {
    const semester = semesters.value.find((s) => s.id === semesterId)
    if (!semester) return

    const updatedSemester = JSON.parse(JSON.stringify(semester))
    const courseIndex = updatedSemester.courses.findIndex((c) => c.id === updatedCourse.id)
    if (courseIndex === -1) return

    updatedSemester.courses[courseIndex] = updatedCourse

    await dbService.updateSemester(updatedSemester)
    semester.courses = updatedSemester.courses
  }

  // --- GETTERS ---

  // Helper to convert grade to points
  const getGradePoint = (grade) => {
    switch (grade) {
      case 'A':
        return 5
      case 'B':
        return 4
      case 'C':
        return 3
      case 'D':
        return 2
      case 'E':
        return 1
      case 'F':
        return 0
      default:
        return 0
    }
  }

  const cgpa = computed(() => {
    let totalPoints = 0
    let totalUnits = 0

    semesters.value.forEach((sem) => {
      sem.courses.forEach((course) => {
        totalPoints += getGradePoint(course.grade) * Number(course.unit)
        totalUnits += Number(course.unit)
      })
    })

    return totalUnits === 0 ? 0.0 : (totalPoints / totalUnits).toFixed(2)
  })

  const totalUnits = computed(() => {
    let units = 0
    semesters.value.forEach((sem) => {
      sem.courses.forEach((c) => (units += Number(c.unit)))
    })
    return units
  })

  const heatmapData = computed(() => {
    const allCourses = []
    semesters.value.forEach((sem) => {
      sem.courses.forEach((course) => {
        allCourses.push({
          id: course.id,
          code: course.code,
          grade: course.grade,
          unit: course.unit,
          semesterName: sem.name,
        })
      })
    })
    return allCourses
  })

  const gpaTrend = computed(() => {
    return semesters.value.map((sem) => {
      let semPoints = 0
      let semUnits = 0
      sem.courses.forEach((c) => {
        semPoints += getGradePoint(c.grade) * Number(c.unit)
        semUnits += Number(c.unit)
      })
      return {
        semester: sem.name,
        gpa: semUnits === 0 ? 0 : (semPoints / semUnits).toFixed(2),
      }
    })
  })

  // Calculate GPA for a specific semester
  function getSemesterGpa(semester) {
    if (!semester || !semester.courses || semester.courses.length === 0) return '0.00'

    let totalPoints = 0
    let totalUnits = 0

    semester.courses.forEach((course) => {
      totalPoints += getGradePoint(course.grade) * Number(course.unit)
      totalUnits += Number(course.unit)
    })

    return totalUnits === 0 ? '0.00' : (totalPoints / totalUnits).toFixed(2)
  }

  async function clearAllSemesters() {
    await dbService.clearSemesters()
    semesters.value = []
  }

  return {
    semesters,
    loadAll,
    addSemester,
    renameSemester,
    deleteSemester,
    reorderSemesters,
    clearAllSemesters,
    addCourse,
    updateCourse,
    removeCourse,
    getSemesterGpa,
    cgpa,
    totalUnits,
    heatmapData,
    gpaTrend,
  }
})
