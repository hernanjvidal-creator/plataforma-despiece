'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Visor3D from './Visor3D';
import ListaPiezas from './ListaPiezas';
import DiagramaCorte from './DiagramaCorte';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { muebleEstaPagado } from '@/lib/pedidosCliente';
import { EMAIL_ADMIN } from '@/lib/admin';
import { MODO_GRATIS_TEMPORAL } from '@/lib/modoGratisTemporal';

const PLANCHAS = [
  { value: 'CL', label: 'Chile — 1830x2500' },
  { value: 'CL_grande', label: 'Chile — 1830x3660 (formato grande)' },
  { value: 'AR', label: 'Argentina — 1830x2750' },
  { value: 'PE', label: 'Perú / Colombia / Ecuador — 2150x2440' },
  { value: 'MX', label: 'México — 1220x2440' },
  { value: 'US', label: 'EEUU — 1220x2440' },
  { value: 'custom', label: 'Medida personalizada...' },
];

const MODULOS = [
  { value: 'bajo_cocina', label: 'Mueble cocina' },
  { value: 'alto_cocina', label: 'Mueble aéreo' },
  { value: 'vanitorio_bano', label: 'Vanitorio de baño' },
  { value: 'closet', label: 'Closet / armario ropero' },
  { value: 'despensa', label: 'Despensa' },
  { value: 'velador', label: 'Velador' },
  { value: 'escritorio', label: 'Escritorio' },
  { value: 'librero', label: 'Librero' },
  { value: 'baul', label: 'Baúl' },
];

// Módulos donde el ancho total no es un input directo: cada módulo/sección
// trae el suyo propio, obligatorio, y el total de arriba es solo la suma
// (de solo lectura) — ver el motor de cada uno (calcularSecciones o
// equivalente) para el mismo criterio del lado del servidor. La despensa NO
// va acá: es un solo cuerpo sin secciones, así que su ancho es un input
// directo (ver el bloque genérico de "Ancho (mm)" más abajo).
const ANCHO_LO_DEFINEN_SECCIONES = ['bajo_cocina', 'alto_cocina', 'closet', 'librero'];

// bajo_cocina y alto_cocina arman cada módulo como una caja independiente
// (laterales en color interior, pensados para quedar tapados contra el
// módulo vecino) y le agregan 2 tapas de acabado en los extremos del
// mueble (15mm cada una, ver piezasTapasLaterales en esos motores) — el
// ancho exterior real del mueble ya armado es la suma de los módulos MÁS
// esas 2 tapas, no solo la suma de los módulos. closet y librero comparten
// un solo cuerpo (sin tapas aparte), así que no llevan este ajuste.
const MODULOS_CON_TAPAS_LATERALES = ['bajo_cocina', 'alto_cocina'];
const ANCHO_TAPAS_LATERALES_MM = 30; // 2 tapas × 15mm (espesor fijo en esos motores)

// El checkout real de Lemon Squeezy está en pruebas — mientras se termina
// de configurar la tienda, solo esta cuenta lo ve. El resto sigue con el
// botón de compra simulada. Sacar este chequeo cuando se habilite para todos.
const EMAIL_PAGOS_REAL = EMAIL_ADMIN;

// Conversión "Compra despiece (código)" en Google Ads (Objetivos > Conversiones)
// — disparada a mano acá en vez de por detección automática de URL, para
// poder mandar el monto real de cada pedido en vez de un valor fijo.
const CONVERSION_ADS_COMPRA = 'AW-18412301415/Il2tCOj-lYUdEOfY1ctE';

// Evita contar la misma compra dos veces si el cliente recarga la página de
// confirmación (Google Ads también deduplica por transaction_id — esto es
// una segunda capa, del lado del navegador). Nunca debe poder romper el
// flujo de compra: cualquier falla acá se ignora en silencio.
function registrarConversionAdsSiCorresponde(pedidoId, total) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const clave = `conversion_ads_${pedidoId}`;
    if (localStorage.getItem(clave)) return;
    window.gtag('event', 'conversion', {
      send_to: CONVERSION_ADS_COMPRA,
      value: total,
      currency: 'USD',
      transaction_id: pedidoId,
    });
    localStorage.setItem(clave, '1');
  } catch {
    // Analítica de terceros nunca debe poder romper la confirmación de compra.
  }
}

const COLORES_INTERIOR = [
  { value: 'blanco', label: 'Blanco' },
  { value: 'gris_claro', label: 'Gris claro' },
  { value: 'gris_ceniza', label: 'Gris ceniza' },
  { value: 'aluminio', label: 'Aluminio' },
];

// Paleta ampliada inspirada en la línea de melaminas Masisa (nombres reales
// de su catálogo de colores).
const COLORES_EXTERIOR = [
  {
    grupo: 'Neutros', opciones: [
      { value: 'blanco', label: 'Blanco' },
      { value: 'gris_claro', label: 'Gris claro' },
      { value: 'gris_ceniza', label: 'Gris ceniza' },
      { value: 'aluminio', label: 'Aluminio' },
      { value: 'concreto_metropolitan', label: 'Concreto Metropolitan' },
      { value: 'vison', label: 'Visón' },
      { value: 'gris_grafito', label: 'Gris grafito' },
      { value: 'negro', label: 'Negro' },
    ],
  },
  {
    grupo: 'Maderas', opciones: [
      { value: 'sahara', label: 'Sahara' },
      { value: 'olmo_alpino', label: 'Olmo Alpino' },
      { value: 'coigue', label: 'Coigüe' },
      { value: 'roble', label: 'Roble' },
      { value: 'nogal', label: 'Nogal' },
      { value: 'nogal_africano', label: 'Nogal Africano' },
      { value: 'cerezo', label: 'Cerezo' },
      { value: 'fresno_humo', label: 'Fresno Humo' },
    ],
  },
  {
    grupo: 'Colores', opciones: [
      { value: 'terracota_charyn', label: 'Terracota Charyn' },
      { value: 'azul_acero', label: 'Azul Acero' },
      { value: 'verde_glaciar', label: 'Verde Glaciar' },
    ],
  },
];

