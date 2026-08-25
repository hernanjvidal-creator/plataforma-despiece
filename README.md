# Plataforma de Despiece — repo inicial

MVP funcional: configurador → motor de reglas → optimizador de corte → plano 3D +
listado de piezas + diagrama de corte. Cubre cinco módulos, todos con el mismo
patrón (parámetros → piezas + posiciones 3D → herrajes):

- **Mueble bajo de cocina** (`lib/muebleBajoCocina.js`) — por secciones (ver abajo)
- **Mueble alto de cocina / alacena** (`lib/muebleAltoCocina.js`)
- **Vanitorio de baño** (`lib/vanitorioBano.js`)
- **Closet / armario ropero** (`lib/closet.js`) — por secciones, puertas batientes o correderas
- **Esquinero bajo de cocina ciego** (`lib/esquineroBajoCocina.js`) — dos brazos en L

El ancho (A) admite hasta 10000mm en todos los módulos. Si una pieza queda más
ancha que la plancha elegida, `optimizadorCorte.js` la divide automáticamente
en segmentos ("empalme") que se unen en taller — ver más abajo.

### Muebles por secciones (bajo_cocina y closet)

En vez de una sola configuración para todo el ancho, estos dos módulos reciben
un array `secciones` (columnas de izquierda a derecha). Entre cada sección hay
un divisor vertical — un panel del mismo tipo que un lateral — que es una
**única pieza compartida** entre las dos secciones que separa (no se duplica).

- **`bajo_cocina`**: cada sección tiene un `tipo`:
  `estandar` (puertas/cajones/mixto, como antes), `lavaplatos` (solo puertas,
  nota de sifón), `lavavajillas` / `horno` (sin frente propio, 600mm por
  defecto — estándar de mercado), `cajones_olleros` (cajones altos ~300mm),
  `cajones_cubiertos` (cajones bajos ~120mm). Las secciones sin ancho fijo se
  reparten el resto del ancho en partes iguales. `parametros.isla = true`
  cambia el respaldo de HDF a un panel terminado (mueble independiente/isla).
- **`closet`**: cada sección tiene `cajones` / `repisas` / `colgador`
  (booleano). El colgador es un herraje (tubo + soportes), no una pieza.
  Los cajones son de 200mm de alto por defecto (`ALTURA_CAJON_UNIDAD`).
  Las puertas son globales (cubren todo el ancho, independientes de las
  secciones) y pueden ser `tipoPuerta: 'batiente'` o `'corredera'`. Si dos o
  más secciones seguidas son "solo colgador" (`cajones: 0, colgador: true`),
  no se genera divisor entre ellas — la barra corre de corrido sin panel.

Además, en `bajo_cocina` (por sección, config `solo_puertas`/`mixto`) y en
`vanitorio_bano` (`config` + `repisas`), el hueco de puertas admite repisas
intermedias (`repisas`, además del piso que ya trae el cuerpo) — se reparten
en partes iguales dentro de la zona libre de puertas, con soportes de repisa
como herraje.

### Cubierta (superficie) y accesorios

`bajo_cocina` y `vanitorio_bano` aceptan `parametros.cubierta = { incluir, material, espesor }`
(`material`: `'melamina' | 'cuarzo' | 'granito' | 'marmol'`). Si `incluir` es
true se agrega la pieza "cubierta" (panel horizontal con vuelo/overhang sobre
el cuerpo). Si el material es piedra, `optimizadorCorte.js` la excluye del
nesting (`MATERIALES_SIN_NESTING` en `lib/shared.js`) — no se corta de una
plancha de melamina, pero igual queda en la lista de piezas y en "Material
requerido" (m²) para cotizarla aparte.

Cuando hay cubierta, además se genera un **accesorio** (lavaplatos en
bajo_cocina, lavamanos en vanitorio): una caja de referencia embutida en la
cubierta, con su propia `descripcion`. Los accesorios viven en un array
separado (`despiece.accesorios`, no en `piezas`) porque no son melamina — no
entran al nesting ni al resumen de material, pero sí se dibujan en el visor 3D
(`Visor3D` acepta un prop `accesorios` además de `piezas`) y se listan en su
propia tabla en `ListaPiezas.jsx`.

### Esquinero ciego (dos brazos en L)

`esquineroBajoCocina.js` genera dos cuerpos rectangulares (brazo A y brazo B)
que se encuentran en 90°. Como el resto de la app trabaja en un solo plano
(x=ancho, z=profundidad), el brazo B se genera primero en su propio plano
local — igual que un mueble lineal normal — y se rota 90° hacia el espacio
global permutando ejes (`rotarPiezaBrazoB`): al ser múltiplos de 90° no hace
falta trigonometría, basta con intercambiar X↔Z y, en piezas horizontales,
ancho↔alto. El brazo B lleva una `zonaCiega` (mm sin puerta junto a la
esquina) que representa el espacio de difícil acceso típico de un esquinero.

### Visor 3D — doble clic para identificar piezas

`Visor3D.jsx` hace raycasting sobre las piezas al doble clic: si la pieza no
tiene etiqueta se le agrega una (nombre + medidas, como overlay HTML
posicionado según la proyección de cámara de Three.js, actualizada cada
frame); si ya la tiene, se la quita. Varias piezas pueden quedar etiquetadas
a la vez — útil para ir identificando cada una mientras se arma el mueble —
y hay un botón "Limpiar etiquetas" para sacarlas todas de una.

