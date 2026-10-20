'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  ShoppingBag,
  Trash2,
  Pencil,
  ArrowRight,
  FileCheck2,
  Info,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatARS } from '@/lib/utils/format';

export function CartDrawer() {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    removeCartItem,
    updateCartItemQuantity,
  } = useStore();

  React.useEffect(() => {
    if (!isCartDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCartDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartDrawerOpen, setIsCartDrawerOpen]);

  if (!isCartDrawerOpen) return null;

  const hasUnpricedItems = cart.some((item) => item.unit_price_ars === null);
  const subtotalArs = cart.reduce((acc, item) => {
    if (item.unit_price_ars === null) return acc;
    return (
      acc +
      item.unit_price_ars * item.quantity +
      (item.design_help_surcharge_ars || 0)
    );
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1C1917]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Tu pedido personalizado"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCartDrawerOpen(false);
      }}
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-[#E7E5E4] bg-[#FAF8F5] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E5E4] bg-[#FFFFFF] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#1C1917]" />
            <h2 className="font-display text-base font-medium text-[#1C1917]">
              Tu pedido ({cart.length} {cart.length === 1 ? 'ítem' : 'ítems'})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(false)}
            aria-label="Cerrar carrito"
            className="rounded-lg p-2 text-[#57534E] hover:bg-[#F4F1EA] hover:text-[#1C1917]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]">
                <ShoppingBag className="h-6 w-6 text-[#78716C]" />
              </div>
              <p className="font-display text-lg font-medium text-[#1C1917]">
                Todavía no agregaste productos
              </p>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[#57534E]">
                Elegí imanes 5 × 5 cm con tus fotos, stickers, pines, tarjetas o etiquetas personalizadas.
              </p>
              <Link
                href="/tienda"
                onClick={() => setIsCartDrawerOpen(false)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
              >
                Explorar productos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                const lineSubtotal =
                  item.unit_price_ars !== null
                    ? item.unit_price_ars * item.quantity +
                      (item.design_help_surcharge_ars || 0)
                    : null;

                return (
                  <div
                    key={item.cart_item_id}
                    className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-medium tracking-wider text-[#78716C] uppercase">
                          {item.category_name}
                        </span>
                        <h3 className="text-sm font-semibold text-[#1C1917]">
                          {item.product_name}
                        </h3>
                        {item.variant_name && (
                          <p className="text-xs text-[#57534E]">
                            Presentación: {item.variant_name}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.cart_item_id)}
                        aria-label={`Quitar ${item.product_name} del pedido`}
                        className="rounded-lg p-1.5 text-[#78716C] hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Resumen de personalización y archivos */}
                    <div className="mt-2.5 rounded-xl bg-[#FAF8F5] p-2.5 text-xs text-[#57534E]">
                      <p className="text-[11px] leading-relaxed text-[#1C1917]">
                        {item.customization_summary}
                      </p>
                      {item.file_ids.length > 0 && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                          <FileCheck2 className="h-3.5 w-3.5" />
                          {item.file_ids.length}{' '}
                          {item.file_ids.length === 1
                            ? 'archivo adjunto'
                            : 'archivos adjuntos'}
                        </p>
                      )}
                    </div>

                    {/* Miniaturas si son imanes 5x5 */}
                    {item.customization_payload.magnet_photos &&
                      item.customization_payload.magnet_photos.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {item.customization_payload.magnet_photos.map((mp) => (
                            <div
                              key={mp.id}
                              className="relative h-10 w-10 overflow-hidden rounded-md border border-[#D6D3D1]"
                              title={`${mp.filename} (${mp.quantity_assigned} copias)`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={mp.cropped_preview_data_url}
                                alt={mp.filename}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute right-0 bottom-0 bg-[#1C1917]/85 px-1 text-[9px] font-semibold text-[#FAF8F5]">
                                ×{mp.quantity_assigned}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Acciones y estado de importe */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E5E4] pt-3">
                      <div className="flex items-center gap-2">
                        {item.customization_payload.customizer_type !==
                          'magnets_5x5' && (
                          <div className="inline-flex items-center rounded-lg border border-[#D6D3D1] bg-[#FAF8F5]">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQuantity(
                                  item.cart_item_id,
                                  Math.max(1, item.quantity - 1)
                                )
                              }
                              aria-label="Disminuir cantidad"
                              className="px-2.5 py-1 text-xs font-semibold text-[#1C1917]"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-semibold text-[#1C1917]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQuantity(
                                  item.cart_item_id,
                                  item.quantity + 1
                                )
                              }
                              aria-label="Aumentar cantidad"
                              className="px-2.5 py-1 text-xs font-semibold text-[#1C1917]"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <Link
                          href={`/tienda/${item.product_slug}?editCartItem=${encodeURIComponent(
                            item.cart_item_id
                          )}`}
                          onClick={() => setIsCartDrawerOpen(false)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D6D3D1] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-medium text-[#1C1917] hover:border-[#1C1917]"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Link>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-semibold text-[#1C1917]">
                          {lineSubtotal !== null
                            ? formatARS(lineSubtotal)
                            : 'Cotización personalizada'}
                        </p>
                        {item.unit_price_ars !== null && (
                          <p className="text-[10px] text-[#78716C]">
                            {formatARS(item.unit_price_ars)} c/u × {item.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-[#E7E5E4] bg-[#FFFFFF] p-5">
            {hasUnpricedItems ? (
              <div className="mb-3.5 flex items-start gap-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-3 text-xs text-[#57534E]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1C1917]" />
                <span>
                  Enviaremos tu pedido como <strong className="font-semibold text-[#1C1917]">Solicitud de Presupuesto</strong> con tus archivos e indicaciones para confirmarte el importe final.
                </span>
              </div>
            ) : (
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-xs font-medium text-[#57534E]">
                  Subtotal estimado (sin envío):
                </span>
                <span className="font-display text-lg font-semibold text-[#1C1917]">
                  {formatARS(subtotalArs)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/carrito"
                onClick={() => setIsCartDrawerOpen(false)}
                className="flex min-h-[44px] items-center justify-center rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
              >
                Ver detalle
              </Link>
              <Link
                href="/checkout"
                onClick={() => setIsCartDrawerOpen(false)}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
              >
                {hasUnpricedItems ? 'Solicitar presupuesto' : 'Iniciar compra'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
