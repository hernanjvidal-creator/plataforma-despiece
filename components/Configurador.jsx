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

const PLANCHAS = [
  { value: 'CL', label: 'Chile — 1830x2500' },
  { value: 'CL_grande', label: 'Chile — 1830x3660 (formato grande)' },
  { value: 'AR', label: 'Argentina — 1830x2750' },
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
];

// El checkout real de Lemon Squeezy está en pruebas — mientras se termina
// de configurar la tienda, solo esta cuenta lo ve. El resto sigue con el
// botón de compra simulada. Sacar este chequeo cuando se habilite para todos.
const EMAIL_PAGOS_REAL = EMAIL_ADMIN;

// Fase de validación: el pago está desactivado y todo el despiece queda
// disponible gratis para cualquier usuario, para probar el flujo completo y
// juntar feedback antes de cobrar. Para reactivar el cobro más adelante,
// basta con volver esto a `false` — el resto de la lógica de pago (Lemon
// Squeezy, el carrito, el bloqueo de edición post-compra) sigue intacta.
const MODO_GRATIS_TEMPORAL = true;

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
    A: 600, H: 700, P: 560,
    isla: false,
    cubiertaIncluir: false, cubiertaMaterial: 'melamina', cubiertaEspesor: 20,
    secciones: [
      { tipo: 'estandar', config: 'solo_cajones', nP: 0, nC: 3 },
    ],
    colorInterior: 'blanco', colorExterior: 'gris_grafito',
    espesorPuertas: 15,
  },
  alto_cocina: {
    A: 600, H: 700, P: 320,
    nP: 2, nBaldas: 1,
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
    A: 2400, H: 2200, P: 580,
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
    A: 900, H: 2000, P: 450,
    nP: 2, tipoPuerta: 'batiente',
    secciones: [
      { repisas: 5 },
      { repisas: 5 },
    ],
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
    A: 900, H: 1800, P: 300,
    secciones: [
      { repisas: 5 },
      { repisas: 5 },
    ],
    colorInterior: 'blanco', colorExterior: 'blanco',
  },
};

const VALORES_COMUNES = { plancha: 'CL', anchoCustom: 1830, altoCustom: 2500 };

