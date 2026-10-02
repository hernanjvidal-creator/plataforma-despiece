-- Cierra la escritura de pedidos desde el navegador.
-- Hasta ahora cualquier usuario logueado podía insertar un pedido con
-- estado 'pagado' directamente (así funcionaba la "compra simulada"), lo que
-- permitía desbloquear el despiece gratis desde la consola. Con el cobro real
-- activo, los pedidos solo se crean desde /api/checkout y se marcan pagados
-- desde el webhook, ambos con service role (que ignora RLS).
-- Los usuarios siguen pudiendo LEER sus propios pedidos (políticas select).

drop policy if exists "insert_propios_pedidos" on public.pedidos;
drop policy if exists "insert_propios_pedido_items" on public.pedido_items;
