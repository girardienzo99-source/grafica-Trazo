'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Tag,
  Scissors,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/catalog/ProductCard';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';

const KIT_PIECES = [
  {
    id: 'planchas-stickers-personalizados',
    title: 'Planchas de stickers personalizados',
    subtitle: 'Troquelados para cerrar bolsas, cajas, papel seda y envases',
    defaultQty: '10 planchas',
  },
  {
    id: 'etiquetas-cartulina-ropa-corte-perforacion',
    title: 'Etiquetas de cartulina para ropa',
    subtitle: 'Con corte y perforación incluidos, listas para colgar en prendas',
    defaultQty: '100 unidades',
  },
  {
    id: 'tarjetas-agradecimiento-packaging',
    title: 'Tarjetas de agradecimiento y packaging',
    subtitle: 'Para sumar tus redes, un mensaje cálido o código QR en cada envío',
    defaultQty: '100 unidades',
  },
  {
    id: 'tarjetas-personales',
    title: 'Tarjetas personales y de presentación',
    subtitle: 'Con tus datos comerciales, WhatsApp e identidad de marca',
    defaultQty: '100 unidades',
  },
  {
    id: 'pines-personalizados',
    title: 'Pines personalizados para tu marca',
    subtitle: 'Para regalar a tus clientes, ferias o identificar a tu equipo',
    defaultQty: '30 unidades',
  },
];

