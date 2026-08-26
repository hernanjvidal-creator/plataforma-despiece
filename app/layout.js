import { Fraunces, Inter } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

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
        <AuthProvider>
          <Header />
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
