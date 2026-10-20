'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  X,
  Heart,
  Layers,
  CalendarHeart,
  ArrowRight,
} from 'lucide-react';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';

export function FloatingWhatsAppCta() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Ocultar en páginas con barra inferior fija, formularios de compra/cotización o administración
  if (
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/tienda/') ||
    pathname.startsWith('/carrito') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/pedidos') ||
    pathname.startsWith('/eventos') ||
    pathname.startsWith('/contacto')
  ) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end sm:right-6 sm:bottom-6">
      {isOpen && (
        <div
          role="dialog"
          aria-label="Asistente rápido de consultas"
          className="mb-3 w-72 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] shadow-lg sm:w-80"
        >
          <div className="flex items-center justify-between border-b border-[#292524] bg-[#1C1917] px-4 py-3 text-[#FAF8F5]">
            <div>
              <p className="text-xs font-semibold text-[#FAF8F5]">
                ¿Te ayudamos con tu pedido?
              </p>
              <p className="text-[11px] text-[#A8A29E]">
                Río Cuarto · Envíos a todo el país
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar asistente rápido"
              className="rounded-lg p-1.5 text-[#D6D3D1] hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 p-3.5">
            <Link
              href="/tienda/imanes-personalizados-fotos-5x5"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-2.5 text-left transition hover:border-[#1C1917]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F1EA] text-[#1C1917]">
                  <Heart className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#1C1917]">
                    Imanes 5 × 5 cm con fotos
                  </p>
                  <p className="text-[11px] text-[#57534E]">
                    Subí tus fotos y encuadrá online
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#57534E]" />
            </Link>

            <Link
              href="/kits-emprendedores"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-2.5 text-left transition hover:border-[#1C1917]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F1EA] text-[#1C1917]">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#1C1917]">
                    Stickers, etiquetas y kits
                  </p>
                  <p className="text-[11px] text-[#57534E]">
                    Papelería para tu marca
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#57534E]" />
            </Link>

            <Link
              href="/eventos"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-2.5 text-left transition hover:border-[#1C1917]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F1EA] text-[#1C1917]">
                  <CalendarHeart className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#1C1917]">
                    Stand de tatuajes temporales
                  </p>
                  <p className="text-[11px] text-[#57534E]">
                    Consultá disponibilidad de fecha
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#57534E]" />
            </Link>

            <a
              href={buildSafeWhatsAppUrl({ context: 'general' })}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1917] px-4 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
            >
              <MessageCircle className="h-4 w-4" />
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        aria-label={isOpen ? 'Cerrar consultas rápidas' : 'Abrir consultas por WhatsApp'}
        aria-expanded={isOpen}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#1C1917] px-4 py-2.5 text-xs font-medium text-[#FAF8F5] shadow-md transition hover:bg-[#292524]"
      >
        <MessageCircle className="h-4 w-4 text-[#FAF8F5]" />
        <span className="hidden sm:inline">Consultas</span>
      </button>
    </div>
  );
}
