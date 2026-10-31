import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative base so the site works from the GitHub Pages project path (/uceni-se-cestiny/).
  base: './',
  test: {
    include: ['src/**/*.test.ts', 'scraper/**/*.test.ts'],
  },
})
