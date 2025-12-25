# CGPA Calculator PWA

A modern, offline-capable Progressive Web App (PWA) for tracking academic performance. Built with Vue 3, Tailwind CSS, and IndexedDB, featuring a premium "Analyst + Glass" aesthetic.

## Features

- **📊 Modern Dashboard**: A glassmorphism-inspired UI with a dark mode focus, providing a premium user experience.
- **✨ CGPA Tracking**: Automatically calculates Cumulative Grade Point Average (CGPA) and displays your Degree Class (e.g., First Class Honors).
- **📈 Visual Analytics**:
  - **GPA Trend Chart**: Visualize your performance trajectory over semesters.
  - **Grade Heatmap**: A color-coded grid view of all your course grades.
- **🔐 Biometric Privacy**: protect your data with biometric authentication (TouchID/FaceID/Windows Hello) using WebAuthn.
- **💾 Offline-First**: All data is persisted locally using IndexedDB (`idb`), ensuring the app works flawlessly without an internet connection.
- **📱 PWA Ready**: Installable on mobile and desktop devices for a native app-like experience.
- **📅 Semester Management**: Organize courses by semester, track semester-specific GPAs, and easily manage your academic history.

## Technology Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Persistence**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb`)
- **PWA**: [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- **Icons**: [Lucide Vue](https://lucide.dev/)
- **Charts**: [Chart.js](https://www.chartjs.org/) (via `vue-chartjs`)
- **Drag & Drop**: [VueDraggable](https://github.com/SortableJS/vue.draggable.next)

## Project Setup

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/oluwaseyihassan/cgpa_calc.git
    cd cgpa-calc
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Start the development server with hot-reload:

```bash
npm run dev
```

### Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Usage Guide

1.  **Add Semesters**: Use the "+" button in the Course Manager to create semesters (e.g., "Year 1 Sem 1").
2.  **Add Courses**: Select a semester and add courses with their code, units, and grade.
3.  **View Progress**: Watch your CGPA update instantly in the top-left card and see trends in the charts.
4.  **Settings**: Click the cog icon to access your profile settings. Here you can:
    - Update your name and department.
    - Enable/Disable Biometric Security.
    - Reset all data if needed.
5.  **Biometrics**: Enabling biometrics adds a secure lock screen that requires device authentication to unlock.

## License

MIT
