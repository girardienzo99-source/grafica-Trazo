'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Layers,
  Heart,
  CalendarHeart,
  CheckCircle2,
  Tag,
  Scissors,
  Gift,
  FileCheck2,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';

export function SalesMarketingShowcases() {
  const [selectedGoal, setSelectedGoal] = useState<'brand' | 'memories' | 'events'>('brand');
  const [packagingMode, setPackagingMode] = useState<'after' | 'before'>('after');

  return (
    <div className="space-y-16">
      {/* 1. EMBUDO GUIADO DE VENTA: "¿QUÉ QUERÉS CREAR HOY?" */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#18181B]">
                <Sparkles className="h-3.5 w-3.5 text-[#475569]" />
                Asesor de Compra Interactiva
              </span>
              <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight text-[#18181B] sm:text-4xl">
                ¿Qué querés transformar hoy en detalles reales?
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs text-[#52525B] sm:text-sm">
                Elegí tu objetivo y descubrí la combinación ideal de productos personalizados con acceso directo al configurador online.
              </p>
            </div>

            {/* Pestañas del embudo comercial */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedGoal('brand')}
                className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-xs font-semibold transition ${
                  selectedGoal === 'brand'
                    ? 'border-[#18181B] bg-[#F1F5F9] text-[#18181B] shadow-sm'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#52525B] hover:border-[#18181B]'
                }`}
              >
                <Layers className="h-4 w-4" />
                Potenciar mi Marca
              </button>

              <button
                type="button"
                onClick={() => setSelectedGoal('memories')}
                className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-xs font-semibold transition ${
                  selectedGoal === 'memories'
                    ? 'border-[#18181B] bg-[#F1F5F9] text-[#18181B] shadow-sm'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#52525B] hover:border-[#18181B]'
                }`}
              >
                <Heart className="h-4 w-4" />
                Regalar Recuerdos (5 × 5 cm)
              </button>

              <button
                type="button"
                onClick={() => setSelectedGoal('events')}
                className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-xs font-semibold transition ${
                  selectedGoal === 'events'
                    ? 'border-[#18181B] bg-[#F1F5F9] text-[#18181B] shadow-sm'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#52525B] hover:border-[#18181B]'
                }`}
              >
                <CalendarHeart className="h-4 w-4" />
                Sorprender en mi Evento
              </button>
            </div>
          </div>

          {/* Panel dinámico según objetivo comercial */}
          <div className="mt-8 grid items-center gap-8 border-t border-[#E2E8F0] pt-8 lg:grid-cols-12">
            {selectedGoal === 'brand' && (
              <>
                <div className="space-y-4 lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[#18181B] px-3 py-1 text-[11px] font-bold text-[#F8FAFC]">
                    PARA EMPRENDEDORES, TIENDAS DE ROPA Y COMERCIOS
                  </div>
                  <h3 className="text-2xl font-semibold text-[#18181B] sm:text-3xl">
                    Hacé que abrir un pedido tuyo sea una experiencia memorable
                  </h3>
                  <p className="text-sm leading-relaxed text-[#3F3F46]">
                    Cuando cuidás el packaging, tus clientes perciben mayor valor en tu producto, vuelven a elegirte y comparten tu marca en redes sociales. En Trazo armamos todas tus piezas con la misma coherencia visual.
                  </p>
                  <ul className="grid gap-2.5 text-xs text-[#18181B] sm:grid-cols-2">
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Planchas de stickers:</strong> Troquelados con tu logo listos para cerrar bolsas y cajas.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Etiquetas para ropa:</strong> En cartulina con corte y perforación listas para colgar.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Tarjetas de agradecimiento:</strong> Sumá tus redes, QR y un mensaje cercano.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Aprobación digital previa:</strong> Revisás y aprobás la muestra antes de imprimir.
                      </span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href="/tienda/kits-para-emprendedores"
                      className="inline-flex items-center gap-2 rounded-full border border-[#0F172A] bg-[#0F172A] px-5 py-2.5 text-xs font-medium text-[#FFFFFF] shadow-sm transition hover:-translate-y-0.5"
                    >
                      Armar mi Kit Emprendedor ahora
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/tienda/planchas-stickers-personalizados"
                      className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-3 text-xs font-bold text-[#18181B] hover:bg-[#F1F5F9]"
                    >
                      Pedir planchas de stickers
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#18181B] p-3 shadow-sm">
                    <div className="relative h-64 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/trazo/post-DeJ6p7QtwAE.jpg"
                        alt="Trabajo real de stickers personalizados por Trazo Espacio Gráfico"
                        className="animate-ken-burns h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#18181B]/90 via-transparent to-transparent" />
                      <div className="animate-float-slow absolute top-3 left-3 rounded-full bg-[#F1F5F9] px-3 py-1 text-[10px] font-semibold text-[#18181B]">
                        ✨ Trabajo real @trazo.grafica
                      </div>
                      <div className="absolute inset-x-3 bottom-3 text-[#FFFFFF]">
                        <p className="text-xs font-semibold">
                          Planchas de stickers + Pines + Papelería comercial
                        </p>
                        <p className="text-[11px] text-[#CBD5E1]">
                          Subí tu logo o pedí que nuestro equipo arme el diseño.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedGoal === 'memories' && (
              <>
                <div className="space-y-4 lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-3 py-1 text-[11px] font-bold text-emerald-100">
                    MEDIDA CONFIRMADA 5 × 5 CM · PERSONALIZADOR INTERACTIVO
                  </div>
                  <h3 className="text-2xl font-semibold text-[#18181B] sm:text-3xl">
                    Tus mejores fotos merecen verse todos los días, no quedar olvidadas en la nube
                  </h3>
                  <p className="text-sm leading-relaxed text-[#3F3F46]">
                    Transformá tus viajes, momentos en familia, cumpleaños o aniversarios en imanes cuadrados de 5 × 5 cm o en una Box de regalo personalizada lista para emocionar a quien más querés.
                  </p>
                  <ul className="grid gap-2.5 text-xs text-[#18181B] sm:grid-cols-2">
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Subida desde el celular:</strong> Elegí varias fotos a la vez sin complicaciones.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Recorte 5 × 5 cm en vivo:</strong> Encuadrá cada imagen y definí cuántas copias querés.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Aviso inteligente de nitidez:</strong> Te alertamos si alguna foto tiene baja resolución.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>100% Privado:</strong> Tus fotos personales se guardan con enlaces firmados protegidos.
                      </span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href="/tienda/imanes-personalizados-fotos-5x5"
                      className="inline-flex items-center gap-2 rounded-full border border-[#0F172A] bg-[#0F172A] px-5 py-2.5 text-xs font-medium text-[#FFFFFF] shadow-sm transition hover:-translate-y-0.5"
                    >
                      Cargar mis fotos y armar imanes 5 × 5 cm
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/tienda/boxes-regalos-personalizados"
                      className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-3 text-xs font-bold text-[#18181B] hover:bg-[#F1F5F9]"
                    >
                      Ver Boxes de Regalos
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] p-6 shadow-sm">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Foto 01 · 5×5 cm', sub: 'Encuadre cuadrado OK', anim: 'animate-float-slow' },
                        { label: 'Foto 02 · 5×5 cm', sub: 'Alta resolución ✓', anim: 'animate-float-reverse' },
                        { label: 'Foto 03 · 5×5 cm', sub: '2 copias asignadas', anim: 'animate-float-reverse' },
                        { label: 'Box Regalo', sub: 'Imanes + Dedicatoria', anim: 'animate-float-slow' },
                      ].map((m, idx) => (
                        <div
                          key={idx}
                          className={`${m.anim} flex flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 text-center shadow-sm`}
                        >
                          {idx === 3 ? (
                            <Gift className="mb-1.5 h-6 w-6 text-[#475569]" />
                          ) : (
                            <Heart className="mb-1.5 h-6 w-6 text-[#F8FAFC] fill-[#F8FAFC]" />
                          )}
                          <p className="text-xs font-semibold text-[#18181B]">{m.label}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-[#52525B]">{m.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedGoal === 'events' && (
              <>
                <div className="space-y-4 lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[#475569] px-3 py-1 text-[11px] font-bold text-white">
                    CASAMIENTOS · 15 AÑOS · CUMPLEAÑOS · EVENTOS EMPRESARIALES
                  </div>
                  <h3 className="text-2xl font-semibold text-[#18181B] sm:text-3xl">
                    El rincón más divertido y fotografiado de tu fiesta
                  </h3>
                  <p className="text-sm leading-relaxed text-[#3F3F46]">
                    Nuestro Stand Creativo de Tatuajes Temporales y los pines personalizados con frases o ilustraciones de los protagonistas hacen que todos los invitados participen y se lleven un recuerdo inolvidable.
                  </p>
                  <ul className="grid gap-2.5 text-xs text-[#18181B] sm:grid-cols-2">
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Stand de Tatuajes Temporales:</strong> Diseños creados a medida con la temática de tu fiesta.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Pines para invitados:</strong> Con frases divertidas, logos o nombres de los homenajeados.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Tarjetas y souvenirs:</strong> Invitaciones, tags y recuerdos de 5 × 5 cm.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>
                        <strong>Cotización sin compromiso:</strong> Consultá disponibilidad para tu fecha y localidad.
                      </span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href="/eventos"
                      className="inline-flex items-center gap-2 rounded-full border border-[#0F172A] bg-[#0F172A] px-5 py-2.5 text-xs font-medium text-[#FFFFFF] shadow-sm transition hover:-translate-y-0.5"
                    >
                      Cotizar Stand de Tatuajes para mi fecha
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/tienda/pines-personalizados"
                      className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-3 text-xs font-bold text-[#18181B] hover:bg-[#F1F5F9]"
                    >
                      Ver Pines para Eventos
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#18181B] p-3 shadow-sm">
                    <div className="relative h-64 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/trazo/post-DeJ7xK4NkUF.jpg"
                        alt="Pines personalizados reales de Trazo Espacio Gráfico"
                        className="animate-ken-burns h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#18181B]/90 via-transparent to-transparent" />
                      <div className="animate-float-slow absolute top-3 left-3 rounded-full bg-[#F1F5F9] px-3 py-1 text-[10px] font-semibold text-[#18181B]">
                        🎉 Souvenirs y Eventos · @trazo.grafica
                      </div>
                      <div className="absolute inset-x-3 bottom-3 text-[#FFFFFF]">
                        <p className="text-xs font-semibold">
                          Stand de Tatuajes Temporales + Pines + Tarjetas de Evento
                        </p>
                        <p className="text-[11px] text-[#CBD5E1]">
                          Consultá tu fecha en Río Cuarto y región o envíos a todo el país.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. COMPARADOR INTERACTIVO EN MOVIMIENTO: EL EFECTO TRAZO EN TU MARCA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-[#18181B] via-[#27272A] to-[#18181B] p-6 text-[#FFFFFF] shadow-sm sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-semibold text-[#18181B]">
                <Eye className="h-3.5 w-3.5" />
                Demostración Interactiva en Movimiento
              </span>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-[#FFFFFF] sm:text-4xl">
                La diferencia entre entregar un paquete y construir una marca recordada
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-[#CBD5E1] sm:text-sm">
                Probá el interruptor para ver cómo los detalles gráficos de Trazo transforman un envío común en una presentación profesional que fideliza a tus clientes.
              </p>

              {/* Selector interactivo Antes / Después */}
              <div className="mt-6 inline-flex rounded-full border border-[#3F3F46] bg-[#18181B] p-1.5">
                <button
                  type="button"
                  onClick={() => setPackagingMode('before')}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                    packagingMode === 'before'
                      ? 'bg-[#3F3F46] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  1. Envío común sin personalizar
                </button>
                <button
                  type="button"
                  onClick={() => setPackagingMode('after')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    packagingMode === 'after'
                      ? 'bg-[#F1F5F9] text-[#18181B] shadow-sm'
                      : 'text-[#F8FAFC] hover:bg-white/5'
                  }`}
                >
                  2. Con Identidad Trazo ✨
                </button>
              </div>

              <div className="mt-6 space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="h-4 w-4 shrink-0 text-[#F8FAFC]" />
                  <span>
                    <strong>Revisión profesional incluida:</strong> Chequeamos tus archivos y te enviamos muestra digital antes de producir.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="h-4 w-4 shrink-0 text-[#F8FAFC]" />
                  <span>
                    <strong>¿No tenés diseño listo?</strong> Marcá <em>&ldquo;Solicitar ayuda con el diseño&rdquo;</em> en cualquier producto y lo armamos con vos.
                  </span>
                </div>
              </div>
            </div>

            {/* Escenario visual animado Antes vs Después */}
            <div className="lg:col-span-6">
              {packagingMode === 'before' ? (
                <div className="flex h-80 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#52525B] bg-[#27272A] p-6 text-center">
                  <div className="flex h-36 w-48 flex-col items-center justify-center rounded-xl border border-[#52525B] bg-[#3F3F46] p-4 text-[#94A3B8]">
                    <p className="text-xs font-bold uppercase">Bolsa / Caja Genérica</p>
                    <p className="mt-1 text-[11px]">Sin logo · Sin redes · Sin contacto</p>
                  </div>
                  <p className="mt-4 max-w-md text-xs text-[#CBD5E1]">
                    El cliente recibe el producto pero olvida el nombre de la tienda, no tiene a mano tu Instagram para volver a comprar ni siente el impulso de subir una historia.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPackagingMode('after')}
                    className="mt-4 rounded-full bg-[#F1F5F9] px-4 py-1.5 text-xs font-semibold text-[#18181B]"
                  >
                    Ver transformación con Trazo →
                  </button>
                </div>
              ) : (
                <div className="relative flex h-80 flex-col justify-between overflow-hidden rounded-2xl border-2 border-[#CBD5E1] bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] p-5 text-[#18181B]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#18181B] px-3 py-1 text-[10px] font-semibold text-[#F8FAFC] uppercase">
                      ✦ Presentación con Identidad Trazo
                    </span>
                    <span className="text-[11px] font-medium text-emerald-900">
                      + Recordación · + Recompras
                    </span>
                  </div>

                  {/* Piezas animadas flotando en conjunto */}
                  <div className="my-auto grid grid-cols-3 gap-3 py-2">
                    {/* 1. Sticker cierra bolsa */}
                    <Link
                      href="/tienda/planchas-stickers-personalizados"
                      className="animate-float-slow group flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-2.5 text-center shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/trazo/post-DeJ6p7QtwAE.jpg"
                        alt="Stickers personalizados"
                        className="h-20 w-full rounded-xl object-cover"
                      />
                      <span className="mt-2 text-[11px] font-semibold text-[#18181B] group-hover:text-[#475569]">
                        1. Sticker Cierra Bolsa
                      </span>
                      <span className="text-[9px] font-semibold text-[#52525B]">
                        En plancha troquelada
                      </span>
                    </Link>

                    {/* 2. Etiqueta cartulina balanceándose */}
                    <Link
                      href="/tienda/etiquetas-cartulina-ropa-corte-perforacion"
                      className="animate-swing-tag group flex flex-col items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-center shadow-sm"
                    >
                      <div className="h-3 w-3 rounded-full border border-[#E2E8F0] bg-[#E2E8F0]" />
                      <Tag className="my-1 h-7 w-7 text-[#475569]" />
                      <div>
                        <span className="block text-[11px] font-semibold text-[#18181B]">
                          2. Tag en Cartulina
                        </span>
                        <span className="text-[9px] font-semibold text-[#52525B]">
                          Corte y perforación
                        </span>
                      </div>
                    </Link>

                    {/* 3. Pin / Tarjeta de agradecimiento */}
                    <Link
                      href="/tienda/pines-personalizados"
                      className="animate-float-reverse group flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-2.5 text-center shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/trazo/post-DeJ7xK4NkUF.jpg"
                        alt="Pines personalizados"
                        className="h-20 w-full rounded-xl object-cover"
                      />
                      <span className="mt-2 text-[11px] font-semibold text-[#18181B] group-hover:text-[#475569]">
                        3. Pin + Tarjeta Gracias
                      </span>
                      <span className="text-[9px] font-semibold text-[#52525B]">
                        Detalle que enamora
                      </span>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#CBD5E1] pt-2.5 text-[11px]">
                    <span className="font-bold text-[#3F3F46]">
                      Tocá cualquier pieza para personalizarla online
                    </span>
                    <Link
                      href="/kits-emprendedores"
                      className="font-semibold text-[#18181B] underline hover:text-[#475569]"
                    >
                      Armar combo completo →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
