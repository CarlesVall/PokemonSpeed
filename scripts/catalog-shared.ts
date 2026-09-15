export const catalogMetadata = {
  schemaVersion: 1 as const,
  regulation: 'M-B' as const,
  snapshotDate: '2026-08-01',
  sources: {
    eligibility: { name: 'WikiDex ? Reglamento M-B', url: 'https://www.wikidex.net/wiki/Reglamento_M-B' },
    speeds: { name: 'PokéBase · Pokémon Champions Speed Tiers', url: 'https://pokebase.app/pokemon-champions/speed-tiers' },
    artwork: { name: 'WikiDex CDN', url: 'https://www.wikidex.net/' },
  },
}

export const createCatalog = <T>(pokemon: T[]) => ({ ...catalogMetadata, pokemon })

export const createRegulationCatalog = <T>(
  regulation: string,
  sources: {
    eligibility: { name: string; url: string }
    speeds: { name: string; url: string }
    artwork: { name: string; url: string }
    officialRegulation: { name: string; url: string }
  },
  pokemon: T[],
) => ({
  schemaVersion: 1 as const,
  regulation: regulation as `M-${string}`,
  snapshotDate: new Date().toISOString().slice(0, 10),
  sources,
  pokemon,
})