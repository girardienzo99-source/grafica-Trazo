'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Upload,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function ComoComprarPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
      <div className="text-center">
        <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
          Guía paso a paso · Trazo Espacio Gráfico
        </span>
        <h1 className="font-display mt-2 text-3xl font-medium text-[#1C1917] sm:text-4xl">
          ¿Cómo encargar tus productos personalizados?
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-[#57534E] sm:text-sm">
          Un proceso claro para elegir tu producto, subir tus fotos o archivos y hacer el seguimiento de tu pedido desde el celular o la computadora.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[
          {
            icon: Sparkles,
            title: '1. Elegí tu producto y cantidad',
            text: 'Ingresá al producto que te guste en nuestra tienda, seleccioná la presentación disponible e indicá la cantidad de unidades o packs que necesitás.',
          },
          {
            icon: Upload,
            title: '2. Subí tus fotos (Imanes 5×5 cm) o tu diseño',
            text: 'Para los imanes de 5 × 5 cm podés subir varias fotos desde tu celular, ajustar el encuadre cuadrado en vivo y elegir cuántas copias querés de cada imagen. En stickers, pines, tarjetas y etiquetas podés adjuntar tu logo o pedirnos ayuda con el diseño.',
          },
          {
            icon: ShieldCheck,
            title: '3. Revisá tu muestra digital cuando corresponde',
            text: 'En productos con armado o revisión gráfica, preparamos la muestra digital y la compartimos en tu enlace de seguimiento para que la apruebes o pidas ajustes antes de pasar al taller.',
          },
          {
            icon: Truck,
            title: '4. Retirá en Río Cuarto o recibí en tu localidad',
            text: 'Una vez terminado tu pedido, te avisamos para coordinar el retiro en Río Cuarto, Córdoba, o realizamos el despacho a tu domicilio y cargamos el código de seguimiento.',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4F1EA] text-[#1C1917]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-display mt-4 text-lg font-medium text-[#1C1917]">
                {card.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
                {card.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
        <h2 className="font-display text-xl font-medium text-[#1C1917]">
          Recomendaciones para enviar tus fotos y archivos
        </h2>
        <ul className="mt-4 space-y-2.5 text-xs text-[#57534E]">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1C1917]" />
            <span>
              <strong className="text-[#1C1917]">Imanes 5 × 5 cm:</strong> Subí imágenes JPG, PNG o WEBP de buena calidad (recomendamos al menos 600 × 600 píxeles) para lograr la mejor nitidez.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1C1917]" />
            <span>
              <strong className="text-[#1C1917]">Stickers, pines, tarjetas y etiquetas:</strong> Podés adjuntar archivos PNG, JPG, WEBP, PDF o SVG (hasta 10 MB por archivo).
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1C1917]" />
            <span>
              <strong className="text-[#1C1917]">Privacidad:</strong> Tus fotos familiares y logos se guardan de manera privada únicamente para producir tu pedido.
            </span>
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/tienda"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1C1917] px-6 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
          >
            Explorar productos
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pedidos/seguimiento"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-5 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
          >
            Seguimiento de mi pedido
          </Link>
        </div>
      </div>
    </div>
  );
}
