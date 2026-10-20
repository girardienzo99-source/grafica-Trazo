import {
  Product,
  ProductVariant,
  ProductionStatus,
  PaymentStatus,
  QuoteStatus,
} from '@/types/trazo';

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatARS(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return 'Solicitar presupuesto';
  }
  return arsFormatter.format(Math.round(amount));
}

export function formatDateTimeAR(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Argentina/Cordoba',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Resolves the effective unit price of a product + variant.
 * Returns null if no official price is configured and sandbox test prices are disabled.
 */
export function resolveEffectiveProductPrice(
  product: Product,
  variant: ProductVariant | null | undefined,
  sandboxEnabled: boolean
): {
  unitPriceArs: number | null;
  isSandboxPrice: boolean;
  designHelpSurchargeArs: number;
} {
  // 1. Check if official price is configured on variant or product
  if (variant && variant.price_ars !== null && variant.price_ars !== undefined && variant.price_ars > 0) {
    return {
      unitPriceArs: variant.price_ars,
      isSandboxPrice: product.is_test_price,
      designHelpSurchargeArs: product.customization_config.design_help_price_ars ?? 0,
    };
  }

  if (product.base_price_ars !== null && product.base_price_ars !== undefined && product.base_price_ars > 0) {
    return {
      unitPriceArs: product.base_price_ars,
      isSandboxPrice: product.is_test_price,
      designHelpSurchargeArs: product.customization_config.design_help_price_ars ?? 0,
    };
  }

  // 2. If sandbox test prices are enabled and product has a sandbox price
  if (sandboxEnabled && product.availability_status !== 'quote_only') {
    const varSandbox = variant?.sandbox_test_price_ars ?? null;
    const prodSandbox = product.sandbox_test_price_ars ?? null;
    const effective = varSandbox ?? prodSandbox;
    if (effective !== null && effective > 0) {
      return {
        unitPriceArs: effective,
        isSandboxPrice: true,
        designHelpSurchargeArs:
          product.customization_config.design_help_price_ars ??
          product.customization_config.sandbox_design_help_price_ars ??
          0,
      };
    }
  }

  return {
    unitPriceArs: null,
    isSandboxPrice: false,
    designHelpSurchargeArs: product.customization_config.design_help_price_ars ?? 0,
  };
}

/**
 * Calculates unit price after applying quantity scale discounts configured on the product.
 */
export function calculateQuantityTierPrice(
  product: Product,
  baseUnitPriceArs: number | null,
  quantity: number
): {
  finalUnitPriceArs: number | null;
  appliedTierLabel: string | null;
  discountPercent: number;
} {
  if (baseUnitPriceArs === null) {
    return { finalUnitPriceArs: null, appliedTierLabel: null, discountPercent: 0 };
  }

  const matchingTier = [...(product.quantity_tiers || [])]
    .sort((a, b) => b.min_qty - a.min_qty)
    .find(
      (t) =>
        quantity >= t.min_qty &&
        (t.max_qty === null || t.max_qty === undefined || quantity <= t.max_qty)
    );

  if (!matchingTier) {
    return { finalUnitPriceArs: baseUnitPriceArs, appliedTierLabel: null, discountPercent: 0 };
  }

  if (matchingTier.unit_price_ars !== null && matchingTier.unit_price_ars > 0) {
    return {
      finalUnitPriceArs: matchingTier.unit_price_ars,
      appliedTierLabel: matchingTier.label,
      discountPercent: matchingTier.discount_percent || 0,
    };
  }

  const discounted = Math.round(baseUnitPriceArs * (1 - (matchingTier.discount_percent || 0) / 100));
  return {
    finalUnitPriceArs: discounted,
    appliedTierLabel: matchingTier.label,
    discountPercent: matchingTier.discount_percent || 0,
  };
}

export const PRODUCTION_STATUS_LABELS: Record<
  ProductionStatus,
  { label: string; description: string; colorClass: string; stepIndex: number }
> = {
  pedido_recibido: {
    label: 'Pedido recibido',
    description: 'Registramos tu pedido en el sistema de Trazo Espacio Gráfico.',
    colorClass: 'bg-slate-100 text-slate-900 border-slate-300',
    stepIndex: 1,
  },
  archivos_pendientes: {
    label: 'Archivos pendientes',
    description: 'Necesitamos que subas o actualices un archivo para continuar.',
    colorClass: 'bg-orange-100 text-orange-900 border-orange-300',
    stepIndex: 2,
  },
  en_revision_diseno: {
    label: 'En revisión de diseño',
    description: 'Nuestro equipo está preparando o verificando tus archivos y medidas.',
    colorClass: 'bg-blue-100 text-blue-900 border-blue-300',
    stepIndex: 3,
  },
  esperando_aprobacion_cliente: {
    label: 'Esperando aprobación del cliente',
    description: 'Subimos una propuesta de diseño. Revisala y aprobala para comenzar a producir.',
    colorClass: 'bg-purple-100 text-purple-900 border-purple-300',
    stepIndex: 4,
  },
  aprobado_para_producir: {
    label: 'Aprobado para producir',
    description: 'El diseño fue aprobado y está en cola para entrar al taller.',
    colorClass: 'bg-teal-100 text-teal-900 border-teal-300',
    stepIndex: 5,
  },
  en_produccion: {
    label: 'En producción',
    description: 'Estamos produciendo tus piezas personalizadas en nuestro taller de Río Cuarto.',
    colorClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    stepIndex: 6,
  },
  listo_para_retirar: {
    label: 'Listo para retirar',
    description: 'Tu pedido está terminado y listo para coordinar el retiro en Río Cuarto.',
    colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    stepIndex: 7,
  },
  despachado: {
    label: 'Despachado',
    description: 'Tu pedido fue despachado. Podés consultar el código de seguimiento.',
    colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    stepIndex: 7,
  },
  entregado: {
    label: 'Entregado',
    description: 'El pedido fue entregado. ¡Gracias por elegir Trazo Espacio Gráfico!',
    colorClass: 'bg-green-100 text-green-950 border-green-400',
    stepIndex: 8,
  },
  cancelado: {
    label: 'Cancelado',
    description: 'Este pedido fue cancelado.',
    colorClass: 'bg-rose-100 text-rose-900 border-rose-300',
    stepIndex: 0,
  },
};

export const PAYMENT_STATUS_LABELS: Record<
  PaymentStatus,
  { label: string; colorClass: string }
> = {
  pending: {
    label: 'Pendiente de pago',
    colorClass: 'bg-slate-100 text-slate-900 border-slate-300',
  },
  transfer_proof_uploaded: {
    label: 'Comprobante en validación',
    colorClass: 'bg-sky-100 text-sky-900 border-sky-300',
  },
  in_process: {
    label: 'Pago en proceso',
    colorClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  paid: {
    label: 'Pago confirmado',
    colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  rejected: {
    label: 'Pago rechazado',
    colorClass: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  refunded: {
    label: 'Pago reintegrado',
    colorClass: 'bg-stone-200 text-stone-800 border-stone-400',
  },
};

export const QUOTE_STATUS_LABELS: Record<
  QuoteStatus,
  { label: string; colorClass: string }
> = {
  nuevo: { label: 'Nueva consulta', colorClass: 'bg-slate-100 text-slate-900 border-slate-300' },
  contactado: { label: 'Contactado', colorClass: 'bg-blue-100 text-blue-900 border-blue-300' },
  presupuestado: { label: 'Presupuestado', colorClass: 'bg-purple-100 text-purple-900 border-purple-300' },
  confirmado: { label: 'Confirmado', colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  descartado: { label: 'Descartado', colorClass: 'bg-stone-200 text-stone-700 border-stone-300' },
};

/**
 * Generates contextual WhatsApp links to +54 9 358 510 4732 WITHOUT exposing
 * private file links, access tokens, or sensitive personal/payment data.
 */
export function buildSafeWhatsAppUrl(params: {
  context: 'general' | 'product' | 'order' | 'event_stand' | 'quote';
  productName?: string;
  variantName?: string;
  quantity?: number;
  orderNumber?: string;
  quoteReference?: string;
}): string {
  const base = 'https://wa.me/5493585104732';
  let text = '¡Hola Trazo Espacio Gráfico! Quería hacerles una consulta desde la tienda web.';

  if (params.context === 'product' && params.productName) {
    const qtyText = params.quantity ? ` (Cantidad: ${params.quantity})` : '';
    const varText = params.variantName ? ` - Variante: ${params.variantName}` : '';
    text = `¡Hola Trazo! Estoy viendo en la web el producto "${params.productName}"${varText}${qtyText} y quería consultarles.`;
  } else if (params.context === 'order' && params.orderNumber) {
    // Only includes the public order number, NEVER the secret access_token or private file URLs
    text = `¡Hola Trazo! Les escribo por mi pedido N° ${params.orderNumber} realizado en la tienda web.`;
  } else if (params.context === 'event_stand') {
    const ref = params.quoteReference ? ` (Ref: ${params.quoteReference})` : '';
    text = `¡Hola Trazo! Quería consultar por el Stand Creativo de Tatuajes Temporales para un evento${ref}.`;
  } else if (params.context === 'quote' && params.quoteReference) {
    text = `¡Hola Trazo! Envié una solicitud de presupuesto en la web con referencia ${params.quoteReference}${params.productName ? ` para "${params.productName}"` : ''}.`;
  }

  return `${base}?text=${encodeURIComponent(text)}`;
}
