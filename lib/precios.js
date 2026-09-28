// Precio del despiece detallado, en USD, según el tipo de mueble. Vive en el
// código (no en la variante de Lemon Squeezy) porque cocina/aéreo cobran por
// módulo — el monto final se manda por checkout como `custom_price` (ver
// lib/lemonsqueezy.js), así que la variante configurada en Lemon Squeezy es
// solo el "producto" al que se asocia el cobro, no la que fija el precio.
const PRECIO_POR_MODULO_COCINA_USD = 3; // bajo_cocina / alto_cocina: por cada módulo
const PRECIO_CLOSET_DESPENSA_USD = 7;   // closet / despensa
const PRECIO_ESTANDAR_USD = 5;          // vanitorio_bano / velador / escritorio / librero / baul

function calcularPrecioUSD(modulo, parametros) {
  if (modulo === 'bajo_cocina' || modulo === 'alto_cocina') {
    const numModulos = parametros?.secciones?.length || 1;
    return PRECIO_POR_MODULO_COCINA_USD * numModulos;
  }
  if (modulo === 'closet' || modulo === 'despensa') {
    return PRECIO_CLOSET_DESPENSA_USD;
  }
  return PRECIO_ESTANDAR_USD;
}

const NOMBRE_MODULO = {
  bajo_cocina: 'Mueble cocina',
  alto_cocina: 'Mueble aéreo',
  vanitorio_bano: 'Vanitorio de baño',
  closet: 'Closet / armario ropero',
  despensa: 'Despensa',
  velador: 'Velador',
  escritorio: 'Escritorio',
  librero: 'Librero',
  baul: 'Baúl',
};

// Una línea legible por ítem, para que el cliente vea en el checkout de
// Lemon Squeezy qué está pagando exactamente (antes solo se veía "Despiece
// detallado" genérico, sin desglose).
function detalleItem({ modulo, nombre, parametros_congelados }) {
  const etiqueta = NOMBRE_MODULO[modulo] || modulo;
  // Si el mueble no tiene nombre propio (quedó con el label genérico del
  // tipo, ej. muebles sin guardar), no repetirlo dos veces.
  const prefijo = nombre && nombre !== etiqueta ? `${nombre} (${etiqueta})` : etiqueta;
  const precio = calcularPrecioUSD(modulo, parametros_congelados);
  if (modulo === 'bajo_cocina' || modulo === 'alto_cocina') {
    const numModulos = parametros_congelados?.secciones?.length || 1;
    return `${prefijo}: ${numModulos} módulo${numModulos > 1 ? 's' : ''} × US$${PRECIO_POR_MODULO_COCINA_USD} = US$${precio}`;
  }
  return `${prefijo}: US$${precio}`;
}

// name/description que se mandan como product_options en el checkout de
// Lemon Squeezy — items es la lista de { modulo, nombre, parametros_congelados }
// que ya arma app/api/checkout/route.js.
function construirDetalleCheckout(items) {
  const name = items.length === 1
    ? `Despiece detallado — ${items[0].nombre}`
    : `Despiece detallado — ${items.length} muebles`;
  const description = items.map(detalleItem).join(' · ');
  return { name, description };
}

export { calcularPrecioUSD, construirDetalleCheckout };
