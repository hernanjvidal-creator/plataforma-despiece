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
 * `cantidad` (carrito con más de un mueble) usa checkout_data.variant_quantities
 * para cobrar cantidad × precio de la variante — no hay múltiples variantes,
 * es la misma variante repetida N veces.
 */
export async function crearCheckoutLemonSqueezy({ email, nombre, redirectUrl, customData, cantidad = 1 }) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  if (!apiKey || !storeId || !variantId) {
    throw new Error('Lemon Squeezy no está configurado en el servidor');
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
          checkout_data: {
            email, name: nombre, custom: customData,
            variant_quantities: [{ variant_id: Number(variantId), quantity: cantidad }],
          },
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
