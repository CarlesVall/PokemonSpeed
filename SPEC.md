# Project Specification

## 1. Goal

Crear una aplicación web de una sola pantalla llamada provisionalmente **Pokémon
Speed**. Será un minijuego de comparación estilo *Higher or Lower* para aprender
la Estadística Base de Velocidad de los Pokémon utilizables en **Pokémon
Champions, Reglamento M-B**.

En cada ronda se muestra un Pokémon de referencia con su Velocidad Base visible
y un Pokémon retador con la cifra oculta. La persona debe responder si el
retador tiene **más velocidad** o **menos velocidad**. Tras responder, la app
revela el valor, indica si fue correcto y continúa la racha.

**Suposición explícita:** “velocidad” significa la Estadística Base de Velocidad
(*Base Speed*), no la estadística final de combate. Esta última depende de
nivel, IVs, EVs, naturaleza, habilidad, objetos y campo, por lo que no sería un
dato único ni útil para memorizar la escala base.

La lista se congelará como una instantánea de M-B: el reglamento oficial estuvo
vigente del 17 de junio al 2 de septiembre de 2026 y permite Mega Evolución una
vez por combate. La fuente de elegibilidad será la lista de Reglamento M-B de
WikiDex, contrastada con el anuncio oficial de Pokémon Champions.

Fuentes de referencia:

