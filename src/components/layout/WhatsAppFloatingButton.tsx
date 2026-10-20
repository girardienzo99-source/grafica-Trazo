'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';

export function WhatsAppFloatingButton() {
  const url = buildSafeWhatsAppUrl({ context: 'general' });

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp a Trazo Espacio Gráfico (+54 9 358 510 4732)"
      className="fixed right-5 bottom-5 z-30 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#25D366] px-4 py-3 text-xs font-medium text-[#18181B] shadow-sm transition-transform hover:-translate-y-0.5"
    >
      <MessageCircle className="h-5 w-5 fill-[#18181B]" />
      <span className="hidden sm:inline">WhatsApp Trazo</span>
    </a>
  );
}
