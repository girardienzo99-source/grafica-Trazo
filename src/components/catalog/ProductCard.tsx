'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileCheck2 } from 'lucide-react';
import { Product } from '@/types/trazo';
import { useStore } from '@/context/StoreContext';
import {
  formatARS,
  resolveEffectiveProductPrice,
} from '@/lib/utils/format';
import { ProductCraftVisual } from '@/components/visuals/ProductCraftVisual';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  priority?: boolean;
}

export function ProductCard({
  product,
  categoryName,
  priority = false,
}: ProductCardProps) {
  const { sandboxTestPricesEnabled } = useStore();
  const primaryImage = product.images[0];
  const defaultVariant = product.variants.find((v) => v.is_enabled) || null;

  const { unitPriceArs } = resolveEffectiveProductPrice(
    product,
    defaultVariant,
    sandboxTestPricesEnabled
  );

  const isEventStand = product.customizer_type === 'event_stand';
  const targetHref = isEventStand ? '/eventos' : `/tienda/${product.slug}`;

  return (
    <article className="sticker-card group flex h-full flex-col justify-between overflow-hidden rounded-2xl">
      <div>
        <Link href={targetHref} className="block overflow-hidden">
          <ProductCraftVisual
            variant={primaryImage?.illustration_variant || 'stickers'}
            imageUrl={primaryImage?.url}
            isAuthorizedRealPhoto={primaryImage?.is_real_authorized_photo}
            alt={primaryImage?.alt || product.name}
            priority={priority}
            className="h-60 w-full border-b border-[#E7E5E4]"
          />
        </Link>

        <div className="p-5">
          {categoryName && (
            <span className="inline-block text-[11px] font-medium tracking-[0.06em] text-[#78716C] uppercase">
              {categoryName}
            </span>
          )}

          <h3 className="font-display mt-1.5 text-lg font-medium leading-snug text-[#1C1917] transition-colors group-hover:text-[#57534E]">
            <Link href={targetHref}>{product.name}</Link>
          </h3>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#57534E]">
            {product.short_description}
          </p>

          {/* Atributos comerciales confirmados */}
          {(product.confirmed_dimensions ||
            product.confirmed_material ||
            product.customization_config.requires_design_approval) && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {product.confirmed_dimensions && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-[#FAF8F5] px-2 py-0.5 text-[11px] font-medium text-[#1C1917]">
                  <CheckCircle2 className="h-3 w-3 text-[#57534E]" />
                  {product.confirmed_dimensions}
                </span>
              )}
              {product.confirmed_material && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-[#FAF8F5] px-2 py-0.5 text-[11px] font-medium text-[#1C1917]">
                  {product.confirmed_material}
                </span>
              )}
              {product.customization_config.requires_design_approval && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-[#FAF8F5] px-2 py-0.5 text-[11px] text-[#57534E]">
                  <FileCheck2 className="h-3 w-3 text-[#78716C]" />
                  Muestra digital previa
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pie limpio: un único estado comercial y un único botón claro */}
      <div className="border-t border-[#E7E5E4] bg-[#FAF8F5]/70 px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            {unitPriceArs !== null ? (
              <div>
                <span className="font-display text-lg font-semibold text-[#1C1917]">
                  {formatARS(unitPriceArs)}
                </span>
                {defaultVariant && (
                  <span className="block text-[11px] text-[#78716C]">
                    {defaultVariant.name}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-medium text-[#57534E]">
                Cotización personalizada
              </span>
            )}
          </div>

          <Link
            href={targetHref}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FAF8F5] transition group-hover:bg-[#292524]"
          >
            <span>
              {isEventStand
                ? 'Consultar fecha'
                : unitPriceArs !== null
                ? 'Personalizar'
                : 'Solicitar presupuesto'}
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
