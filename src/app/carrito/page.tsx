'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Trash2,
  Pencil,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Tag,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatARS } from '@/lib/utils/format';

export default function CarritoPage() {
  const {
    cart,
    settings,
    removeCartItem,
    updateCartItemQuantity,
    clearCart,
    sandboxTestPricesEnabled,
  } = useStore();

  const [discountInput, setDiscountInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    null
  );
  const [selectedShippingId, setSelectedShippingId] = useState<string>(
    settings.shipping_methods[0]?.id || 'ship-pickup-rio-cuarto'
  );
  const [serverValidation, setServerValidation] = useState<{
    valid: boolean;
    error?: string;
    hasUnpricedItems: boolean;
    subtotalArs: number;
    discountArs: number;
    appliedDiscountCode: string | null;
    shippingCostArs: number | null;
    shippingRequiresQuote: boolean;
    totalArs: number;
  } | null>(null);

  useEffect(() => {
    if (cart.length === 0) {
      setServerValidation(null);
      return;
    }

    let cancelled = false;
    async function revalidate() {
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map((c) => ({
              product_id: c.product_id,
              variant_id: c.variant_id,
              quantity: c.quantity,
              design_help_requested: c.design_help_requested,
              customization_summary: c.customization_summary,
              customization_payload: c.customization_payload,
              file_ids: c.file_ids,
            })),
            discountCode: appliedCouponCode,
            deliveryMethodId: selectedShippingId,
          }),
        });
        const data = await res.json();
        if (!cancelled) {
          setServerValidation(data);
        }
      } catch {
        // ignore
      }
    }
    void revalidate();
    return () => {
      cancelled = true;
    };
  }, [cart, appliedCouponCode, selectedShippingId, sandboxTestPricesEnabled]);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF]">
          <ShoppingBag className="h-7 w-7 text-[#1C1917]" />
        </div>
        <h1 className="font-display text-3xl font-medium text-[#1C1917]">
          Tu pedido está vacío
        </h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#57534E] sm:text-sm">
          Todavía no agregaste productos personalizados. Explorá nuestros imanes de 5 × 5 cm, stickers, pines, tarjetas y etiquetas.
        </p>
        <Link
          href="/tienda"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-6 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
        >
          Explorar tienda
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Seguir viendo productos
          </Link>
          <h1 className="font-display mt-1 text-3xl font-medium text-[#1C1917]">
            Tu pedido personalizado
          </h1>
          <p className="mt-1 text-xs text-[#57534E]">
            Revisá las cantidades, fotos y archivos de cada ítem antes de continuar.
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-800 hover:bg-rose-100"
        >
          Vaciar pedido
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Lista de líneas del pedido */}
        <div className="space-y-4 lg:col-span-8">
          {cart.map((item, index) => {
            const lineTotal =
              item.unit_price_ars !== null
                ? item.unit_price_ars * item.quantity +
                  (item.design_help_surcharge_ars || 0)
                : null;

            return (
              <div
                key={item.cart_item_id}
                data-testid={`cart-line-${index}`}
                className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-medium text-[#78716C] uppercase">
                        Ítem #{index + 1} · {item.category_name}
                      </span>
                      {item.requires_design_approval && (
                        <span className="rounded-full bg-[#F4F1EA] px-2.5 py-0.5 text-[10px] font-medium text-[#1C1917]">
                          Incluye muestra digital previa
                        </span>
                      )}
                    </div>

                    <h2 className="font-display mt-2 text-lg font-medium text-[#1C1917]">
                      {item.product_name}
                    </h2>

                    {item.variant_name && (
                      <p className="text-xs text-[#57534E]">
                        Presentación: {item.variant_name}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-display text-lg font-semibold text-[#1C1917]">
                      {lineTotal !== null
                        ? formatARS(lineTotal)
                        : 'Cotización personalizada'}
                    </p>
                    {item.unit_price_ars !== null && (
                      <p className="text-[11px] text-[#78716C]">
                        {formatARS(item.unit_price_ars)} × {item.quantity} u.
                        {item.design_help_surcharge_ars > 0
                          ? ` (+${formatARS(item.design_help_surcharge_ars)} diseño)`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen de personalización y archivos */}
                <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs text-[#57534E]">
                  <p className="font-semibold text-[#1C1917]">
                    Detalle de tu personalización:
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {item.customization_summary}
                  </p>

                  {item.file_ids.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-emerald-800">
                      <FileCheck2 className="h-4 w-4" />
                      <span>
                        {item.file_ids.length}{' '}
                        {item.file_ids.length === 1
                          ? 'archivo adjunto guardado de forma privada'
                          : 'archivos adjuntos guardados de forma privada'}
                      </span>
                    </div>
                  )}

                  {/* Miniaturas de imanes 5x5 */}
                  {item.customization_payload.magnet_photos &&
                    item.customization_payload.magnet_photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.customization_payload.magnet_photos.map((mp) => (
                          <div
                            key={mp.id}
                            className="flex items-center gap-2 rounded-xl border border-[#D6D3D1] bg-[#FFFFFF] p-1.5 pr-3"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={mp.cropped_preview_data_url}
                              alt={mp.filename}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                            <div className="text-[10px]">
                              <p className="max-w-[110px] truncate font-semibold text-[#1C1917]">
                                {mp.filename}
                              </p>
                              <p className="text-[#57534E]">
                                {mp.quantity_assigned} copia(s) · 5×5 cm
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Acciones por línea */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    {item.customization_payload.customizer_type !==
                      'magnets_5x5' && (
                      <div className="inline-flex items-center rounded-xl border border-[#D6D3D1] bg-[#FAF8F5]">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemQuantity(
                              item.cart_item_id,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-[#1C1917]"
                        >
                          -
                        </button>
                        <span className="px-3 text-xs font-semibold text-[#1C1917]">
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
                          className="px-3 py-1.5 text-xs font-semibold text-[#1C1917]"
                        >
                          +
                        </button>
                      </div>
                    )}

                    <Link
                      href={`/tienda/${item.product_slug}?editCartItem=${encodeURIComponent(
                        item.cart_item_id
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-4 py-1.5 text-xs font-medium text-[#1C1917] hover:border-[#1C1917]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar personalización
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCartItem(item.cart_item_id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar ítem
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen del pedido */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
            <h2 className="font-display text-lg font-medium text-[#1C1917]">
              Resumen del pedido
            </h2>

            {/* Cupón de descuento */}
            <div className="mt-5 border-t border-[#E7E5E4] pt-4">
              <label
                htmlFor="coupon-input"
                className="block text-xs font-medium text-[#1C1917]"
              >
                Código de descuento (opcional)
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="coupon-input"
                  type="text"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="Ingresá tu código"
                  className="w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-2 text-xs uppercase text-[#1C1917]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAppliedCouponCode(discountInput.trim() || null)
                  }
                  className="rounded-xl bg-[#1C1917] px-3.5 py-2 text-xs font-medium text-[#FAF8F5]"
                >
                  Aplicar
                </button>
              </div>
              {serverValidation?.appliedDiscountCode && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                  <Tag className="h-3 w-3" />
                  Código {serverValidation.appliedDiscountCode} aplicado (-
                  {formatARS(serverValidation.discountArs)})
                </p>
              )}
            </div>

            {/* Estimador de modalidad de entrega */}
            <div className="mt-4 border-t border-[#E7E5E4] pt-4">
              <label
                htmlFor="shipping-preview-select"
                className="block text-xs font-medium text-[#1C1917]"
              >
                Modalidad de entrega o retiro
              </label>
              <select
                id="shipping-preview-select"
                value={selectedShippingId}
                onChange={(e) => setSelectedShippingId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-2.5 text-xs font-medium text-[#1C1917]"
              >
                {settings.shipping_methods
                  .filter((m) => m.is_enabled)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (
                      {m.requires_quote
                        ? 'A cotizar'
                        : m.price_ars === 0
                        ? 'Sin cargo'
                        : formatARS(m.price_ars)}
                      )
                    </option>
                  ))}
              </select>
            </div>

            {/* Desglose de importes o solicitud de presupuesto */}
            <div className="mt-5 space-y-2.5 border-t border-[#E7E5E4] pt-4 text-xs">
              {serverValidation?.hasUnpricedItems ? (
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-3.5 text-[#57534E]">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1C1917]" />
                    <div>
                      <p className="font-semibold text-[#1C1917]">
                        Solicitud de presupuesto personalizado
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Tu pedido se registrará sin cobro online para que revisemos tus archivos y te confirmemos el importe final y el plazo de producción.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[#57534E]">
                    <span>Subtotal productos:</span>
                    <span className="font-semibold text-[#1C1917]">
                      {formatARS(serverValidation?.subtotalArs ?? 0)}
                    </span>
                  </div>
                  {(serverValidation?.discountArs ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>
                        Descuento ({serverValidation?.appliedDiscountCode}):
                      </span>
                      <span className="font-semibold">
                        -{formatARS(serverValidation?.discountArs ?? 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#57534E]">
                    <span>Entrega:</span>
                    <span className="font-semibold text-[#1C1917]">
                      {serverValidation?.shippingRequiresQuote
                        ? 'A cotizar según destino'
                        : serverValidation?.shippingCostArs === 0
                        ? 'Retiro coordinado ($0)'
                        : formatARS(serverValidation?.shippingCostArs)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#E7E5E4] pt-3 text-base font-semibold text-[#1C1917]">
                    <span>Total:</span>
                    <span data-testid="cart-final-total">
                      {formatARS(serverValidation?.totalArs ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <Link
              href={`/checkout?shipping=${encodeURIComponent(
                selectedShippingId
              )}${
                serverValidation?.appliedDiscountCode
                  ? `&coupon=${encodeURIComponent(
                      serverValidation.appliedDiscountCode
                    )}`
                  : ''
              }`}
              className="mt-6 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
            >
              {serverValidation?.hasUnpricedItems
                ? 'Continuar para solicitar presupuesto'
                : 'Continuar para finalizar compra'}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="mt-4 flex items-center gap-2 text-[11px] text-[#57534E]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                No necesitás crear una cuenta. Recibirás tu número de pedido y un enlace de seguimiento.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
