import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import { Navbar } from '@/components/layout/Navbar';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Footer } from '@/components/layout/Footer';
import { FloatingWhatsAppCta } from '@/components/layout/FloatingWhatsAppCta';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  title: {
    default:
      'Trazo Espacio Gráfico | Imanes, Stickers, Pines y Gráfica Personalizada en Río Cuarto',
    template: '%s | Trazo Espacio Gráfico',
  },
  description:
    'Tus ideas, hechas detalles. Imanes personalizados con fotos de 5 × 5 cm, planchas de stickers, pines, tarjetas, etiquetas para ropa, kits para emprendedores, boxes de regalo y stand de tatuajes temporales para eventos. Hecho en Río Cuarto, Córdoba, con envíos a todo el país.',
  keywords: [
    'Trazo Espacio Gráfico',
    'Trazo Gráfica',
    'imanes personalizados 5x5',
    'stickers personalizados Río Cuarto',
    'pines personalizados',
    'etiquetas para ropa cartulina',
    'kits para emprendedores',
    'gráfica personalizada Río Cuarto',
    'stand tatuajes temporales eventos',
  ],
  openGraph: {
    title: 'Trazo Espacio Gráfico — Tus ideas, hechas detalles',
    description:
      'Imanes personalizados de 5 × 5 cm, stickers, pines, tarjetas, etiquetas para ropa y propuestas para eventos. Hecho en Río Cuarto, Córdoba con envíos a todo el país.',
    locale: 'es_AR',
    type: 'website',
    siteName: 'Trazo Espacio Gráfico',
    images: [
      {
        url: '/images/trazo/post-DeJ6p7QtwAE.jpg',
        width: 1080,
        height: 1080,
        alt: 'Trazo Espacio Gráfico — Productos gráficos personalizados en Río Cuarto',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trazo Espacio Gráfico — Tus ideas, hechas detalles',
    description:
      'Imanes 5 × 5 cm, stickers, pines, tarjetas, etiquetas para ropa y stand creativo para eventos. Hecho en Río Cuarto con envíos a todo el país.',
    images: ['/images/trazo/post-DeJ6p7QtwAE.jpg'],
  },
};

const structuredDataJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Trazo Espacio Gráfico',
  alternateName: 'Trazo Gráfica',
  description:
    'Diseño y producción de imanes personalizados de 5 × 5 cm, planchas de stickers, pines, tarjetas, etiquetas de cartulina para ropa, kits para emprendedores, boxes de regalos y stand creativo de tatuajes temporales para eventos.',
  email: 'Trazoografica@gmail.com',
  telephone: '+54 9 358 510 4732',
  sameAs: ['https://www.instagram.com/trazo.grafica/'],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Río Cuarto',
    addressRegion: 'Córdoba',
    addressCountry: 'AR',
  },
  areaServed: {
    '@type': 'Country',
    name: 'Argentina',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="flex min-h-screen flex-col antialiased selection:bg-[#0F172A] selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-[#0F172A] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-[#FFFFFF] focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredDataJsonLd),
          }}
        />
        <StoreProvider>
          <Navbar />
          <CartDrawer />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingWhatsAppCta />
        </StoreProvider>
      </body>
    </html>
  );
}
