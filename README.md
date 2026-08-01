# Pokémon Speed

Minijuego web para entrenar la **Velocidad Base** de los Pokémon permitidos en
Pokémon Champions, Reglamento M-B. Se responde si el retador es más rápido o
más lento que el Pokémon de referencia.

## Requisitos y uso

```bash
npm install
npm run dev
```

Para producción y comprobaciones:

```bash
npm run validate:data
npm run test
npm run build
```

## Datos

`src/data/pokemon-mb.json` es una instantánea local del Reglamento M-B:
310 entradas (235 especies/formas y 75 megaevoluciones). El juego no consulta
una API durante la partida. Se generó a partir de la lista y páginas de WikiDex;
las imágenes se enlazan a WikiDex y no se incluyen en el repositorio.

Para regenerar el dataset desde WikiDex:

```bash
npm run generate:data
```

Después hay que ejecutar `npm run validate:data`. WikiDex puede aplicar límites
de consulta; el importador usa peticiones por lotes para respetarlos.

Fuentes: [anuncio oficial de M-B](https://champions-news.pokemon-home.com/en/page/776.html)
y [Reglamento M-B de WikiDex](https://www.wikidex.net/wiki/Reglamento_M-B).

Pokémon es una marca de sus respectivos titulares. Esta aplicación no es oficial.
