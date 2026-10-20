'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Heart,
  CheckCircle2,
  Play,
  Pause,
  Instagram,
  Sparkles,
} from 'lucide-react';

interface ShowcaseSlide {
  id: string;
  tag: string;
  title: string;
  titleAccent: string;
  marketingHook: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  isRealPhoto: boolean;
  instagramPostUrl?: string;
  badgeTop: string;
  badgeBottom: string;
}

const SLIDES: ShowcaseSlide[] = [
  {
    id: 'stickers-reales',
    tag: 'Fotografía Real · @trazo.grafica',
    title: 'Planchas de stickers para',
    titleAccent: 'realzar tu packaging',
    marketingHook:
      'Convertí cada entrega en una experiencia cuidada y memorable. Troquelados con precisión y listos para usar.',
    ctaText: 'Personalizar planchas de stickers',
    ctaHref: '/tienda/planchas-stickers-personalizados',
    imageUrl: '/images/trazo/post-DeJ6p7QtwAE.jpg',
    isRealPhoto: true,
    instagramPostUrl: 'https://www.instagram.com/p/DeJ6p7QtwAE/',
    badgeTop: 'Troquelados por plancha',
    badgeBottom: 'Muestra digital previa incluida',
  },
  {
    id: 'pines-reales',
    tag: 'Fotografía Real · @trazo.grafica',
    title: 'Pines personalizados que',
    titleAccent: 'cuentan tu historia',
    marketingHook:
      'Un detalle delicado y duradero para eventos especiales, souvenirs, regalos corporativos o identidad de marca.',
    ctaText: 'Configurar mis pines',
    ctaHref: '/tienda/pines-personalizados',
    imageUrl: '/images/trazo/post-DeJ7xK4NkUF.jpg',
    isRealPhoto: true,
    instagramPostUrl: 'https://www.instagram.com/p/DeJ7xK4NkUF/',
    badgeTop: 'Con tu logo, frase o temática',
    badgeBottom: 'Escala de precios por cantidad',
  },
  {
    id: 'papeleria-real',
    tag: 'Fotografía Real · @trazo.grafica',
    title: 'Papelería comercial y',
    titleAccent: 'etiquetas de autor',
    marketingHook:
      'Etiquetas de cartulina con corte y perforación, tarjetas de agradecimiento y piezas editoriales para tu marca.',
    ctaText: 'Explorar Kits Emprendedores',
    ctaHref: '/kits-emprendedores',
    imageUrl: '/images/trazo/post-DctEFmPNLrC.jpg',
    isRealPhoto: true,
    instagramPostUrl: 'https://www.instagram.com/p/DctEFmPNLrC/',
    badgeTop: 'Etiquetas con corte y perforación',
    badgeBottom: 'Identidad coherente en cada prenda',
  },
  {
    id: 'imanes-5x5-live',
    tag: 'Personalizador Interactivo Online',
    title: 'Imanes fotográficos en',
    titleAccent: 'formato 5 × 5 cm',
    marketingHook:
      'Transformá tus fotos favoritas del celular en recuerdos tangibles. Subí tus imágenes, encuadrá en 1:1 y elegí copias por foto.',
    ctaText: 'Subir mis fotos 5 × 5 cm',
    ctaHref: '/tienda/imanes-personalizados-fotos-5x5',
    imageUrl: '/images/trazo/producto-imanes-5x5.jpg',
    isRealPhoto: true,
    badgeTop: 'Medida confirmada: 5 × 5 cm',
    badgeBottom: 'Control automático de resolución',
  },
];

