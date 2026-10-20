'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  Truck,
  Sparkles,
  Layers,
  CalendarHeart,
  Instagram,
  MessageCircle,
  CheckCircle2,
  ChevronDown,
  X,
  ZoomIn,
  Mail,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/catalog/ProductCard';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';
import { GalleryWorkItem } from '@/types/trazo';

const CATEGORY_VISUALS: Record<
  string,
  { image: string; isRealPhoto: boolean; subtitle: string }
> = {
  'imanes-personalizados': {
    image: '/images/trazo/producto-imanes-5x5.jpg',
    isRealPhoto: true,
    subtitle: 'Formato cuadrado 5 × 5 cm',
  },
  stickers: {
    image: '/images/trazo/post-DeJ6p7QtwAE.jpg',
    isRealPhoto: true,
    subtitle: 'Planchas troqueladas listas para usar',
  },
  pines: {
    image: '/images/trazo/post-DeJ7xK4NkUF.jpg',
    isRealPhoto: true,
    subtitle: 'Para eventos, marcas y souvenirs',
  },
  tarjetas: {
    image: '/images/trazo/producto-tarjetas-eventos.jpg',
    isRealPhoto: true,
    subtitle: 'Personales, packaging y eventos',
  },
  'etiquetas-packaging': {
    image: '/images/trazo/producto-etiquetas-ropa.jpg',
    isRealPhoto: true,
    subtitle: 'Cartulina con corte y perforación',
  },
  'kits-emprendedores': {
    image: '/images/trazo/producto-tarjetas-agradecimiento.jpg',
    isRealPhoto: true,
    subtitle: 'Combos de identidad para tu marca',
  },
  'regalos-boxes': {
    image: '/images/trazo/producto-boxes-regalos.jpg',
    isRealPhoto: true,
    subtitle: 'Boxes de regalo y stand para fiestas',
  },
};