// Inversa de construirParametros(): reconstruye el estado plano del
// formulario a partir de los `parametros` guardados de un mueble.
function formDesdeParametros(modulo, parametros) {
  const base = { modulo, ...VALORES_POR_MODULO[modulo], ...VALORES_COMUNES };
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
    return { ...base, ...comunes, nP: parametros.nP, nBaldas: parametros.nBaldas };
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
    return { ...base, ...comunes, nP: parametros.nP, tipoPuerta: parametros.tipoPuerta, secciones: parametros.secciones };
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
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [soloLectura, setSoloLectura] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [comprandoReal, setComprandoReal] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
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
      setForm(formDesdeParametros(data.modulo, data.parametros));
      setMuebleActualId(data.id);

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
          body: JSON.stringify({ modulo: data.modulo, parametros: data.parametros, opcionesCorte: { plancha: 'CL' } }),
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
  // estado del pedido cada 2s (hasta 15 intentos) en vez de confiar en que
  // ya esté "pagado" apenas se vuelve a esta página.
  useEffect(() => {
    if (!pedidoPagoParam) return;
    let cancelado = false;
    let intentos = 0;

    async function verificar() {
      const { data, error: err } = await supabase
        .from('pedidos')
        .select('estado')
        .eq('id', pedidoPagoParam)
        .single();
      if (cancelado) return;

      if (!err && data?.estado === 'pagado') {
        setDesbloqueado(true);
        setVerificandoPago(false);
        return;
      }
      intentos += 1;
      if (intentos < 15) {
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
    const nombreSugerido = MODULOS.find(m => m.value === form.modulo)?.label || 'Mueble';
    const nombre = window.prompt('Nombre para este mueble:', nombreSugerido);
    if (!nombre) return;

    setGuardando(true);
    setGuardadoOk(false);
    setError(null);
    try {
      const parametros = construirParametros();
      if (muebleActualId) {
        const { error: err } = await supabase
          .from('muebles')
          .update({ nombre, modulo: form.modulo, parametros })
          .eq('id', muebleActualId);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from('muebles')
          .insert({ user_id: usuario.id, nombre, modulo: form.modulo, parametros })
          .select()
          .single();
        if (err) throw err;
        setMuebleActualId(data.id);
      }
      setGuardadoOk(true);
    } catch (e) {
      setError('No se pudo guardar el mueble: ' + e.message);
    } finally {
      setGuardando(false);
    }
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
    const nueva = form.modulo === 'closet'
      ? { cajones: 0, repisas: 1, colgador: false }
      : (form.modulo === 'despensa' || form.modulo === 'librero')
      ? { repisas: 5 }
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
      espesorPuertas: form.puertasGruesas ? 18 : 15,
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
          if (s.tipo === 'esquinero') {
            return { tipo: 'esquinero', giro: s.giro || 'derecha' };
          }
          const ancho = s.ancho ? Number(s.ancho) : undefined;
          if (s.tipo === 'estandar') {
            const { nP, nC } = nPyNCporConfig(s.config, Number(s.nP) || 0, Number(s.nC) || 0);
            const repisas = (nP > 0 || s.config === 'abierto') ? Number(s.repisas) || 0 : 0;
            return { tipo: 'estandar', config: s.config, nP, nC, repisas, ancho };
          }
          return { tipo: s.tipo, ancho };
        }),
      };
    }
    if (form.modulo === 'alto_cocina') {
      return { ...base, nP: Number(form.nP), nBaldas: Number(form.nBaldas) };
    }
    if (form.modulo === 'closet') {
      return {
        ...base,
        nP: Number(form.nP), tipoPuerta: form.tipoPuerta,
        secciones: form.secciones.map(s => ({
          cajones: Number(s.cajones), repisas: Number(s.repisas), colgador: !!s.colgador,
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
      return {
        ...base,
        nP: Number(form.nP), tipoPuerta: form.tipoPuerta,
        secciones: form.secciones.map(s => ({ repisas: Number(s.repisas) })),
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
        secciones: form.secciones.map(s => ({ repisas: Number(s.repisas) })),
      };
    }
    return base;
  }

  async function generar() {
    setCargando(true);
    setError(null);
    setDesbloqueado(false);
    try {
      const parametros = construirParametros();
      const opcionesCorte = form.plancha === 'custom'
        ? { plancha: 'custom', anchoCustom: Number(form.anchoCustom), altoCustom: Number(form.altoCustom) }
        : { plancha: form.plancha };

      const res = await fetch('/api/despiece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo: form.modulo, parametros, opcionesCorte }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando el despiece');
      setResultado(data);
    } catch (e) {
      setError(e.message);
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }

  // ---------- Fase 2: "compra" (simulada por ahora) + descarga del PDF ----------
  // El listado de piezas y el diagrama de corte se ocultan hasta que el
  // cliente "compra" el despiece. Por ahora la compra es simulada (queda
  // registrada igual en pedidos/pedido_items) — el pago real con Lemon
  // Squeezy es la fase siguiente.
  async function simularCompra() {
    if (!usuario) {
      router.push(`/login?redirect=${encodeURIComponent('/configurador')}`);
      return;
    }
    setComprando(true);
    setError(null);
    try {
      const parametros = construirParametros();
      const nombre = MODULOS.find(m => m.value === form.modulo)?.label || 'Mueble';

      const { data: pedido, error: errPedido } = await supabase
        .from('pedidos')
        .insert({ user_id: usuario.id, estado: 'pagado', total: 0, paid_at: new Date().toISOString() })
        .select()
        .single();
      if (errPedido) throw errPedido;

      const { error: errItem } = await supabase.from('pedido_items').insert({
        pedido_id: pedido.id,
        user_id: usuario.id,
        mueble_id: muebleActualId,
        nombre,
        modulo: form.modulo,
        parametros_congelados: parametros,
        precio: 0,
      });
      if (errItem) throw errItem;

      setDesbloqueado(true);
    } catch (e) {
      setError('No se pudo procesar la compra: ' + e.message);
    } finally {
      setComprando(false);
    }
  }

  // ---------- Checkout real de Lemon Squeezy (en pruebas, ver EMAIL_PAGOS_REAL) ----------
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

  const moduloLabel = MODULOS.find(m => m.value === form.modulo)?.label || '';

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

          <label>Ancho (mm)</label>
          <input type="number" value={form.A} onChange={e => actualizar('A', e.target.value)} />
          {form.modulo === 'bajo_cocina' && form.secciones.some(s => s.tipo === 'esquinero') ? (
            <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
              Con una esquina agregada, este ancho ya no se usa — cada sección de cada brazo necesita su propio "Ancho fijo" más abajo.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
              Este es el ancho exterior del mueble completo.
            </p>
          )}

          <label>Alto (mm)</label>
          <input type="number" value={form.H} onChange={e => actualizar('H', e.target.value)} />

          <label>Profundidad (mm)</label>
          <input type="number" value={form.P} onChange={e => actualizar('P', e.target.value)} />


          {form.modulo === 'alto_cocina' && (
            <>
              <label>Cantidad de puertas</label>
              <input type="number" min={1} value={form.nP} onChange={e => actualizar('nP', e.target.value)} />

              <label>Cantidad de repisas interiores</label>
              <input type="number" min={0} value={form.nBaldas} onChange={e => actualizar('nBaldas', e.target.value)} />
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
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar sección
              </button>

              <label style={{ marginTop: 18 }}>Cantidad de puertas (0 = closet abierto)</label>
              <input type="number" min={0} value={form.nP} onChange={e => actualizar('nP', e.target.value)} />

              {Number(form.nP) > 0 && (
                <>
                  <label>Tipo de puerta</label>
                  <select value={form.tipoPuerta} onChange={e => actualizar('tipoPuerta', e.target.value)}>
                    <option value="batiente">Batiente (con bisagra)</option>
                    <option value="corredera">Corredera (sobre riel)</option>
                  </select>
                </>
              )}
            </>
          )}

          {form.modulo === 'despensa' && (
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
                </div>
              ))}
              <button
                type="button"
                onClick={agregarSeccion}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                + Agregar sección
              </button>

              <label style={{ marginTop: 18 }}>Cantidad de puertas (0 = despensa abierta)</label>
              <input type="number" min={0} value={form.nP} onChange={e => actualizar('nP', e.target.value)} />

              {Number(form.nP) > 0 && (
                <>
                  <label>Tipo de puerta</label>
                  <select value={form.tipoPuerta} onChange={e => actualizar('tipoPuerta', e.target.value)}>
                    <option value="batiente">Batiente (con bisagra)</option>
                    <option value="corredera">Corredera (sobre riel)</option>
                  </select>
                </>
              )}
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

              <label>Secciones (de izquierda a derecha)</label>
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

                  <label>Tipo</label>
                  <select value={s.tipo} onChange={e => actualizarSeccion(i, 'tipo', e.target.value)}>
                    <option value="estandar">Estándar (puertas/cajones)</option>
                    <option value="lavaplatos">Lavaplatos</option>
                    <option value="lavavajillas">Lavavajillas (600mm, sin frente)</option>
                    <option value="horno">Horno empotrado (600mm, sin frente)</option>
                    <option value="cajones_olleros">Cajones olleros (2 de 300mm + 1 superior)</option>
                    <option value="esquinero">Esquina (dobla 90° acá)</option>
                  </select>

                  {s.tipo === 'esquinero' && (
                    <>
                      <label>Gira hacia</label>
                      <select value={s.giro || 'derecha'} onChange={e => actualizarSeccion(i, 'giro', e.target.value)}>
                        <option value="derecha">Derecha</option>
                        <option value="izquierda">Izquierda</option>
                      </select>
                      <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                        No es un frente: acá el mueble dobla 90° y sigue con las secciones que pongas después
                        (nuevo brazo, "esquinero interior" con bisagra plegable de rincón). Tiene que haber al
                        menos una sección antes y después de cada esquina.
                      </p>
                    </>
                  )}

                  {s.tipo === 'estandar' && (
                    <>
                      <label>Configuración</label>
                      <select value={s.config} onChange={e => actualizarSeccion(i, 'config', e.target.value)}>
                        <option value="solo_cajones">Solo cajones</option>
                        <option value="solo_puertas">Solo puertas</option>
                        <option value="mixto">Cajones abajo + puertas arriba</option>
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

                  {s.tipo === 'cajones_olleros' && (
                    <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                      Siempre 2 cajones de 300mm abajo, más un cajón superior con el resto del alto disponible.
                    </p>
                  )}

                  {(s.tipo === 'lavaplatos' || s.tipo === 'lavavajillas' || s.tipo === 'horno') && (
                    <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0' }}>
                      Ancho estándar 600mm{s.tipo === 'lavaplatos' ? ' (según cubeta simple/doble)' : ''}.
                      {(s.tipo === 'lavavajillas' || s.tipo === 'horno') && ' Sin frente propio: lo cubre el electrodoméstico.'}
                    </p>
                  )}

                  {s.tipo !== 'esquinero' && (
                    <>
                      <label>
                        Ancho fijo (mm{form.secciones.some(sec => sec.tipo === 'esquinero') ? ', obligatorio con esquinas' : ', opcional — vacío = automático'})
                      </label>
                      <input
                        type="number" min={0}
                        value={s.ancho ?? ''}
                        onChange={e => actualizarSeccion(i, 'ancho', e.target.value === '' ? undefined : e.target.value)}
                      />
                      <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                        Ancho interior de esta sección (el hueco donde van puertas/cajones), sin contar los laterales.
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
                + Agregar sección
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

          {form.modulo !== 'librero' && form.modulo !== 'escritorio' && (
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

          <label>Color interior (cajones/bandejas/repisas)</label>
          <select value={form.colorInterior} onChange={e => actualizar('colorInterior', e.target.value)}>
            {COLORES_INTERIOR.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {form.modulo !== 'librero' && (
          <>
          <label>Color exterior (frentes/puertas/zócalo)</label>
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

          <button
            type="button"
            onClick={guardarMueble}
            disabled={guardando}
            style={{ background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
          >
            {guardando ? 'Guardando...' : muebleActualId ? 'Actualizar mueble guardado' : 'Guardar mueble'}
          </button>
          {guardadoOk && <p style={{ color: 'var(--color-ok)', fontSize: 13, marginTop: 8 }}>Mueble guardado ✓</p>}

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
                />
              </div>

              {!desbloqueado && !esAdmin && !MODO_GRATIS_TEMPORAL && (
                <div className="card" style={{ textAlign: 'center' }}>
                  <h3>Listado de piezas, herrajes y diagrama de corte</h3>
                  <p style={{ color: '#888', fontSize: 14 }}>
                    Desbloquea el despiece completo para ver el detalle de piezas, herrajes,
                    material y el diagrama de corte, y descargar el PDF de entrega.
                  </p>

                  {verificandoPago && (
                    <p style={{ color: 'var(--color-accent)', fontSize: 14 }}>Confirmando tu pago…</p>
                  )}

                  {usuario?.email === EMAIL_PAGOS_REAL && (
                    <>
                      <button onClick={iniciarCheckoutReal} disabled={comprandoReal} style={{ maxWidth: 320, margin: '0 auto' }}>
                        {comprandoReal ? 'Redirigiendo a pago...' : 'Pagar con Lemon Squeezy (modo prueba)'}
                      </button>
                      <p style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>
                        Checkout real de Lemon Squeezy en modo test — usa una tarjeta de prueba, no se cobra nada real.
                      </p>
                    </>
                  )}

                  <button
                    onClick={simularCompra}
                    disabled={comprando}
                    style={{ maxWidth: 320, margin: usuario?.email === EMAIL_PAGOS_REAL ? '16px auto 0' : '0 auto' }}
                  >
                    {comprando ? 'Procesando...' : 'Simular compra y desbloquear'}
                  </button>
                  <p style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>
                    Pago simulado por ahora — la pasarela de pago real se está probando antes de habilitarla para todos.
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
                    <h3>Listado de piezas y herrajes</h3>
                    <ListaPiezas despiece={resultado.despiece} />
                  </div>

                  <div className="card" style={{ marginBottom: 20 }}>
                    <h3>Diagrama de corte</h3>
                    <DiagramaCorte corte={resultado.corte} />
                  </div>

                  <div className="card" style={{ textAlign: 'center' }}>
                    <button onClick={descargarPdf} disabled={descargandoPdf} style={{ maxWidth: 320, margin: '0 auto' }}>
                      {descargandoPdf ? 'Generando PDF...' : 'Descargar PDF de entrega'}
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
