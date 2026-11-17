// Interruptor del cobro. En true, todo es gratis para todos, con o sin
// cuenta: el despiece exacto, el diagrama de corte, los PDF y el link para
// compartir — el servidor los entrega sin revisar compras (ver
// lib/accesoDespiece.js), y la interfaz y los textos del sitio dejan de
// hablar de precios. En false se cobra por mueble con Lemon Squeezy (ver
// lib/precios.js), que sigue configurado y listo para volver a usarse. Vive
// en un solo lugar porque lo usan tanto componentes como rutas del servidor.
//
//   - Agosto a septiembre de 2026: gratis (etapa de prueba).
//   - 2 de octubre a noviembre de 2026: con cobro (sin ventas).
//   - Desde noviembre de 2026: gratis de nuevo.
export const MODO_GRATIS_TEMPORAL = true;
