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
  title: 'Despiece — Plataforma de configuración de muebles',
  description: 'Configura tu mueble y recibe el plano 3D, el despiece y el plano de armado.',
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
