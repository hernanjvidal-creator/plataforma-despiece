// Decide, EN EL SERVIDOR, qué versión del despiece puede recibir una
// solicitud. Solo se debe importar desde rutas de servidor (app/api/**).
//
//   - EXACTA: el mueble ya está comprado, la cuenta es la de administración,
//     o está activa la fase gratuita. Es la única que sirve para cortar.
//   - VISTA PREVIA: todo lo demás. Alcanza para dibujar el mueble en 3D y
//     listar qué piezas lleva, pero sus medidas están alteradas unos
//     milímetros y no trae el diagrama de corte.
//
// Antes el servidor mandaba siempre el despiece exacto y el navegador solo lo
// mostraba borroso: bastaba mirar la respuesta de la red para tenerlo gratis.

import crypto from 'node:crypto';
import { supabase } from './supabaseClient';
import { supabaseAdmin, supabaseAdminConfigurado } from './supabaseAdmin';
import { EMAIL_ADMIN } from './admin';
import { MODO_GRATIS_TEMPORAL } from './modoGratisTemporal';
import { generarDespiecePorModulo } from './generarDespiecePorModulo';

// ---------- Quién puede ver el despiece exacto ----------

// Un mueble guardado está comprado si tiene un pedido_item cuyo pedido está
// "pagado" (un reembolso lo saca de ese estado y lo vuelve a bloquear).
// Devuelve el item de la compra más reciente, con los parámetros que quedaron
// CONGELADOS al pagar: el despiece exacto se calcula siempre con esos, no con
// lo que diga hoy la fila del mueble ni con lo que mande el navegador — así
// un mueble comprado no sirve de llave para sacar gratis otro diseño.
async function compraDeMueble(muebleId) {
  if (!supabaseAdminConfigurado || typeof muebleId !== 'string' || !muebleId) return null;

  const { data: items } = await supabaseAdmin
    .from('pedido_items')
    .select('pedido_id, modulo, parametros_congelados, opciones_corte')
    .eq('mueble_id', muebleId);
  if (!items || items.length === 0) return null;

  const { data: pagados } = await supabaseAdmin
    .from('pedidos')
    .select('id, created_at')
    .in('id', [...new Set(items.map(i => i.pedido_id))])
    .eq('estado', 'pagado')
    .order('created_at', { ascending: false });
  if (!pagados || pagados.length === 0) return null;

  const { data: mueble } = await supabaseAdmin
    .from('muebles')
    .select('nombre, modulo, parametros, opciones_corte')
    .eq('id', muebleId)
    .single();

  return { item: items.find(i => i.pedido_id === pagados[0].id), mueble: mueble || null };
}

async function esCuentaAdmin(accessToken) {
  if (typeof accessToken !== 'string' || !accessToken) return false;
  const { data, error } = await supabase.auth.getUser(accessToken);
  return !error && data?.user?.email === EMAIL_ADMIN;
}

/**
 * Calcula el despiece que corresponde entregar.
 *
 * @param {Object} solicitud
 * @param {string} [solicitud.muebleId]     mueble guardado que se está viendo
 * @param {string} [solicitud.accessToken]  sesión de quien pide (solo importa si es la cuenta admin)
 * @param {string} [solicitud.modulo]       diseño en edición (si el mueble no está comprado)
 * @param {Object} [solicitud.parametros]
 * @param {Object} [solicitud.opcionesCorte]
 * @returns {{ completo: boolean, nombre: string|null, modulo: string, despiece: Object, corte: Object }}
 */
