'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  Upload,
  FileCheck2,
  AlertTriangle,
  MessageCircle,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Order } from '@/types/trazo';
import {
  buildSafeWhatsAppUrl,
  formatARS,
  formatDateTimeAR,
  PAYMENT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
} from '@/lib/utils/format';

interface SignedFileView {
  id: string;
  original_filename: string;
  mime_type: string;
  width_px: number | null;
  height_px: number | null;
  low_resolution_warning: boolean;
  signed_url: string;
}

function OrderDetailContent() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const mpReturnParam = searchParams.get('mp_return');

  const [order, setOrder] = useState<Order | null>(null);
  const [signedFilesMap, setSignedFilesMap] = useState<
    Record<string, SignedFileView>
  >({});
  const [bankTransferConfig, setBankTransferConfig] = useState<{
    is_configured: boolean;
    bank_name: string | null;
    account_holder: string | null;
    cbu_or_cvu: string | null;
    alias: string | null;
    cuit: string | null;
    instructions: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Mercado Pago preference & sandbox webhook state
  const [mpPreferenceData, setMpPreferenceData] = useState<{
    credentialsConfigured: boolean;
    message?: string;
    initPoint?: string;
    sandboxTestHelper?: {
      available: boolean;
      paymentId: string;
      requestId: string;
      xSignature: string;
      amountArs: number;
      currency: string;
      externalReference: string;
    };
  } | null>(null);
  const [mpActionFeedback, setMpActionFeedback] = useState<string | null>(null);
  const [mpLoading, setMpLoading] = useState(false);

  // Bank transfer receipt upload state
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);

  // Design revision approval state
  const [customerFeedbackText, setCustomerFeedbackText] = useState('');
  const [designActionFeedback, setDesignActionFeedback] = useState<
    string | null
  >(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(params.token)}`,
        {
          cache: 'no-store',
        }
      );
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(
          data.error ||
            'No se pudo cargar el pedido. Verificá que el enlace de seguimiento esté completo.'
        );
        setLoading(false);
        return;
      }
      setOrder(data.order);
      setSignedFilesMap(data.signedFilesMap || {});
      setBankTransferConfig(data.bankTransferConfig || null);
      setLoading(false);
    } catch {
      setError('Error al conectar con el servidor.');
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const handleInitMercadoPago = async () => {
    if (!order) return;
    setMpLoading(true);
    setMpActionFeedback(null);
    try {
      const res = await fetch('/api/payments/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: order.access_token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMpActionFeedback(
          data.error || 'No se pudo inicializar Mercado Pago.'
        );
      } else {
        setMpPreferenceData(data);
        if (data.credentialsConfigured && data.initPoint) {
          window.open(data.initPoint, '_blank', 'noopener,noreferrer');
        }
      }
    } catch {
      setMpActionFeedback('Error al consultar preferencia de Mercado Pago.');
    } finally {
      setMpLoading(false);
    }
  };

  const handleTriggerSignedSandboxWebhook = async (isDuplicateTest = false) => {
    if (!order || !mpPreferenceData?.sandboxTestHelper) return;
    setMpLoading(true);
    try {
      const helper = mpPreferenceData.sandboxTestHelper;
      const res = await fetch(
        `/api/payments/mercadopago/webhook?data.id=${encodeURIComponent(
          helper.paymentId
        )}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': helper.xSignature,
            'x-request-id': helper.requestId,
          },
          body: JSON.stringify({
            data: { id: helper.paymentId },
            sandbox_simulation: true,
            external_reference: helper.externalReference,
            transaction_amount: helper.amountArs,
            currency_id: helper.currency,
            status: 'approved',
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        if (data.deduplicated) {
          setMpActionFeedback(
            `✓ Idempotencia comprobada: La notificación duplicada (${helper.paymentId}) fue detectada e ignorada sin duplicar cobros ni registros (Pagos registrados: ${data.paymentsCount}).`
          );
        } else {
          setMpActionFeedback(
            `✓ Pago confirmado en servidor vía Webhook firmado (${helper.paymentId})${
              isDuplicateTest
                ? ''
                : '. Podés presionar "Enviar notificación duplicada" para verificar la idempotencia.'
            }`
          );
        }
        await fetchOrder();
      } else {
        setMpActionFeedback(data.error || 'Error en el webhook.');
      }
    } catch {
      setMpActionFeedback('Error al disparar el webhook de prueba.');
    } finally {
      setMpLoading(false);
    }
  };

  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    setUploadingReceipt(true);
    setReceiptFeedback(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('owner_token', order.owner_session_token);
      form.append('purpose', 'transfer_receipt');

      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        body: form,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.file) {
        setReceiptFeedback(
          uploadData.error || 'No se pudo subir el comprobante.'
        );
        setUploadingReceipt(false);
        return;
      }

      const attachRes = await fetch(
        `/api/orders/${encodeURIComponent(order.access_token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'attach_transfer_receipt',
            fileId: uploadData.file.id,
          }),
        }
      );
      const attachData = await attachRes.json();
      if (attachRes.ok) {
        setReceiptFeedback(attachData.message);
        await fetchOrder();
      } else {
        setReceiptFeedback(
          attachData.error || 'No se pudo vincular el comprobante.'
        );
      }
    } catch {
      setReceiptFeedback('Error al cargar el comprobante.');
    } finally {
      setUploadingReceipt(false);
      e.target.value = '';
    }
  };

  const handleDesignDecision = async (
    revisionId: string,
    decision: 'approve' | 'request_changes'
  ) => {
    if (!order) return;
    setDesignActionFeedback(null);

    const res = await fetch(
      `/api/orders/${encodeURIComponent(order.access_token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'design_decision',
          revisionId,
          decision,
          feedback: customerFeedbackText,
        }),
      }
    );
    const data = await res.json();
    if (res.ok) {
      setDesignActionFeedback(data.message);
      setCustomerFeedbackText('');
      await fetchOrder();
    } else {
      setDesignActionFeedback(
        data.error || 'No se pudo registrar tu decisión.'
      );
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm font-medium text-[#57534E]">
        Cargando el estado de tu pedido...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-800">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-medium text-[#1C1917]">
          No pudimos encontrar el pedido
        </h1>
        <p className="mt-2 text-xs text-[#57534E]">
          {error ||
            'Verificá que el enlace de seguimiento esté completo o ingresá con tus datos de verificación.'}
        </p>
        <Link
          href="/pedidos/seguimiento"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-6 py-3 text-xs font-medium text-[#FAF8F5]"
        >
          Ir a Seguimiento de pedido
        </Link>
      </div>
    );
  }

  const paymentBadge = PAYMENT_STATUS_LABELS[order.payment_status];
  const productionBadge = PRODUCTION_STATUS_LABELS[order.production_status];

  const handleCopySecureLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Estado de las 4 etapas principales para la línea de tiempo del cliente
  const timelineStages = [
    {
      title: '1. Pago / Cotización',
      subtitle: paymentBadge.label,
      done: order.payment_status === 'paid',
      active: order.payment_status !== 'paid',
    },
    {
      title: '2. Diseño y muestra',
      subtitle: order.requires_design_approval
        ? order.design_approved_at
          ? 'Muestra aprobada'
          : order.design_revisions.length > 0
          ? 'Muestra lista para revisar'
          : 'En preparación'
        : 'Archivos recibidos',
      done: order.requires_design_approval
        ? Boolean(order.design_approved_at)
        : true,
      active:
        order.requires_design_approval &&
        !order.design_approved_at &&
        order.design_revisions.length > 0,
    },
    {
      title: '3. Producción en taller',
      subtitle:
        order.production_status === 'en_produccion'
          ? 'En producción'
          : ['listo_para_retirar', 'despachado', 'entregado'].includes(
              order.production_status
            )
          ? 'Producción completada'
          : 'Aguardando inicio',
      done: ['listo_para_retirar', 'despachado', 'entregado'].includes(
        order.production_status
      ),
      active: order.production_status === 'en_produccion',
    },
    {
      title: '4. Entrega / Envío',
      subtitle:
        order.production_status === 'entregado'
          ? 'Entregado'
          : order.production_status === 'despachado'
          ? 'Despachado'
          : order.production_status === 'listo_para_retirar'
          ? 'Listo para retirar'
          : order.delivery_method_snapshot.name,
      done: order.production_status === 'entregado',
      active: ['listo_para_retirar', 'despachado'].includes(
        order.production_status
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      {mpReturnParam && order.payment_status !== 'paid' && (
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#F4F1EA] p-4 text-xs text-[#1C1917]">
          <p className="font-semibold">
            Verificación de pago en curso
          </p>
          <p className="mt-1 text-[#57534E]">
            El estado de tu pago se actualizará automáticamente a &ldquo;Pago confirmado&rdquo; en cuanto Mercado Pago nos notifique la acreditación.
          </p>
        </div>
      )}

      {/* Encabezado del Pedido + Línea de Tiempo */}
      <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                Pedido registrado
              </span>
              {order.is_sandbox_order && (
                <span
                  data-testid="order-sandbox-badge"
                  className="rounded-full border border-[#D6D3D1] bg-[#F4F1EA] px-3 py-1 text-xs font-medium text-[#1C1917]"
                >
                  Orden de prueba (Sandbox)
                </span>
              )}
            </div>

            <h1
              data-testid="order-number-heading"
              className="font-display mt-3 text-3xl font-medium text-[#1C1917]"
            >
              Pedido {order.order_number}
            </h1>
            <p className="mt-1 text-xs text-[#57534E]">
              Creado el {formatDateTimeAR(order.created_at)} · Cliente:{' '}
              <strong className="text-[#1C1917]">{order.customer_name}</strong> (
              {order.customer_email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopySecureLink}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2 text-xs font-medium text-[#1C1917] hover:border-[#1C1917]"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                  Enlace copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar enlace de seguimiento
                </>
              )}
            </button>

            <a
              href={buildSafeWhatsAppUrl({
                context: 'order',
                orderNumber: order.order_number,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FAF8F5]"
            >
              <MessageCircle className="h-4 w-4" />
              Consultar por WhatsApp
            </a>
          </div>
        </div>

        {/* Código de acceso del pedido */}
        <div className="mt-5 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs text-[#57534E]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>
                <strong className="text-[#1C1917]">
                  Código de acceso de tu pedido:
                </strong>{' '}
                <code className="rounded border border-[#D6D3D1] bg-[#FFFFFF] px-2 py-0.5 font-mono text-xs font-semibold text-[#1C1917]">
                  {order.access_code}
                </code>
              </span>
            </div>
            <span className="text-[11px]">
              Guardá este enlace o tu código para consultar novedades en cualquier momento.
            </span>
          </div>
        </div>

        {/* LÍNEA DE TIEMPO CLARA EN 4 ETAPAS */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {timelineStages.map((stage) => (
            <div
              key={stage.title}
              className={`rounded-2xl border p-4 ${
                stage.done
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : stage.active
                  ? 'border-[#1C1917] bg-[#FAF8F5]'
                  : 'border-[#E7E5E4] bg-[#FFFFFF]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#1C1917]">
                  {stage.title}
                </p>
                {stage.done && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                )}
              </div>
              <p className="mt-1 text-[11px] font-medium text-[#57534E]">
                {stage.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* Estado detallado de Pago y Producción */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4">
            <span className="text-[10px] font-medium tracking-wider text-[#78716C] uppercase">
              Estado del pago / cotización
            </span>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span
                data-testid="order-payment-status"
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${paymentBadge.colorClass}`}
              >
                {paymentBadge.label}
              </span>
              <span className="text-xs font-medium text-[#57534E]">
                {order.payment_method === 'mercadopago'
                  ? 'Mercado Pago'
                  : order.payment_method === 'bank_transfer'
                  ? 'Transferencia bancaria'
                  : 'Solicitud de presupuesto'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4">
            <span className="text-[10px] font-medium tracking-wider text-[#78716C] uppercase">
              Estado de producción y taller
            </span>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span
                data-testid="order-production-status"
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${productionBadge.colorClass}`}
              >
                {productionBadge.label}
              </span>
              <span className="text-xs font-medium text-[#57534E]">
                {order.requires_design_approval
                  ? order.design_approved_at
                    ? '✓ Diseño aprobado'
                    : 'Requiere aprobar muestra'
                  : 'Listo para taller'}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-[#57534E]">
              {productionBadge.description}
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE APROBACIÓN DE DISEÑO */}
      <section className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#57534E]" />
            <h2 className="font-display text-xl font-medium text-[#1C1917]">
              Diseño y muestra digital
            </h2>
          </div>

          {order.requires_design_approval && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                order.design_approved_at
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'bg-[#F4F1EA] text-[#1C1917]'
              }`}
            >
              {order.design_approved_at
                ? `Aprobado el ${formatDateTimeAR(order.design_approved_at)}`
                : 'Aguardando aprobación antes de producir'}
            </span>
          )}
        </div>

        {order.design_revisions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#D6D3D1] bg-[#FAF8F5] p-5 text-xs text-[#57534E]">
            {order.requires_design_approval ? (
              <p>
                Revisaremos tus archivos e indicaciones y subiremos aquí la{' '}
                <strong className="text-[#1C1917]">muestra digital</strong> para que puedas verla y aprobarla antes de producir.
              </p>
            ) : (
              <p>
                Tus fotografías con su encuadre seleccionado ya quedaron asociadas a tu pedido. Si necesitamos hacerte alguna consulta sobre un archivo, aparecerá en esta sección.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {order.design_revisions.map((rev) => {
              const previewFile = rev.preview_file_id
                ? signedFilesMap[rev.preview_file_id]
                : null;

              return (
                <div
                  key={rev.id}
                  data-testid={`design-revision-v${rev.version_number}`}
                  className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="rounded bg-[#1C1917] px-2.5 py-0.5 text-[10px] font-medium text-[#FAF8F5] uppercase">
                        Muestra v{rev.version_number}
                      </span>
                      <h3 className="mt-1.5 text-base font-semibold text-[#1C1917]">
                        {rev.title}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        rev.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-900'
                          : rev.status === 'changes_requested'
                          ? 'bg-[#F4F1EA] text-[#1C1917]'
                          : 'bg-amber-50 text-amber-900'
                      }`}
                    >
                      {rev.status === 'approved'
                        ? '✓ Muestra aprobada'
                        : rev.status === 'changes_requested'
                        ? 'Cambios solicitados'
                        : 'Pendiente de tu revisión'}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
                    <strong className="text-[#1C1917]">Nota de Trazo:</strong>{' '}
                    {rev.admin_notes}
                  </p>

                  {previewFile && (
                    <div className="mt-3">
                      <a
                        href={previewFile.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6D3D1] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#1C1917] hover:border-[#1C1917]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver archivo de muestra ({previewFile.original_filename})
                      </a>
                    </div>
                  )}

                  {rev.status === 'pending_customer_review' && (
                    <div className="mt-4 space-y-3 border-t border-[#E7E5E4] pt-4">
                      <div>
                        <label className="block text-xs font-medium text-[#1C1917]">
                          Comentarios o ajustes sobre esta muestra (opcional al aprobar)
                        </label>
                        <input
                          type="text"
                          value={customerFeedbackText}
                          onChange={(e) =>
                            setCustomerFeedbackText(e.target.value)
                          }
                          placeholder="Ej: ¡Quedó bárbaro, apruebo! / Por favor cambiar..."
                          className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#1C1917]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          data-testid="approve-design-button"
                          onClick={() =>
                            handleDesignDecision(rev.id, 'approve')
                          }
                          className="inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar muestra para producción
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDesignDecision(rev.id, 'request_changes')
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-5 py-2.5 text-xs font-medium text-[#1C1917] hover:border-[#1C1917]"
                        >
                          Solicitar cambios
                        </button>
                      </div>
                    </div>
                  )}

                  {rev.customer_feedback && (
                    <p className="mt-3 rounded-xl bg-[#FFFFFF] p-3 text-xs text-[#57534E]">
                      <strong className="text-[#1C1917]">Tu comentario:</strong>{' '}
                      {rev.customer_feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {designActionFeedback && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-950">
            {designActionFeedback}
          </div>
        )}
      </section>

      {/* SECCIÓN DE PAGO */}
      {order.order_type !== 'quote_request' && (
        <section className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
          <h2 className="font-display text-xl font-medium text-[#1C1917]">
            Pago del pedido ({formatARS(order.total_ars)})
          </h2>

          {order.payment_method === 'mercadopago' && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-5 text-xs text-[#57534E]">
                <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
                  <CreditCard className="h-4 w-4 text-[#57534E]" />
                  <span>Mercado Pago</span>
                </div>
                <p className="mt-1.5 leading-relaxed">
                  Podés abonar tu pedido mediante Mercado Pago. Una vez acreditado el pago, el estado de tu pedido se actualizará automáticamente.
                </p>

                {order.payment_status !== 'paid' && (
                  <button
                    type="button"
                    data-testid="init-mp-button"
                    onClick={handleInitMercadoPago}
                    disabled={mpLoading}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5]"
                  >
                    {mpLoading
                      ? 'Conectando con Mercado Pago...'
                      : 'Pagar con Mercado Pago'}
                  </button>
                )}

                {order.is_sandbox_order &&
                  mpPreferenceData &&
                  !mpPreferenceData.credentialsConfigured && (
                    <div className="mt-4 rounded-2xl border border-[#D6D3D1] bg-[#FFFFFF] p-4">
                      <p className="font-semibold text-[#1C1917]">
                        Verificación de Webhook en orden de prueba (Sandbox):
                      </p>
                      <p className="mt-1 text-[11px] text-[#57534E]">
                        {mpPreferenceData.message}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          data-testid="simulate-mp-webhook-button"
                          onClick={() => handleTriggerSignedSandboxWebhook(false)}
                          disabled={mpLoading}
                          className="rounded-full bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FAF8F5]"
                        >
                          1. Simular Webhook Firmado de Pago Aprobado
                        </button>
                        <button
                          type="button"
                          data-testid="simulate-mp-duplicate-webhook-button"
                          onClick={() => handleTriggerSignedSandboxWebhook(true)}
                          disabled={mpLoading}
                          className="rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2 text-xs font-medium text-[#1C1917]"
                        >
                          2. Enviar Notificación Duplicada (Probar Idempotencia)
                        </button>
                      </div>
                    </div>
                  )}

                {mpActionFeedback && (
                  <div
                    data-testid="mp-webhook-feedback"
                    className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-950"
                  >
                    {mpActionFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {order.payment_method === 'bank_transfer' && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-5 text-xs text-[#57534E]">
                <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
                  <Building2 className="h-4 w-4 text-[#57534E]" />
                  <span>Datos para transferencia bancaria</span>
                </div>

                {bankTransferConfig?.is_configured ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-[#1C1917]">
                    <p>
                      <strong>Banco / Entidad:</strong>{' '}
                      {bankTransferConfig.bank_name}
                    </p>
                    <p>
                      <strong>Titular:</strong>{' '}
                      {bankTransferConfig.account_holder}
                    </p>
                    <p>
                      <strong>CBU / CVU:</strong>{' '}
                      {bankTransferConfig.cbu_or_cvu}
                    </p>
                    <p>
                      <strong>Alias:</strong> {bankTransferConfig.alias}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl border border-[#E7E5E4] bg-[#FFFFFF] p-3 text-xs text-[#57534E]">
                    {bankTransferConfig?.instructions ||
                      'Contactanos por WhatsApp indicando tu número de pedido para enviarte el alias o CBU de transferencia.'}
                  </p>
                )}

                {/* Subida de comprobante */}
                <div className="mt-4 border-t border-[#E7E5E4] pt-4">
                  <p className="font-semibold text-[#1C1917]">
                    Adjuntar comprobante de transferencia
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#57534E]">
                    Una vez que subas tu comprobante, verificaremos la acreditación y actualizaremos el estado de tu pago.
                  </p>

                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5]">
                    <Upload className="h-4 w-4" />
                    <span>
                      {uploadingReceipt
                        ? 'Subiendo comprobante...'
                        : 'Seleccionar imagen o PDF del comprobante'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleReceiptUpload}
                      disabled={uploadingReceipt}
                      className="sr-only"
                    />
                  </label>

                  {order.transfer_receipt_file_id &&
                    signedFilesMap[order.transfer_receipt_file_id] && (
                      <div className="mt-3">
                        <a
                          href={
                            signedFilesMap[order.transfer_receipt_file_id]
                              .signed_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 underline"
                        >
                          <FileCheck2 className="h-4 w-4" />
                          Ver comprobante adjunto (
                          {
                            signedFilesMap[order.transfer_receipt_file_id]
                              .original_filename
                          }
                          )
                        </a>
                      </div>
                    )}

                  {receiptFeedback && (
                    <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-950">
                      {receiptFeedback}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* DETALLE DE PRODUCTOS Y ARCHIVOS */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
            <h2 className="font-display text-lg font-medium text-[#1C1917]">
              Productos de tu pedido
            </h2>

            <div className="mt-4 space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-medium text-[#78716C] uppercase">
                        {item.category_name_snapshot}
                      </span>
                      <h3 className="text-sm font-semibold text-[#1C1917]">
                        {item.quantity}× {item.product_name_snapshot}
                      </h3>
                      {item.variant_name_snapshot && (
                        <p className="text-[11px] text-[#57534E]">
                          {item.variant_name_snapshot}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-[#1C1917]">
                      {order.order_type === 'quote_request'
                        ? 'Cotización personalizada'
                        : formatARS(item.line_total_ars_snapshot)}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-[#57534E]">
                    {item.customization_summary}
                  </p>

                  {item.file_ids.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#E7E5E4] pt-2.5">
                      {item.file_ids.map((fid) => {
                        const f = signedFilesMap[fid];
                        if (!f) return null;
                        return (
                          <a
                            key={fid}
                            href={f.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#D6D3D1] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-medium text-[#1C1917] hover:border-[#1C1917]"
                          >
                            <FileCheck2 className="h-3 w-3 text-emerald-700" />
                            {f.original_filename}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Entrega e historial */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs">
            <h2 className="font-display flex items-center gap-2 text-base font-medium text-[#1C1917]">
              <Truck className="h-4 w-4 text-[#57534E]" />
              Entrega y plazos
            </h2>
            <div className="mt-3 space-y-2.5 text-[#57534E]">
              <p>
                <strong className="text-[#1C1917]">Modalidad:</strong>{' '}
                {order.delivery_method_snapshot.name}
              </p>
              {order.shipping_address && (
                <p>
                  <strong className="text-[#1C1917]">Domicilio:</strong>{' '}
                  {order.shipping_address.street_and_number},{' '}
                  {order.shipping_address.locality},{' '}
                  {order.shipping_address.province} (CP{' '}
                  {order.shipping_address.postal_code})
                </p>
              )}
              <p>
                <strong className="text-[#1C1917]">Plazo de producción:</strong>{' '}
                {order.estimated_production_summary}
              </p>
              <p>
                <strong className="text-[#1C1917]">Transporte:</strong>{' '}
                {order.estimated_shipping_summary}
              </p>
              {order.shipping_tracking_code && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                  <p className="font-semibold">
                    Seguimiento de envío disponible:
                  </p>
                  <p className="mt-0.5">
                    {order.shipping_carrier || 'Correo'} — Código:{' '}
                    <strong>{order.shipping_tracking_code}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs">
            <h2 className="font-display flex items-center gap-2 text-base font-medium text-[#1C1917]">
              <Clock className="h-4 w-4 text-[#57534E]" />
              Actividad de tu pedido
            </h2>
            <div className="mt-4 space-y-3">
              {order.events.map((evt) => (
                <div
                  key={evt.id}
                  className="border-l-2 border-[#D6D3D1] py-0.5 pl-3"
                >
                  <p className="font-medium text-[#1C1917]">{evt.description}</p>
                  <p className="text-[10px] text-[#78716C]">
                    {formatDateTimeAR(evt.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderTokenPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm font-medium text-[#57534E]">
          Cargando tu pedido...
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
