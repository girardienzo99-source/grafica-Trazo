'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  LogOut,
  Package,
  ShoppingBag,
  CalendarHeart,
  Settings,
  BarChart3,
  Download,
  ExternalLink,
  Upload,
  Plus,
  Save,
  SlidersHorizontal,
  FileCheck2,
  CreditCard,
  Server,
  Store,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Category,
  Order,
  ProductionStatus,
  Product,
  QuoteRequest,
  QuoteStatus,
  StoreSettings,
} from '@/types/trazo';
import {
  formatARS,
  PAYMENT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
} from '@/lib/utils/format';
import { useStore } from '@/context/StoreContext';

interface AdminDashboardPayload {
  adminEmail: string;
  metrics: {
    totalOrdersReceived: number;
    officialOrdersCount?: number;
    sandboxOrdersCount?: number;
    confirmedPaidOrdersCount: number;
    confirmedSalesArs: number;
    confirmedProductsSoldCount: number;
    pendingDesignOrdersCount: number;
    inProductionOrdersCount: number;
    readyForDeliveryOrdersCount: number;
    unpaidOrPendingReviewOrdersCount: number;
    totalQuoteRequests: number;
  };
  integrations: {
    database: { activeEngine: string; supabaseConfigured: boolean };
    privateStorage: { activeEngine: string; supabaseConfigured: boolean };
    mercadoPago: {
      configured: boolean;
      webhookSecretConfigured: boolean;
      statusLabel: string;
    };
    transactionalEmail: { configured: boolean; statusLabel: string };
  };
  categories: Category[];
  products: Product[];
  orders: Order[];
  quoteRequests: QuoteRequest[];
  storeSettings: StoreSettings;
  adminSignedFilesMap: Record<
    string,
    {
      id: string;
      original_filename: string;
      mime_type: string;
      size_bytes: number;
      width_px: number | null;
      height_px: number | null;
      low_resolution_warning: boolean;
      purpose: string;
      order_id: string | null;
      created_at: string;
      retention_expires_at: string;
      signed_url: string;
    }
  >;
}

type AdminSectionId =
  | 'resumen'
  | 'pedidos'
  | 'disenos'
  | 'productos'
  | 'presupuestos'
  | 'contenido'
  | 'pagos_envios'
  | 'integraciones';

function getProductReadiness(product: Product) {
  const hasOfficialPrice =
    product.base_price_ars !== null ||
    product.variants.some((v) => v.is_enabled && v.price_ars !== null);
  const hasRealPhoto = product.images.some(
    (img) => Boolean(img.url) && img.is_real_authorized_photo
  );
  const hasProductionTime = Boolean(
    product.estimated_production_text &&
      product.estimated_production_text.trim().length > 0 &&
      !product.estimated_production_text.toLowerCase().includes('confirmar')
  );
  return {
    hasOfficialPrice,
    hasRealPhoto,
    hasProductionTime,
    readyCount:
      (hasOfficialPrice ? 1 : 0) +
      (hasRealPhoto ? 1 : 0) +
      (hasProductionTime ? 1 : 0),
  };
}

