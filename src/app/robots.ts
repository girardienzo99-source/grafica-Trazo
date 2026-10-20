import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Excluir administración, pedidos privados y archivos de clientes de la indexación
        disallow: ['/admin', '/admin/', '/pedidos', '/pedidos/', '/api/files/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