const VALORES_POR_MODULO = {
  bajo_cocina: {
    H: 700, P: 560,
    isla: false,
    cubiertaIncluir: false, cubiertaMaterial: 'melamina', cubiertaEspesor: 20,
    secciones: [
      { tipo: 'estandar', config: 'solo_cajones', nP: 0, nC: 3 },
    ],
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
    espesorPuertas: 15,
  },
  alto_cocina: {
    H: 700, P: 320,
    secciones: [
      { nP: 2, nBaldas: 1 },
    ],
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
    espesorPuertas: 15,
  },
  vanitorio_bano: {
    A: 600, H: 550, P: 450,
    nP: 0, nC: 2, repisas: 0, config: 'solo_cajones',
    soporte: 'patas', sifon: true,
    cubiertaIncluir: false, cubiertaMaterial: 'melamina', cubiertaEspesor: 20,
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
    espesorPuertas: 15,
  },
  closet: {
    H: 2200, P: 580,
    nP: 0, tipoPuerta: 'batiente',
    secciones: [
      { cajones: 2, repisas: 2, colgador: false },
      { cajones: 0, repisas: 1, colgador: true },
      { cajones: 2, repisas: 2, colgador: false },
    ],
    colorInterior: 'blanco', colorExterior: 'blanco',
    espesorPuertas: 15,
  },
  despensa: {
    A: 450, H: 2000, P: 450,
    nP: '',        // sin elegir por defecto — obligatorio que el cliente escoja 0, 1 o 2
    repisas: 5,
    colorInterior: 'blanco', colorExterior: 'blanco',
    espesorPuertas: 15,
  },
  velador: {
    A: 450, H: 500, P: 400,
    tipoInferior: 'puerta',
    colorInterior: 'blanco', colorExterior: 'blanco',
    espesorPuertas: 15,
  },
  escritorio: {
    A: 1200, H: 720, P: 550,
    anchoCajonera: 450, ladoCajonera: 'derecha', configCajonera: 'solo_cajones', nC: 3,
    cubiertaMaterial: 'melamina', cubiertaEspesor: 20,
    colorInterior: 'blanco', colorExterior: 'blanco',
  },
  librero: {
    H: 1800, P: 300,
    secciones: [
      { repisas: 5 },
      { repisas: 5 },
    ],
    colorInterior: 'blanco', colorExterior: 'blanco',
  },
  baul: {
    A: 600, H: 400, P: 400,
    colorInterior: 'blanco', colorExterior: 'blanco',
  },
};

const VALORES_COMUNES = { plancha: 'CL', anchoCustom: 1830, altoCustom: 2500 };

// Inversa de construirParametros(): reconstruye el estado plano del
// formulario a partir de los `parametros` guardados de un mueble. `opcionesCorte`
// es lo que se guardó en la columna aparte `opciones_corte` (la plancha de
// melamina elegida) — null en diseños guardados antes de que existiera esa
// columna, así que se cae de vuelta a Chile por defecto.
function formDesdeParametros(modulo, parametros, opcionesCorte) {
  const corte = opcionesCorte || VALORES_COMUNES;
  const base = { modulo, ...VALORES_POR_MODULO[modulo], ...VALORES_COMUNES, ...corte };
  if (!parametros) return base;

  const comunes = {
    A: parametros.A, H: parametros.H, P: parametros.P,
    colorInterior: parametros.colorInterior, colorExterior: parametros.colorExterior,
    espesorPuertas: parametros.espesorPuertas ?? 15,
  };

  if (modulo === 'bajo_cocina') {
    return {
      ...base, ...comunes,
      isla: parametros.isla,
      cubiertaIncluir: parametros.cubierta?.incluir ?? false,
      cubiertaMaterial: parametros.cubierta?.material ?? 'melamina',
      cubiertaEspesor: parametros.cubierta?.espesor ?? 20,
      secciones: parametros.secciones,
    };
  }
  if (modulo === 'alto_cocina') {
    return { ...base, ...comunes, secciones: parametros.secciones };
  }
  if (modulo === 'vanitorio_bano') {
    return {
      ...base, ...comunes,
      nP: parametros.nP, nC: parametros.nC, repisas: parametros.repisas, config: parametros.config,
      soporte: parametros.soporte, sifon: parametros.sifon,
      cubiertaIncluir: parametros.cubierta?.incluir ?? false,
      cubiertaMaterial: parametros.cubierta?.material ?? 'melamina',
      cubiertaEspesor: parametros.cubierta?.espesor ?? 20,
    };
  }
  if (modulo === 'closet') {
    return { ...base, ...comunes, nP: parametros.nP, tipoPuerta: parametros.tipoPuerta, secciones: parametros.secciones };
  }
  if (modulo === 'despensa') {
    return { ...base, ...comunes, nP: parametros.nP, repisas: parametros.repisas };
  }
  if (modulo === 'velador') {
    return { ...base, ...comunes, tipoInferior: parametros.tipoInferior };
  }
  if (modulo === 'escritorio') {
    return {
      ...base, ...comunes,
      anchoCajonera: parametros.anchoCajonera, ladoCajonera: parametros.ladoCajonera,
      configCajonera: parametros.configCajonera, nC: parametros.nC,
      cubiertaMaterial: parametros.cubierta?.material ?? 'melamina',
      cubiertaEspesor: parametros.cubierta?.espesor ?? 20,
    };
  }
  if (modulo === 'librero') {
    return { ...base, ...comunes, secciones: parametros.secciones };
  }
  return base;
}

