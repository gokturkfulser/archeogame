import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 240_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // Typing and curtains are shortened; the play-through is about logic, not timing.
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 810 } } },
    { name: 'phone', use: { viewport: { width: 844, height: 390 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173/efes/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