export default function HomePage() {
  const { categories, products, settings } = useStore();
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    settings.faqs[0]?.id || null
  );
  const [lightboxItem, setLightboxItem] = useState<GalleryWorkItem | null>(
    null
  );

  useEffect(() => {
    if (!lightboxItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxItem(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxItem]);

  const featuredProducts = products
    .filter((p) => p.is_published && p.is_featured)
    .slice(0, 6);

  const authorizedGallery = (settings.gallery_items || []).filter(
    (g) => g.is_published && g.is_authorized_real_work && g.image_url
  );

  const publishedFaqs = (settings.faqs || [])
    .filter((f) => f.is_published)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-16 pb-20 sm:space-y-20">
      {/* Campaña activa (solo si el administrador la activa) */}
      {settings.active_campaign?.is_active && (
        <div className="border-b border-[#E7E5E4] bg-[#F4F1EA] px-4 py-2.5 text-center text-xs font-medium text-[#1C1917]">
          <span className="font-semibold">{settings.active_campaign.title}: </span>
          <span className="text-[#57534E]">
            {settings.active_campaign.description}
          </span>{' '}
          <Link
            href={settings.active_campaign.cta_url || '/tienda'}
            className="ml-2 font-medium text-[#1C1917] underline underline-offset-4"
          >
            {settings.active_campaign.cta_text}
          </Link>
        </div>
      )}

      {/* 1. HERO CON FOTOGRAFÍA REAL VISIBLE EN LA PRIMERA PANTALLA MÓVIL */}
      <section className="pt-5 sm:pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
            {/* Texto principal + CTAs */}
            <div className="lg:col-span-6">
              <p className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
                {settings.brand_name} · {settings.city}, {settings.province}
              </p>

              <h1 className="font-display mt-2.5 text-3xl font-medium tracking-tight text-[#1C1917] sm:text-5xl lg:text-[54px] lg:leading-[1.08]">
                {settings.hero_config.title || 'Tus ideas, hechas detalles.'}
              </h1>

              <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-[#57534E] sm:text-base">
                {settings.hero_config.description ||
                  'Imanes, stickers, pines y productos personalizados para tus recuerdos, tu marca y tus momentos especiales.'}
              </p>

              {/* Fotografía real visible de inmediato en la primera pantalla móvil */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-sm lg:hidden">
                <div className="grid grid-cols-3 gap-1 bg-[#F4F1EA] p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/trazo/post-DeJ6p7QtwAE.jpg"
                    alt="Stickers y piezas gráficas reales de Trazo Espacio Gráfico"
                    loading="eager"
                    fetchPriority="high"
                    className="col-span-2 h-44 w-full rounded-xl object-cover"
                  />
                  <div className="flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/trazo/post-DeJ7xK4NkUF.jpg"
                      alt="Pines personalizados reales de Trazo"
                      loading="eager"
                      className="h-[86px] w-full rounded-xl object-cover"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/trazo/post-DctEFmPNLrC.jpg"
                      alt="Tarjetería y etiquetas reales de Trazo"
                      loading="eager"
                      className="h-[86px] w-full rounded-xl object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción principales */}
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-7">
                <Link
                  href="/tienda"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1C1917] px-6 py-3 text-xs font-medium tracking-wide text-[#FAF8F5] transition hover:bg-[#292524]"
                >
                  <span>Explorar productos</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/tienda/imanes-personalizados-fotos-5x5"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-5 py-3 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917] hover:bg-[#F4F1EA]"
                >
                  <span>Personalizar mis imanes</span>
                </Link>
              </div>

              {/* Tres sellos reales de la marca debajo del Hero */}
              <div className="mt-6 grid grid-cols-1 gap-2.5 border-t border-[#E7E5E4] pt-5 sm:grid-cols-3">
                <div className="flex items-center gap-2.5 text-xs text-[#1C1917]">
                  <MapPin className="h-4 w-4 shrink-0 text-[#57534E]" />
                  <span>{settings.hero_config.badge_1 || 'Hecho en Río Cuarto'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#1C1917]">
                  <Truck className="h-4 w-4 shrink-0 text-[#57534E]" />
                  <span>{settings.hero_config.badge_2 || 'Envíos a todo el país'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#1C1917]">
                  <Sparkles className="h-4 w-4 shrink-0 text-[#57534E]" />
                  <span>{settings.hero_config.badge_3 || 'Atención personalizada'}</span>
                </div>
              </div>
            </div>

            {/* Composición fotográfica real en Desktop */}
            <div className="hidden lg:col-span-6 lg:block">
              <div className="grid grid-cols-12 gap-4 rounded-3xl border border-[#E7E5E4] bg-[#F4F1EA] p-4">
                <div className="col-span-7 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/trazo/post-DeJ6p7QtwAE.jpg"
                    alt="Stickers y papelería personalizada de Trazo Espacio Gráfico"
                    loading="eager"
                    fetchPriority="high"
                    className="h-[380px] w-full object-cover"
                  />
                </div>
                <div className="col-span-5 flex flex-col justify-between gap-4">
                  <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/trazo/post-DeJ7xK4NkUF.jpg"
                      alt="Pines personalizados producidos en Río Cuarto"
                      loading="eager"
                      className="h-[180px] w-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/trazo/post-DctEFmPNLrC.jpg"
                      alt="Tarjetería y etiquetas personalizadas de Trazo"
                      loading="eager"
                      className="h-[180px] w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORÍAS VISUALES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
              Líneas de producto
            </span>
            <h2 className="font-display mt-1 text-2xl font-medium text-[#1C1917] sm:text-3xl">
              Elegí qué querés personalizar
            </h2>
          </div>
          <Link
            href="/tienda"
            className="text-xs font-medium text-[#1C1917] underline underline-offset-4 hover:text-[#57534E]"
          >
            Ver catálogo completo →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {categories.map((cat) => {
            const visual = CATEGORY_VISUALS[cat.slug] || {
              image: '/images/trazo/post-DeJ6p7QtwAE.jpg',
              isRealPhoto: true,
              subtitle: cat.description,
            };
            return (
              <Link
                key={cat.id}
                href={`/tienda?categoria=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-3 transition hover:border-[#1C1917]"
              >
                <div className="overflow-hidden rounded-xl bg-[#F4F1EA]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={visual.image}
                    alt={cat.name}
                    className="h-24 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xs font-semibold text-[#1C1917]">
                    {cat.name}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-[#78716C]">
                    {visual.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. PRODUCTOS DESTACADOS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
              Productos destacados
            </span>
            <h2 className="font-display mt-1 text-2xl font-medium text-[#1C1917] sm:text-3xl">
              Personalizá tu pedido online
            </h2>
          </div>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
          >
            <span>Ver los {products.length} productos</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((prod, index) => {
            const cat = categories.find((c) => c.id === prod.category_id);
            return (
              <ProductCard
                key={prod.id}
                product={prod}
                categoryName={cat?.name}
                priority={index < 2}
              />
            );
          })}
        </div>
      </section>

      {/* 4. TRABAJOS REALES CON VISTA AMPLIADA ACCESIBLE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
              Trabajos reales · {settings.instagram_handle}
            </span>
            <h2 className="font-display mt-1 text-2xl font-medium text-[#1C1917] sm:text-3xl">
              Piezas producidas en nuestro taller
            </h2>
          </div>
          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
          >
            <Instagram className="h-3.5 w-3.5 text-[#57534E]" />
            <span>Ver más en {settings.instagram_handle}</span>
          </a>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {authorizedGallery.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]"
            >
              <button
                type="button"
                onClick={() => setLightboxItem(item)}
                aria-label={`Ampliar fotografía: ${item.title}`}
                className="relative block h-64 w-full overflow-hidden bg-[#F4F1EA] text-left focus:outline-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url || ''}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-[#1C1917]/85 px-2.5 py-1 text-[11px] font-medium text-[#FAF8F5]">
                  <ZoomIn className="h-3 w-3" />
                  Ampliar
                </span>
              </button>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox accesible por teclado y mouse para fotos reales */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/80 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxItem(null);
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  {lightboxItem.title}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {lightboxItem.category_label}
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setLightboxItem(null)}
                aria-label="Cerrar vista ampliada"
                className="rounded-lg p-2 text-[#57534E] hover:bg-[#F4F1EA] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-[#1C1917] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.image_url || ''}
                alt={lightboxItem.title}
                className="mx-auto max-h-[68vh] w-auto rounded-lg object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-xs text-[#57534E]">
              <p>{lightboxItem.description}</p>
              <Link
                href="/tienda"
                onClick={() => setLightboxItem(null)}
                className="shrink-0 font-semibold text-[#1C1917] underline underline-offset-4"
              >
                Encargar similar →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. CÓMO COMPRAR EN 3 PASOS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#F4F1EA] p-6 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
                Proceso claro
              </span>
              <h2 className="font-display mt-1 text-2xl font-medium text-[#1C1917] sm:text-3xl">
                Cómo encargar tu pedido en 3 pasos
              </h2>
            </div>
            <Link
              href="/como-comprar"
              className="text-xs font-medium text-[#1C1917] underline underline-offset-4"
            >
              Ver preguntas sobre archivos y formatos →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Elegí presentación y cantidad',
                description:
                  'Seleccioná el producto en la tienda, indicá las unidades o packs que necesitás y contanos para qué ocasión o marca lo buscás.',
              },
              {
                step: '2',
                title: 'Subí tus archivos o pedí ayuda',
                description:
                  'En imanes 5 × 5 cm encuadrás tus fotos desde el celular. En stickers, pines, tarjetas y etiquetas podés subir tu archivo o pedirnos armado.',
              },
              {
                step: '3',
                title: 'Revisá tu pedido y coordiná',
                description:
                  'Te confirmamos el presupuesto o el pago, preparamos la muestra digital cuando corresponde y coordinamos retiro en Río Cuarto o envío.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5"
              >
                <span className="font-display inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1917] text-xs font-semibold text-[#FAF8F5]">
                  {item.step}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-[#1C1917]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#57534E]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BLOQUE PARA EMPRENDEDORES Y EVENTOS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Emprendedores */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#78716C] uppercase">
                <Layers className="h-4 w-4 text-[#1C1917]" />
                Para marcas y comercios
              </span>
              <h2 className="font-display mt-2 text-2xl font-medium text-[#1C1917]">
                Dale identidad a tu emprendimiento
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#57534E] sm:text-sm">
                Combiná planchas de stickers troquelados, etiquetas de cartulina para ropa con corte y perforación, tarjetas personales y tarjetas de agradecimiento para tu packaging.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#1C1917]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#57534E]" />
                  <span>Etiquetas de cartulina con corte y perforación listos para colgar</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#57534E]" />
                  <span>Planchas de stickers y tarjetas con la identidad de tu marca</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/kits-emprendedores"
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
              >
                <span>Armar mi kit emprendedor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tienda?categoria=etiquetas-packaging"
                className="inline-flex min-h-[42px] items-center rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
              >
                Ver etiquetas y packaging
              </Link>
            </div>
          </div>

          {/* Eventos */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#1C1917] bg-[#1C1917] p-6 text-[#FAF8F5] sm:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#A8A29E] uppercase">
                <CalendarHeart className="h-4 w-4 text-[#FAF8F5]" />
                Celebraciones y eventos
              </span>
              <h2 className="font-display mt-2 text-2xl font-medium text-[#FAF8F5]">
                Stand de tatuajes temporales, pines y recuerdos
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#D6D3D1] sm:text-sm">
                Llevá una propuesta creativa a casamientos, 15 años, cumpleaños y eventos empresariales con nuestro stand de tatuajes temporales personalizados, pines, tarjetas e imanes 5 × 5 cm.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#E7E5E4]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#A8A29E]" />
                  <span>Diseños personalizados con la temática de los agasajados</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#A8A29E]" />
                  <span>Cotización según fecha, localidad y cantidad de invitados</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/eventos"
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[#FAF8F5] px-5 py-2.5 text-xs font-medium text-[#1C1917] transition hover:bg-[#E7E5E4]"
              >
                <span>Consultar por mi evento</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tienda/pines-personalizados"
                className="inline-flex min-h-[42px] items-center rounded-full border border-[#44403C] px-4 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:border-[#FAF8F5]"
              >
                Ver pines personalizados
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PREGUNTAS FRECUENTES */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
            Preguntas frecuentes
          </span>
          <h2 className="font-display mt-1 text-2xl font-medium text-[#1C1917] sm:text-3xl">
            Todo lo que necesitás saber antes de pedir
          </h2>
        </div>

        <div className="mt-6 space-y-2.5">
          {publishedFaqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-xs font-semibold text-[#1C1917] sm:text-sm"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#57534E] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#E7E5E4] px-5 py-4 text-xs leading-relaxed text-[#57534E] sm:text-sm">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. CONTACTO DIRECTO */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
                Contacto directo · {settings.city}, {settings.province}
              </span>
              <h2 className="font-display mt-1.5 text-2xl font-medium text-[#1C1917] sm:text-3xl">
                ¿Necesitás asesoramiento para tu pedido?
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#57534E] sm:text-sm">
                Escribinos por WhatsApp, Instagram o correo electrónico. Te ayudamos a elegir formatos, cantidades o revisar tus archivos antes de encargar.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
              <a
                href={buildSafeWhatsAppUrl({ context: 'general' })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp: {settings.whatsapp_number}</span>
              </a>

              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
              >
                <Instagram className="h-4 w-4" />
                <span>{settings.instagram_handle}</span>
              </a>

              <a
                href={`mailto:${settings.email}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
              >
                <Mail className="h-4 w-4" />
                <span>{settings.email}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
