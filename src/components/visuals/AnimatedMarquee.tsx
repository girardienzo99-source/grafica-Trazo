'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Heart, Scissors, Tag, CalendarHeart, Truck, ShieldCheck } from 'lucide-react';

const MARQUEE_ITEMS = [
  {
    icon: Heart,
    text: 'IMANES PERSONALIZADOS 5 × 5 CM CON TUS FOTOS',
    sub: 'Encuadre online al instante',
    href: '/tienda/imanes-personalizados-fotos-5x5',
  },
  {
    icon: Scissors,
    text: 'PLANCHAS DE STICKERS TROQUELADOS',
    sub: 'Listos para despegar y vestir tus envíos',
    href: '/tienda/planchas-stickers-personalizados',
  },
  {
    icon: Tag,
    text: 'ETIQUETAS DE CARTULINA CON CORTE Y PERFORACIÓN',
    sub: 'Para marcas de ropa e indumentaria',
    href: '/tienda/etiquetas-cartulina-ropa-corte-perforacion',
  },
  {
    icon: Sparkles,
    text: 'PINES Y TARJETAS PERSONALIZADAS',
    sub: 'Identidad para emprendimientos y souvenirs',
    href: '/tienda/pines-personalizados',
  },
  {
    icon: CalendarHeart,
    text: 'STAND CREATIVO DE TATUAJES TEMPORALES',
    sub: 'La experiencia más original para tu evento',
    href: '/eventos',
  },
  {
    icon: ShieldCheck,
    text: 'APROBÁS LA MUESTRA DIGITAL ANTES DE PRODUCIR',
    sub: 'Cero sorpresas · Calidad cuidada',
    href: '/como-comprar',
  },
  {
    icon: Truck,
    text: 'HECHO EN RÍO CUARTO · ENVÍOS A TODO EL PAÍS',
    sub: 'Atención cercana y personalizada',
    href: '/contacto',
  },
];

export function AnimatedMarquee() {
  const repeated = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div
      aria-label="Destacados en movimiento de Trazo Espacio Gráfico"
      className="relative overflow-hidden border-y-2 border-[#18181B] bg-[#18181B] py-3 text-[#FFFFFF] select-none"
    >
      <div className="animate-marquee flex items-center gap-8">
        {repeated.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={`${item.text}-${idx}`}
              href={item.href}
              className="group inline-flex shrink-0 items-center gap-3 rounded-full border border-[#3F3F46] bg-[#27272A] px-4 py-1.5 transition hover:border-[#CBD5E1] hover:bg-[#3F3F46]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F5F9] text-[#18181B] transition-transform group-hover:scale-110">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold tracking-wide text-[#FFFFFF]">
                {item.text}
              </span>
              <span className="text-[11px] font-semibold text-[#F8FAFC]">
                · {item.sub}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
