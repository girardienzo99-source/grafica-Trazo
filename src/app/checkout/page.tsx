'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  CreditCard,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatARS } from '@/lib/utils/format';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    cart,
    settings,
    ownerSessionToken,
    clearCart,
    registerSavedOrderLink,
    sandboxTestPricesEnabled,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [deliveryMethodId, setDeliveryMethodId] = useState<string>(
    searchParams.get('shipping') ||
      settings.shipping_methods[0]?.id ||
      'ship-pickup-rio-cuarto'
  );

  // Dirección de envío cuando corresponda
  const [streetAndNumber, setStreetAndNumber] = useState('');
  const [apartmentOrRef, setApartmentOrRef] = useState('');
  const [locality, setLocality] = useState('');
  const [province, setProvince] = useState('Córdoba');
  const [postalCode, setPostalCode] = useState('');

  // Datos de facturación solo cuando sean necesarios
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [taxIdOrDni, setTaxIdOrDni] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [taxCondition, setTaxCondition] = useState('Consumidor Final');

  const [customerNotes, setCustomerNotes] = useState('');
  const [discountCode, setDiscountCode] = useState(
    searchParams.get('coupon') || ''
  );

  const [paymentMethod, setPaymentMethod] = useState<
    'mercadopago' | 'bank_transfer'
  >('mercadopago');

  const [serverSummary, setServerSummary] = useState<{
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedDelivery =
    settings.shipping_methods.find((m) => m.id === deliveryMethodId) ||
    settings.shipping_methods[0];

  useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;
    async function validateOnServer() {
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
            discountCode: discountCode.trim() || null,
            deliveryMethodId,
          }),
        });
        const data = await res.json();
        if (!cancelled) {
          setServerSummary(data);
        }
      } catch {
        // ignore
      }
    }
    void validateOnServer();
    return () => {
      cancelled = true;
    };
  }, [cart, discountCode, deliveryMethodId, sandboxTestPricesEnabled]);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-medium text-[#1C1917]">
          No hay productos en tu pedido para finalizar
        </h1>
        <Link
          href="/tienda"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5]"
        >
          Ir a la tienda
        </Link>
      </div>
    );
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const effectivePaymentMethod = serverSummary?.hasUnpricedItems
        ? 'quote_only'
        : paymentMethod;

      const res = await fetch('/api/orders', {
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
          customerName,
          customerEmail,
          customerPhone,
          deliveryMethodId,
          shippingAddress: selectedDelivery?.requires_shipping_address
            ? {
                street_and_number: streetAndNumber,
                apartment_or_ref: apartmentOrRef,
                locality,
                province,
                postal_code: postalCode,
              }
            : null,
          billingInfo: needsInvoice
            ? {
                needs_invoice: true,
                tax_id_or_dni: taxIdOrDni,
                business_name: businessName,
                tax_condition: taxCondition,
              }
            : { needs_invoice: false },
          customerNotes,
          discountCode: discountCode.trim() || null,
          paymentMethod: effectivePaymentMethod,
          ownerSessionToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.order) {
        setSubmitError(
          data.error ||
            'No se pudo registrar el pedido. Revisá los datos ingresados.'
        );
        setIsSubmitting(false);
        return;
      }

      registerSavedOrderLink({
        orderNumber: data.order.order_number,
        accessToken: data.order.access_token,
        accessCode: data.order.access_code,
        createdAt: data.order.created_at,
        totalArs: data.order.total_ars,
      });

      clearCart();
      router.push(`/pedidos/${data.order.access_token}?newlyCreated=1`);
    } catch {
      setSubmitError('Error de conexión al procesar tu pedido.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        href="/carrito"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a mi pedido
      </Link>

      <h1 className="font-display mt-2 text-3xl font-medium text-[#1C1917]">
        {serverSummary?.hasUnpricedItems
          ? 'Confirmar solicitud de presupuesto'
          : 'Finalizar compra'}
      </h1>
      <p className="mt-1 text-xs text-[#57534E]">
        No necesitás crear una cuenta. Al confirmar recibirás tu número de pedido y un enlace de seguimiento para consultar el estado y revisar tu muestra digital.
      </p>

      {sandboxTestPricesEnabled && (
        <div
          role="status"
          data-testid="checkout-sandbox-banner"
          className="mt-5 rounded-2xl border border-[#D6D3D1] bg-[#F4F1EA] p-4 text-xs text-[#1C1917]"
        >
          <p className="font-semibold">
            Modo de prueba activo desde Administración
          </p>
          <p className="mt-0.5 text-[11px] text-[#57534E]">
            Este pedido se registrará como orden de prueba (`[PEDIDO DE PRUEBA SANDBOX]`) con tarifas técnicas de demostración.
          </p>
        </div>
      )}

      <form
        onSubmit={handleCheckoutSubmit}
        className="mt-8 grid gap-8 lg:grid-cols-12"
      >
        {/* Columna izquierda: Datos del cliente, entrega y pago */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Datos de contacto */}
          <section className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
            <h2 className="font-display text-base font-medium text-[#1C1917]">
              1. Tus datos de contacto
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="checkout-name"
                  className="block text-xs font-medium text-[#1C1917]"
                >
                  Nombre y apellido *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Valentina Gómez"
                  className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                />
              </div>

              <div>
                <label
                  htmlFor="checkout-email"
                  className="block text-xs font-medium text-[#1C1917]"
                >
                  Correo electrónico *
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                />
              </div>

              <div>
                <label
                  htmlFor="checkout-phone"
                  className="block text-xs font-medium text-[#1C1917]"
                >
                  Teléfono / WhatsApp *
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+54 9 358 ..."
                  className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                />
              </div>
            </div>
          </section>

          {/* 2. Modalidad de entrega */}
          <section className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#57534E]" />
              <h2 className="font-display text-base font-medium text-[#1C1917]">
                2. Modalidad de entrega
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              {settings.shipping_methods
                .filter((m) => m.is_enabled)
                .map((method) => {
                  const selected = method.id === deliveryMethodId;
                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 transition ${
                        selected
                          ? 'border-[#1C1917] bg-[#FAF8F5]'
                          : 'border-[#E7E5E4] bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          checked={selected}
                          onChange={() => setDeliveryMethodId(method.id)}
                          className="mt-1 h-4 w-4 accent-[#1C1917]"
                        />
                        <div className="text-xs">
                          <p className="font-semibold text-[#1C1917]">
                            {method.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#57534E]">
                            {method.description}
                          </p>
                          {method.estimated_transit_text && (
                            <p className="mt-1 text-[10px] text-[#78716C]">
                              Transporte: {method.estimated_transit_text}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1 text-xs font-medium text-[#1C1917]">
                        {method.requires_quote
                          ? 'A cotizar'
                          : method.price_ars === 0
                          ? 'Retiro coordinado'
                          : formatARS(method.price_ars)}
                      </span>
                    </label>
                  );
                })}
            </div>

            <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs text-[#57534E]">
              <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
                <Clock className="h-4 w-4 text-[#57534E]" />
                <span>Plazos de producción y de envío</span>
              </div>
              <p className="mt-1 leading-relaxed">
                El tiempo de producción comienza una vez confirmado tu pedido y aprobada la muestra digital (cuando aplica). El plazo del correo corre por separado a partir del despacho.
              </p>
            </div>

            {/* Dirección postal cuando corresponda */}
            {selectedDelivery?.requires_shipping_address && (
              <div className="mt-5 grid gap-4 border-t border-[#E7E5E4] pt-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="shipping-street"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Calle y altura *
                  </label>
                  <input
                    id="shipping-street"
                    type="text"
                    required
                    value={streetAndNumber}
                    onChange={(e) => setStreetAndNumber(e.target.value)}
                    placeholder="Ej: San Martín 450"
                    className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-apt"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Piso / Depto / Referencia (opcional)
                  </label>
                  <input
                    id="shipping-apt"
                    type="text"
                    value={apartmentOrRef}
                    onChange={(e) => setApartmentOrRef(e.target.value)}
                    placeholder="Ej: Piso 2 B"
                    className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-locality"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Localidad *
                  </label>
                  <input
                    id="shipping-locality"
                    type="text"
                    required
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="Ej: Río Cuarto / Córdoba Capital / Rosario"
                    className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-province"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Provincia *
                  </label>
                  <input
                    id="shipping-province"
                    type="text"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-cp"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Código Postal *
                  </label>
                  <input
                    id="shipping-cp"
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Ej: 5800"
                    className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* 3. Medio de Pago */}
          <section className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
            <h2 className="font-display text-base font-medium text-[#1C1917]">
              3. Modalidad de pago o cotización
            </h2>

            {serverSummary?.hasUnpricedItems ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs text-[#57534E]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1C1917]" />
                <div>
                  <p className="font-semibold text-[#1C1917]">
                    Solicitud de presupuesto sin cobro inmediato
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Tu pedido incluye productos con cotización personalizada. Al confirmar, guardaremos tus archivos y opciones para enviarte el presupuesto final y los medios de pago.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    paymentMethod === 'mercadopago'
                      ? 'border-[#1C1917] bg-[#FAF8F5]'
                      : 'border-[#E7E5E4] bg-[#FFFFFF]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'mercadopago'}
                    onChange={() => setPaymentMethod('mercadopago')}
                    className="mt-1 h-4 w-4 accent-[#1C1917]"
                  />
                  <div className="text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
                      <CreditCard className="h-4 w-4 text-[#57534E]" />
                      <span>Mercado Pago</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#57534E]">
                      Aboná con tarjeta, dinero en cuenta o medios habilitados en Mercado Pago.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#1C1917] bg-[#FAF8F5]'
                      : 'border-[#E7E5E4] bg-[#FFFFFF]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="mt-1 h-4 w-4 accent-[#1C1917]"
                  />
                  <div className="text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
                      <Building2 className="h-4 w-4 text-[#57534E]" />
                      <span>Transferencia bancaria</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#57534E]">
                      Al confirmar el pedido verás los datos para transferir y podrás adjuntar tu comprobante desde tu enlace de seguimiento.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </section>

          {/* 4. Observaciones y Datos de Facturación */}
          <section className="space-y-4 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
            <div>
              <label
                htmlFor="checkout-notes"
                className="block text-xs font-medium text-[#1C1917]"
              >
                Observaciones sobre tu pedido o entrega (opcional)
              </label>
              <textarea
                id="checkout-notes"
                rows={2}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Indicaciones adicionales sobre horarios o fecha ideal..."
                className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
              />
            </div>

            <div className="border-t border-[#E7E5E4] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-medium text-[#1C1917]">
                <input
                  type="checkbox"
                  checked={needsInvoice}
                  onChange={(e) => setNeedsInvoice(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#1C1917]"
                />
                Necesito cargar datos específicos de facturación (CUIT / DNI / Razón Social)
              </label>

              {needsInvoice && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#1C1917]">
                      CUIT o DNI *
                    </label>
                    <input
                      type="text"
                      required={needsInvoice}
                      value={taxIdOrDni}
                      onChange={(e) => setTaxIdOrDni(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#1C1917]">
                      Nombre o Razón Social *
                    </label>
                    <input
                      type="text"
                      required={needsInvoice}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#1C1917]">
                      Condición frente al IVA
                    </label>
                    <select
                      value={taxCondition}
                      onChange={(e) => setTaxCondition(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1917]"
                    >
                      <option value="Consumidor Final">Consumidor Final</option>
                      <option value="Monotributista">Monotributista</option>
                      <option value="Responsable Inscripto">
                        Responsable Inscripto
                      </option>
                      <option value="Exento">Exento</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Columna derecha: Resumen final */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
            <h2 className="font-display text-lg font-medium text-[#1C1917]">
              Resumen de tu pedido
            </h2>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-3.5 text-xs"
                >
                  <div className="flex justify-between gap-2 font-semibold text-[#1C1917]">
                    <span>
                      {item.quantity}× {item.product_name}
                    </span>
                    <span>
                      {item.unit_price_ars !== null
                        ? formatARS(
                            item.unit_price_ars * item.quantity +
                              (item.design_help_surcharge_ars || 0)
                          )
                        : 'Cotización personalizada'}
                    </span>
                  </div>
                  {item.variant_name && (
                    <p className="text-[11px] text-[#57534E]">
                      {item.variant_name}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-[#57534E]">
                    {item.customization_summary}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-[#E7E5E4] pt-4 text-xs">
              {!serverSummary?.hasUnpricedItems && (
                <>
                  <div className="flex justify-between text-[#57534E]">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-[#1C1917]">
                      {formatARS(serverSummary?.subtotalArs ?? 0)}
                    </span>
                  </div>
                  {(serverSummary?.discountArs ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Descuento ({discountCode.toUpperCase()}):</span>
                      <span className="font-semibold">
                        -{formatARS(serverSummary?.discountArs ?? 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#57534E]">
                    <span>Entrega ({selectedDelivery?.name}):</span>
                    <span className="font-semibold text-[#1C1917]">
                      {serverSummary?.shippingRequiresQuote
                        ? 'A cotizar'
                        : formatARS(serverSummary?.shippingCostArs ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#E7E5E4] pt-3 text-lg font-semibold text-[#1C1917]">
                    <span>Total a pagar:</span>
                    <span data-testid="checkout-total-ars">
                      {formatARS(serverSummary?.totalArs ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {submitError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-medium text-rose-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="confirm-order-button"
              disabled={isSubmitting}
              className="mt-6 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting
                ? 'Registrando tu pedido...'
                : serverSummary?.hasUnpricedItems
                ? 'Confirmar y solicitar presupuesto'
                : paymentMethod === 'mercadopago'
                ? 'Confirmar pedido y continuar a Mercado Pago'
                : 'Confirmar pedido con transferencia bancaria'}
            </button>

            <div className="mt-4 flex items-start gap-2 text-[11px] text-[#57534E]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                Conservamos el detalle de tu personalización y archivos adjuntos junto con tu pedido.
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm font-medium text-[#57534E]">
          Cargando checkout...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
