// Contenido de las páginas por tipo de mueble (/despiece/[slug]), pensadas
// para que Google nos muestre a quien busca justo eso ("despiece closet
// melamina", "lista de cortes mueble cocina", etc.). `modulo` es el valor que
// entiende el configurador (/configurador?modulo=...). Las medidas de partida
// salen de VALORES_POR_MODULO en components/Configurador.jsx — si cambian allá,
// actualizarlas acá.

export const PAGINAS_MUEBLE = [
  {
    slug: 'closet-melamina',
    modulo: 'closet',
    nombre: 'closet',
    nombreLargo: 'Closet / armario ropero',
    titulo: 'Despiece de closet en melamina: piezas, cortes y herrajes',
    descripcion:
      'Diseña tu closet en melamina por secciones (cajones, repisas, colgador) y obtén la lista de piezas, los herrajes y el diagrama de corte listos para la maderera.',
    h1: 'Despiece de closet en melamina: diseña el tuyo y obtén tu lista de cortes',
    intro:
      'Arma tu closet o armario ropero por secciones, con cajones, repisas y colgador donde los necesites, y elige puertas batientes o correderas. Ves el mueble en 3D al instante y, cuando estés conforme, desbloqueas el despiece completo: cada pieza con su medida, los herrajes y el diagrama de corte por plancha.',
    incluye: [
      'Secciones independientes: cada una con su propio ancho, cantidad de cajones, repisas y colgador.',
      'Puertas batientes o correderas (o closet abierto, sin puertas).',
      'Respaldo estructural, para que el closet mantenga la escuadra.',
      'Lista de herrajes según lo que elijas: bisagras o rieles para puertas correderas, guías de cajones y tornillería.',
    ],
    medidas:
      'El configurador parte con un closet de 2200 mm de alto y 580 mm de fondo, con tres secciones de 600 mm. Puedes cambiar el alto, el fondo y el ancho de cada sección, la cantidad de secciones y el color interior y exterior.',
    faq: [
      {
        q: '¿Cuánta melamina necesito para un closet?',
        a: 'Depende de las medidas y de cuántos cajones y repisas lleve. Armandolo calcula el despiece de tu diseño y lo acomoda en planchas de la medida que se vende en tu país (por ejemplo 1830x2500 mm en Chile), mostrándote cuántas planchas necesitas y cómo se cortan.',
      },
      {
        q: '¿Puedo llevar el resultado a un centro de corte?',
        a: 'Sí. El PDF de entrega trae cada pieza con sus medidas, cantidades, colores y cantos, pensado justamente para entregárselo a la maderera o al centro de corte.',
      },
      {
        q: '¿Sirve para puertas correderas?',
        a: 'Sí, puedes elegir puertas batientes, correderas o dejar el closet sin puertas. El listado de piezas y herrajes se ajusta a lo que elijas.',
      },
      {
        q: '¿Tengo que pagar para diseñar?',
        a: 'No. Diseñar el closet y verlo en 3D es gratis y puedes hacerlo cuantas veces quieras. El pago es solo para desbloquear las medidas exactas, el diagrama de corte y el PDF.',
      },
    ],
  },
  {
    slug: 'mueble-cocina-melamina',
    modulo: 'bajo_cocina',
    nombre: 'mueble de cocina',
    nombreLargo: 'Mueble de cocina (bajo mesón)',
    titulo: 'Despiece de mueble de cocina en melamina: lista de cortes',
    descripcion:
      'Diseña tu mueble bajo mesón de cocina por módulos (lavaplatos, lavavajillas, horno, cajones y puertas) y obtén piezas, herrajes y diagrama de corte en melamina.',
    h1: 'Despiece de mueble de cocina en melamina: diseña por módulos y obtén tu lista de cortes',
    intro:
      'Arma el mueble bajo mesón de tu cocina módulo por módulo: puertas, cajones, espacio para lavaplatos, lavavajillas u horno. Cada módulo se calcula como una caja independiente, y el despiece te dice qué piezas cortar, qué herrajes comprar y cómo acomodar todo en las planchas.',
    incluye: [
      'Módulos con puertas, cajones o abiertos, cada uno con su propio ancho.',
      'Módulos especiales para lavaplatos, lavavajillas y horno.',
      'Con patas o zócalo, y cubierta (mesón) opcional.',
      'Lista de herrajes: bisagras, correderas de cajones, patas y tornillería.',
    ],
    medidas:
      'El configurador parte con 700 mm de alto y 560 mm de fondo, y un módulo de 400 mm. Como referencia de partida: 400 mm por puerta, 800 mm para un módulo de lavaplatos y 600 mm para horno o lavavajillas. Todo se puede cambiar.',
    faq: [
      {
        q: '¿Qué medidas tiene un mueble bajo de cocina?',
        a: 'Lo habitual es un fondo de 560 a 600 mm y un alto de 700 a 720 mm sin contar la cubierta, pero puedes ajustar alto, fondo y el ancho de cada módulo según tu cocina.',
      },
      {
        q: '¿Puedo combinar puertas y cajones en el mismo mueble?',
        a: 'Sí. Cada módulo puede llevar solo puertas, solo cajones o una combinación, y el despiece y los herrajes se calculan módulo por módulo.',
      },
      {
        q: '¿Incluye el espacio para lavaplatos y horno?',
        a: 'Sí, hay módulos pensados para lavaplatos, lavavajillas y horno, con las piezas y aberturas que corresponden a cada uno.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$3 por cada módulo del mueble (un mueble de 3 módulos son US$9), más los impuestos que apliquen según tu país. Diseñarlo y verlo en 3D es gratis.',
      },
    ],
  },
  {
    slug: 'mueble-aereo-cocina-melamina',
    modulo: 'alto_cocina',
    nombre: 'mueble aéreo de cocina',
    nombreLargo: 'Mueble aéreo (alacena)',
    titulo: 'Despiece de mueble aéreo de cocina en melamina',
    descripcion:
      'Diseña tu alacena o mueble aéreo de cocina en melamina, con repisas y colgado a pared, y obtén la lista de piezas, herrajes y diagrama de corte.',
    h1: 'Despiece de mueble aéreo de cocina en melamina: alacena con repisas y colgado a pared',
    intro:
      'Diseña tu alacena o mueble aéreo por módulos, con una o dos puertas y las repisas que necesites. El despiece incluye las piezas, los herrajes de colgado y el diagrama de corte, listos para llevar a la maderera.',
    incluye: [
      'Módulos de una o dos puertas con repisas interiores.',
      'Travesaños traseros para el colgado a pared.',
      'Respaldo de MDF blanco, con la lista de grapas para fijarlo.',
      'Lista de herrajes: bisagras, soportes de repisa, colgadores y tornillería.',
    ],
    medidas:
      'El configurador parte con 700 mm de alto y 320 mm de fondo, y un módulo de dos puertas de 800 mm (400 mm por puerta). Puedes cambiar alto, fondo, ancho y cantidad de módulos, repisas y colores.',
    faq: [
      {
        q: '¿Qué fondo debe tener un mueble aéreo de cocina?',
        a: 'Es habitual entre 300 y 350 mm, para que no estorbe al trabajar en el mesón. Partimos con 320 mm y puedes ajustarlo.',
      },
      {
        q: '¿Cómo se cuelga el mueble?',
        a: 'El diseño incluye travesaños traseros pensados para fijar el mueble a la pared, y el listado de herrajes trae los colgadores y tornillos correspondientes.',
      },
      {
        q: '¿Puedo hacer varios módulos juntos?',
        a: 'Sí, cada módulo se calcula como una caja independiente y el mueble completo es la suma de ellos, con tapas laterales de terminación en los extremos.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$3 por cada módulo, más los impuestos que apliquen según tu país. Ver el diseño en 3D es gratis.',
      },
    ],
  },
  {
    slug: 'vanitorio-bano-melamina',
    modulo: 'vanitorio_bano',
    nombre: 'vanitorio de baño',
    nombreLargo: 'Vanitorio de baño',
    titulo: 'Despiece de vanitorio de baño en melamina: piezas y cortes',
    descripcion:
      'Diseña tu vanitorio de baño en melamina, con patas o suspendido, cajones o puertas, y obtén la lista de piezas, herrajes y el diagrama de corte.',
    h1: 'Despiece de vanitorio de baño en melamina: con patas o suspendido',
    intro:
      'Diseña tu vanitorio con cajones o puertas, sobre patas o colgado a la pared, con espacio para el lavamanos y el sifón. Obtienes el despiece completo con medidas, herrajes y cómo cortar todo en las planchas.',
    incluye: [
      'Con patas o suspendido a la pared.',
      'Cajones, puertas, repisas o abierto, según lo que prefieras.',
      'Espacio para sifón y opción de cubierta.',
      'Lista de herrajes: bisagras, correderas de cajones, patas y tornillería.',
    ],
    medidas:
      'El configurador parte con 600 mm de ancho, 550 mm de alto y 450 mm de fondo. Puedes cambiar todas las medidas, el tipo de frente, los colores y si lleva cubierta.',
    faq: [
      {
        q: '¿Qué medidas tiene un vanitorio de baño?',
        a: 'Lo más común es un ancho de 600 a 900 mm, un fondo de 400 a 500 mm y un alto de 500 a 600 mm. Puedes ingresar las medidas exactas de tu baño.',
      },
      {
        q: '¿Sirve para melamina resistente a la humedad?',
        a: 'El despiece te entrega las piezas y medidas, independiente del tipo de melamina que elijas comprar. Para un baño conviene una melamina con buen sellado de cantos.',
      },
      {
        q: '¿Puedo hacerlo suspendido sin patas?',
        a: 'Sí, puedes elegir entre patas o suspendido, y el despiece se ajusta a la opción elegida.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$5 por el vanitorio completo, más los impuestos que apliquen según tu país. Diseñarlo y verlo en 3D es gratis.',
      },
    ],
  },
  {
    slug: 'despensa-melamina',
    modulo: 'despensa',
    nombre: 'despensa',
    nombreLargo: 'Despensa / armario de cocina',
    titulo: 'Despiece de despensa en melamina: lista de piezas y cortes',
    descripcion:
      'Diseña tu despensa o armario de cocina en melamina, con repisas ajustables y una o dos puertas, y obtén la lista de piezas, herrajes y diagrama de corte.',
    h1: 'Despiece de despensa en melamina: armario de cocina con repisas ajustables',
    intro:
      'Diseña una despensa alta sobre zócalo, con las repisas que necesites y una o dos puertas (o sin puertas). El despiece incluye todas las piezas, los herrajes y el diagrama de corte por plancha.',
    incluye: [
      'Armario alto sobre zócalo, con repisas ajustables.',
      'Una puerta, dos puertas o abierto.',
      'Respaldo estructural, para mayor rigidez.',
      'Lista de herrajes: bisagras, soportes de repisa y tornillería.',
    ],
    medidas:
      'El configurador parte con 450 mm de ancho, 2000 mm de alto y 450 mm de fondo, con 5 repisas. Puedes cambiar medidas, cantidad de repisas, puertas y colores.',
    faq: [
      {
        q: '¿Cuántas repisas lleva una despensa?',
        a: 'Tú decides: partimos con 5 repisas ajustables y puedes aumentar o reducir la cantidad según lo que quieras guardar.',
      },
      {
        q: '¿Puedo hacerla sin puertas?',
        a: 'Sí, puedes elegir cero, una o dos puertas.',
      },
      {
        q: '¿Qué plancha de melamina se usa?',
        a: 'Puedes elegir el formato de plancha de tu país (por ejemplo 1830x2500 mm en Chile) o ingresar una medida personalizada, y el diagrama de corte se calcula para esa plancha.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$7 por la despensa completa, más los impuestos que apliquen según tu país. Diseñarla y verla en 3D es gratis.',
      },
    ],
  },
  {
    slug: 'velador-melamina',
    modulo: 'velador',
    nombre: 'velador',
    nombreLargo: 'Velador / mesa de noche',
    titulo: 'Despiece de velador en melamina: piezas y diagrama de corte',
    descripcion:
      'Diseña tu velador o mesa de noche en melamina, con cajón arriba y puerta, repisa o espacio abierto abajo, y obtén piezas, herrajes y diagrama de corte.',
    h1: 'Despiece de velador en melamina: cajón arriba y puerta o repisa abajo',
    intro:
      'Diseña tu velador con un cajón arriba y, abajo, una puerta, una repisa o un espacio abierto, sobre patas. Obtienes el despiece completo con medidas, herrajes y el diagrama de corte.',
    incluye: [
      'Cajón superior con corredera.',
      'Parte inferior a elección: puerta, repisa o abierto.',
      'Sobre patas.',
      'Lista de herrajes: correderas, bisagras, patas y tornillería.',
    ],
    medidas:
      'El configurador parte con 450 mm de ancho, 500 mm de alto y 400 mm de fondo. Puedes cambiar las medidas, el tipo de parte inferior y los colores.',
    faq: [
      {
        q: '¿Qué medidas tiene un velador?',
        a: 'Lo habitual es entre 400 y 500 mm de ancho y alto, y 350 a 400 mm de fondo. Parte con 450 x 500 x 400 mm y ajusta lo que necesites.',
      },
      {
        q: '¿Puedo hacerlo con repisa en vez de puerta?',
        a: 'Sí, la parte inferior puede ser puerta, repisa o espacio abierto.',
      },
      {
        q: '¿Sirve para llevar a la maderera?',
        a: 'Sí, el PDF trae las piezas con medidas, cantidades, colores y cantos, para entregar al centro de corte.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$5 por el velador, más los impuestos que apliquen según tu país. Diseñarlo y verlo en 3D es gratis.',
      },
    ],
  },
  {
    slug: 'escritorio-melamina',
    modulo: 'escritorio',
    nombre: 'escritorio',
    nombreLargo: 'Escritorio',
    titulo: 'Despiece de escritorio en melamina: lista de piezas y cortes',
    descripcion:
      'Diseña tu escritorio en melamina con cajonera a la derecha o izquierda y cubierta de superficie, y obtén la lista de piezas, herrajes y diagrama de corte.',
    h1: 'Despiece de escritorio en melamina: con cajonera y cubierta',
    intro:
      'Diseña tu escritorio con una cajonera al lado que prefieras, cajones o puertas, y una cubierta del espesor que elijas. El despiece trae todas las piezas con sus medidas, los herrajes y el diagrama de corte.',
    incluye: [
      'Cajonera a la derecha o a la izquierda, con cajones o puertas.',
      'Cubierta de superficie en melamina.',
      'Sobre patas.',
      'Lista de herrajes: correderas de cajones, bisagras, patas y tornillería.',
    ],
    medidas:
      'El configurador parte con 1200 mm de ancho, 720 mm de alto y 550 mm de fondo, con una cajonera de 450 mm de 3 cajones. Puedes cambiar todas las medidas, el lado de la cajonera y los colores.',
    faq: [
      {
        q: '¿Qué altura debe tener un escritorio?',
        a: 'Lo habitual es entre 720 y 750 mm. Partimos con 720 mm y puedes ajustarlo a tu estatura.',
      },
      {
        q: '¿Puedo elegir de qué lado va la cajonera?',
        a: 'Sí, puedes ponerla a la derecha o a la izquierda.',
      },
      {
        q: '¿Qué espesor de cubierta usa?',
        a: 'Puedes elegir el espesor de la cubierta, y el despiece se calcula con esa medida.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$5 por el escritorio, más los impuestos que apliquen según tu país. Diseñarlo y verlo en 3D es gratis.',
      },
    ],
  },
  {
    slug: 'librero-melamina',
    modulo: 'librero',
    nombre: 'librero',
    nombreLargo: 'Librero / estantería',
    titulo: 'Despiece de librero en melamina: piezas y diagrama de corte',
    descripcion:
      'Diseña tu librero o estantería en melamina por secciones con repisas ajustables y obtén la lista de piezas, herrajes y diagrama de corte listos para cortar.',
    h1: 'Despiece de librero en melamina: estantería por secciones con repisas',
    intro:
      'Diseña tu librero por secciones, cada una con su ancho y su cantidad de repisas. Es un cuerpo abierto, sin puertas, y el despiece te entrega las piezas, los herrajes y el diagrama de corte por plancha.',
    incluye: [
      'Secciones con ancho y cantidad de repisas independientes.',
      'Repisas ajustables en altura.',
      'Cuerpo abierto, sin puertas.',
      'Lista de herrajes: soportes de repisa y tornillería.',
    ],
    medidas:
      'El configurador parte con 1800 mm de alto y 300 mm de fondo, con dos secciones de 400 mm y 5 repisas cada una. Puedes cambiar alto, fondo, secciones, repisas y colores.',
    faq: [
      {
        q: '¿Qué fondo debe tener un librero?',
        a: 'Para libros, entre 250 y 300 mm suele alcanzar. Partimos con 300 mm y puedes ajustarlo.',
      },
      {
        q: '¿Las repisas son ajustables?',
        a: 'Sí, el diseño usa repisas ajustables en altura con sus soportes.',
      },
      {
        q: '¿Puedo hacer un librero de varias secciones?',
        a: 'Sí, agregas las secciones que quieras, cada una con su ancho y su cantidad de repisas.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$5 por el librero, más los impuestos que apliquen según tu país. Diseñarlo y verlo en 3D es gratis.',
      },
    ],
  },
  {
    slug: 'baul-melamina',
    modulo: 'baul',
    nombre: 'baúl',
    nombreLargo: 'Baúl',
    titulo: 'Despiece de baúl en melamina: piezas y diagrama de corte',
    descripcion:
      'Diseña tu baúl en melamina: caja cerrada de cuatro lados con tapa, sobre patas, y obtén la lista de piezas, herrajes y diagrama de corte.',
    h1: 'Despiece de baúl en melamina: caja con tapa sobre patas',
    intro:
      'Diseña un baúl como caja cerrada de cuatro lados con tapa, sobre patas y en un solo color. Obtienes el despiece completo con medidas, herrajes y el diagrama de corte por plancha.',
    incluye: [
      'Caja cerrada de cuatro lados con tapa.',
      'Sobre patas.',
      'Un solo color para todo el baúl.',
      'Lista de herrajes: bisagras, patas y tornillería.',
    ],
    medidas:
      'El configurador parte con 600 mm de ancho, 400 mm de alto y 400 mm de fondo. Puedes cambiar las medidas y el color.',
    faq: [
      {
        q: '¿Qué medidas puede tener un baúl?',
        a: 'Tú las defines: parte con 600 x 400 x 400 mm y puedes ajustarlas al uso que le vayas a dar.',
      },
      {
        q: '¿Lleva patas?',
        a: 'Sí, el baúl se arma sobre patas.',
      },
      {
        q: '¿Puedo llevar el resultado a un centro de corte?',
        a: 'Sí, el PDF trae las piezas con medidas, cantidades y cantos, listo para entregarlo.',
      },
      {
        q: '¿Cuánto cuesta el despiece?',
        a: 'US$5 por el baúl, más los impuestos que apliquen según tu país. Diseñarlo y verlo en 3D es gratis.',
      },
    ],
  },
];

export function paginaPorSlug(slug) {
  return PAGINAS_MUEBLE.find(p => p.slug === slug) || null;
}
