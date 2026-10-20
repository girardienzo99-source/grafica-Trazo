import type { Metadata } from 'next';
import { readDatabase } from '@/lib/db/store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = readDatabase();
  const product = db.products.find((p) => p.slug === slug);

  if (!product) {
    return {
      title: 'Producto personalizado | Trazo Espacio Gráfico',
      description:
        'Catálogo y personalizador de productos gráficos en Río Cuarto, Córdoba con envíos a todo el país.',
    };
  }

  const imageUrl =
    product.images[0]?.url || '/images/trazo/post-DeJ6p7QtwAE.jpg';

  return {
    title: product.name,
    description: `${product.short_description} Hecho en Río Cuarto, Córdoba por Trazo Espacio Gráfico con envíos a todo el país.`,
    alternates: {
      canonical: `/tienda/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | Trazo Espacio Gráfico`,
      description: product.short_description,
      url: `/tienda/${product.slug}`,
      images: [
        {
          url: imageUrl,
          alt: product.images[0]?.alt || product.name,
        },
      ],
    },
  };
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
