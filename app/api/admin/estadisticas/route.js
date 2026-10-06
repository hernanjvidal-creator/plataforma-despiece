import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';
import { EMAIL_ADMIN } from '@/lib/admin';

/**
 * GET /api/admin/estadisticas?accessToken=...
 *
 * Resumen de uso real de la plataforma (cuántos muebles se han diseñado, de
 * qué tipo, cuántos usuarios distintos, feedback recibido) — solo para la
 * cuenta admin, igual que /api/admin/feedback.
 */
export async function GET(request) {
  if (!supabaseAdminConfigurado) {
    return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 });
  }

  const accessToken = new URL(request.url).searchParams.get('accessToken');
  if (!accessToken) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: { user }, error: errUser } = await supabase.auth.getUser(accessToken);
  if (errUser || !user) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
  if (user.email !== EMAIL_ADMIN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Supabase (PostgREST) tope por defecto las filas de un .select() a 1000
  // aunque haya más — sin paginar con .range(), "total" se quedaba pegado
  // en 1000 apenas la tabla pasaba ese tamaño. Se pagina en bloques de 1000
  // hasta traer todas las filas.
  async function traerTodasLasFilas(fabricaQuery) {
    const TAMANO_PAGINA = 1000;
    let desde = 0;
    let todas = [];
    for (;;) {
      const { data, error } = await fabricaQuery().range(desde, desde + TAMANO_PAGINA - 1);
      if (error) throw error;
      todas = todas.concat(data);
      if (!data || data.length < TAMANO_PAGINA) break;
      desde += TAMANO_PAGINA;
    }
    return todas;
  }

  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let generaciones, feedback;
  try {
    // "generaciones_despiece" registra cada vez que alguien aprieta "Generar
    // despiece" — a diferencia de "muebles" (que solo se llena si además
    // guarda el diseño), esto sí refleja el uso real de la plataforma, ya que
    // guardar no es necesario para ver/descargar el despiece completo.
    generaciones = await traerTodasLasFilas(() =>
      supabaseAdmin.from('generaciones_despiece').select('modulo, user_id, pais, created_at')
    );
    feedback = await traerTodasLasFilas(() =>
      supabaseAdmin.from('feedback').select('calificacion')
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Embudo de compra desde que se activó el cobro real. Excluye las filas de
  // la propia cuenta admin (sus pruebas no son clientes). Si la tabla de
  // eventos todavía no existe, el embudo igual se arma con lo que sí hay.
  const INICIO_COBRO = '2026-10-02T00:00:00Z';
  let embudo = null;
  try {
    let eventos = [];
    let eventosDisponibles = true;
    try {
      eventos = await traerTodasLasFilas(() =>
        supabaseAdmin.from('eventos_embudo').select('evento, user_id, created_at')
      );
    } catch {
      eventosDisponibles = false;
    }
    const pedidos = await traerTodasLasFilas(() =>
      supabaseAdmin.from('pedidos').select('estado, total, user_id, created_at').gt('total', 0)
    );
    const mueblesGuardados = await traerTodasLasFilas(() =>
      supabaseAdmin.from('muebles').select('user_id, created_at')
    );
    const { data: listaUsuarios } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const cuentas = listaUsuarios?.users || [];

    const noAdmin = f => f.user_id !== user.id;
    const ventana = (desde) => {
      const dentro = f => f.created_at >= desde;
      const ev = nombre => eventos.filter(e => e.evento === nombre && dentro(e) && noAdmin(e)).length;
      const ped = pedidos.filter(p => dentro(p) && noAdmin(p));
      const pagados = ped.filter(p => p.estado === 'pagado');
      return {
        vistasPrevias: ev('vista_previa_3d'),
        generaciones: generaciones.filter(dentro).length,
        cuentasNuevas: cuentas.filter(c => c.created_at >= desde && c.id !== user.id).length,
        mueblesGuardados: mueblesGuardados.filter(m => dentro(m) && noAdmin(m)).length,
        clicsDesbloquear: ev('desbloquear_clic'),
        loginParaComprar: ev('login_para_comprar'),
        compraRetomada: ev('compra_retomada'),
        checkoutsCreados: ped.length,
        pagados: pagados.length,
        reembolsados: ped.filter(p => p.estado === 'reembolsado').length,
        ingresosUSD: pagados.reduce((s, p) => s + Number(p.total || 0), 0),
      };
    };
    embudo = {
      eventosDisponibles,
      desdeCobro: ventana(INICIO_COBRO),
      ultimos7: ventana(hace7Dias > INICIO_COBRO ? hace7Dias : INICIO_COBRO),
    };
  } catch (e) {
    embudo = { error: e.message };
  }

  const porModulo = {};
  const porPais = {};
  // Por usuario logueado: módulos que generó, país más reciente que se le
  // conozca y fecha de su generación más reciente — para poder ver "quiénes
  // son los usuarios que han usado la plataforma" con nombre y actividad.
  const porUsuario = {};
  generaciones.forEach(g => {
    porModulo[g.modulo] = (porModulo[g.modulo] || 0) + 1;
    if (g.pais) porPais[g.pais] = (porPais[g.pais] || 0) + 1;
    if (g.user_id) {
      if (!porUsuario[g.user_id]) porUsuario[g.user_id] = { modulos: {}, total: 0, pais: null, ultimaGeneracion: null };
      const u = porUsuario[g.user_id];
      u.modulos[g.modulo] = (u.modulos[g.modulo] || 0) + 1;
      u.total += 1;
      if (!u.ultimaGeneracion || g.created_at > u.ultimaGeneracion) {
        u.ultimaGeneracion = g.created_at;
        if (g.pais) u.pais = g.pais; // país de su generación más reciente conocida
      }
    }
  });

  const idsUsuarios = Object.keys(porUsuario);
  const usuariosDetalle = [];
  for (const id of idsUsuarios) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(id);
    usuariosDetalle.push({
      email: userData?.user?.email || '(cuenta eliminada)',
      pais: porUsuario[id].pais,
      totalGeneraciones: porUsuario[id].total,
      modulos: porUsuario[id].modulos,
      ultimaGeneracion: porUsuario[id].ultimaGeneracion,
    });
  }
  usuariosDetalle.sort((a, b) => (a.ultimaGeneracion < b.ultimaGeneracion ? 1 : -1));

  const calificaciones = feedback.map(f => f.calificacion).filter(c => c != null);
  const promedioCalificacion = calificaciones.length > 0
    ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
    : null;

  // El registro de "generaciones_despiece" es más nuevo que la plataforma
  // misma (se agregó el 2026-09-23) — mientras no lleve 30 días existiendo,
  // "Últimos 30 días" y "Total" van a dar prácticamente lo mismo, no porque
  // haya un error de cálculo sino porque no hay datos de antes de esa fecha.
  // Se manda la fecha real de la generación más antigua para que el panel
  // pueda avisarlo en vez de mostrar un número que parece engañoso.
  const primeraGeneracion = generaciones.reduce(
    (minima, g) => (!minima || g.created_at < minima ? g.created_at : minima),
    null
  );
  const diasDeHistorial = primeraGeneracion
    ? Math.floor((Date.now() - new Date(primeraGeneracion).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return NextResponse.json({
    totalMuebles: generaciones.length,
    mueblesUltimos7Dias: generaciones.filter(g => g.created_at >= hace7Dias).length,
    mueblesUltimos30Dias: generaciones.filter(g => g.created_at >= hace30Dias).length,
    diasDeHistorial,
    usuariosUnicos: idsUsuarios.length,
    porModulo,
    porPais,
    usuariosDetalle,
    embudo,
    totalFeedback: feedback.length,
    promedioCalificacion,
  });
}
