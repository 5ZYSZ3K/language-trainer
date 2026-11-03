import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative base so the site works from the GitHub Pages project path (/language-trainer/).
  base: './',
  test: {
    include: ['src/**/*.test.ts', 'scraper/**/*.test.ts', 'scripts/**/*.test.ts'],
    // The dataset loader's import.meta.glob is expanded when its module is transformed; a cached transform would
    // not notice a dataset file that was added or removed since. Still needed (checked with Vitest 5.0.5): with the
    // cache on, a dataset file added after an earlier run stays unknown to the real loader, on every run after it.
    fsModuleCache: false,
  },
})