export function HeroMotionShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const activeSlide = SLIDES[activeIndex];

  return (
    <div className="relative">
      {/* Marco editorial principal en Gama del Blanco */}
      <div className="overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] sm:p-5">
        {/* Cabecera delicada del visor */}
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <a
            href="https://www.instagram.com/trazo.grafica/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#0F172A] transition hover:border-[#94A3B8]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/trazo/logo-trazo.jpg"
              alt="Logo oficial Trazo Espacio Gráfico"
              className="h-5 w-5 rounded-full border border-[#CBD5E1] object-cover grayscale"
            />
            <span className="tracking-tight">@trazo.grafica</span>
            <span className="rounded-full bg-[#FFFFFF] px-2 py-0.5 text-[9px] font-medium tracking-[0.12em] text-[#64748B] uppercase border border-[#E2E8F0]">
              Lookbook
            </span>
          </a>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] font-normal text-[#64748B] sm:inline-flex">
              <Sparkles className="h-3 w-3 text-[#475569]" />
              {activeSlide.badgeTop}
            </span>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={
                isPlaying
                  ? 'Pausar presentación en movimiento'
                  : 'Reproducir presentación en movimiento'
              }
              className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-medium text-[#475569] transition hover:border-[#94A3B8] hover:text-[#0F172A]"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-2.5 w-2.5" />
                  <span>Activo</span>
                </>
              ) : (
                <>
                  <Play className="h-2.5 w-2.5" />
                  <span>Pausado</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Escenario visual limpio y despejado (sin texto superpuesto que tape el producto) */}
        <div className="relative h-60 w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] sm:h-68">
          <div key={activeSlide.id} className="relative h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeSlide.imageUrl}
              alt={`${activeSlide.title} ${activeSlide.titleAccent}`}
              className="animate-ken-burns h-full w-full object-cover"
            />
            <div className="animate-shimmer-sweep pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>

          {/* Etiqueta superior flotante sutil tipo galería */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[#E2E8F0]/80 bg-[#FFFFFF]/95 px-3 py-1 text-[10px] font-medium tracking-[0.12em] text-[#0F172A] uppercase shadow-2xs backdrop-blur-md">
              {activeSlide.tag}
            </span>
          </div>

          {activeSlide.instagramPostUrl && (
            <a
              href={activeSlide.instagramPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-[#E2E8F0]/80 bg-[#FFFFFF]/95 px-2.5 py-1 text-[10px] font-medium text-[#0F172A] shadow-2xs backdrop-blur-md transition hover:bg-[#F8FAFC]"
            >
              <Instagram className="h-3 w-3 text-[#475569]" />
              <span>Ver en IG</span>
            </a>
          )}

          {/* Sello inferior delicado */}
          <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0]/90 bg-[#FFFFFF]/95 px-3 py-1 text-[11px] font-medium text-[#334155] shadow-2xs backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              {activeSlide.badgeBottom}
            </span>
            <span className="rounded-full border border-[#E2E8F0]/90 bg-[#FFFFFF]/95 px-2.5 py-0.5 text-[10px] font-medium text-[#475569] shadow-2xs backdrop-blur-md">
              {activeIndex + 1} / {SLIDES.length}
            </span>
          </div>
        </div>

        {/* Pie editorial de alto contraste debajo de la imagen */}
        <div className="mt-4 rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC]/70 p-4">
          <h2 className="font-display text-lg font-medium leading-snug text-[#0F172A] sm:text-xl">
            <span>{activeSlide.title} </span>
            <span className="font-editorial-italic font-normal text-[#475569]">
              {activeSlide.titleAccent}
            </span>
          </h2>
          <p className="mt-1.5 text-xs font-normal leading-relaxed text-[#64748B]">
            {activeSlide.marketingHook}
          </p>

          <div className="mt-3.5 flex items-center justify-between gap-2">
            <Link
              href={activeSlide.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-4 py-2 text-xs font-medium tracking-wide text-[#FFFFFF] shadow-xs transition hover:bg-[#1E293B]"
            >
              <span>{activeSlide.ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-[11px] font-editorial-italic text-[#64748B]">
              Diseño cuidado al detalle
            </span>
          </div>
        </div>

        {/* Selector interactivo de escenas (Miniaturas delicadas) */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {SLIDES.map((s, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`group relative overflow-hidden rounded-xl border p-1.5 text-left transition ${
                  isCurrent
                    ? 'border-[#0F172A] bg-[#F8FAFC] shadow-2xs'
                    : 'border-[#E2E8F0] bg-[#FFFFFF] opacity-70 hover:border-[#CBD5E1] hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageUrl}
                    alt={s.title}
                    className="h-7 w-7 shrink-0 rounded-lg border border-[#E2E8F0] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold text-[#0F172A]">
                      {idx === 0
                        ? 'Stickers'
                        : idx === 1
                        ? 'Pines'
                        : idx === 2
                        ? 'Marcas'
                        : 'Imanes 5×5'}
                    </p>
                    <p className="truncate text-[9px] font-normal text-[#64748B]">
                      {s.isRealPhoto ? 'Foto real' : '5 × 5 cm'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
