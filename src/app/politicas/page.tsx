'use client';

import React from 'react';
import { useStore } from '@/context/StoreContext';

export default function PoliticasPage() {
  const { settings } = useStore();
  const { policies } = settings;

  const sections = [
    { id: 'privacidad', data: policies.privacy_policy },
    { id: 'terminos', data: policies.terms_and_conditions },
    { id: 'envios', data: policies.shipping_and_delivery },
    { id: 'cambios', data: policies.returns_and_cancellations },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
          Información para clientes · {settings.brand_name}
        </span>
        <h1 className="font-display mt-1 text-3xl font-medium text-[#1C1917]">
          Privacidad, Envíos, Términos y Cambios
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#57534E] sm:text-sm">
          Conocé cómo resguardamos tus fotografías y archivos personales, nuestras modalidades de entrega y el funcionamiento de los pedidos personalizados.
        </p>
      </div>

      {sections.map((sec) => (
        <section
          key={sec.id}
          id={sec.id}
          className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8"
        >
          <h2 className="font-display text-lg font-medium text-[#1C1917]">
            {sec.data.title}
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-[#57534E] sm:text-sm">
            {sec.data.content}
          </p>
        </section>
      ))}
    </div>
  );
}
