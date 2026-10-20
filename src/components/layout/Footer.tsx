'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  Mail,
  MessageCircle,
  Instagram,
  Truck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';
import { TrazoBrandLogo } from '@/components/visuals/TrazoBrandLogo';

export function Footer() {
  const pathname = usePathname();
  const { settings } = useStore();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-[#E7E5E4] bg-[#1C1917] text-[#FAF8F5]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Columna 1: Marca */}
          <div>
            <TrazoBrandLogo size="md" variant="light" />
            <p className="mt-2 text-xs text-[#A8A29E]">
              {settings.brand_name} · {settings.instagram_handle}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[#D6D3D1]">
              Diseño y producción gráfica personalizada en Río Cuarto. Imanes de 5 × 5 cm con tus fotos, stickers, pines, tarjetas, etiquetas para ropa, kits para emprendedores, boxes de regalo y stand de tatuajes temporales para eventos.
            </p>
          </div>

          {/* Columna 2: Navegación y Categorías */}
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#FAF8F5] uppercase">
              Tienda y Propuestas
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#D6D3D1]">
              <li>
                <Link href="/tienda" className="transition hover:text-[#FFFFFF]">
                  Catálogo completo
                </Link>
              </li>
              <li>
                <Link
                  href="/tienda/imanes-personalizados-fotos-5x5"
                  className="transition hover:text-[#FFFFFF]"
                >
                  Imanes personalizados con fotos (5 × 5 cm)
                </Link>
              </li>
              <li>
                <Link
                  href="/kits-emprendedores"
                  className="transition hover:text-[#FFFFFF]"
                >
                  Kits y papelería para emprendedores
                </Link>
              </li>
              <li>
                <Link href="/eventos" className="transition hover:text-[#FFFFFF]">
                  Stand de tatuajes temporales para eventos
                </Link>
              </li>
              <li>
                <Link href="/como-comprar" className="transition hover:text-[#FFFFFF]">
                  Cómo comprar y envío de archivos
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Atención, Pedidos y Legales */}
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#FAF8F5] uppercase">
              Tu Pedido e Información
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#D6D3D1]">
              <li>
                <Link
                  href="/pedidos/seguimiento"
                  className="font-medium text-[#FAF8F5] underline-offset-4 hover:underline"
                >
                  Seguimiento de pedido y muestras
                </Link>
              </li>
              <li>
                <Link href="/politicas" className="transition hover:text-[#FFFFFF]">
                  Privacidad y cuidado de tus archivos
                </Link>
              </li>
              <li>
                <Link href="/politicas#terminos" className="transition hover:text-[#FFFFFF]">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/politicas#envios" className="transition hover:text-[#FFFFFF]">
                  Retiro en Río Cuarto y envíos
                </Link>
              </li>
              <li>
                <Link href="/politicas#cambios" className="transition hover:text-[#FFFFFF]">
                  Cambios y cancelaciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Datos Reales de Contacto */}
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#FAF8F5] uppercase">
              Contacto
            </h3>
            <ul className="mt-4 space-y-3 text-xs text-[#D6D3D1]">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#A8A29E]" />
                <span>
                  {settings.city}, {settings.province}, {settings.country}
                  <span className="block text-[11px] text-[#A8A29E]">
                    {settings.exact_address
                      ? settings.exact_address
                      : 'Retiro coordinado en Río Cuarto'}
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 shrink-0 text-[#A8A29E]" />
                <span>Envíos a todo el país</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 shrink-0 text-[#A8A29E]" />
                <a
                  href={buildSafeWhatsAppUrl({ context: 'general' })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#FAF8F5] transition hover:underline"
                >
                  WhatsApp: {settings.whatsapp_number}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Instagram className="h-4 w-4 shrink-0 text-[#A8A29E]" />
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#FAF8F5] transition hover:underline"
                >
                  Instagram: {settings.instagram_handle}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-[#A8A29E]" />
                <a
                  href={`mailto:${settings.email}`}
                  className="transition hover:text-[#FFFFFF]"
                >
                  {settings.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#292524] pt-6 text-[11px] text-[#A8A29E] sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.brand_name} — {settings.city}, {settings.province}, {settings.country}.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <span>Tus fotos y archivos se almacenan de forma privada para tu pedido.</span>
            <span className="text-[#44403C]">·</span>
            <Link
              href="/admin"
              className="text-[#78716C] transition hover:text-[#D6D3D1]"
            >
              Administración
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
