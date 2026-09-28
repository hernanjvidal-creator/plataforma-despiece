// Cliente mínimo para la API de Lemon Squeezy — solo lo que necesitamos
// (crear un checkout). Es REST/JSON:API plano, no hace falta el SDK oficial.

const URL_CHECKOUTS = 'https://api.lemonsqueezy.com/v1/checkouts';

export const lemonsqueezyConfigurado = Boolean(
  process.env.LEMONSQUEEZY_API_KEY &&
  process.env.LEMONSQUEEZY_STORE_ID &&
  process.env.LEMONSQUEEZY_VARIANT_ID
);

/**
 * Crea un checkout de Lemon Squeezy y devuelve su URL de pago.
 * customData viaja en meta.custom_data de todos los webhooks relacionados
 * a esta compra — así el webhook sabe a qué pedido nuestro corresponde.
 * `montoUSD` es el monto EXACTO a cobrar (ya sea un solo mueble o la suma de
 * un carrito, calculado en lib/precios.js — closet/despensa/etc. tienen
 * precio fijo, pero cocina/aéreo cobran por módulo, así que no alcanza con
 * repetir una variante N veces). Se manda como `custom_price` (en centavos),
 * que reemplaza el precio configurado en la variante de Lemon Squeezy — la
 * variante (LEMONSQUEEZY_VARIANT_ID) queda solo como el "producto" al que se
 * asocia el cobro, no la que fija el precio.
 */
export async function crearCheckoutLemonSqueezy({ email, nombre, redirectUrl, customData, montoUSD }) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  if (!apiKey || !storeId || !variantId) {
    throw new Error('Lemon Squeezy no está configurado en el servidor');
  }
  if (!(montoUSD > 0)) {
    throw new Error('Monto de checkout inválido');
  }

  const res = await fetch(URL_CHECKOUTS, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          custom_price: Math.round(montoUSD * 100),
          checkout_data: { email, name: nombre, custom: customData },
          product_options: { redirect_url: redirectUrl },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(storeId) } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.attributes?.url) {
    const detalle = json?.errors?.[0]?.detail;
    throw new Error(detalle || 'Error creando el checkout de Lemon Squeezy');
  }
  return json.data.attributes.url;
}
