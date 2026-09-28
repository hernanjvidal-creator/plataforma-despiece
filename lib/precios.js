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

export { calcularPrecioUSD };