export default function Configurador() {
  // Si se entra desde una tarjeta de la portada (/configurador?modulo=closet),
  // arranca directo en ese tipo de mueble en vez del genérico por defecto.
  const searchParams = useSearchParams();
  const router = useRouter();
  const { usuario } = useAuth();
  const esAdmin = usuario?.email === EMAIL_PAGOS_REAL;
  const moduloParam = searchParams.get('modulo');
  const muebleIdParam = searchParams.get('muebleId');
  const pedidoPagoParam = searchParams.get('pedidoPago');
  const moduloInicial = VALORES_POR_MODULO[moduloParam] ? moduloParam : 'bajo_cocina';

  const [form, setForm] = useState(() => ({
    modulo: moduloInicial,
    ...VALORES_POR_MODULO[moduloInicial],
    ...VALORES_COMUNES,
  }));
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [muebleActualId, setMuebleActualId] = useState(null);
  const [nombreMueble, setNombreMueble] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [soloLectura, setSoloLectura] = useState(false);
  const [comprandoReal, setComprandoReal] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [descargandoManual, setDescargandoManual] = useState(false);
  const visor3DRef = useRef(null);

  // Si se entra desde "Mis muebles" (/configurador?muebleId=...), carga ese
  // diseño guardado y genera el despiece de una vez — no hace falta apretar
  // "Generar despiece" de nuevo para ver el mueble.
  useEffect(() => {
    if (!muebleIdParam) {
      // Se navegó de vuelta a /configurador sin muebleId (ej. desde "Mis
      // muebles" con un diseño ya cargado, apretando "Diseñar" en la barra
      // superior) — sin este reset, el formulario/resultado del mueble
      // anterior se quedaba pegado en pantalla como si el click no hubiera
      // hecho nada.
      setMuebleActualId(null);
      setNombreMueble(null);
      setDesbloqueado(false);
      setSoloLectura(false);
      setResultado(null);
      setError(null);
      setForm({ modulo: moduloInicial, ...VALORES_POR_MODULO[moduloInicial], ...VALORES_COMUNES });
      return;
    }
    let cancelado = false;

    supabase.from('muebles').select('*').eq('id', muebleIdParam).single().then(async ({ data, error: err }) => {
      if (cancelado || err || !data) return;
      setForm(formDesdeParametros(data.modulo, data.parametros, data.opciones_corte));
      setMuebleActualId(data.id);
      setNombreMueble(data.nombre);

      // Si este mueble ya se compró antes, desbloquea de una vez — evita que
      // se le vuelva a cobrar por algo que ya pagó en una compra anterior —
      // y lo deja de solo lectura, para que no se pueda editar y volver a
      // sacar un despiece distinto del mismo diseño ya comprado.
      if (await muebleEstaPagado(data.id)) {
        if (!cancelado) {
          setDesbloqueado(true);
          setSoloLectura(true);
        }
      }

      setCargando(true);
      setError(null);
      try {
        const res = await fetch('/api/despiece', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modulo: data.modulo, parametros: data.parametros, opcionesCorte: data.opciones_corte || { plancha: 'CL' } }),
        });
        const resultadoData = await res.json();
        if (cancelado) return;
        if (!res.ok) throw new Error(resultadoData.error || 'Error generando el despiece');
        setResultado(resultadoData);
      } catch (e) {
        if (!cancelado) setError(e.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muebleIdParam]);

  // Al volver del checkout de Lemon Squeezy (?pedidoPago=...), el webhook
  // puede tardar un par de segundos en confirmar el pago. Se consulta el
  // estado del pedido cada 2s (hasta 30 intentos) en vez de confiar en que
  // ya esté "pagado" apenas se vuelve a esta página.
  useEffect(() => {
    if (!pedidoPagoParam) return;
    let cancelado = false;
    let intentos = 0;

    async function verificar() {
      const { data, error: err } = await supabase
        .from('pedidos')
        .select('estado, total')
        .eq('id', pedidoPagoParam)
        .single();
      if (cancelado) return;

      if (!err && data?.estado === 'pagado') {
        setDesbloqueado(true);
        setSoloLectura(true);
        setVerificandoPago(false);
        registrarConversionAdsSiCorresponde(pedidoPagoParam, data.total);
        return;
      }
      intentos += 1;
      if (intentos < 30) {
        setTimeout(verificar, 2000);
      } else {
        setVerificandoPago(false);
        setError('Tu pago está siendo confirmado — si no se desbloquea en un momento, recarga la página.');
      }
    }

    setVerificandoPago(true);
    verificar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoPagoParam]);

  function actualizar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function cambiarModulo(modulo) {
    setForm(f => ({
      ...f,
      modulo,
      ...VALORES_POR_MODULO[modulo],
    }));
    setResultado(null);
    setMuebleActualId(null);
    setGuardadoOk(false);
    setDesbloqueado(false);
  }

  async function guardarMueble() {
    if (!usuario) {
      router.push(`/login?redirect=${encodeURIComponent('/configurador')}`);
      return;
    }

    setGuardando(true);
    setGuardadoOk(false);
    setError(null);
    try {
      const parametros = construirParametros();
      const opcionesCorte = construirOpcionesCorte();
      if (muebleActualId) {
        // Actualizar un mueble ya guardado: mantiene el nombre que ya
        // tenía, sin volver a preguntar (antes se pedía de nuevo con un
        // window.prompt, y si se cancelaba o no se completaba, la función
        // cortaba en silencio sin guardar ni avisar del error).
        const { error: err } = await supabase
          .from('muebles')
          .update({ modulo: form.modulo, parametros, opciones_corte: opcionesCorte })
          .eq('id', muebleActualId);
        if (err) throw err;
      } else {
        const nombreSugerido = MODULOS.find(m => m.value === form.modulo)?.label || 'Mueble';
        const nombre = window.prompt('Nombre para este mueble:', nombreSugerido);
        if (!nombre) { setGuardando(false); return; }
        const { data, error: err } = await supabase
          .from('muebles')
          .insert({ user_id: usuario.id, nombre, modulo: form.modulo, parametros, opciones_corte: opcionesCorte })
          .select()
          .single();
        if (err) throw err;
        setMuebleActualId(data.id);
        setNombreMueble(data.nombre);
      }
      setGuardadoOk(true);
    } catch (e) {
      setError('No se pudo guardar el mueble: ' + e.message);
    } finally {
      setGuardando(false);
    }
  }

  // Link de solo lectura (sin login) para pasarle a un maestro externo u otra
  // persona — cualquiera con el link puede verlo, así que solo está
  // disponible una vez que el mueble ya se guardó (necesita el id).
  async function compartirMueble() {
    if (!muebleActualId) return;
    const url = `${window.location.origin}/ver/${muebleActualId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copia este link:', url);
      return;
    }
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2500);
  }

  // La config "solo_puertas"/"solo_cajones" solo admite un tipo de frente, pero el
  // campo oculto (nC o nP) puede conservar un valor viejo de una config anterior.
  // Se fuerza a 0 el que no corresponde para que siempre calcen con `config`.
  function nPyNCporConfig(config, nP, nC) {
    if (config === 'abierto') return { nP: 0, nC: 0 };
    if (config === 'solo_puertas') return { nP, nC: 0 };
    if (config === 'solo_cajones') return { nP: 0, nC };
    return { nP, nC }; // mixto
  }

  // ---------- Secciones (closet: columnas; bajo_cocina: módulos de cocina) ----------
  function agregarSeccion() {
    // Sin ancho por defecto: que el total no suba solo con un valor de
    // ejemplo que el cliente no eligió — sube recién cuando escribe el
    // ancho real de la sección nueva.
    const nueva = form.modulo === 'closet'
      ? { cajones: 0, repisas: 1, colgador: false }
      : form.modulo === 'librero'
      ? { repisas: 5 }
      : form.modulo === 'alto_cocina'
      ? { nP: 2, nBaldas: 1 }
      : { tipo: 'estandar', config: 'solo_cajones', nP: 0, nC: 2 };
    setForm(f => ({ ...f, secciones: [...f.secciones, nueva] }));
  }

  function quitarSeccion(indice) {
    setForm(f => ({
      ...f,
      secciones: f.secciones.filter((_, i) => i !== indice),
    }));
  }

  function actualizarSeccion(indice, campo, valor) {
    setForm(f => ({
      ...f,
      secciones: f.secciones.map((s, i) => i === indice ? { ...s, [campo]: valor } : s),
    }));
  }

  function construirParametros() {
    const base = {
      A: Number(form.A), H: Number(form.H), P: Number(form.P),
      colorInterior: form.colorInterior, colorExterior: form.colorExterior,
      espesorPuertas: Number(form.espesorPuertas) === 18 ? 18 : 15,
    };

    const cubierta = {
      incluir: !!form.cubiertaIncluir,
      material: form.cubiertaMaterial,
      espesor: Number(form.cubiertaEspesor) || 20,
    };

    if (form.modulo === 'bajo_cocina') {
      return {
        ...base,
        isla: !!form.isla,
        cubierta,
        secciones: form.secciones.map(s => {
          const ancho = Number(s.ancho) || undefined;
          if (s.tipo === 'estandar') {
            const { nP, nC } = nPyNCporConfig(s.config, Number(s.nP) || 0, Number(s.nC) || 0);
            const repisas = (nP > 0 || s.config === 'abierto') ? Number(s.repisas) || 0 : 0;
            return { tipo: 'estandar', config: s.config, nP, nC, repisas, ancho };
          }
          if (s.tipo === 'esquinero') {
            return { tipo: 'esquinero', giro: s.giro || 'derecha', ancho, repisas: Number(s.repisas) || 0 };
          }
          return { tipo: s.tipo, ancho };
        }),
      };
    }
    if (form.modulo === 'alto_cocina') {
      return {
        ...base,
        secciones: form.secciones.map(s => ({
          ancho: Number(s.ancho) || undefined,
          nP: Number(s.nP) || 1,
          nBaldas: Number(s.nBaldas) || 0,
        })),
      };
    }
    if (form.modulo === 'closet') {
      return {
        ...base,
        nP: form.tipoPuerta === 'corredera' && Number(form.nP) > 0 ? 2 : Number(form.nP),
        tipoPuerta: form.tipoPuerta,
        secciones: form.secciones.map(s => ({
          cajones: Number(s.cajones), repisas: Number(s.repisas), colgador: !!s.colgador,
          ancho: s.ancho ? Number(s.ancho) : undefined,
        })),
      };
    }
    if (form.modulo === 'vanitorio_bano') {
      const { nP, nC } = nPyNCporConfig(form.config, Number(form.nP), Number(form.nC));
      const repisas = (nP > 0 || form.config === 'abierto') ? Number(form.repisas) || 0 : 0;
      return {
        ...base,
        nP, nC, repisas, config: form.config,
        soporte: form.soporte, sifon: !!form.sifon,
        cubierta,
      };
    }
    if (form.modulo === 'despensa') {
      if (form.nP === '' || form.nP === undefined || form.nP === null) {
        throw new Error('Elige la cantidad de puertas de la despensa (0, 1 o 2) antes de continuar.');
      }
      return {
        ...base,
        nP: Number(form.nP),
        repisas: Number(form.repisas),
      };
    }
    if (form.modulo === 'velador') {
      return { ...base, tipoInferior: form.tipoInferior };
    }
    if (form.modulo === 'escritorio') {
      return {
        ...base,
        anchoCajonera: Number(form.anchoCajonera), ladoCajonera: form.ladoCajonera,
        configCajonera: form.configCajonera, nC: Number(form.nC),
        cubierta,
      };
    }
    if (form.modulo === 'librero') {
      return {
        ...base,
        secciones: form.secciones.map(s => ({
          repisas: Number(s.repisas),
          ancho: s.ancho ? Number(s.ancho) : undefined,
        })),
      };
    }
    return base;
  }

  function construirOpcionesCorte() {
    return form.plancha === 'custom'
      ? { plancha: 'custom', anchoCustom: Number(form.anchoCustom), altoCustom: Number(form.altoCustom) }
      : { plancha: form.plancha };
  }

  async function generar() {
    setCargando(true);
    setError(null);
    setDesbloqueado(false);
    try {
      const parametros = construirParametros();
      const opcionesCorte = construirOpcionesCorte();

      const res = await fetch('/api/despiece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo: form.modulo, parametros, opcionesCorte }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando el despiece');
      setResultado(data);

      // Registro de uso real: a diferencia de "muebles" (que solo se llena
      // si además se guarda el diseño), esto cuenta a cualquiera que llegue
      // a ver su despiece generado, se lo guarde o no — para que las
      // estadísticas de uso reflejen la plataforma tal como se usa de
      // verdad. Pasa por el servidor (no un insert directo del cliente) para
      // poder registrar también el país del visitante. Sin esperar la
      // respuesta ni frenar la UI si falla.
      fetch('/api/registrar-generacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: usuario?.id || null, modulo: form.modulo }),
      }).catch(errGen => console.error('No se pudo registrar la generación:', errGen.message));

      // Evento de GA4 para poder importarlo como conversión en Google Ads —
      // esta es la acción real que le da valor a un clic (no solo entrar al
      // sitio). Solo existe en producción (ver app/layout.js).
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'generar_despiece', { modulo: form.modulo });
      }
    } catch (e) {
      setError(e.message);
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }

  // ---------- Checkout real de Lemon Squeezy ----------
  async function iniciarCheckoutReal() {
    if (!usuario) {
      router.push(`/login?redirect=${encodeURIComponent('/configurador')}`);
      return;
    }
    setComprandoReal(true);
    setError(null);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const accessToken = sesion.session?.access_token;
      if (!accessToken) throw new Error('Sesión no encontrada, vuelve a iniciar sesión');

      const nombre = MODULOS.find(m => m.value === form.modulo)?.label || 'Mueble';
      const parametros = construirParametros();

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, muebleId: muebleActualId, nombre, modulo: form.modulo, parametros }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error iniciando el pago');

      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError('No se pudo iniciar el pago: ' + e.message);
      setComprandoReal(false);
    }
  }

  async function descargarPdf() {
    if (!resultado) return;
    setDescargandoPdf(true);
    setError(null);
    try {
      const nombre = MODULOS.find(m => m.value === form.modulo)?.label || 'Mueble';
      const imagen3D = visor3DRef.current?.capturarImagen() || null;

      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          modulo: form.modulo,
          despiece: resultado.despiece,
          corte: resultado.corte,
          imagen3D,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error generando el PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `despiece_${form.modulo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('No se pudo descargar el PDF: ' + e.message);
    } finally {
      setDescargandoPdf(false);
    }
  }

  async function descargarManual() {
    if (!resultado) return;
    setDescargandoManual(true);
    setError(null);
    try {
      const nombre = MODULOS.find(m => m.value === form.modulo)?.label || 'Mueble';

      const res = await fetch('/api/manual-armado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          modulo: form.modulo,
          despiece: resultado.despiece,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error generando el manual');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual_armado_${form.modulo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('No se pudo descargar el manual: ' + e.message);
    } finally {
      setDescargandoManual(false);
    }
  }

  const moduloLabel = MODULOS.find(m => m.value === form.modulo)?.label || '';
  // Todo mueble tiene una superficie superior (cubierta, techo o tapa) hasta
  // donde llega el "Alto" — salvo los que se cuelgan de la pared, donde el
  // "Alto" es el alto del cuerpo colgado, no una medida desde el piso.
  const alturaEsDesdeElPiso = !(form.modulo === 'alto_cocina' || (form.modulo === 'vanitorio_bano' && form.soporte === 'suspendido'));

  // Mismos rangos que valida el backend en cada motor (validarParametros) —
  // se repiten acá para que el cliente vea el límite ANTES de generar el
  // despiece, no recién al hacer clic y toparse con un error.
  const esModuloChico = form.modulo === 'velador' || form.modulo === 'baul';
  const maxAncho = esModuloChico ? 2000 : 10000;
  const maxAltoProfundidad = esModuloChico ? 1500 : 3000;

  return (
    <main className="container">
      <h1>Diseñar — {moduloLabel}</h1>

      <div className="grid-2">
        {/* ---------- Panel de parámetros ---------- */}
        <div className="card">
          {soloLectura && (
            <p style={{ background: '#fff4e5', border: '1px solid #f0c987', borderRadius: 6, padding: 10, fontSize: 13, marginBottom: 14 }}>
              Este despiece ya fue comprado — queda de solo lectura para que no se pueda modificar y sacar un plano distinto del mismo diseño ya pagado. Crea un mueble nuevo si quieres otro diseño.
            </p>
          )}
          <fieldset disabled={soloLectura} style={{ border: 'none', margin: 0, padding: 0 }}>
          <label>Tipo de mueble</label>
          <select value={form.modulo} onChange={e => cambiarModulo(e.target.value)}>
            {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          {ANCHO_LO_DEFINEN_SECCIONES.includes(form.modulo) && form.secciones.some(s => s.tipo === 'esquinero') ? (
            <p style={{ fontSize: 12, color: '#888', margin: '8px 0' }}>
              Con una esquina agregada, el mueble dobla 90° — ya no tiene un solo ancho en línea recta,
              así que este total deja de mostrarse. Cada módulo (de cada tramo) trae su propio ancho más abajo.
            </p>
          ) : ANCHO_LO_DEFINEN_SECCIONES.includes(form.modulo) ? (
            <>
              <label>Ancho total (mm)</label>
              <input
                type="number"
                value={
                  form.secciones.reduce((suma, s) => suma + (Number(s.ancho) || 0), 0) +
                  (MODULOS_CON_TAPAS_LATERALES.includes(form.modulo) ? ANCHO_TAPAS_LATERALES_MM : 0)
                }
                disabled
              />
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                {MODULOS_CON_TAPAS_LATERALES.includes(form.modulo)
                  ? `Cada módulo es una caja independiente con su propio ancho — este total es la suma de los módulos de abajo más ${ANCHO_TAPAS_LATERALES_MM}mm de las 2 tapas laterales de acabado en los extremos, no se edita directamente.`
                  : 'Cada sección trae su propio ancho — este total es solo la suma de las secciones de abajo, no se edita directamente.'}
              </p>
            </>
          ) : (
            <>
              <label>Ancho (mm)</label>
              <input type="number" min={50} max={maxAncho} value={form.A} onChange={e => actualizar('A', e.target.value)} />
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                Este es el ancho exterior del mueble completo.
              </p>
            </>
          )}

          <label>Alto (mm)</label>
          <input type="number" min={50} max={maxAltoProfundidad} value={form.H} onChange={e => actualizar('H', e.target.value)} />
          {alturaEsDesdeElPiso && (
            <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
              Esta es la altura desde el piso hasta la superficie superior del mueble.
            </p>
          )}

          <label>Profundidad (mm)</label>
          <input type="number" min={50} max={maxAltoProfundidad} value={form.P} onChange={e => actualizar('P', e.target.value)} />
          {alturaEsDesdeElPiso && (
            <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
              Esta es la profundidad de la superficie superior del mueble.
            </p>
          )}


          {form.modulo === 'alto_cocina' && (
            <>
              <label>Módulos (de izquierda a derecha)</label>
              {form.secciones.map((s, i) => (
                <div key={i} style={{ border: '1px solid #e4e2dc', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>Módulo {i + 1}</strong>
                    {form.secciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarSeccion(i)}
                        style={{ margin: 0, width: 'auto', padding: '2px 8px', fontSize: 12, background: 'var(--color-danger)' }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <label>Ancho fijo (mm)</label>
                  <input
                    type="number" min={100}
                    value={s.ancho ?? ''}
                    onChange={e => actualizarSeccion(i, 'ancho', e.target.value === '' ? undefined : e.target.value)}
                  />

                  <label>Cantidad de puertas</label>
                  <input type="number" min={1} value={s.nP} onChange={e => actualizarSeccion(i, 'nP', e.target.value)} />

                  <label>Cantidad de repisas interiores</label>
                  <input type="number" min={0} value={s.nBaldas} onChange={e => actualizarSeccion(i, 'nBaldas', e.target.value)} />
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar módulo
              </button>
            </>
          )}

          {form.modulo === 'closet' && (
            <>
              <label>Secciones del interior (de izquierda a derecha)</label>
              {form.secciones.map((s, i) => (
                <div key={i} style={{ border: '1px solid #e4e2dc', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>Sección {i + 1}</strong>
                    {form.secciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarSeccion(i)}
                        style={{ margin: 0, width: 'auto', padding: '2px 8px', fontSize: 12, background: 'var(--color-danger)' }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <label>Cajones</label>
                  <input type="number" min={0} value={s.cajones} onChange={e => actualizarSeccion(i, 'cajones', e.target.value)} />

                  <label>Repisas</label>
                  <input type="number" min={0} value={s.repisas} onChange={e => actualizarSeccion(i, 'repisas', e.target.value)} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={!!s.colgador}
                      onChange={e => actualizarSeccion(i, 'colgador', e.target.checked)}
                    />
                    Colgador (barra para colgar ropa)
                  </label>

                  <label>Ancho de la sección (mm)</label>
                  <input
                    type="number" min={100}
                    value={s.ancho ?? ''}
                    onChange={e => actualizarSeccion(i, 'ancho', e.target.value === '' ? undefined : e.target.value)}
                  />
                  <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                    Cada sección trae su propio ancho — no hay reparto automático. Es el ancho tal como se ve por
                    fuera (comparte la mitad de cada separador con la sección vecina). Sumando el de todas las
                    secciones da el "Ancho total" de arriba.
                  </p>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar sección
              </button>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={Number(form.nP) > 0}
                  onChange={e => actualizar('nP', e.target.checked ? 1 : 0)}
                />
                Lleva puertas (si no, el closet queda abierto y las secciones a la vista)
              </label>

              {Number(form.nP) > 0 && (
                <>
                  <label>Tipo de puerta</label>
                  <select value={form.tipoPuerta} onChange={e => actualizar('tipoPuerta', e.target.value)}>
                    <option value="batiente">Batiente (con bisagra)</option>
                    <option value="corredera">Corredera (sobre riel)</option>
                  </select>

                  {form.tipoPuerta === 'batiente' ? (
                    <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                      La cantidad y el ancho de las puertas se calculan solos: una por sección (o más si queda muy
                      ancha, máximo ~500mm por hoja), siempre alineadas con un separador real para poder atornillar
                      la bisagra.
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                      Las puertas correderas siempre son 2 hojas, superpuestas en dos rieles, que en conjunto
                      cubren todo el ancho del closet.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {form.modulo === 'despensa' && (
            <>
              <label>Repisas</label>
              <input type="number" min={0} value={form.repisas} onChange={e => actualizar('repisas', e.target.value)} />

              <label style={{ marginTop: 18 }}>Cantidad de puertas</label>
              <select value={form.nP} onChange={e => actualizar('nP', e.target.value)}>
                <option value="" disabled>Selecciona una opción...</option>
                <option value={0}>Sin puertas (despensa abierta)</option>
                <option value={1}>1 puerta</option>
                <option value={2}>2 puertas</option>
              </select>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                Como referencia: 1 puerta rinde bien en anchos de 200 a 500mm, y 2 puertas en anchos de 500 a
                1000mm.
              </p>
            </>
          )}

          {form.modulo === 'bajo_cocina' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!form.isla}
                  onChange={e => actualizar('isla', e.target.checked)}
                />
                Mueble isla (independiente, respaldo terminado)
              </label>

              <label>Módulos (de izquierda a derecha)</label>
              {form.secciones.map((s, i) => (
                <div key={i} style={{ border: '1px solid #e4e2dc', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>Módulo {i + 1}</strong>
                    {form.secciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarSeccion(i)}
                        style={{ margin: 0, width: 'auto', padding: '2px 8px', fontSize: 12, background: 'var(--color-danger)' }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <label>Tipo</label>
                  <select value={s.tipo} onChange={e => actualizarSeccion(i, 'tipo', e.target.value)}>
                    <option value="estandar">Estándar (puertas/cajones)</option>
                    <option value="lavaplatos">Lavaplatos</option>
                    {esAdmin && <option value="lavavajillas">Lavavajillas (600mm, sin frente)</option>}
                    <option value="horno">Horno empotrado (600mm, sin frente)</option>
                    {esAdmin && <option value="esquinero">Esquina (dobla 90° acá)</option>}
                  </select>

                  {s.tipo === 'estandar' && (
                    <>
                      <label>Configuración</label>
                      <select value={s.config} onChange={e => actualizarSeccion(i, 'config', e.target.value)}>
                        <option value="solo_cajones">Solo cajones</option>
                        <option value="solo_puertas">Solo puertas</option>
                        <option value="mixto">Cajones arriba + puertas abajo</option>
                        <option value="abierto">Sin puerta (hueco abierto)</option>
                      </select>

                      {(s.config === 'solo_cajones' || s.config === 'mixto') && (
                        <>
                          <label>Cantidad de cajones</label>
                          <input type="number" min={1} value={s.nC} onChange={e => actualizarSeccion(i, 'nC', e.target.value)} />
                        </>
                      )}
                      {(s.config === 'solo_puertas' || s.config === 'mixto') && (
                        <>
                          <label>Cantidad de puertas</label>
                          <input type="number" min={1} value={s.nP} onChange={e => actualizarSeccion(i, 'nP', e.target.value)} />
                        </>
                      )}
                      {(s.config === 'solo_puertas' || s.config === 'mixto' || s.config === 'abierto') && (
                        <>
                          <label>Repisas interiores (además del piso)</label>
                          <input type="number" min={0} value={s.repisas ?? 0} onChange={e => actualizarSeccion(i, 'repisas', e.target.value)} />
                        </>
                      )}
                    </>
                  )}

                  {(s.tipo === 'lavaplatos' || s.tipo === 'lavavajillas' || s.tipo === 'horno') && (
                    <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                      Ancho estándar 600mm{s.tipo === 'lavaplatos' ? ' (según cubeta simple/doble)' : ''}.
                      {(s.tipo === 'lavavajillas' || s.tipo === 'horno') && ' Sin frente propio: lo cubre el electrodoméstico.'}
                    </p>
                  )}
                  {s.tipo === 'esquinero' && (
                    <>
                      <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                        No es un frente: acá la fila dobla 90° y sigue con los módulos que pongas después (un
                        nuevo tramo, ya girado). Tiene que haber al menos un módulo antes y uno después de
                        cada esquina.
                      </p>
                      <label>Gira hacia</label>
                      <select value={s.giro || 'derecha'} onChange={e => actualizarSeccion(i, 'giro', e.target.value)}>
                        <option value="derecha">Derecha</option>
                        <option value="izquierda">Izquierda</option>
                      </select>
                      <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                        Dos brazos en L, cada uno con su puerta (bisagra de 165° para que abran sin chocar
                        entre sí) — el ancho de abajo es el ancho de esas puertas, igual para los dos brazos.
                      </p>
                    </>
                  )}

                  <label>{s.tipo === 'esquinero' ? 'Ancho de las puertas (mm)' : 'Ancho del módulo (mm)'}</label>
                  <input
                    type="number" min={100}
                    value={s.ancho ?? ''}
                    onChange={e => actualizarSeccion(i, 'ancho', e.target.value === '' ? undefined : e.target.value)}
                  />
                  <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                    {s.tipo === 'esquinero'
                      ? 'Igual que en los otros módulos, tú eliges el ancho — el brazo perpendicular suma además el fondo del mueble a la fila, aparte de este ancho.'
                      : 'Cada módulo es una caja independiente — no hay reparto automático, cada uno trae su propio ' +
                        'ancho exterior. Sumando el de todos los módulos da el "Ancho total" de arriba. Se recomienda ' +
                        'que el ancho de las puertas sea el mismo en todos los módulos, para que el mueble quede parejo.'}
                  </p>
                  {s.tipo === 'esquinero' && (
                    <>
                      <label>Repisas interiores (por brazo)</label>
                      <input
                        type="number" min={0}
                        value={s.repisas ?? 0}
                        onChange={e => actualizarSeccion(i, 'repisas', e.target.value)}
                      />
                      <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                        Misma cantidad para los dos brazos. Si pides repisas, se agrega un travesaño de
                        soporte por abajo, en el rincón.
                      </p>
                    </>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar módulo
              </button>
            </>
          )}

          {form.modulo === 'vanitorio_bano' && (
            <>
              <label>Configuración de frentes</label>
              <select value={form.config} onChange={e => actualizar('config', e.target.value)}>
                <option value="solo_cajones">Solo cajones</option>
                <option value="solo_puertas">Solo puertas</option>
                <option value="mixto">Cajón superior + puertas</option>
                <option value="abierto">Sin puerta (hueco abierto)</option>
              </select>

              {(form.config === 'solo_cajones' || form.config === 'mixto') && (
                <>
                  <label>Cantidad de cajones</label>
                  <input type="number" min={1} value={form.nC} onChange={e => actualizar('nC', e.target.value)} />
                </>
              )}

              {(form.config === 'solo_puertas' || form.config === 'mixto') && (
                <>
                  <label>Cantidad de puertas</label>
                  <input type="number" min={1} value={form.nP} onChange={e => actualizar('nP', e.target.value)} />
                </>
              )}

              {(form.config === 'solo_puertas' || form.config === 'mixto' || form.config === 'abierto') && (
                <>
                  <label>Repisas interiores (además del piso)</label>
                  <input type="number" min={0} value={form.repisas} onChange={e => actualizar('repisas', e.target.value)} />
                </>
              )}
            </>
          )}

          {form.modulo === 'vanitorio_bano' && (
            <>
              <label>Soporte</label>
              <select value={form.soporte} onChange={e => actualizar('soporte', e.target.value)}>
                <option value="patas">Con patas (apoyado en el piso)</option>
                <option value="suspendido">Suspendido (colgado de la pared)</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!form.sifon}
                  onChange={e => actualizar('sifon', e.target.checked)}
                />
                Lleva lavamanos con sifón (deja nota de perforación)
              </label>
            </>
          )}

          {form.modulo === 'escritorio' && (
            <>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 8px' }}>
                Un panel sólido de un lado y una cajonera del otro, con hueco libre para las piernas en el medio — la cubierta vuela por encima de todo.
              </p>

              <label>Lado de la cajonera</label>
              <select value={form.ladoCajonera} onChange={e => actualizar('ladoCajonera', e.target.value)}>
                <option value="derecha">Derecha</option>
                <option value="izquierda">Izquierda</option>
              </select>

              <label>Ancho de la cajonera (mm)</label>
              <input type="number" min={250} value={form.anchoCajonera} onChange={e => actualizar('anchoCajonera', e.target.value)} />

              <label>Configuración de la cajonera</label>
              <select value={form.configCajonera} onChange={e => actualizar('configCajonera', e.target.value)}>
                <option value="solo_cajones">Solo cajones</option>
                <option value="cajon_puerta">Cajón superior + puerta abajo</option>
                <option value="cajon_repisa">Cajón superior + repisa fija abajo</option>
              </select>

              {form.configCajonera === 'solo_cajones' && (
                <>
                  <label>Cantidad de cajones</label>
                  <input type="number" min={1} value={form.nC} onChange={e => actualizar('nC', e.target.value)} />
                </>
              )}

              <label>Material de la cubierta (superficie de trabajo)</label>
              <select value={form.cubiertaMaterial} onChange={e => actualizar('cubiertaMaterial', e.target.value)}>
                <option value="melamina">Melamina (se corta y anida con el resto)</option>
                <option value="cuarzo">Cuarzo (proveedor aparte, no se anida)</option>
                <option value="granito">Granito (proveedor aparte, no se anida)</option>
                <option value="marmol">Mármol (proveedor aparte, no se anida)</option>
              </select>

              <label>Espesor cubierta (mm)</label>
              <input type="number" min={10} value={form.cubiertaEspesor} onChange={e => actualizar('cubiertaEspesor', e.target.value)} />
            </>
          )}

          {form.modulo === 'velador' && (
            <>
              <label>Compartimento inferior (bajo el cajón)</label>
              <select value={form.tipoInferior} onChange={e => actualizar('tipoInferior', e.target.value)}>
                <option value="puerta">Con puerta (cerrado)</option>
                <option value="repisa">Repisa fija (abierto)</option>
                <option value="abierto">Abierto, sin repisa</option>
              </select>
            </>
          )}

          {form.modulo === 'librero' && (
            <>
              <label>Secciones del interior (de izquierda a derecha)</label>
              {form.secciones.map((s, i) => (
                <div key={i} style={{ border: '1px solid #e4e2dc', borderRadius: 8, padding: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>Sección {i + 1}</strong>
                    {form.secciones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarSeccion(i)}
                        style={{ margin: 0, width: 'auto', padding: '2px 8px', fontSize: 12, background: 'var(--color-danger)' }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <label>Repisas</label>
                  <input type="number" min={0} value={s.repisas} onChange={e => actualizarSeccion(i, 'repisas', e.target.value)} />

                  <label>Ancho de la sección (mm)</label>
                  <input
                    type="number" min={100}
                    value={s.ancho ?? ''}
                    onChange={e => actualizarSeccion(i, 'ancho', e.target.value === '' ? undefined : e.target.value)}
                  />
                  <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                    Cada sección trae su propio ancho — no hay reparto automático. Es el ancho tal como se ve por
                    fuera (comparte la mitad de cada separador con la sección vecina). Con una sola sección no se
                    agrega ningún separador interior.
                  </p>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar sección
              </button>
            </>
          )}

          {(form.modulo === 'bajo_cocina' || form.modulo === 'vanitorio_bano') && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!form.cubiertaIncluir}
                  onChange={e => actualizar('cubiertaIncluir', e.target.checked)}
                />
                Incluir cubierta (superficie)
                {form.modulo === 'bajo_cocina' ? ' + lavaplatos' : ' + lavamanos'}
              </label>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 8px' }}>
                Aunque no la agregues acá, el "Alto" de arriba ya es la altura {alturaEsDesdeElPiso ? 'desde el piso ' : ''}
                hasta la superficie de la cubierta, y la "Profundidad" ya es la profundidad de la cubierta — se la
                puedes encargar a otro proveedor (piedra, por ejemplo) con esas mismas medidas.
              </p>

              {form.cubiertaIncluir && (
                <>
                  <label>Material de la cubierta</label>
                  <select value={form.cubiertaMaterial} onChange={e => actualizar('cubiertaMaterial', e.target.value)}>
                    <option value="melamina">Melamina (se corta y anida con el resto)</option>
                    <option value="cuarzo">Cuarzo (proveedor aparte, no se anida)</option>
                    <option value="granito">Granito (proveedor aparte, no se anida)</option>
                    <option value="marmol">Mármol (proveedor aparte, no se anida)</option>
                  </select>

                  <label>Espesor cubierta (mm)</label>
                  <input type="number" min={10} value={form.cubiertaEspesor} onChange={e => actualizar('cubiertaEspesor', e.target.value)} />
                </>
              )}
            </>
          )}

          {form.modulo !== 'librero' && form.modulo !== 'escritorio' && form.modulo !== 'baul' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={Number(form.espesorPuertas) === 18}
                onChange={e => actualizar('espesorPuertas', e.target.checked ? 18 : 15)}
              />
              Puertas más gruesas (18mm en vez de 15mm estándar)
            </label>
          )}

          {form.modulo !== 'baul' && (
          <>
          <label>Color interior (cajones/bandejas/repisas)</label>
          <select value={form.colorInterior} onChange={e => actualizar('colorInterior', e.target.value)}>
            {COLORES_INTERIOR.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          </>
          )}

          {form.modulo !== 'librero' && (
          <>
          <label>{form.modulo === 'baul' ? 'Color (toda la estructura)' : 'Color exterior (frentes/puertas/zócalo)'}</label>
          <select value={form.colorExterior} onChange={e => actualizar('colorExterior', e.target.value)}>
            {COLORES_EXTERIOR.map(g => (
              <optgroup key={g.grupo} label={g.grupo}>
                {g.opciones.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </optgroup>
            ))}
          </select>
          </>
          )}

          <label>Plancha de melamina</label>
          <select value={form.plancha} onChange={e => actualizar('plancha', e.target.value)}>
            {PLANCHAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {form.plancha === 'custom' && (
            <>
              <label>Ancho plancha (mm)</label>
              <input type="number" value={form.anchoCustom} onChange={e => actualizar('anchoCustom', e.target.value)} />
              <label>Alto plancha (mm)</label>
              <input type="number" value={form.altoCustom} onChange={e => actualizar('altoCustom', e.target.value)} />
            </>
          )}

          <button onClick={generar} disabled={cargando}>
            {cargando ? 'Generando...' : 'Generar despiece'}
          </button>

          {!muebleActualId && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
              Diseñar y ver tu mueble en 3D es gratis. Para ver las medidas exactas de cada pieza, el diagrama de corte y el PDF
              de entrega, desbloquea el despiece con un pago único por mueble (ver <a href="/precios" style={{ color: 'var(--color-accent)' }}>precios</a>).
            </p>
          )}
          <button
            type="button"
            onClick={guardarMueble}
            disabled={guardando}
            style={{ background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
          >
            {guardando ? 'Guardando...' : muebleActualId ? 'Actualizar mueble guardado' : 'Guardar mueble'}
          </button>
          {guardadoOk && <p style={{ color: 'var(--color-ok)', fontSize: 13, marginTop: 8 }}>Mueble guardado ✓</p>}

          {muebleActualId && (desbloqueado || esAdmin || MODO_GRATIS_TEMPORAL) && (
            <button
              type="button"
              onClick={compartirMueble}
              style={{ background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', marginTop: 10 }}
            >
              {linkCopiado ? 'Link copiado ✓' : 'Copiar link para compartir'}
            </button>
          )}
          {muebleActualId && (desbloqueado || esAdmin || MODO_GRATIS_TEMPORAL) && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 6 }}>
              Cualquiera con este link puede ver el plano 3D y el despiece, sin necesitar cuenta — útil para pasárselo a quien te esté armando el mueble.
            </p>
          )}
          {muebleActualId && !desbloqueado && !esAdmin && !MODO_GRATIS_TEMPORAL && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 6 }}>
              El link para compartir se habilita una vez que compres el despiece.
            </p>
          )}

          {error && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
          </fieldset>
        </div>

        {/* ---------- Panel de resultados ---------- */}
        <div>
          {!resultado && (
            <div className="card" style={{ textAlign: 'center', color: '#888' }}>
              Completa los parámetros y genera el despiece para ver el plano 3D,
              el listado de piezas y el diagrama de corte.
            </div>
          )}

          {resultado && (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3>Plano 3D</h3>
                <Visor3D
                  ref={visor3DRef}
                  piezas={resultado.despiece.piezas}
                  accesorios={resultado.despiece.accesorios}
                  parametros={resultado.despiece.parametros}
                  modulo={resultado.despiece.modulo}
                  medidasBloqueadas={!desbloqueado && !esAdmin && !MODO_GRATIS_TEMPORAL}
                />
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <h3>Listado de piezas y herrajes</h3>
                <ListaPiezas
                  despiece={resultado.despiece}
                  medidasBloqueadas={!desbloqueado && !esAdmin && !MODO_GRATIS_TEMPORAL}
                />
              </div>

              {!desbloqueado && !esAdmin && !MODO_GRATIS_TEMPORAL && (
                <div className="card" style={{ textAlign: 'center' }}>
                  <h3>Diagrama de corte y descarga</h3>
                  <p style={{ color: '#888', fontSize: 14 }}>
                    Ya puedes ver qué piezas necesita tu mueble. Desbloquea las medidas exactas,
                    el diagrama de corte y el PDF de entrega para poder cortarlo.
                  </p>

                  {verificandoPago && (
                    <p style={{ color: 'var(--color-accent)', fontSize: 14 }}>Confirmando tu pago…</p>
                  )}

                  <button onClick={iniciarCheckoutReal} disabled={comprandoReal} style={{ maxWidth: 320, margin: '0 auto' }}>
                    {comprandoReal ? 'Redirigiendo a pago...' : 'Desbloquear despiece'}
                  </button>
                  <p style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>
                    Pago único por mueble con tarjeta, procesado por Lemon Squeezy. Se desbloquea al instante.
                    Precio en US$, más impuestos aplicables según tu país.
                  </p>
                  {error && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
                </div>
              )}

              {(desbloqueado || esAdmin || MODO_GRATIS_TEMPORAL) && (
                <>
                  {esAdmin && !desbloqueado && (
                    <div className="card" style={{ textAlign: 'center', marginBottom: 20 }}>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                        Modo administrador: nunca se te cobra por sacar un plano.
                        {' '}
                        <button
                          type="button"
                          onClick={iniciarCheckoutReal}
                          disabled={comprandoReal}
                          style={{ width: 'auto', padding: '4px 10px', fontSize: 12, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
                        >
                          {comprandoReal ? 'Redirigiendo...' : 'Probar el pago real igual'}
                        </button>
                      </p>
                    </div>
                  )}
                  <div className="card" style={{ marginBottom: 20 }}>
                    <h3>Diagrama de corte</h3>
                    <DiagramaCorte corte={resultado.corte} />
                  </div>

                  <div className="card" style={{ textAlign: 'center' }}>
                    <button onClick={descargarPdf} disabled={descargandoPdf} style={{ display: 'block', width: '100%', maxWidth: 320, margin: '0 auto' }}>
                      {descargandoPdf ? 'Generando PDF...' : 'Descargar PDF de entrega'}
                    </button>
                    <button
                      onClick={descargarManual}
                      disabled={descargandoManual}
                      style={{ display: 'block', width: '100%', maxWidth: 320, margin: '10px auto 0' }}
                    >
                      {descargandoManual ? 'Generando manual...' : 'Descargar manual de armado de este mueble'}
                    </button>
                    <p style={{ fontSize: 13, marginTop: 12 }}>
                      <a href="/guia-armado" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                        Ver guía general de armado
                      </a>
                      {' '}— cómo unir las piezas, instalar correderas/bisagras y fijar el mueble
                    </p>
                    {error && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
