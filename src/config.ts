/**
 * Where this project lives on GitHub. One place for the coordinates, so that the scraper's User-Agent and the
 * future `github` data delivery (raw.githubusercontent.com/<owner>/<name>/<branch>/data/...) cannot drift apart.
 */
export const REPOSITORY = {
  owner: '5ZYSZ3K',
  name: 'language-trainer',
  /** The branch the datasets are committed to. */
  branch: 'main',
} as const

export const REPOSITORY_URL = `https://github.com/${REPOSITORY.owner}/${REPOSITORY.name}`
