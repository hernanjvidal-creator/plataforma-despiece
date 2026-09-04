import { Fraunces, Inter } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/components/AuthProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Feedback from '@/components/Feedback';
import './globals.css';

// Tag de Google Ads (mide visitas desde los anuncios y, más adelante,
// conversiones específicas — ver Herramientas > Conversiones en Google Ads).
const GOOGLE_ADS_ID = 'AW-18412301415';

// Google Analytics 4: para ver el flujo/recorrido real de la gente por el
// sitio (Explorar > Exploración de rutas), más allá de los conteos
// agregados de Vercel Analytics. Comparte el mismo gtag.js que Google Ads,
// solo se agrega como un 'config' adicional.
const GA4_ID = 'G-TVFE5DK7N3';

// Microsoft Clarity: grabaciones de sesiones reales + mapas de calor, para
// ver cómo la gente usa el configurador (más allá de los conteos agregados
// de Vercel Analytics).
const CLARITY_PROJECT_ID = 'ycsetimbyj';

const fuenteSerif = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const fuenteSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL('https://www.armandolo.com'),
  title: 'Despiece — Plataforma de configuración de muebles',
  description: 'Configura tu mueble y recibe el plano 3D, el despiece y el plano de armado.',
  openGraph: {
    title: 'Despiece — Diseña tu propio mueble en melamina',
    description: 'Configura las medidas y recibe al instante el plano 3D, el listado de piezas y herrajes, y el diagrama de corte listo para la maderera.',
    url: 'https://www.armandolo.com',
    siteName: 'Despiece',
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Despiece — Diseña tu propio mueble en melamina',
    description: 'Configura las medidas y recibe al instante el plano 3D, el listado de piezas y herrajes, y el diagrama de corte listo para la maderera.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${fuenteSerif.variable} ${fuenteSans.variable}`}>
      <body>
        <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_ID}');
            gtag('config', '${GA4_ID}');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
          `}
        </Script>
        <AuthProvider>
          <Header />
          {children}
          <Footer />
          <Feedback />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
