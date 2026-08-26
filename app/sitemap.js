const BASE_URL = 'https://www.armandolo.com';

export default function sitemap() {
  const rutas = [
    { url: '', prioridad: 1 },
    { url: '/configurador', prioridad: 0.9 },
    { url: '/guia-armado', prioridad: 0.6 },
    { url: '/privacidad', prioridad: 0.2 },
    { url: '/terminos', prioridad: 0.2 },
    { url: '/reembolsos', prioridad: 0.2 },
  ];

  return rutas.map(({ url, prioridad }) => ({
    url: `${BASE_URL}${url}`,
    lastModified: new Date(),
    priority: prioridad,
  }));
}