export default function KitsEmprendedoresPage() {
  const { products, categories } = useStore();

  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([
    'planchas-stickers-personalizados',
    'etiquetas-cartulina-ropa-corte-perforacion',
    'tarjetas-agradecimiento-packaging',
  ]);
  const [brandName, setBrandName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [kitNotes, setKitNotes] = useState('');
  const [submittingKitQuote, setSubmittingKitQuote] = useState(false);
  const [submittedKitCode, setSubmittedKitCode] = useState<string | null>(null);
  const [kitError, setKitError] = useState<string | null>(null);

  const togglePiece = (id: string) => {
    setSelectedPieceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const entrepreneurProducts = products.filter(
    (p) =>
      p.is_published &&
      [
        'kits-para-emprendedores',
        'planchas-stickers-personalizados',
        'etiquetas-cartulina-ropa-corte-perforacion',
        'tarjetas-agradecimiento-packaging',
        'tarjetas-personales',
        'pines-personalizados',
      ].includes(p.slug)
  );

  const selectedPieceTitles = KIT_PIECES.filter((p) =>
    selectedPieceIds.includes(p.id)
  ).map((p) => p.title);

  const handleSubmitKitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPieceIds.length === 0) {
      setKitError('Seleccioná al menos una pieza para armar tu kit.');
      return;
    }
    setKitError(null);
    setSubmittingKitQuote(true);

    try {
      const summary = [
        brandName.trim() ? `Marca / Instagram: ${brandName.trim()}` : null,
        `Piezas seleccionadas: ${selectedPieceTitles.join(' + ')}`,
        kitNotes.trim() ? `Indicaciones: ${kitNotes.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'custom_bulk_order',
          customerName,
          customerContact,
          productSlug: 'kits-para-emprendedores',
          productName: 'Kit para Emprendedores a medida',
          requestedQuantity: selectedPieceIds.length,
          themeOrIdea: brandName.trim() || 'Identidad para emprendimiento',
          observations: summary,
          customizationPayload: {
            selected_pieces: selectedPieceIds,
            brand_name: brandName.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.quote) {
        setKitError(
          data.error || 'No se pudo enviar la solicitud. Intentá nuevamente.'
        );
        setSubmittingKitQuote(false);
        return;
      }

      setSubmittedKitCode(data.quote.reference_code);
      setSubmittingKitQuote(false);
    } catch {
      setKitError('Error de conexión al registrar tu solicitud.');
      setSubmittingKitQuote(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
      {/* 1. PRESENTACIÓN CON FOTOGRAFÍAS REALES */}
      <div className="overflow-hidden rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#78716C] uppercase">
              <Layers className="h-3.5 w-3.5 text-[#1C1917]" />
              Papelería y packaging para marcas
            </span>
            <h1 className="font-display mt-2.5 text-3xl font-medium tracking-tight text-[#1C1917] sm:text-5xl">
              Dale identidad a tu emprendimiento
            </h1>
            <p className="mt-3.5 text-sm leading-relaxed text-[#57534E] sm:text-base">
              Diseñamos y producimos las piezas gráficas que acompañan tus productos: planchas de stickers troquelados, etiquetas de cartulina para ropa con corte y perforación, tarjetas personales y tarjetas de agradecimiento.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4">
                <Tag className="h-4 w-4 text-[#1C1917]" />
                <h2 className="mt-2 text-xs font-semibold text-[#1C1917]">
                  Etiquetas para ropa
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-[#57534E]">
                  En cartulina con corte y perforación, listas para colgar en tus prendas.
                </p>
              </div>
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4">
                <Scissors className="h-4 w-4 text-[#1C1917]" />
                <h2 className="mt-2 text-xs font-semibold text-[#1C1917]">
                  Planchas de stickers
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-[#57534E]">
                  Troquelados para cerrar bolsas, cajas de envío, papel seda y frascos.
                </p>
              </div>
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4">
                <CreditCard className="h-4 w-4 text-[#1C1917]" />
                <h2 className="mt-2 text-xs font-semibold text-[#1C1917]">
                  Tarjetas y combos
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-[#57534E]">
                  Tarjetas personales, de agradecimiento y kits combinados.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#armar-kit"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1C1917] px-6 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
              >
                Elegir piezas para mi marca
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/tienda/kits-para-emprendedores"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-5 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
              >
                Subir logo en Kit Emprendedor
              </Link>
            </div>
          </div>

          {/* Fotografías reales autorizadas */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            <div className="col-span-2 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#F4F1EA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/trazo/post-DeJ6p7QtwAE.jpg"
                alt="Planchas de stickers personalizados por Trazo Espacio Gráfico"
                className="h-48 w-full object-cover"
              />
              <div className="bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#1C1917]">
                Planchas de stickers personalizados (@trazo.grafica)
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#F4F1EA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/trazo/post-DeJ7xK4NkUF.jpg"
                alt="Pines personalizados por Trazo Espacio Gráfico"
                className="h-36 w-full object-cover"
              />
              <div className="bg-[#FFFFFF] px-3 py-1.5 text-[11px] font-medium text-[#1C1917]">
                Pines personalizados
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#F4F1EA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/trazo/post-DctEFmPNLrC.jpg"
                alt="Tarjetería y papelería para marcas por Trazo Espacio Gráfico"
                className="h-36 w-full object-cover"
              />
              <div className="bg-[#FFFFFF] px-3 py-1.5 text-[11px] font-medium text-[#1C1917]">
                Tarjetas y etiquetas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONFIGURADOR FUNCIONAL DE PIEZAS PARA TU MARCA */}
      <section
        id="armar-kit"
        className="rounded-3xl border border-[#E7E5E4] bg-[#F4F1EA] p-6 sm:p-10"
      >
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#78716C] uppercase">
              <Sparkles className="h-3.5 w-3.5 text-[#1C1917]" />
              Armá tu combinación a medida
            </span>
            <h2 className="font-display mt-1.5 text-2xl font-medium text-[#1C1917] sm:text-3xl">
              1. Seleccioná qué piezas necesita tu emprendimiento
            </h2>
            <p className="mt-1.5 text-xs text-[#57534E] sm:text-sm">
              Marcá las piezas que querés combinar con la misma identidad visual:
            </p>

            <div className="mt-5 space-y-2.5">
              {KIT_PIECES.map((piece) => {
                const checked = selectedPieceIds.includes(piece.id);
                return (
                  <label
                    key={piece.id}
                    className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 transition ${
                      checked
                        ? 'border-[#1C1917] bg-[#FFFFFF]'
                        : 'border-[#E7E5E4] bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePiece(piece.id)}
                        className="mt-1 h-4 w-4 rounded accent-[#1C1917]"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[#1C1917] sm:text-sm">
                          {piece.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#57534E]">
                          {piece.subtitle}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/tienda/${piece.id}`}
                      className="shrink-0 text-[11px] font-medium text-[#57534E] underline hover:text-[#1C1917]"
                    >
                      Ver ficha →
                    </Link>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Formulario directo de cotización de la combinación elegida */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
              <h3 className="font-display text-lg font-medium text-[#1C1917]">
                2. Solicitá presupuesto de tu combinación
              </h3>

              {submittedKitCode ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
                    <p className="font-semibold">
                      ¡Combinación registrada! Código: {submittedKitCode}
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Recibimos tu selección ({selectedPieceTitles.join(', ')}). Te contactaremos para coordinar cantidades y diseño.
                    </p>
                  </div>
                  <a
                    href={buildSafeWhatsAppUrl({
                      context: 'quote',
                      quoteReference: submittedKitCode,
                      productName: `Kit Emprendedor (${selectedPieceTitles.join(' + ')})`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] py-3 text-xs font-medium text-[#FAF8F5]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Continuar por WhatsApp ({submittedKitCode})
                  </a>
                  <button
                    type="button"
                    onClick={() => setSubmittedKitCode(null)}
                    className="w-full rounded-full border border-[#D6D3D1] py-2.5 text-xs font-medium text-[#1C1917]"
                  >
                    Armar otra combinación
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitKitQuote} className="mt-4 space-y-3.5">
                  <div className="rounded-xl bg-[#FAF8F5] p-3 text-xs text-[#57534E]">
                    <span className="font-semibold text-[#1C1917]">
                      Piezas marcadas ({selectedPieceIds.length}):
                    </span>{' '}
                    {selectedPieceTitles.length > 0
                      ? selectedPieceTitles.join(' · ')
                      : 'Seleccioná al menos una pieza a la izquierda'}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#1C1917]">
                      Nombre de tu marca o Instagram
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Ej: @mi.emprendimiento"
                      className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#1C1917]">
                      Tu nombre y apellido *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#1C1917]">
                      WhatsApp o correo electrónico *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      placeholder="+54 9 358 ..."
                      className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#1C1917]">
                      Cantidades aproximadas o consultas
                    </label>
                    <textarea
                      rows={2}
                      value={kitNotes}
                      onChange={(e) => setKitNotes(e.target.value)}
                      placeholder="Contanos si ya tenés logo o qué cantidades te gustaría cotizar..."
                      className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#1C1917]"
                    />
                  </div>

                  {kitError && (
                    <p className="text-xs font-medium text-rose-700">{kitError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submittingKitQuote}
                    className="w-full rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
                  >
                    {submittingKitQuote
                      ? 'Enviando solicitud...'
                      : 'Solicitar presupuesto de esta combinación'}
                  </button>

                  <Link
                    href="/tienda/kits-para-emprendedores"
                    className="block text-center text-xs font-medium text-[#57534E] underline hover:text-[#1C1917]"
                  >
                    O ir a la ficha de Kit Emprendedor para subir archivos →
                  </Link>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATÁLOGO DE PIEZAS INDIVIDUALES PARA EMPRENDEDORES */}
      <section>
        <h2 className="font-display text-2xl font-medium text-[#1C1917]">
          Piezas individuales y kits para tu marca
        </h2>
        <p className="mt-1 text-xs text-[#57534E]">
          También podés personalizar y cotizar cada producto por separado.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entrepreneurProducts.map((prod) => {
            const cat = categories.find((c) => c.id === prod.category_id);
            return (
              <ProductCard
                key={prod.id}
                product={prod}
                categoryName={cat?.name}
              />
            );
          })}
        </div>
      </section>

      {/* 4. REVISIÓN DE DISEÑO Y MUESTRA DIGITAL */}
      <section className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h3 className="font-display text-xl font-medium text-[#1C1917]">
              ¿Tenés tu logo listo o necesitás que armemos el diseño?
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-[#57534E]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1C1917]" />
                Si ya tenés tus archivos, podés subirlos directamente en cada producto.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1C1917]" />
                Si necesitás armado gráfico, indicanos tus colores y textos al hacer tu pedido.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1C1917]" />
                En piezas con revisión gráfica te enviamos la muestra digital antes de producir.
              </li>
            </ul>
          </div>
          <a
            href={buildSafeWhatsAppUrl({
              context: 'product',
              productName: 'Kits para emprendedores',
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5]"
          >
            <MessageCircle className="h-4 w-4" />
            Consultar por WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
