export type RegulationConfig = {
  code: `M-${string}`
  wikidexPage: string
  wikidexUrl: string
  officialUrl: string
  baselineCode?: `M-${string}`
  minimumNewSpecies?: number
}

const regulations = {
  'M-B': {
    code: 'M-B',
    wikidexPage: 'Reglamento M-B',
    wikidexUrl: 'https://www.wikidex.net/wiki/Reglamento_M-B',
    officialUrl: 'https://champions-news.pokemon-home.com/en/page/776.html',
  },
  'M-C': {
    code: 'M-C',
    wikidexPage: 'Reglamento M-C',
    wikidexUrl: 'https://www.wikidex.net/wiki/Reglamento_M-C',
    officialUrl: 'https://champions-news.pokemon-home.com/en/page/816.html',
    baselineCode: 'M-B',
    minimumNewSpecies: 26,
  },
} satisfies Record<string, RegulationConfig>

export const getRegulationConfig = (code: string): RegulationConfig => {
  const regulation = regulations[code as keyof typeof regulations]
  if (!regulation) throw new Error(`Reglamento no configurado: ${code}. Añádelo a scripts/regulation-config.ts.`)
  return regulation
}