export default function AdminPanelPage() {
  const { refreshCatalog } = useStore();

  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(
    null
  );
  const [activeSection, setActiveSection] =
    useState<AdminSectionId>('resumen');

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Order filters & selected order state
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderDateFilter, setOrderDateFilter] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Order management inputs
  const [designProposalTitle, setDesignProposalTitle] = useState(
    'Muestra digital lista para revisión'
  );
  const [designProposalNotes, setDesignProposalNotes] = useState('');
  const [designRequestCorrections, setDesignRequestCorrections] =
    useState(false);
  const [designPreviewFileId, setDesignPreviewFileId] = useState<string | null>(
    null
  );
  const [uploadingDesignFile, setUploadingDesignFile] = useState(false);

  // Product editor state & unsaved changes protection
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductDirty, setIsProductDirty] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as AdminDashboardPayload;
        setDashboard(data);
        setAuthenticated(true);
        if (!selectedOrderId && data.orders.length > 0) {
          setSelectedOrderId(data.orders[0].id);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedOrderId]);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/admin/auth', { cache: 'no-store' });
        const data = await res.json();
        if (data.authenticated) {
          setAuthenticated(true);
          await loadDashboard();
        }
      } finally {
        setAuthChecked(true);
      }
    }
    void checkSession();
  }, [loadDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError(data.error || 'Credenciales inválidas.');
      return;
    }
    setAuthenticated(true);
    await loadDashboard();
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthenticated(false);
    setDashboard(null);
  };

  const executeAdminAction = async (payload: Record<string, unknown>) => {
    setFeedbackBanner(null);
    const res = await fetch('/api/admin/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackBanner({
        type: 'error',
        text: data.error || 'No se pudo completar la operación.',
      });
      return null;
    }
    await loadDashboard();
    await refreshCatalog();
    return data;
  };

  const handleUploadAdminDesignPreview = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDesignFile(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('owner_token', 'admin');
      form.append('purpose', 'admin_design_proposal');

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.file) {
        setDesignPreviewFileId(data.file.id);
        setFeedbackBanner({
          type: 'success',
          text: `Archivo de muestra "${data.file.original_filename}" cargado en almacenamiento privado.`,
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          text: data.error || 'Error al subir archivo de diseño.',
        });
      }
    } finally {
      setUploadingDesignFile(false);
      e.target.value = '';
    }
  };

  const updateEditingProduct = (next: Product) => {
    setEditingProduct(next);
    setIsProductDirty(true);
  };

  const closeProductEditorSafely = () => {
    if (
      isProductDirty &&
      typeof window !== 'undefined' &&
      !window.confirm(
        'Tenés cambios sin guardar en este producto. ¿Querés cerrar y descartarlos?'
      )
    ) {
      return false;
    }
    setEditingProduct(null);
    setIsProductDirty(false);
    return true;
  };

  const openProductEditor = (product: Product) => {
    if (editingProduct && editingProduct.id !== product.id) {
      const canClose = closeProductEditorSafely();
      if (!canClose) return;
    }
    setEditingProduct(product);
    setIsProductDirty(false);
  };

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm font-medium text-[#57534E]">
        Verificando sesión del panel de administración...
      </div>
    );
  }

  // Pantalla de Inicio de Sesión limpia y sin credenciales expuestas
  if (!authenticated || !dashboard) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-7 shadow-sm sm:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1C1917] text-[#FAF8F5]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                Administración
              </h1>
              <p className="text-xs text-[#57534E]">
                Trazo Espacio Gráfico · Gestión interna
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-[#1C1917]"
              >
                Correo electrónico
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Ingresá tu correo de administración"
                className="mt-1.5 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-4 py-2.5 text-sm text-[#1C1917] focus:border-[#1C1917] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#1C1917]"
              >
                Contraseña
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-4 py-2.5 text-sm text-[#1C1917] focus:border-[#1C1917] focus:outline-none"
              />
            </div>

            {loginError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              data-testid="admin-login-button"
              className="w-full rounded-full bg-[#1C1917] px-5 py-3 text-xs font-semibold text-[#FAF8F5] transition hover:bg-[#292524]"
            >
              Ingresar al panel
            </button>
          </form>

          <div className="mt-6 border-t border-[#E7E5E4] pt-4 text-center">
            <Link
              href="/"
              className="text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
            >
              ← Volver a la tienda pública
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = dashboard.orders.filter((o) => {
    if (
      orderStatusFilter !== 'all' &&
      o.production_status !== orderStatusFilter &&
      o.payment_status !== orderStatusFilter
    ) {
      return false;
    }
    if (orderDateFilter && !o.created_at.startsWith(orderDateFilter)) {
      return false;
    }
    return true;
  });

  const designPendingOrders = dashboard.orders.filter(
    (o) =>
      o.requires_design_approval &&
      (!o.design_approved_at ||
        o.production_status === 'en_revision_diseno' ||
        o.production_status === 'esperando_aprobacion_cliente' ||
        o.production_status === 'archivos_pendientes')
  );

  const selectedOrder =
    dashboard.orders.find((o) => o.id === selectedOrderId) ||
    filteredOrders[0] ||
    null;

  const navItems: {
    id: AdminSectionId;
    label: string;
    badge?: string | number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    {
      id: 'pedidos',
      label: 'Pedidos',
      badge: dashboard.orders.length,
      icon: ShoppingBag,
    },
    {
      id: 'disenos',
      label: 'Diseños y aprobaciones',
      badge: designPendingOrders.length,
      icon: FileCheck2,
    },
    {
      id: 'productos',
      label: 'Productos y variantes',
      badge: dashboard.products.length,
      icon: Package,
    },
    {
      id: 'presupuestos',
      label: 'Presupuestos y eventos',
      badge: dashboard.quoteRequests.length,
      icon: CalendarHeart,
    },
    { id: 'contenido', label: 'Contenido', icon: Settings },
    { id: 'pagos_envios', label: 'Pagos y envíos', icon: CreditCard },
    { id: 'integraciones', label: 'Integraciones', icon: Server },
  ];

  const renderOrderDetailPanel = (order: Order | null) => {
    if (!order) {
      return (
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-8 text-center text-xs text-[#57534E]">
          Seleccioná un pedido de la lista para gestionar su pago, archivos,
          muestra digital y estado de taller.
        </div>
      );
    }

    return (
      <div className="space-y-6 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7E5E4] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                Pedido {order.order_number}
              </h2>
              {order.is_sandbox_order && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  Prueba Sandbox
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#57534E]">
              Cliente: <strong>{order.customer_name}</strong> ·{' '}
              {order.customer_phone} · {order.customer_email}
            </p>
            <p className="mt-1 text-[11px] text-[#78716C]">
              Seguimiento del cliente:{' '}
              <a
                href={`/pedidos/${order.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1C1917] underline"
              >
                /pedidos/{order.access_token.slice(0, 12)}...
              </a>{' '}
              (Código: <strong>{order.access_code}</strong>)
            </p>
          </div>

          <div className="text-right">
            <p className="text-lg font-semibold text-[#1C1917]">
              {formatARS(order.total_ars)}
            </p>
            <span className="text-[11px] text-[#57534E]">
              {order.delivery_method_snapshot.name}
            </span>
          </div>
        </div>

        {/* 1. Validación de Transferencia Bancaria */}
        {order.payment_method === 'bank_transfer' && (
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs">
            <p className="font-semibold text-[#1C1917]">
              1. Validación de transferencia bancaria
            </p>
            {order.transfer_receipt_file_id &&
            dashboard.adminSignedFilesMap[order.transfer_receipt_file_id] ? (
              <p className="mt-1">
                Comprobante adjunto:{' '}
                <a
                  href={
                    dashboard.adminSignedFilesMap[
                      order.transfer_receipt_file_id
                    ].signed_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-800 underline"
                >
                  Abrir comprobante (
                  {
                    dashboard.adminSignedFilesMap[
                      order.transfer_receipt_file_id
                    ].original_filename
                  }
                  )
                </a>
              </p>
            ) : (
              <p className="mt-1 text-[#57534E]">
                El cliente aún no adjuntó el comprobante en la web.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="admin-approve-transfer-btn"
                onClick={async () => {
                  const res = await executeAdminAction({
                    action: 'validate_transfer',
                    orderId: order.id,
                    decision: 'approve',
                    notes: 'Transferencia acreditada y verificada en cuenta.',
                  });
                  if (res) {
                    setFeedbackBanner({
                      type: 'success',
                      text: 'Transferencia validada: el pedido pasó a Pago Confirmado.',
                    });
                  }
                }}
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-emerald-800"
              >
                ✓ Aprobar y confirmar pago por transferencia
              </button>

              <button
                type="button"
                onClick={() =>
                  executeAdminAction({
                    action: 'validate_transfer',
                    orderId: order.id,
                    decision: 'reject',
                    notes: 'Comprobante ilegible o pendiente de acreditación.',
                  })
                }
                className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-900"
              >
                Rechazar comprobante
              </button>
            </div>
          </div>
        )}

        {/* 2. Gestión de Propuestas de Diseño y Aprobación */}
        <div className="space-y-3 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#1C1917]">
              2. Muestra digital y aprobación del cliente
            </p>
            <span className="font-semibold text-[#57534E]">
              {order.requires_design_approval
                ? order.design_approved_at
                  ? `✓ Aprobado (${order.design_approved_by})`
                  : 'Pendiente de aprobación antes de producir'
                : 'No requiere muestra previa'}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <input
              type="text"
              value={designProposalTitle}
              onChange={(e) => setDesignProposalTitle(e.target.value)}
              placeholder="Título de la muestra (ej: Muestra v1 Stickers)"
              className="rounded-xl border border-[#D6D3CD] bg-[#FFFFFF] px-3 py-2 text-xs"
            />
            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#1C1917] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#1C1917]">
              <Upload className="h-3.5 w-3.5" />
              <span>
                {uploadingDesignFile
                  ? 'Subiendo...'
                  : designPreviewFileId
                  ? 'Archivo de muestra listo ✓'
                  : 'Adjuntar archivo de muestra (opcional)'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,image/svg+xml"
                onChange={handleUploadAdminDesignPreview}
                className="sr-only"
              />
            </label>
          </div>

          <textarea
            rows={2}
            value={designProposalNotes}
            onChange={(e) => setDesignProposalNotes(e.target.value)}
            placeholder="Notas sobre la muestra digital o indicaciones para el cliente..."
            className="w-full rounded-xl border border-[#D6D3CD] bg-[#FFFFFF] px-3 py-2 text-xs"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 font-medium text-[#1C1917]">
              <input
                type="checkbox"
                checked={designRequestCorrections}
                onChange={(e) => setDesignRequestCorrections(e.target.checked)}
                className="h-4 w-4 accent-[#1C1917]"
              />
              Solicitar nuevo archivo al cliente
            </label>

            <button
              type="button"
              data-testid="admin-send-design-proposal-btn"
              onClick={async () => {
                const res = await executeAdminAction({
                  action: 'add_design_revision',
                  orderId: order.id,
                  title: designProposalTitle,
                  adminNotes:
                    designProposalNotes ||
                    'Revisá la muestra digital y confirmá tu aprobación para pasar al taller.',
                  previewFileId: designPreviewFileId,
                  requestFileCorrections: designRequestCorrections,
                });
                if (res) {
                  setDesignProposalNotes('');
                  setDesignPreviewFileId(null);
                  setFeedbackBanner({
                    type: 'success',
                    text: 'Muestra digital enviada al seguimiento del pedido.',
                  });
                }
              }}
              className="rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-semibold text-[#FAF8F5]"
            >
              Enviar muestra al cliente
            </button>
          </div>
        </div>

        {/* 3. Estado de Producción y Seguimiento Logístico */}
        <div className="space-y-3 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs">
          <p className="font-semibold text-[#1C1917]">
            3. Estado de taller y entrega
          </p>
          <p className="text-[11px] text-[#57534E]">
            Para pasar a &ldquo;En producción&rdquo; o &ldquo;Despachado&rdquo;,
            el pedido debe contar con la aprobación de diseño cuando el producto
            lo requiera.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#1C1917]">
                Estado actual
              </label>
              <select
                data-testid="admin-production-status-select"
                value={order.production_status}
                onChange={async (e) => {
                  const nextStatus = e.target.value as ProductionStatus;
                  const res = await executeAdminAction({
                    action: 'update_order_production',
                    orderId: order.id,
                    productionStatus: nextStatus,
                  });
                  if (res) {
                    setFeedbackBanner({
                      type: 'success',
                      text: `Estado actualizado a "${PRODUCTION_STATUS_LABELS[nextStatus].label}".`,
                    });
                  }
                }}
                className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold"
              >
                {Object.entries(PRODUCTION_STATUS_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              {!order.design_approved_at && order.requires_design_approval && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await executeAdminAction({
                      action: 'update_order_production',
                      orderId: order.id,
                      registerManualDesignApproval: true,
                      productionStatus: 'aprobado_para_producir',
                    });
                    if (res) {
                      setFeedbackBanner({
                        type: 'success',
                        text: 'Aprobación registrada manualmente por administración.',
                      });
                    }
                  }}
                  className="w-full rounded-xl border border-[#1C1917] bg-[#FFFFFF] px-3 py-2 text-[11px] font-semibold text-[#1C1917] hover:bg-[#F4F1EA]"
                >
                  Registrar aprobación manual
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <input
              type="text"
              defaultValue={order.shipping_carrier || ''}
              placeholder="Correo o expreso"
              onBlur={(e) =>
                executeAdminAction({
                  action: 'update_order_production',
                  orderId: order.id,
                  shippingCarrier: e.target.value,
                })
              }
              className="rounded-xl border border-[#D6D3CD] bg-[#FFFFFF] px-3 py-2 text-xs"
            />
            <input
              type="text"
              defaultValue={order.shipping_tracking_code || ''}
              placeholder="Código de seguimiento"
              onBlur={(e) =>
                executeAdminAction({
                  action: 'update_order_production',
                  orderId: order.id,
                  shippingTrackingCode: e.target.value,
                })
              }
              className="rounded-xl border border-[#D6D3CD] bg-[#FFFFFF] px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#1C1917]">
              Notas internas de taller (privadas)
            </label>
            <textarea
              rows={2}
              defaultValue={order.admin_internal_notes || ''}
              placeholder="Anotaciones internas de producción..."
              onBlur={(e) =>
                executeAdminAction({
                  action: 'update_order_production',
                  orderId: order.id,
                  adminInternalNotes: e.target.value,
                })
              }
              className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FFFFFF] px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* 4. Archivos privados del pedido */}
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-4 text-xs">
          <p className="font-semibold text-[#1C1917]">
            4. Ítems y archivos cargados en este pedido
          </p>
          <div className="mt-2.5 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#FAF8F5] p-3">
                <p className="font-semibold text-[#1C1917]">
                  {item.quantity}× {item.product_name_snapshot} —{' '}
                  {formatARS(item.line_total_ars_snapshot)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#57534E]">
                  {item.customization_summary}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.file_ids.map((fid) => {
                    const f = dashboard.adminSignedFilesMap[fid];
                    if (!f) return null;
                    return (
                      <a
                        key={fid}
                        href={f.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D6D3CD] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-semibold text-[#1C1917]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {f.original_filename}
                        {f.low_resolution_warning ? ' (Baja res.)' : ''}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917]">
      {/* Barra superior administrativa */}
      <header className="sticky top-0 z-30 border-b border-[#E7E5E4] bg-[#1C1917] text-[#FAF8F5]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#292524] text-[#FAF8F5]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-base font-semibold leading-tight">
                Trazo · Administración
              </p>
              <p className="text-[11px] text-[#A8A29E]">
                Sesión activa: {dashboard.adminEmail}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dashboard.storeSettings.sandbox_test_prices_enabled && (
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-200">
                Tarifas de prueba Sandbox activas
              </span>
            )}

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#44403C] bg-[#292524] px-3.5 py-1.5 text-xs font-medium text-[#FAF8F5] hover:bg-[#44403C]"
            >
              <Store className="h-3.5 w-3.5" />
              Ver tienda pública
            </Link>

            <a
              href="/api/admin/dashboard?format=csv"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] px-3.5 py-1.5 text-xs font-semibold text-[#1C1917]"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#44403C] px-3.5 py-1.5 text-xs font-medium text-[#D6D3CD] hover:border-rose-400 hover:text-rose-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* Navegación lateral (8 secciones) */}
        <aside className="lg:col-span-3">
          <nav
            aria-label="Secciones de administración"
            className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-2 lg:flex-col"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                    active
                      ? 'bg-[#1C1917] text-[#FAF8F5]'
                      : 'text-[#57534E] hover:bg-[#F4F1EA] hover:text-[#1C1917]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        active
                          ? 'bg-[#292524] text-[#FAF8F5]'
                          : 'bg-[#F4F1EA] text-[#57534E]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Área principal */}
        <main className="space-y-6 lg:col-span-9">
          {feedbackBanner && (
            <div
              role="alert"
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-xs font-semibold ${
                feedbackBanner.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-rose-300 bg-rose-50 text-rose-950'
              }`}
            >
              <span>{feedbackBanner.text}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* SECCIÓN 1: RESUMEN */}
          {activeSection === 'resumen' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                  Resumen operativo
                </h1>
                <p className="mt-1 text-xs text-[#57534E]">
                  Estado general de pedidos, muestras de diseño, presupuestos y
                  catálogo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5">
                  <span className="text-[11px] font-semibold text-[#78716C] uppercase">
                    Pedidos recibidos
                  </span>
                  <p
                    data-testid="metric-total-orders"
                    className="mt-2 text-3xl font-semibold text-[#1C1917]"
                  >
                    {dashboard.metrics.totalOrdersReceived}
                  </p>
                  <p className="mt-1 text-xs text-[#57534E]">
                    {dashboard.metrics.unpaidOrPendingReviewOrdersCount}{' '}
                    pendientes de pago o validación.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-[#FFFFFF] p-5">
                  <span className="text-[11px] font-semibold text-emerald-900 uppercase">
                    Ventas con pago confirmado
                  </span>
                  <p
                    data-testid="metric-confirmed-sales"
                    className="mt-2 text-3xl font-semibold text-emerald-900"
                  >
                    {formatARS(dashboard.metrics.confirmedSalesArs)}
                  </p>
                  <p className="mt-1 text-xs text-[#57534E]">
                    {dashboard.metrics.confirmedPaidOrdersCount} pedido(s)
                    acreditados.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5">
                  <span className="text-[11px] font-semibold text-[#78716C] uppercase">
                    Unidades cobradas
                  </span>
                  <p className="mt-2 text-3xl font-semibold text-[#1C1917]">
                    {dashboard.metrics.confirmedProductsSoldCount} u.
                  </p>
                  <p className="mt-1 text-xs text-[#57534E]">
                    Contabilizadas sobre pedidos pagados.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5">
                  <span className="text-[11px] font-semibold text-purple-900 uppercase">
                    Pendientes de diseño
                  </span>
                  <p className="mt-2 text-3xl font-semibold text-purple-900">
                    {dashboard.metrics.pendingDesignOrdersCount}
                  </p>
                  <p className="mt-1 text-xs text-[#57534E]">
                    En revisión o esperando aprobación del cliente.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5">
                  <span className="text-[11px] font-semibold text-indigo-900 uppercase">
                    En producción
                  </span>
                  <p className="mt-2 text-3xl font-semibold text-indigo-900">
                    {dashboard.metrics.inProductionOrdersCount}
                  </p>
                  <p className="mt-1 text-xs text-[#57534E]">
                    Diseño aprobado y en taller.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5">
                  <span className="text-[11px] font-semibold text-teal-900 uppercase">
                    Listos o despachados
                  </span>
                  <p className="mt-2 text-3xl font-semibold text-teal-900">
                    {dashboard.metrics.readyForDeliveryOrdersCount}
                  </p>
                  <p className="mt-1 text-xs text-[#57534E]">
                    Listos para retiro en Río Cuarto o enviados.
                  </p>
                </div>
              </div>

              {/* Resumen de preparación comercial del catálogo */}
              <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                      Estado comercial del catálogo ({dashboard.products.length}{' '}
                      productos)
                    </h2>
                    <p className="text-xs text-[#57534E]">
                      Mientras un producto no tenga precio oficial cargado, la
                      tienda pública lo ofrece en modalidad de solicitud de
                      presupuesto sin exponer textos técnicos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('productos')}
                    className="rounded-full border border-[#1C1917] px-4 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F4F1EA]"
                  >
                    Ir a productos
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#FAF8F5] p-4 text-xs">
                    <p className="font-semibold text-[#1C1917]">
                      Con precio de compra directa
                    </p>
                    <p className="mt-1 text-xl font-semibold text-[#1C1917]">
                      {
                        dashboard.products.filter(
                          (p) => getProductReadiness(p).hasOfficialPrice
                        ).length
                      }{' '}
                      / {dashboard.products.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#FAF8F5] p-4 text-xs">
                    <p className="font-semibold text-[#1C1917]">
                      Con fotografía real asignada
                    </p>
                    <p className="mt-1 text-xl font-semibold text-[#1C1917]">
                      {
                        dashboard.products.filter(
                          (p) => getProductReadiness(p).hasRealPhoto
                        ).length
                      }{' '}
                      / {dashboard.products.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#FAF8F5] p-4 text-xs">
                    <p className="font-semibold text-[#1C1917]">
                      Con plazo estimado propio
                    </p>
                    <p className="mt-1 text-xl font-semibold text-[#1C1917]">
                      {
                        dashboard.products.filter(
                          (p) => getProductReadiness(p).hasProductionTime
                        ).length
                      }{' '}
                      / {dashboard.products.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: PEDIDOS */}
          {activeSection === 'pedidos' && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-5">
                <div className="space-y-3 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-4">
                  <h1 className="font-display text-lg font-semibold text-[#1C1917]">
                    Pedidos ({filteredOrders.length})
                  </h1>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="paid">Pago confirmado</option>
                      <option value="transfer_proof_uploaded">
                        Transferencia por validar
                      </option>
                      <option value="pedido_recibido">Pedido recibido</option>
                      <option value="en_revision_diseno">
                        En revisión diseño
                      </option>
                      <option value="esperando_aprobacion_cliente">
                        Esperando aprobación
                      </option>
                      <option value="aprobado_para_producir">
                        Aprobado para producir
                      </option>
                      <option value="en_produccion">En producción</option>
                      <option value="listo_para_retirar">
                        Listo para retirar
                      </option>
                      <option value="despachado">Despachado</option>
                    </select>

                    <input
                      type="date"
                      value={orderDateFilter}
                      onChange={(e) => setOrderDateFilter(e.target.value)}
                      className="rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="max-h-[600px] space-y-2.5 overflow-y-auto pr-1">
                    {filteredOrders.length === 0 ? (
                      <p className="py-8 text-center text-xs text-[#57534E]">
                        No hay pedidos para el filtro seleccionado.
                      </p>
                    ) : (
                      filteredOrders.map((o) => {
                        const active = selectedOrder?.id === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              active
                                ? 'border-[#1C1917] bg-[#FAF8F5]'
                                : 'border-[#E7E5E4] bg-[#FFFFFF] hover:bg-[#FAF8F5]/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#1C1917]">
                                {o.order_number}
                              </span>
                              <span className="text-xs font-semibold text-[#1C1917]">
                                {formatARS(o.total_ars)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#57534E]">
                              {o.customer_name} · {o.customer_email}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  PAYMENT_STATUS_LABELS[o.payment_status]
                                    .colorClass
                                }`}
                              >
                                {PAYMENT_STATUS_LABELS[o.payment_status].label}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  PRODUCTION_STATUS_LABELS[o.production_status]
                                    .colorClass
                                }`}
                              >
                                {
                                  PRODUCTION_STATUS_LABELS[o.production_status]
                                    .label
                                }
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                {renderOrderDetailPanel(selectedOrder)}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: DISEÑOS Y APROBACIONES */}
          {activeSection === 'disenos' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                  Diseños y aprobaciones
                </h1>
                <p className="mt-1 text-xs text-[#57534E]">
                  Pedidos que requieren revisión de archivos, envío de muestra
                  digital o conformidad del cliente antes de entrar a taller.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-2.5 lg:col-span-5">
                  {designPendingOrders.length === 0 ? (
                    <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-center text-xs text-[#57534E]">
                      No hay pedidos pendientes de muestra o aprobación en este
                      momento.
                    </div>
                  ) : (
                    designPendingOrders.map((o) => {
                      const active = selectedOrder?.id === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSelectedOrderId(o.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active
                              ? 'border-[#1C1917] bg-[#FAF8F5]'
                              : 'border-[#E7E5E4] bg-[#FFFFFF]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#1C1917]">
                              {o.order_number}
                            </span>
                            <span className="text-[11px] font-semibold text-purple-900">
                              {
                                PRODUCTION_STATUS_LABELS[o.production_status]
                                  .label
                              }
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#57534E]">
                            {o.customer_name} · {o.items.length} ítem(s)
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="lg:col-span-7">
                  {renderOrderDetailPanel(selectedOrder)}
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 4: PRODUCTOS Y VARIANTES */}
          {activeSection === 'productos' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                    Productos y variantes
                  </h1>
                  <p className="mt-1 text-xs text-[#57534E]">
                    Configurá precios vigentes en ARS, mínimos, múltiplos,
                    plazos de producción, fotos y variantes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date().toISOString();
                    openProductEditor({
                      id: `prod_${Date.now()}`,
                      slug: `nuevo-producto-${Date.now()}`,
                      category_id:
                        dashboard.categories[0]?.id || 'cat-stickers',
                      name: 'Nuevo producto personalizado',
                      short_description: 'Descripción breve del producto.',
                      description: 'Descripción completa del producto.',
                      base_price_ars: null,
                      sandbox_test_price_ars: 5000,
                      is_test_price: false,
                      confirmed_dimensions: null,
                      confirmed_material: null,
                      confirmed_finish: null,
                      min_quantity: 1,
                      quantity_multiple: 1,
                      estimated_production_text: null,
                      availability_status: 'available',
                      stock_or_quota: null,
                      is_featured: false,
                      is_published: true,
                      customizer_type: 'design_upload',
                      customization_config: {
                        allow_photo_upload: false,
                        allow_logo_upload: true,
                        allow_custom_text: true,
                        allow_color_notes: true,
                        allow_observations: true,
                        allow_variants: true,
                        allow_design_help: true,
                        design_help_price_ars: null,
                        requires_design_approval: true,
                        file_instructions: 'Subí tu archivo en buena calidad.',
                      },
                      variants: [],
                      quantity_tiers: [],
                      images: [
                        {
                          id: `img_${Date.now()}`,
                          url: null,
                          alt: 'Nuevo producto Trazo',
                          caption: 'Vista orientativa',
                          is_real_authorized_photo: false,
                          illustration_variant: 'stickers',
                          display_order: 1,
                        },
                      ],
                      seo_title: 'Nuevo Producto | Trazo Espacio Gráfico',
                      seo_description: 'Producto personalizado en Río Cuarto.',
                      created_at: now,
                      updated_at: now,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-semibold text-[#FAF8F5]"
                >
                  <Plus className="h-4 w-4" />
                  Crear producto
                </button>
              </div>

              {editingProduct && (
                <div className="space-y-4 rounded-3xl border border-[#1C1917] bg-[#FFFFFF] p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E5E4] pb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                        Editando: {editingProduct.name}
                      </h2>
                      {isProductDirty && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          Cambios sin guardar
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={closeProductEditorSafely}
                      className="text-xs font-semibold text-[#57534E] underline"
                    >
                      Cerrar editor
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Nombre del producto
                      </label>
                      <input
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            name: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Categoría
                      </label>
                      <select
                        value={editingProduct.category_id}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            category_id: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      >
                        {dashboard.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Precio oficial ARS (vacío = Cotización)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingProduct.base_price_ars ?? ''}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            base_price_ars:
                              e.target.value === ''
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        placeholder="Vacío = Solicitar presupuesto"
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Cantidad mínima
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingProduct.min_quantity ?? 1}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            min_quantity: Math.max(
                              1,
                              Number(e.target.value) || 1
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Múltiplo de compra
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingProduct.quantity_multiple}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            quantity_multiple: Math.max(
                              1,
                              Number(e.target.value) || 1
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Plazo estimado de producción
                      </label>
                      <input
                        type="text"
                        value={editingProduct.estimated_production_text || ''}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            estimated_production_text:
                              e.target.value.trim() || null,
                          })
                        }
                        placeholder="Ej: 3 a 5 días hábiles"
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Medidas confirmadas
                      </label>
                      <input
                        type="text"
                        value={editingProduct.confirmed_dimensions || ''}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            confirmed_dimensions: e.target.value.trim() || null,
                          })
                        }
                        placeholder="Ej: 5 × 5 cm"
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Material confirmado
                      </label>
                      <input
                        type="text"
                        value={editingProduct.confirmed_material || ''}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            confirmed_material: e.target.value.trim() || null,
                          })
                        }
                        placeholder="Ej: Cartulina / Vinilo / Imán flexible"
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Terminación confirmada
                      </label>
                      <input
                        type="text"
                        value={editingProduct.confirmed_finish || ''}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            confirmed_finish: e.target.value.trim() || null,
                          })
                        }
                        placeholder="Ej: Corte y perforación"
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Adicional por diseño desde cero ARS
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={
                          editingProduct.customization_config
                            .design_help_price_ars ?? ''
                        }
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            customization_config: {
                              ...editingProduct.customization_config,
                              design_help_price_ars:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value),
                            },
                          })
                        }
                        placeholder="Sin recargo fijo"
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        Disponibilidad
                      </label>
                      <select
                        value={editingProduct.availability_status}
                        onChange={(e) =>
                          updateEditingProduct({
                            ...editingProduct,
                            availability_status:
                              e.target.value as Product['availability_status'],
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      >
                        <option value="available">Disponible</option>
                        <option value="available_on_order">
                          Disponible por encargo
                        </option>
                        <option value="limited_quota">Cupo limitado</option>
                        <option value="paused">Pausado temporalmente</option>
                        <option value="archived">Archivado (oculto)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917]">
                        URL Fotografía principal
                      </label>
                      <input
                        type="text"
                        value={editingProduct.images[0]?.url || ''}
                        onChange={(e) => {
                          const firstImg = editingProduct.images[0] || {
                            id: 'img-1',
                            url: '',
                            alt: editingProduct.name,
                            is_real_authorized_photo: true,
                            illustration_variant: 'stickers',
                            caption: editingProduct.name,
                            display_order: 1,
                          };
                          updateEditingProduct({
                            ...editingProduct,
                            images: [
                              {
                                ...firstImg,
                                url: e.target.value.trim() || null,
                                is_real_authorized_photo: Boolean(
                                  e.target.value.trim()
                                ),
                              },
                              ...editingProduct.images.slice(1),
                            ],
                          });
                        }}
                        placeholder="/images/trazo/post-..."
                        className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  {/* Variantes */}
                  <div className="space-y-2.5 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#1C1917]">
                        Variantes y presentaciones (
                        {editingProduct.variants.length})
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          updateEditingProduct({
                            ...editingProduct,
                            variants: [
                              ...editingProduct.variants,
                              {
                                id: `var_${Date.now()}`,
                                product_id: editingProduct.id,
                                name: 'Nueva variante',
                                dimensions_label: null,
                                material_label: null,
                                finish_label: null,
                                price_ars: null,
                                sandbox_test_price_ars: 5000,
                                pack_units: null,
                                is_confirmed_spec: false,
                                is_enabled: true,
                                display_order:
                                  editingProduct.variants.length + 1,
                              },
                            ],
                          })
                        }
                        className="rounded-full border border-[#1C1917] bg-[#FFFFFF] px-3 py-1 text-[11px] font-semibold text-[#1C1917]"
                      >
                        + Agregar variante
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editingProduct.variants.map((v, vIdx) => (
                        <div
                          key={v.id}
                          className="grid items-center gap-2 rounded-xl border border-[#D6D3CD] bg-[#FFFFFF] p-2.5 sm:grid-cols-12"
                        >
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                              const next = [...editingProduct.variants];
                              next[vIdx] = { ...v, name: e.target.value };
                              updateEditingProduct({
                                ...editingProduct,
                                variants: next,
                              });
                            }}
                            placeholder="Nombre de variante"
                            className="rounded-lg border border-[#D6D3CD] bg-[#FAF8F5] px-2.5 py-1.5 text-xs sm:col-span-5"
                          />
                          <input
                            type="number"
                            min="0"
                            value={v.price_ars ?? ''}
                            onChange={(e) => {
                              const next = [...editingProduct.variants];
                              next[vIdx] = {
                                ...v,
                                price_ars:
                                  e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                              };
                              updateEditingProduct({
                                ...editingProduct,
                                variants: next,
                              });
                            }}
                            placeholder="Precio ARS (vacío = usa base)"
                            className="rounded-lg border border-[#D6D3CD] bg-[#FAF8F5] px-2.5 py-1.5 text-xs sm:col-span-4"
                          />
                          <label className="inline-flex items-center gap-1.5 font-semibold sm:col-span-3">
                            <input
                              type="checkbox"
                              checked={v.is_enabled}
                              onChange={(e) => {
                                const next = [...editingProduct.variants];
                                next[vIdx] = {
                                  ...v,
                                  is_enabled: e.target.checked,
                                };
                                updateEditingProduct({
                                  ...editingProduct,
                                  variants: next,
                                });
                              }}
                              className="h-3.5 w-3.5 accent-[#1C1917]"
                            />
                            Activa
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Opciones de personalización */}
                  <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs">
                    <p className="font-semibold text-[#1C1917]">
                      Campos habilitados en el personalizador:
                    </p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-4">
                      {[
                        { key: 'allow_photo_upload', label: 'Subir fotos' },
                        {
                          key: 'allow_logo_upload',
                          label: 'Subir logo/diseño',
                        },
                        {
                          key: 'allow_custom_text',
                          label: 'Texto o frase',
                        },
                        { key: 'allow_color_notes', label: 'Indicar colores' },
                        { key: 'allow_observations', label: 'Observaciones' },
                        { key: 'allow_variants', label: 'Selector variantes' },
                        {
                          key: 'allow_design_help',
                          label: 'Solicitar diseño',
                        },
                        {
                          key: 'requires_design_approval',
                          label: 'Exigir aprobación',
                        },
                      ].map((field) => {
                        const checked = Boolean(
                          editingProduct.customization_config[
                            field.key as keyof Product['customization_config']
                          ]
                        );
                        return (
                          <label
                            key={field.key}
                            className="inline-flex items-center gap-2 font-medium"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                updateEditingProduct({
                                  ...editingProduct,
                                  customization_config: {
                                    ...editingProduct.customization_config,
                                    [field.key]: e.target.checked,
                                  },
                                })
                              }
                              className="h-4 w-4 accent-[#1C1917]"
                            />
                            {field.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-4 text-xs font-semibold">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingProduct.is_featured}
                          onChange={(e) =>
                            updateEditingProduct({
                              ...editingProduct,
                              is_featured: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-[#1C1917]"
                        />
                        Destacado en inicio
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingProduct.is_published}
                          onChange={(e) =>
                            updateEditingProduct({
                              ...editingProduct,
                              is_published: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-[#1C1917]"
                        />
                        Publicado en tienda
                      </label>
                    </div>

                    <button
                      type="button"
                      data-testid="admin-save-product-btn"
                      onClick={async () => {
                        const res = await executeAdminAction({
                          action: 'upsert_product',
                          product: editingProduct,
                        });
                        if (res) {
                          setEditingProduct(null);
                          setIsProductDirty(false);
                          setFeedbackBanner({
                            type: 'success',
                            text: `Producto "${editingProduct.name}" guardado correctamente.`,
                          });
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-semibold text-[#FAF8F5]"
                    >
                      <Save className="h-4 w-4" />
                      Guardar cambios del producto
                    </button>
                  </div>
                </div>
              )}

              {/* Grilla de productos con indicador de preparación comercial */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.products.map((p) => {
                  const readiness = getProductReadiness(p);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-[#78716C]">
                            {p.slug}
                          </span>
                          {p.is_featured && (
                            <span className="rounded-full bg-[#F4F1EA] px-2.5 py-0.5 text-[10px] font-semibold text-[#1C1917]">
                              Destacado
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 text-base font-semibold text-[#1C1917]">
                          {p.name}
                        </h3>

                        {/* Indicadores de preparación comercial */}
                        <div className="mt-3 space-y-1.5 rounded-xl bg-[#FAF8F5] p-3 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[#57534E]">Precio:</span>
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                readiness.hasOfficialPrice
                                  ? 'text-emerald-800'
                                  : 'text-amber-800'
                              }`}
                            >
                              {readiness.hasOfficialPrice ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  {p.base_price_ars !== null
                                    ? formatARS(p.base_price_ars)
                                    : 'En variantes'}
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3 w-3" />
                                  Por cotización
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#57534E]">Imagen:</span>
                            <span
                              className={`font-semibold ${
                                readiness.hasRealPhoto
                                  ? 'text-emerald-800'
                                  : 'text-[#57534E]'
                              }`}
                            >
                              {readiness.hasRealPhoto
                                ? '✓ Foto real'
                                : 'Esquema orientativo'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#57534E]">Plazo:</span>
                            <span
                              className={`font-semibold ${
                                readiness.hasProductionTime
                                  ? 'text-emerald-800'
                                  : 'text-[#57534E]'
                              }`}
                            >
                              {readiness.hasProductionTime
                                ? p.estimated_production_text
                                : 'A confirmar al pedir'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openProductEditor(p)}
                        className="mt-4 w-full rounded-xl border border-[#1C1917] bg-[#FAF8F5] py-2 font-semibold text-[#1C1917] hover:bg-[#F4F1EA]"
                      >
                        Editar producto
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 5: PRESUPUESTOS Y EVENTOS */}
          {activeSection === 'presupuestos' && (
            <div className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                  Presupuestos y eventos ({dashboard.quoteRequests.length})
                </h1>
                <p className="mt-1 text-xs text-[#57534E]">
                  Consultas de productos a medida, kits para emprendedores y
                  stand de tatuajes temporales para eventos.
                </p>
              </div>

              {dashboard.quoteRequests.length === 0 ? (
                <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-8 text-center text-xs text-[#57534E]">
                  Todavía no se recibieron solicitudes de presupuesto.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {dashboard.quoteRequests.map((q) => (
                    <div
                      key={q.id}
                      className="space-y-2.5 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#1C1917]">
                          {q.reference_code} ·{' '}
                          {q.request_type === 'tattoo_stand_event'
                            ? 'Stand para evento'
                            : 'Presupuesto de producto'}
                        </span>
                        <select
                          value={q.status}
                          onChange={(e) =>
                            executeAdminAction({
                              action: 'update_quote',
                              quoteId: q.id,
                              status: e.target.value as QuoteStatus,
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                            QUOTE_STATUS_LABELS[q.status].colorClass
                          }`}
                        >
                          {Object.entries(QUOTE_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <p>
                        <strong>Cliente:</strong> {q.customer_name} (
                        {q.customer_contact}
                        {q.customer_email ? ` · ${q.customer_email}` : ''})
                      </p>
                      {q.product_name && (
                        <p>
                          <strong>Producto / Propuesta:</strong>{' '}
                          {q.product_name}
                          {q.requested_quantity
                            ? ` · Cantidad: ${q.requested_quantity}`
                            : ''}
                        </p>
                      )}
                      {q.event_type && (
                        <p>
                          <strong>Evento:</strong> {q.event_type} · Fecha:{' '}
                          {q.event_date} · Localidad: {q.event_locality} ·
                          Invitados: {q.estimated_guests}
                        </p>
                      )}
                      {q.theme_or_idea && (
                        <p>
                          <strong>Temática / Idea:</strong> {q.theme_or_idea}
                        </p>
                      )}
                      {q.observations && (
                        <p>
                          <strong>Observaciones:</strong> {q.observations}
                        </p>
                      )}
                      {q.customization_payload && (
                        <div className="rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-2.5 text-[11px] text-[#57534E]">
                          {q.customization_payload.selected_dimensions && (
                            <p>
                              <strong>Presentación / Medida:</strong>{' '}
                              {q.customization_payload.selected_dimensions}
                            </p>
                          )}
                          {q.customization_payload.custom_text && (
                            <p>
                              <strong>Texto / Frase:</strong>{' '}
                              {q.customization_payload.custom_text}
                            </p>
                          )}
                          {q.customization_payload.color_notes && (
                            <p>
                              <strong>Colores:</strong>{' '}
                              {q.customization_payload.color_notes}
                            </p>
                          )}
                          {q.customization_payload.design_help_requested && (
                            <p className="font-semibold text-purple-900">
                              ✦ Solicitó armado de diseño
                            </p>
                          )}
                        </div>
                      )}
                      {q.file_ids && q.file_ids.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {q.file_ids.map((fid) => {
                            const signed = dashboard.adminSignedFilesMap[fid];
                            if (!signed) return null;
                            return (
                              <a
                                key={fid}
                                href={signed.signed_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#D6D3CD] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-semibold text-[#1C1917]"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {signed.original_filename}
                              </a>
                            );
                          })}
                        </div>
                      )}
                      <div className="border-t border-[#E7E5E4] pt-2">
                        <input
                          type="text"
                          defaultValue={q.admin_notes || ''}
                          placeholder="Notas internas de cotización..."
                          onBlur={(e) =>
                            executeAdminAction({
                              action: 'update_quote',
                              quoteId: q.id,
                              adminNotes: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-[#D6D3CD] bg-[#FAF8F5] px-2.5 py-1.5 text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 6: CONTENIDO */}
          {activeSection === 'contenido' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                  Contenido y canales de contacto
                </h1>
                <p className="mt-1 text-xs text-[#57534E]">
                  Editá los textos principales de portada, la dirección de
                  retiro en Río Cuarto y los textos informativos.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs">
                  <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                    Portada y dirección
                  </h2>
                  <div>
                    <label className="block font-semibold text-[#1C1917]">
                      Título principal de portada
                    </label>
                    <input
                      type="text"
                      defaultValue={dashboard.storeSettings.hero_config.title}
                      onBlur={(e) =>
                        executeAdminAction({
                          action: 'update_store_settings',
                          settingsPatch: {
                            hero_config: {
                              ...dashboard.storeSettings.hero_config,
                              title: e.target.value,
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1C1917]">
                      Descripción de portada
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={
                        dashboard.storeSettings.hero_config.description
                      }
                      onBlur={(e) =>
                        executeAdminAction({
                          action: 'update_store_settings',
                          settingsPatch: {
                            hero_config: {
                              ...dashboard.storeSettings.hero_config,
                              description: e.target.value,
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1C1917]">
                      Dirección exacta de retiro en Río Cuarto (opcional)
                    </label>
                    <input
                      type="text"
                      defaultValue={dashboard.storeSettings.exact_address || ''}
                      placeholder="Vacío = Se coordina al confirmar el pedido"
                      onBlur={(e) =>
                        executeAdminAction({
                          action: 'update_store_settings',
                          settingsPatch: {
                            exact_address: e.target.value.trim() || null,
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs">
                  <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                    Políticas informativas
                  </h2>
                  <div>
                    <label className="block font-semibold text-[#1C1917]">
                      Términos y condiciones generales
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={
                        dashboard.storeSettings.policies.terms_and_conditions
                          .content
                      }
                      onBlur={(e) =>
                        executeAdminAction({
                          action: 'update_store_settings',
                          settingsPatch: {
                            policies: {
                              ...dashboard.storeSettings.policies,
                              terms_and_conditions: {
                                ...dashboard.storeSettings.policies
                                  .terms_and_conditions,
                                content: e.target.value,
                              },
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1C1917]">
                      Cambios, devoluciones y productos personalizados
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={
                        dashboard.storeSettings.policies
                          .returns_and_cancellations.content
                      }
                      onBlur={(e) =>
                        executeAdminAction({
                          action: 'update_store_settings',
                          settingsPatch: {
                            policies: {
                              ...dashboard.storeSettings.policies,
                              returns_and_cancellations: {
                                ...dashboard.storeSettings.policies
                                  .returns_and_cancellations,
                                content: e.target.value,
                              },
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 7: PAGOS Y ENVÍOS */}
          {activeSection === 'pagos_envios' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                  Pagos, transferencias y envíos
                </h1>
                <p className="mt-1 text-xs text-[#57534E]">
                  Configurá los datos bancarios para transferencias, las
                  modalidades de entrega y el modo interno de prueba.
                </p>
              </div>

              <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs space-y-4">
                <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                  Datos bancarios para transferencias
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    defaultValue={
                      dashboard.storeSettings.bank_transfer_config.bank_name ||
                      ''
                    }
                    placeholder="Banco o billetera"
                    onBlur={(e) =>
                      executeAdminAction({
                        action: 'update_store_settings',
                        settingsPatch: {
                          bank_transfer_config: {
                            ...dashboard.storeSettings.bank_transfer_config,
                            is_configured: Boolean(e.target.value.trim()),
                            bank_name: e.target.value.trim() || null,
                          },
                        },
                      })
                    }
                    className="rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                  />
                  <input
                    type="text"
                    defaultValue={
                      dashboard.storeSettings.bank_transfer_config
                        .account_holder || ''
                    }
                    placeholder="Titular de la cuenta"
                    onBlur={(e) =>
                      executeAdminAction({
                        action: 'update_store_settings',
                        settingsPatch: {
                          bank_transfer_config: {
                            ...dashboard.storeSettings.bank_transfer_config,
                            is_configured: true,
                            account_holder: e.target.value.trim() || null,
                          },
                        },
                      })
                    }
                    className="rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                  />
                  <input
                    type="text"
                    defaultValue={
                      dashboard.storeSettings.bank_transfer_config.alias || ''
                    }
                    placeholder="Alias CBU/CVU"
                    onBlur={(e) =>
                      executeAdminAction({
                        action: 'update_store_settings',
                        settingsPatch: {
                          bank_transfer_config: {
                            ...dashboard.storeSettings.bank_transfer_config,
                            is_configured: true,
                            alias: e.target.value.trim() || null,
                          },
                        },
                      })
                    }
                    className="rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                  />
                  <input
                    type="text"
                    defaultValue={
                      dashboard.storeSettings.bank_transfer_config.cbu_or_cvu ||
                      ''
                    }
                    placeholder="Número de CBU / CVU (22 dígitos)"
                    onBlur={(e) =>
                      executeAdminAction({
                        action: 'update_store_settings',
                        settingsPatch: {
                          bank_transfer_config: {
                            ...dashboard.storeSettings.bank_transfer_config,
                            is_configured: true,
                            cbu_or_cvu: e.target.value.trim() || null,
                          },
                        },
                      })
                    }
                    className="rounded-xl border border-[#D6D3CD] bg-[#FAF8F5] px-3 py-2"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs space-y-4">
                <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                  Modalidades de retiro y envío
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {dashboard.storeSettings.shipping_methods.map(
                    (method, mIdx) => (
                      <div
                        key={method.id}
                        className="space-y-2.5 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#1C1917]">
                            {method.name}
                          </span>
                          <label className="inline-flex items-center gap-1.5 font-semibold">
                            <input
                              type="checkbox"
                              defaultChecked={method.is_enabled}
                              onChange={(e) => {
                                const next = [
                                  ...dashboard.storeSettings.shipping_methods,
                                ];
                                next[mIdx] = {
                                  ...method,
                                  is_enabled: e.target.checked,
                                };
                                executeAdminAction({
                                  action: 'update_store_settings',
                                  settingsPatch: { shipping_methods: next },
                                });
                              }}
                              className="h-4 w-4 accent-[#1C1917]"
                            />
                            Habilitado
                          </label>
                        </div>
                        <p className="text-[11px] text-[#57534E]">
                          {method.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <label className="inline-flex items-center gap-1.5 font-semibold">
                            <input
                              type="checkbox"
                              defaultChecked={method.requires_quote}
                              onChange={(e) => {
                                const next = [
                                  ...dashboard.storeSettings.shipping_methods,
                                ];
                                next[mIdx] = {
                                  ...method,
                                  requires_quote: e.target.checked,
                                };
                                executeAdminAction({
                                  action: 'update_store_settings',
                                  settingsPatch: { shipping_methods: next },
                                });
                              }}
                              className="h-3.5 w-3.5 accent-[#1C1917]"
                            />
                            A cotizar según destino
                          </label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={method.price_ars ?? ''}
                            placeholder="Costo fijo ARS (0 = sin cargo)"
                            onBlur={(e) => {
                              const next = [
                                ...dashboard.storeSettings.shipping_methods,
                              ];
                              next[mIdx] = {
                                ...method,
                                price_ars:
                                  e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                              };
                              executeAdminAction({
                                action: 'update_store_settings',
                                settingsPatch: { shipping_methods: next },
                              });
                            }}
                            className="w-44 rounded-lg border border-[#D6D3CD] bg-[#FFFFFF] px-2.5 py-1 text-xs"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Control interno de tarifas de prueba Sandbox (solo visible dentro de Admin) */}
              <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#1C1917]">
                      Modo de prueba de compra (Sandbox interno)
                    </h2>
                    <p className="mt-1 text-xs text-[#57534E]">
                      Habilita importes de prueba para verificar el recorrido de
                      carrito y checkout antes de publicar la lista oficial de
                      precios.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      executeAdminAction({
                        action: 'toggle_sandbox_prices',
                        enabled:
                          !dashboard.storeSettings.sandbox_test_prices_enabled,
                      })
                    }
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
                      dashboard.storeSettings.sandbox_test_prices_enabled
                        ? 'bg-amber-600 text-[#FFFFFF]'
                        : 'border border-[#1C1917] bg-[#FAF8F5] text-[#1C1917]'
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {dashboard.storeSettings.sandbox_test_prices_enabled
                      ? 'Desactivar tarifas de prueba'
                      : 'Activar tarifas de prueba'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 8: INTEGRACIONES */}
          {activeSection === 'integraciones' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold text-[#1C1917]">
                  Estado de integraciones y servicios
                </h1>
                <p className="mt-1 text-xs text-[#57534E]">
                  Diferenciación entre motores activos en este servidor y
                  credenciales externas opcionales.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 text-xs">
                  <p className="font-semibold text-[#1C1917]">
                    1. Base de datos y persistencia
                  </p>
                  <p className="mt-1.5 text-[#57534E]">
                    {dashboard.integrations.database.activeEngine}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 text-xs">
                  <p className="font-semibold text-[#1C1917]">
                    2. Almacenamiento privado de archivos
                  </p>
                  <p className="mt-1.5 text-[#57534E]">
                    {dashboard.integrations.privateStorage.activeEngine}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 text-xs">
                  <p className="font-semibold text-[#1C1917]">
                    3. Pasarela Mercado Pago
                  </p>
                  <p className="mt-1.5 text-[#57534E]">
                    {dashboard.integrations.mercadoPago.statusLabel}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-5 text-xs">
                  <p className="font-semibold text-[#1C1917]">
                    4. Correos transaccionales (Resend / SMTP)
                  </p>
                  <p className="mt-1.5 text-[#57534E]">
                    {dashboard.integrations.transactionalEmail.statusLabel}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
