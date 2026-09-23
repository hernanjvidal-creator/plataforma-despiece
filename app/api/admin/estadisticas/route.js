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

  return NextResponse.json({
    totalMuebles: generaciones.length,
    mueblesUltimos7Dias: generaciones.filter(g => g.created_at >= hace7Dias).length,
    mueblesUltimos30Dias: generaciones.filter(g => g.created_at >= hace30Dias).length,
    usuariosUnicos: idsUsuarios.length,
    porModulo,
    porPais,
    usuariosDetalle,
    totalFeedback: feedback.length,
    promedioCalificacion,
  });
}
