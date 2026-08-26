export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/mis-muebles'],
    },
    sitemap: 'https://www.armandolo.com/sitemap.xml',
  };
}
