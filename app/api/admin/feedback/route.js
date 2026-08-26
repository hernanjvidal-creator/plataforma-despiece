import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';
import { EMAIL_ADMIN } from '@/lib/admin';

/**
 * GET /api/admin/feedback?accessToken=...
 *
 * Solo la cuenta admin puede leer el feedback — la tabla no tiene política
 * de select para nadie más, así que esto usa la service_role key después
 * de verificar quién hace la consulta.
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

  const { data, error } = await supabaseAdmin
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: data });
}
