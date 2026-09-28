// Fase de validación: durante esta etapa, cualquier usuario logueado tiene
// acceso completo y gratis al despiece (piezas, herrajes, diagrama de corte,
// medidas en el 3D, link para compartir) — el cobro real todavía no está
// activo. Se define acá (en vez de duplicar el booleano en cada componente)
// porque también lo necesita el endpoint público de "compartir link", que
// corre en el servidor.
export const MODO_GRATIS_TEMPORAL = true;
