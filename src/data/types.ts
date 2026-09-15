export type PokemonAssets = {
  wikidexPageUrl: string
  imageUrl: string
  imageAlt: string
}


export const POKEMON_TYPES = ["Acero","Agua","Bicho","Dragón","Eléctrico","Fantasma","Fuego","Hada","Hielo","Lucha","Normal","Planta","Psíquico","Roca","Siniestro","Tierra","Veneno","Volador"] as const

export type PokemonEntry = {
  id: string
  dexNumber: number
  displayName: string
  form: string | null
  baseStats: {
    speed: number
  }
  types: string[]
  isMega: boolean
  assets: PokemonAssets
}

export type PokemonCatalog = {
  schemaVersion: 1
  regulation: `M-${string}`
  snapshotDate: string
  sources: {
    eligibility: { name: string; url: string }
    speeds: { name: string; url: string }
    artwork: { name: string; url: string }
    officialRegulation?: { name: string; url: string }
  }
  pokemon: PokemonEntry[]
}

export type Answer = 'higher' | 'equal' | 'lower'
export type Result = 'correct' | 'incorrect' | 'tie'
