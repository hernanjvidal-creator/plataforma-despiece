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

  let muebles, feedback;
  try {
    // "generaciones_despiece" registra cada vez que alguien aprieta "Generar
    // despiece" — a diferencia de "muebles" (que solo se llena si además
    // guarda el diseño), esto sí refleja el uso real de la plataforma, ya que
    // guardar no es necesario para ver/descargar el despiece completo.
    muebles = await traerTodasLasFilas(() =>
      supabaseAdmin.from('generaciones_despiece').select('modulo, user_id, created_at')
    );
    feedback = await traerTodasLasFilas(() =>
      supabaseAdmin.from('feedback').select('calificacion')
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const porModulo = {};
  const usuariosUnicos = new Set();
  muebles.forEach(m => {
    porModulo[m.modulo] = (porModulo[m.modulo] || 0) + 1;
    if (m.user_id) usuariosUnicos.add(m.user_id);
  });

  const calificaciones = feedback.map(f => f.calificacion).filter(c => c != null);
  const promedioCalificacion = calificaciones.length > 0
    ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length
    : null;

  return NextResponse.json({
    totalMuebles: muebles.length,
    mueblesUltimos7Dias: muebles.filter(m => m.created_at >= hace7Dias).length,
    mueblesUltimos30Dias: muebles.filter(m => m.created_at >= hace30Dias).length,
    usuariosUnicos: usuariosUnicos.size,
    porModulo,
    totalFeedback: feedback.length,
    promedioCalificacion,
  });
}