## Cómo correrlo localmente

```bash
npm install
npm run dev
```

Abrir http://localhost:3000 → "Ir al configurador" → elegir el tipo de mueble
en el selector "Tipo de mueble".

## Estructura

```
lib/
  shared.js              → utilidades compartidas entre motores (resumen de m² por plancha)
  muebleBajoCocina.js    → motor de reglas: mueble bajo de cocina
  muebleAltoCocina.js    → motor de reglas: alacena (cuerpo cerrado, repisas, colgado a pared)
  vanitorioBano.js       → motor de reglas: vanitorio (patas o suspendido, nota de sifón)
  closet.js              → motor de reglas: closet por secciones (cajones/repisas/colgador,
                            puertas batientes o correderas)
  esquineroBajoCocina.js → motor de reglas: esquinero ciego (dos brazos en L, uno rotado 90°)
  optimizadorCorte.js    → nesting (piezas → diagrama de corte por plancha, agrupado
                            por espesor + material + color) + división automática
                            ("empalme") de piezas más anchas que la plancha
app/
  api/despiece/route.js  → endpoint que despacha al motor según `modulo` y corre el nesting
  configurador/page.js   → página del wizard
  page.js                → landing
components/
  Configurador.jsx       → formulario multi-módulo + orquestación
  Visor3D.jsx             → render 3D con Three.js (una caja por pieza, orientada según su
                            campo `rotacion`; la cámara se centra según el bounding box real
                            de las piezas, no de parametros.A/H/P — no todos los módulos
                            tienen ese campo, ej. el esquinero usa anchoA/anchoB)
  ListaPiezas.jsx         → tabla de piezas/herrajes/notas + export CSV
  DiagramaCorte.jsx       → SVG del diagrama de corte por plancha
```

## Agregar un nuevo módulo

1. Crear `lib/<modulo>.js` exportando `generarDespiece(params)` → `{ modulo, parametros, piezas, herrajes, resumen, notas? }`,
   siguiendo el mismo sistema de coordenadas (mm; x=ancho, y=alto, z=profundidad) y usando `resumirPlanchas` de `lib/shared.js`.
2. Registrarlo en `MOTORES` dentro de `app/api/despiece/route.js`.
3. Agregar su entrada a `MODULOS` y `VALORES_POR_MODULO` en `components/Configurador.jsx`, y los campos
   condicionales que necesite en el panel de parámetros.

## Qué falta para producción (siguientes pasos)

1. **Persistencia**: hoy todo se calcula al vuelo y no se guarda. Falta una base
   de datos (Postgres, por ejemplo con Supabase o Neon) para guardar pedidos,
   clientes y despieces generados.
2. **Autenticación**: login de clientes (para ver historial de pedidos) y de
   administradores.
3. **Exportar PDF real**: hoy el CSV alcanza para mandar a cortar, pero falta
   generar el PDF con plano 3D + vistas explosionadas + plano de armado paso a
   paso (se puede usar una librería como `@react-pdf/renderer` o `pdf-lib`).
4. **Plano de auto-armado**: secuenciar las piezas en pasos de montaje
   (actualmente el motor entrega todas las piezas juntas; falta la lógica de
   "orden de armado" pieza por pieza).
5. **Pagos**: integrar pasarela (Flow, Webpay, MercadoPago) cuando el flujo de
   pedidos esté definido.
6. **Cubierta de piedra**: hoy el flujo asume melamina; falta el módulo de
   cubierta en piedra (dimensiones, cortes especiales para lavaplatos/cocina,
   no aplica nesting porque es otro proveedor/material). El vanitorio ya deja
   una nota indicando que la cubierta se cotiza aparte.
7. **Mecanizados reales**: las notas de "hueco de sifón" en el vanitorio son
   texto informativo; falta modelar el recorte real (geometría no rectangular)
   si se necesita para el plano de corte automatizado.
8. **Cantos en piezas empalmadas**: al dividir una pieza muy ancha, cada segmento
   hereda la lista de cantos original tal cual; en el corte real, los dos bordes
   de la unión no deben llevar canto (van a unión/refuerzo, no al exterior).
   Hoy es una aproximación — hay que revisar visualmente antes de mandar a cortar.
9. **Esquinero diagonal**: el módulo actual es un esquinero *ciego* (dos brazos
   rectangulares en L). La variante con frente en 45° tipo carrusel/lazy susan
   necesitaría piezas no rectangulares, que hoy no soportan ni el modelo de
   piezas, ni el nesting, ni el visor 3D (todo asume cajas).
10. **Isla — laterales terminados**: `isla: true` solo cambia el respaldo a un
    panel terminado; si el mueble queda con un extremo visible (no contra otro
    módulo), ese lateral también debería pasar a color exterior — hoy es manual.
11. **Anchos de sección personalizados**: las secciones sin ancho fijo se
    reparten el resto del ancho en partes iguales (bajo_cocina y closet); no
    hay forma de pedir, por ejemplo, "sección 1 más ancha que la 2" sin fijar
    un `ancho` explícito en cada una.

## Deploy

Al ser Next.js, se puede desplegar directo en Vercel (`vercel deploy`) sin
configuración adicional — el endpoint `/api/despiece` corre como función
serverless automáticamente.
