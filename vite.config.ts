import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const githubRepository = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GITHUB_REPOSITORY
const repositoryName = githubRepository?.split('/')[1]

export default defineConfig({
  base: repositoryName ? '/' + repositoryName + '/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})