export async function resolverDespiece({ muebleId, accessToken, modulo, parametros, opcionesCorte }) {
  const compra = await compraDeMueble(muebleId);
  if (compra) {
    const moduloComprado = compra.item.modulo || compra.mueble?.modulo;
    const { despiece, corte } = generarDespiecePorModulo(
      moduloComprado,
      compra.item.parametros_congelados || compra.mueble?.parametros,
      opcionesCorte || compra.mueble?.opciones_corte || compra.item.opciones_corte || undefined
    );
    return { completo: true, nombre: compra.mueble?.nombre || null, modulo: moduloComprado, despiece, corte };
  }

  const moduloPedido = modulo || 'bajo_cocina';
  const { despiece, corte } = generarDespiecePorModulo(moduloPedido, parametros, opcionesCorte);
  if (MODO_GRATIS_TEMPORAL || await esCuentaAdmin(accessToken)) {
    return { completo: true, nombre: null, modulo: moduloPedido, despiece, corte };
  }
  return { completo: false, nombre: null, modulo: moduloPedido, ...aVistaPrevia(moduloPedido, parametros, despiece, corte) };
}

// ---------- Vista previa ----------

// El 3D necesita la forma de cada pieza, así que algo de geometría tiene que
// llegar al navegador igual. Lo que se manda es cada pieza con su ancho y su
// alto corridos unos milímetros (creciendo o achicándose desde su centro): en
// pantalla el mueble se ve igual, pero la lista no sirve para cortar.
//
// El corrimiento sale de una clave que solo conoce el servidor, y depende del
// diseño completo y de la pieza: el mismo diseño da siempre la misma vista
// previa (no se puede promediar pidiéndola muchas veces), y lo que se aprenda
// comparando un despiece comprado con su vista previa no sirve para otro
// diseño.
const CLAVE_VISTA_PREVIA = crypto
  .createHash('sha256')
  .update(`vista-previa:${process.env.SUPABASE_SERVICE_ROLE_KEY || 'sin-clave-local'}`)
  .digest();

// Los frentes quedan todos en un mismo plano, uno al lado del otro: ahí un
// corrimiento grande se notaría como luces disparejas, así que es más chico.
// El resto (estructura, repisas, cajas de cajón) se corre lo suficiente para
// que una pieza cortada con esa medida no calce.
const CORRIMIENTO_FRENTES_MM = [1, 2];
const CORRIMIENTO_RESTO_MM = [3, 6];
const REGEX_FRENTE = /puerta|frente_cajon|tapa_lateral|cubierta/;

function corrimiento(semilla, [minimo, maximo]) {
  const h = crypto.createHmac('sha256', CLAVE_VISTA_PREVIA).update(semilla).digest();
  const magnitud = minimo + (h.readUInt32BE(0) / 0xffffffff) * (maximo - minimo);
  return (h[4] & 1 ? 1 : -1) * magnitud;
}

function aVistaPrevia(modulo, parametros, despiece, corte) {
  const semillaDiseno = JSON.stringify([modulo, parametros || null]);

  const piezas = despiece.piezas.map(pieza => {
    const rango = REGEX_FRENTE.test(pieza.id) ? CORRIMIENTO_FRENTES_MM : CORRIMIENTO_RESTO_MM;
    const ancho = Math.max(1, Math.round(pieza.ancho + corrimiento(`${semillaDiseno}|${pieza.id}|ancho`, rango)));
    const alto = Math.max(1, Math.round(pieza.alto + corrimiento(`${semillaDiseno}|${pieza.id}|alto`, rango)));
    const dAncho = (ancho - pieza.ancho) / 2;
    const dAlto = (alto - pieza.alto) / 2;

    // Mismo mapeo de ancho/alto a ejes que usa el visor 3D según la rotación.
    const { x, y, z } = pieza.posicion;
    let posicion;
    if (pieza.rotacion === 'horizontal') posicion = { x: x - dAncho, y, z: z - dAlto };
    else if (pieza.rotacion === 'vertical_profundidad') posicion = { x, y: y - dAlto, z: z - dAncho };
    else posicion = { x: x - dAncho, y: y - dAlto, z };

    return { ...pieza, ancho, alto, posicion };
  });

  return {
    despiece: { ...despiece, piezas },
    // Del corte solo la cantidad de planchas (se muestra antes de comprar);
    // el acomodo de las piezas en cada plancha es parte de lo que se compra.
    corte: { plancha: corte.plancha, resumen: corte.resumen },
  };
}