- [Anuncio oficial de Regulation Set M-B](https://champions-news.pokemon-home.com/en/page/776.html)
- [Lista de Pokémon y megaevoluciones permitidas de WikiDex](https://www.wikidex.net/wiki/Reglamento_M-B)

## 2. Target users

- Jugadores hispanohablantes de Pokémon competitivo que preparan equipos para
  Pokémon Champions M-B.
- Personas que ya conocen los Pokémon por nombre o imagen, pero quieren fijar
  sus rangos de Velocidad Base con sesiones cortas.

## 3. Core features

1. **Partida inmediata:** al abrir la web se puede empezar con un clic; no hay
   cuentas, registro ni configuración obligatoria.
2. **Rondas Higher or Lower:** se eligen dos entradas distintas y válidas del
   conjunto M-B. La carta izquierda conserva el Pokémon de referencia; la
   derecha es el nuevo retador y oculta su Velocidad Base hasta la respuesta.
3. **Tres respuestas claras:** botones grandes de "M?S R?PIDO" y "M?S LENTO", m?s un bot?n central y compacto de "IGUALES" para las velocidades compartidas.
4. **Resultado inmediato:** revelar la cifra, animar la respuesta y mostrar
   “¡Correcto!” o “Incorrecto”. En empate, la respuesta correcta es "IGUALES" y se muestra el aviso de misma Velocidad Base.
5. **Racha y mejor marca:** mostrar la racha actual y persistir la mejor marca
   localmente en el navegador.
6. **Catálogo M-B completo:** incluir cada especie permitida, sus formas
   regionales, de género/tamaño/modo que figuren explícitamente en M-B, y cada
   megaevolución permitida como entrada independiente. Una mega usa sus propios
   stats, nombre e ilustración; no se trata como el Pokémon base.
7. **Ilustraciones:** cada carta muestra una ilustración oficial enlazada desde
   WikiDex, texto alternativo y atribución/enlace a su página de origen. Si la
   imagen falla, se mantiene la ronda con un marcador visual y el nombre.
8. **Modo de estudio posterior (fase 2):** filtros opcionales por formas,
   megas y rangos de Velocidad. No es requisito para el primer lanzamiento.

## 4. User flows

### Jugar una ronda

1. La persona pulsa “Empezar”.
2. Ve dos cartas: la referencia ya revela, por ejemplo, `Garchomp — 102`; el
   retador muestra nombre, forma e ilustración, pero `¿?` como velocidad.
3. Pulsa "M?S R?PIDO", "IGUALES" o "M?S LENTO".
4. La app bloquea respuestas repetidas, revela la cifra, actualiza racha y
   mejor marca si corresponde, y aplica color/animación de acierto o fallo.
5. Tras una pausa breve (aprox. 1,1 s), el retador se convierte en referencia y
   aparece otro retador. Un fallo reinicia la racha antes de la siguiente ronda.

### Reiniciar

1. La persona pulsa “Nueva partida”.
2. La racha vuelve a cero y se genera un nuevo par; la mejor marca se conserva.

### Carga sin imagen

1. El navegador no puede cargar una ilustración de WikiDex.
2. Se renderiza un recuadro neutro con el nombre y un icono de Poké Ball; el
   juego sigue siendo jugable y se registra el error solo en consola durante
   desarrollo.

## 5. Screens/pages

### Pantalla de juego (única pantalla del MVP)

- Encabezado compacto: logo/título, etiqueta “Champions · Reglamento M-B”,
  racha y mejor marca.
- Área central de dos cartas grandes, con composición simétrica en escritorio
  y vertical en móvil.
- Carta de referencia: ilustración, nombre completo de forma, etiqueta
  “Velocidad Base” y valor numérico visible.
- Separador central “VS”.
- Carta del retador: ilustración, nombre completo de forma y valor oculto o
  recién revelado.
- Debajo: botones “MÁS LENTO” y “MÁS RÁPIDO”; mensaje de resultado accesible.
- Pie discreto: fuente de datos e ilustraciones de WikiDex y aviso de que
  Pokémon es una marca de sus respectivos titulares; esta app no es oficial.

No se diseñarán menús, autenticación, perfiles ni clasificación online para el
MVP.

## 6. Data model

Los datos residirán en un fichero versionado local, `src/data/pokemon-mb.json`.
No se consultará una API durante una partida: así funciona sin conexión una vez
cargada y conserva una versión coherente del reglamento.

```ts
type PokemonEntry = {
  id: string;
  dexNumber: number;
  displayName: string;
  form: string | null;
  baseStats: { speed: number };
  types: string[];
  isMega: boolean;
  assets: {
    wikidexPageUrl: string;
    imageUrl: string;
    imageAlt: string;
  };
};

type PokemonCatalog = {
  schemaVersion: 1;
  regulation: "M-B";
  snapshotDate: string;
  sources: {
    eligibility: { name: string; url: string };
    speeds: { name: string; url: string };
    artwork: { name: string; url: string };
  };
  pokemon: PokemonEntry[];
};

type GameState = {
  reference: PokemonEntry;
  challenger: PokemonEntry;
  phase: "ready" | "answered" | "transitioning";
  streak: number;
  bestStreak: number;
  lastAnswer: "higher" | "equal" | "lower" | null;
  lastResult: "correct" | "incorrect" | "tie" | null;
};
```

### Construcción y mantenimiento del dataset

- Mantener una lista curada, revisable y versionada a partir de la sección
  “Pokémon permitidos” y “Megaevoluciones permitidas” de WikiDex M-B.
- Cada forma listada se convierte en una entrada separada. Ejemplos: Raichu de
  Alola, los tres Tauros de Paldea, Meowstic macho/hembra, cada Gourgeist, los
  tres Lycanroc, Basculegion macho/hembra y las formas de Rotom.
- Incluir todas las megas permitidas por la regulación, incluidas Mega Raichu X
  e Y y las introducidas en M-B; verificar que sean entradas distintas del
  Pokémon base.
- Verificar `baseStats.speed` contra la página individual de WikiDex u otra fuente
  de datos de stats fiable y documentar la fecha de la instantánea. No inferir
  la velocidad de una mega a partir de su forma base.
- Un script de validación de desarrollo comprobará IDs únicos, URLs presentes,
  valor entero válido, `regulation === "M-B"` y que no haya registros fuera de
  la lista de elegibilidad curada.

## 7. Technical stack recommendation

- **React + TypeScript + Vite:** interfaz rápida de una pantalla y tipado para
  el conjunto de datos.
- **CSS nativo con variables y módulos/hoja global:** suficiente para las
  tarjetas, responsive y microanimaciones; evita dependencia de UI innecesaria.
- **Vitest + Testing Library:** pruebas de la lógica de comparación y de los
  estados de interfaz.
- **localStorage:** persistencia únicamente de la mejor racha y preferencias
  futuras; no requiere backend.

La aplicación debe poder desplegarse como sitio estático en GitHub Pages,
Vercel, Netlify o equivalente.

## 8. Architecture

```text
pokemon-mb.json ──> data validation ──> round generator
                                          │
                                      useGame state
                                          │
                     ┌────────────────────┴────────────────────┐
                     │                                         │
               PokemonCard × 2                         AnswerControls
                     │                                         │
                     └────────── Game feedback / scoreboard ──┘
```

- `data/`: dataset M-B y metadatos de fuente/fecha.
- `domain/game.ts`: funciones puras para elegir pares, resolver una respuesta
  y evitar duplicados consecutivos.
- `hooks/useGame.ts`: controla transición, temporizador y localStorage.
- `components/`: `PokemonCard`, `AnswerControls`, `Scoreboard` y `GameBoard`.
- `App.tsx`: composición de pantalla única.

El generador no debe seleccionar el mismo `id` para ambas cartas ni repetir el
retador de la ronda anterior cuando haya alternativas disponibles. Debe incluir
pares con valores iguales: sirven para enseñar empates y evitar que los datos
con misma velocidad desaparezcan del entrenamiento.

## 9. Validation rules

- Solo se acepta una respuesta por ronda; mientras se revela el resultado, los
  botones quedan deshabilitados.
- `higher` es correcto si `challenger.baseStats.speed > reference.baseStats.speed`.
- `lower` es correcto si `challenger.baseStats.speed < reference.baseStats.speed`.
- Si los valores coinciden, solo `equal` es correcto y el resultado debe indicar el empate. Elegir `higher` o `lower` cuenta como fallo.
- Nunca se muestra el valor del retador antes de confirmar la respuesta.
- Las entradas base y mega no se deduplican por número de Pokédex; se deduplican
  por `id`.
- El dataset no se carga si falla su validación en desarrollo.

## 10. Edge cases

- **Diferencia de 0:** tratar como empate, no como error del usuario.
- **Ilustración rota o lenta:** usar `onError` con marcador de posición; no
  bloquear ni desplazar el layout.
- **Nombres largos de formas:** usar tipografía fluida, dos líneas como máximo
  y conservar el nombre completo en `title`/texto alternativo.
- **Recarga de página:** puede empezar una partida nueva, pero mantiene la
  mejor racha; no se promete restaurar una ronda en curso en el MVP.
- **Cambio futuro de reglamento:** M-B queda etiquetado y aislado. No mezclar
  silenciosamente futuras regulaciones con el conjunto estudiado.
- **Datos o imágenes de terceros:** enlazar y acreditar WikiDex; no afirmar
  afiliación oficial ni eliminar atribuciones.

## 11. Non-functional requirements

- Interfaz en español, legible y usable desde 320 px de ancho.
- Navegable con teclado: foco visible, `↑` y `↓`, Enter/Espacio en botones.
- Mensajes de acierto/fallo anunciados por un área `aria-live`.
- Respeto de `prefers-reduced-motion` y contraste suficiente en textos,
  botones y estados, sin basar el resultado solo en color.
- Carga inicial ligera: dataset local comprimible, imágenes con `loading="lazy"`
  cuando no sean críticas y reserva de dimensiones para evitar saltos de diseño.
- Sin analítica, cookies ni datos personales en el MVP.
- Todo el código de juego debe ser determinista y testeable inyectando una
  fuente de aleatoriedad en pruebas.

## 12. Implementation milestones

1. Inicializar Vite/React/TypeScript, estructura de carpetas y tema visual
   responsive.
2. Crear y revisar el dataset M-B completo, con script de validación y
   atribuciones de WikiDex.
3. Implementar lógica pura de rondas y comparación, con pruebas de mayor,
   menor, empate y no duplicación.
4. Construir la pantalla de juego, tarjetas, botones, teclado y revelado.
5. Añadir racha, mejor marca en localStorage, estados de carga/error de imagen
   y accesibilidad.
6. Ejecutar pruebas, build de producción y revisión manual en móvil/escritorio.
7. Añadir README con instalación, comandos y procedencia/actualización de datos.

## 13. Acceptance criteria

- La aplicación permite jugar una ronda completa desde la primera carga sin
  crear cuenta.
- Cada ronda usa dos entradas M-B distintas y muestra correctamente sus
  nombres, formas e ilustraciones o su sustituto accesible.
- El valor visible es la Velocidad Base y la evaluación de Más rápido/Más lento
  es correcta en los tres casos: mayor, menor y empate.
- El conjunto de datos contiene todas las especies, formas y megaevoluciones
  de la lista M-B congelada, con una prueba/validación que lo asegure.
- Las megas tienen su propia Velocidad Base y no reutilizan por error la de la
  forma normal.
- La racha se actualiza al responder, se reinicia tras fallar y la mejor marca
  persiste al recargar.
- Se puede jugar con ratón, teclado y en pantalla móvil.
- `npm run test` y `npm run build` finalizan correctamente.
- La interfaz identifica claramente la fuente WikiDex y que no es una app
  oficial.

## 14. Out of scope

- Simulación de combates, cálculos de Velocidad final, IVs/EVs, naturalezas,
  habilidades, objetos, clima o control de velocidad.
- Login, perfiles, ranking global, multijugador, anuncios o pagos.
- Soporte de reglamentos distintos a M-B durante el MVP.
- Editor de datos desde la interfaz o sincronización automática de WikiDex.
- Reutilizar o redistribuir imágenes fuera de los términos aplicables de sus
  autores/fuentes.
