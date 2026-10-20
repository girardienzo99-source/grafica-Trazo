'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  MessageCircle,
  Instagram,
  Mail,
  Truck,
  CalendarHeart,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';

export default function ContactoPage() {
  const { settings } = useStore();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
      <div className="text-center">
        <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
          Atención directa · {settings.city}, {settings.province}
        </span>
        <h1 className="font-display mt-2 text-3xl font-medium text-[#1C1917] sm:text-4xl">
          Contacto · {settings.brand_name}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-[#57534E] sm:text-sm">
          Estamos en {settings.city}, {settings.province} y realizamos envíos a todo el país. Escribinos por cualquiera de nuestros canales para recibir asesoramiento sobre tus productos personalizados.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="flex flex-col justify-between rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
          <div>
            <MessageCircle className="h-6 w-6 text-[#1C1917]" />
            <h2 className="font-display mt-3 text-lg font-medium text-[#1C1917]">
              WhatsApp
            </h2>
            <p className="mt-1 text-xs text-[#57534E]">
              {settings.whatsapp_number}
            </p>
          </div>
          <a
            href={buildSafeWhatsAppUrl({ context: 'general' })}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
          >
            Escribir por WhatsApp
          </a>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
          <div>
            <Instagram className="h-6 w-6 text-[#1C1917]" />
            <h2 className="font-display mt-3 text-lg font-medium text-[#1C1917]">
              Instagram
            </h2>
            <p className="mt-1 text-xs text-[#57534E]">
              {settings.instagram_handle}
            </p>
          </div>
          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-5 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
          >
            Ver perfil en Instagram
          </a>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
          <div>
            <Mail className="h-6 w-6 text-[#1C1917]" />
            <h2 className="font-display mt-3 text-lg font-medium text-[#1C1917]">
              Correo electrónico
            </h2>
            <p className="mt-1 text-xs text-[#57534E]">{settings.email}</p>
          </div>
          <a
            href={`mailto:${settings.email}`}
            className="mt-5 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-5 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
          >
            Enviar correo
          </a>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
            <MapPin className="h-4 w-4 text-[#57534E]" />
            <span>Ubicación y retiros en Río Cuarto</span>
          </div>
          <p className="mt-2 leading-relaxed text-[#57534E]">
            <strong className="text-[#1C1917]">Ciudad:</strong> {settings.city},{' '}
            {settings.province}, {settings.country}.
          </p>
          <p className="mt-1 leading-relaxed text-[#57534E]">
            <strong className="text-[#1C1917]">Retiro en persona:</strong>{' '}
            {settings.exact_address
              ? settings.exact_address
              : 'Coordinamos el punto y horario de retiro en Río Cuarto cuando tu pedido está listo para entregar.'}
          </p>
        </div>

        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
            <Truck className="h-4 w-4 text-[#57534E]" />
            <span>Envíos y consultas para eventos</span>
          </div>
          <p className="mt-2 leading-relaxed text-[#57534E]">
            Realizamos envíos a todo el país. Si querés consultar disponibilidad para nuestro{' '}
            <strong className="text-[#1C1917]">
              Stand creativo de tatuajes temporales para eventos
            </strong>
            , podés hacerlo desde la sección de eventos:
          </p>
          <Link
            href="/eventos"
            className="mt-3 inline-flex items-center gap-1.5 font-medium text-[#1C1917] underline underline-offset-4"
          >
            <CalendarHeart className="h-4 w-4" />
            Ir a Eventos y Presupuestos →
          </Link>
        </div>
      </div>
    </div>
  );
}
