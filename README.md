# Pokémon Speed

## Juega en línea

[**Abrir Pokémon Speed en GitHub Pages**](https://carlesvall.github.io/PokemonSpeed/)

Herramienta web no oficial para entrenar y consultar la **Velocidad Base** de los Pokémon permitidos en **Pokémon Champions · Reglamento M-B**. Está pensada para practicar decisiones de velocidad y preparar combates dobles desde el navegador, sin cuenta ni servidor.

## Funciones

- **Comparar:** responde si el Pokémon retador es más rápido, igual o más lento que el de referencia. La partida encadena rondas y guarda la mejor racha en el navegador.
- **Adivinar velocidad:** escribe la Velocidad Base exacta del Pokémon mostrado. Si fallas, se revela el valor y recibes una pista de si era mayor o menor.
- **Tabla de velocidades:** consulta el catálogo completo, busca por nombre o forma, filtra por uno o dos tipos y por rangos de Velocidad Base, y cambia el orden de la tabla.
- **Simulación de combate doble:** crea equipos de hasta seis Pokémon por lado, elige dos combatientes y visualiza el orden de movimiento. Permite ajustar puntos de velocidad, naturaleza, etapas de Velocidad, Viento Afín, Espacio Raro, clima y las habilidades meteorológicas compatibles disponibles en la interfaz.
- **Formas y megaevoluciones:** las formas incluidas y cada megaevolución se tratan como entradas independientes, con su propia Velocidad Base.

## Catálogo y fuentes

El catálogo local es una instantánea del **1 de agosto de 2026** del Reglamento M-B. Contiene **310 entradas**: 235 especies o formas y 75 megaevoluciones. Durante el juego no se consulta ninguna API.

- Elegibilidad: [Reglamento M-B de WikiDex](https://www.wikidex.net/wiki/Reglamento_M-B), contrastado con el [anuncio oficial de Pokémon Champions](https://champions-news.pokemon-home.com/en/page/776.html).
- Velocidades: [PokéBase · Pokémon Champions Speed Tiers](https://pokebase.app/pokemon-champions/speed-tiers).
- Ilustraciones y páginas de cada Pokémon: [WikiDex](https://www.wikidex.net/). Las imágenes se enlazan desde su CDN; no se distribuyen en este repositorio.

> La simulación es una ayuda visual para comparar velocidades. No pretende sustituir un calculador de daño ni cubrir todas las reglas, habilidades, objetos o redondeos del juego.

## Desarrollo local

Requiere Node.js 22 o una versión compatible con las dependencias del proyecto.

```bash
npm install
npm run dev
```

Vite mostrará la URL local de desarrollo en la terminal.

### Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run test` | Ejecuta las pruebas de la lógica de juego con Vitest. |
| `npm run test:watch` | Ejecuta las pruebas en modo interactivo. |
| `npm run validate:data` | Valida estructura, IDs, tipos, velocidades y recuento del catálogo M-B. |
| `npm run audit:mega-speeds` | Contrasta las velocidades de las megaevoluciones con PokéBase. |
| `npm run build` | Comprueba TypeScript y genera la versión de producción en `dist/`. |
| `npm run generate:data` | Regenera el catálogo desde WikiDex, resuelve las imágenes, añade tipos y corrige velocidades de megas. |

Antes de publicar cambios en los datos, ejecuta:

```bash
npm run validate:data
npm run test
npm run build
```

## Despliegue

El proyecto se publica automáticamente en GitHub Pages al hacer *push* a la rama `main`. El flujo de trabajo [deploy-pages.yml](.github/workflows/deploy-pages.yml) instala las dependencias con `npm ci`, crea `dist/` mediante `npm run build` y lo despliega en Pages.

La configuración de Vite toma el nombre del repositorio desde `GITHUB_REPOSITORY`, por lo que genera correctamente las rutas bajo `/PokemonSpeed/` al desplegarse en Pages.

## Estructura

```text
src/
├── components/       Interfaz de juego, tabla, tarjetas y simulador
├── data/             Catálogo M-B local y tipos TypeScript
├── domain/           Lógica pura de rondas y validación del catálogo
├── hooks/            Estado de los modos de entrenamiento
└── styles.css         Estilos globales y diseño adaptable
scripts/              Generación, corrección y validación de datos
.github/workflows/    Despliegue automático en GitHub Pages
```

## Tecnologías

React, TypeScript, Vite y Vitest. La aplicación es estática: no usa backend, cuentas, analítica ni cookies. La mejor racha de cada modo se conserva únicamente en `localStorage` del navegador.

## Aviso

Pokémon y Pokémon Champions son marcas de sus respectivos titulares. Esta es una herramienta de entrenamiento creada por la comunidad y no está afiliada ni respaldada oficialmente por The Pokémon Company.
