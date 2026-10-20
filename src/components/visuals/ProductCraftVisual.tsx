'use client';

import React from 'react';
import {
  Sparkles,
  Scissors,
  Layers,
  Tag,
  Heart,
  Gift,
  Ruler,
} from 'lucide-react';

interface ProductCraftVisualProps {
  variant: string;
  imageUrl?: string | null;
  isAuthorizedRealPhoto?: boolean;
  alt: string;
  caption?: string;
  className?: string;
  showEditableBadge?: boolean;
  priority?: boolean;
}

/**
 * Componente visual honesto y consistente:
 * - Si el producto cuenta con fotografía real del negocio (`isAuthorizedRealPhoto` y URL jpg/png/webp),
 *   muestra la fotografía real con proporción e iluminación uniforme.
 * - Si aún no tiene fotografía real subida, muestra un esquema gráfico limpio y discreto
 *   sin presentar ilustraciones como fotos reales ni exponer mensajes internos de administración.
 */
export function ProductCraftVisual({
  variant,
  imageUrl,
  isAuthorizedRealPhoto = false,
  alt,
  caption,
  className = '',
  priority = false,
}: ProductCraftVisualProps) {
  const hasRealRasterPhoto =
    Boolean(imageUrl) &&
    (isAuthorizedRealPhoto || !imageUrl?.toLowerCase().endsWith('.svg'));

  if (hasRealRasterPhoto && imageUrl) {
    return (
      <div
        className={`group/img relative overflow-hidden bg-[#F4F1EA] ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          width={720}
          height={540}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover/img:scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative flex flex-col justify-between overflow-hidden bg-[#F4F1EA] p-5 select-none ${className}`}
    >
      <div className="relative z-10 flex items-center justify-end">
        <span className="rounded-full border border-[#D6D3D1] bg-[#FAF8F5]/90 px-2.5 py-0.5 text-[10px] font-medium text-[#57534E]">
          Esquema orientativo
        </span>
      </div>

      <div className="relative z-10 my-auto flex items-center justify-center py-2">
        {(variant === 'magnets_grid_5x5' ||
          variant === 'magnets_detail_scale' ||
          variant === 'magnets') && (
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#D6D3D1] bg-[#FFFFFF] p-3 shadow-2xs">
              {[
                { label: '5 × 5 cm', sub: 'Familia' },
                { label: '5 × 5 cm', sub: 'Viajes' },
                { label: '5 × 5 cm', sub: 'Recuerdos' },
                { label: '5 × 5 cm', sub: 'Regalos' },
              ].map((cell, i) => (
                <div
                  key={i}
                  className="flex h-15 w-15 flex-col items-center justify-center rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-1.5 text-center"
                >
                  <Heart className="mb-0.5 h-3.5 w-3.5 text-[#44403C]" />
                  <span className="text-[10px] font-semibold text-[#1C1917]">
                    {cell.label}
                  </span>
                  <span className="text-[8px] text-[#57534E]">{cell.sub}</span>
                </div>
              ))}
            </div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1C1917] px-2.5 py-0.5 text-[10px] font-medium text-[#FAF8F5]">
              <Ruler className="h-3 w-3" />
              Formato cuadrado 5 × 5 cm
            </span>
          </div>
        )}

        {(variant === 'sticker_sheet' || variant === 'stickers') && (
          <div className="w-44 rounded-2xl border border-[#D6D3D1] bg-[#FFFFFF] p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between border-b border-dashed border-[#D6D3D1] pb-1.5">
              <span className="text-[9px] font-medium tracking-wider text-[#57534E] uppercase">
                Plancha troquelada
              </span>
              <Scissors className="h-3.5 w-3.5 text-[#57534E]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[#A8A29E] bg-[#FAF8F5] text-[8px] font-medium text-[#44403C]"
                >
                  Logo
                </div>
              ))}
            </div>
          </div>
        )}

        {(variant === 'custom_pins' || variant === 'pins') && (
          <div className="flex items-center gap-3">
            <div className="flex h-22 w-22 flex-col items-center justify-center rounded-full border-2 border-[#1C1917] bg-[#FFFFFF] text-center shadow-2xs">
              <Sparkles className="mb-1 h-4 w-4 text-[#44403C]" />
              <span className="text-[10px] font-semibold text-[#1C1917]">
                Pines
              </span>
              <span className="text-[8px] text-[#57534E]">A medida</span>
            </div>
          </div>
        )}

        {(variant === 'clothing_hang_tags' || variant === 'tags_packaging') && (
          <div className="flex items-center gap-3">
            <div className="flex h-32 w-24 flex-col items-center justify-between rounded-t-2xl rounded-b-xl border border-[#D6D3D1] bg-[#FFFFFF] p-3 shadow-2xs">
              <div className="h-3 w-3 rounded-full border border-[#A8A29E] bg-[#F4F1EA]" />
              <div className="text-center">
                <Tag className="mx-auto mb-1 h-4 w-4 text-[#1C1917]" />
                <p className="text-[10px] font-semibold text-[#1C1917]">
                  Cartulina
                </p>
                <p className="text-[8px] text-[#57534E]">Corte y perforación</p>
              </div>
              <div className="w-full border-t border-dashed border-[#D6D3D1] pt-1 text-center text-[8px] font-medium text-[#57534E]">
                Indumentaria
              </div>
            </div>
          </div>
        )}

        {(variant === 'business_cards' ||
          variant === 'packaging_cards' ||
          variant === 'event_cards' ||
          variant === 'cards') && (
          <div className="w-48 rounded-2xl border border-[#D6D3D1] bg-[#FFFFFF] p-4 shadow-2xs">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-medium tracking-wider text-[#57534E] uppercase">
                Tarjetería a medida
              </span>
              <Heart className="h-3.5 w-3.5 text-[#57534E]" />
            </div>
            <p className="font-display text-xs font-medium text-[#1C1917]">
              Gracias por tu compra
            </p>
            <p className="mt-1 text-[10px] text-[#57534E]">
              Packaging, presentación y eventos
            </p>
          </div>
        )}

        {(variant === 'entrepreneur_kit' || variant === 'entrepreneur_kits') && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#D6D3D1] bg-[#FFFFFF] p-4 shadow-2xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E7E5E4] bg-[#FAF8F5]">
              <Layers className="h-5 w-5 text-[#1C1917]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1C1917]">
                Kit Emprendedor
              </p>
              <p className="text-[10px] text-[#57534E]">
                Stickers · Etiquetas · Tarjetas
              </p>
            </div>
          </div>
        )}

        {(variant === 'gift_boxes' || variant === 'gifts_boxes') && (
          <div className="flex flex-col items-center rounded-2xl border border-[#D6D3D1] bg-[#FFFFFF] px-5 py-3.5 text-center shadow-2xs">
            <Gift className="mb-1 h-5 w-5 text-[#44403C]" />
            <p className="text-xs font-semibold text-[#1C1917]">
              Box de regalo personalizada
            </p>
            <p className="mt-0.5 text-[10px] text-[#57534E]">
              Imanes 5 × 5 cm + tarjeta y detalles
            </p>
          </div>
        )}

        {variant === 'tattoo_stand' && (
          <div className="rounded-2xl border border-[#1C1917] bg-[#1C1917] px-5 py-3.5 text-center text-[#FAF8F5] shadow-2xs">
            <Sparkles className="mx-auto mb-1 h-5 w-5 text-[#D6D3D1]" />
            <p className="text-[10px] font-medium tracking-wider text-[#D6D3D1] uppercase">
              Experiencia para eventos
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[#FAF8F5]">
              Stand de tatuajes temporales
            </p>
          </div>
        )}
      </div>

      {caption && (
        <p className="relative z-10 line-clamp-1 text-center text-[11px] text-[#57534E]">
          {caption}
        </p>
      )}
    </div>
  );
}
