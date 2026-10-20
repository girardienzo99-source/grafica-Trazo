import fs from 'fs';
import path from 'path';
import {
  Category,
  DesignRevision,
  Order,
  OrderEvent,
  OrderItemSnapshot,
  PaymentRecord,
  PaymentStatus,
  PrivateFileRecord,
  Product,
  ProductionStatus,
  QuoteRequest,
  QuoteStatus,
  StoreSettings,
  TrazoDatabaseSchema,
  CustomizationPayload,
} from '@/types/trazo';
import { INITIAL_SEED_DATA } from './seed-data';
import {
  calculateQuantityTierPrice,
  resolveEffectiveProductPrice,
} from '@/lib/utils/format';
import {
  computeSha256,
  generateAccessCode,
  generateOrderNumber,
  generateQuoteReference,
  generateSecureToken,
} from '@/lib/security/auth-and-tokens';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'trazo_db.runtime.json');
const PRIVATE_STORAGE_DIR = path.join(DATA_DIR, 'private_storage');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
    fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
  }
}

function normalizeRuntimeCatalogStrings(db: TrazoDatabaseSchema): boolean {
  let mutated = false;

  for (const prod of db.products) {
    const seedProd = INITIAL_SEED_DATA.products.find((p) => p.id === prod.id);
    if (!seedProd) continue;

    if (
      prod.images.some(
        (img) => !img.url || img.url.endsWith('.svg') || !img.is_real_authorized_photo
      )
    ) {
      prod.images = JSON.parse(JSON.stringify(seedProd.images));
      mutated = true;
    }

    for (const v of prod.variants) {
      const seedVar = seedProd.variants.find((sv) => sv.id === v.id);
      if (
        seedVar &&
        (v.name.includes('configuración') ||
          v.name.includes('confirmar') ||
          v.name.includes('configurable'))
      ) {
        v.name = seedVar.name;
        v.dimensions_label = seedVar.dimensions_label;
        v.material_label = seedVar.material_label;
        v.finish_label = seedVar.finish_label;
        mutated = true;
      }
    }

    for (const t of prod.quantity_tiers || []) {
      if (t.label.includes('configurable')) {
        t.label = t.label.replace(/\s*\(escala configurable\)/gi, '');
        mutated = true;
      }
    }
  }

  if (db.store_settings) {
    if (
      db.store_settings.hero_config.secondary_cta_text === 'Armar mi pedido'
    ) {
      db.store_settings.hero_config.secondary_cta_text =
        'Personalizar mis imanes';
      mutated = true;
    }

    for (const sm of db.store_settings.shipping_methods || []) {
      const seedSm = INITIAL_SEED_DATA.store_settings.shipping_methods.find(
        (s) => s.id === sm.id
      );
      if (
        seedSm &&
        (sm.name.includes('configurable') ||
          sm.description.includes('Panel Admin'))
      ) {
        sm.name = seedSm.name;
        sm.description = seedSm.description;
        sm.estimated_transit_text = seedSm.estimated_transit_text;
        mutated = true;
      }
    }

    if (
      db.store_settings.bank_transfer_config.instructions.includes(
        'Panel Administrador'
      )
    ) {
      db.store_settings.bank_transfer_config.instructions =
        INITIAL_SEED_DATA.store_settings.bank_transfer_config.instructions;
      mutated = true;
    }

    const beforeGalLen = (db.store_settings.gallery_items || []).length;
    db.store_settings.gallery_items = (
      db.store_settings.gallery_items || []
    ).filter((g) => Boolean(g.image_url));
    if (db.store_settings.gallery_items.length !== beforeGalLen) {
      mutated = true;
    }

    const pols = db.store_settings.policies;
    if (
      pols.privacy_policy.content.includes('Borrador técnico') ||
      pols.returns_and_cancellations.content.includes('Panel Administrador')
    ) {
      db.store_settings.policies = JSON.parse(
        JSON.stringify(INITIAL_SEED_DATA.store_settings.policies)
      );
      mutated = true;
    }
  }

  return mutated;
}

export function readDatabase(): TrazoDatabaseSchema {
  ensureDirectories();
  if (!fs.existsSync(DB_FILE_PATH)) {
    const initialCopy = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as TrazoDatabaseSchema;
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialCopy, null, 2), 'utf8');
    return initialCopy;
  }
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as TrazoDatabaseSchema;
    if (normalizeRuntimeCatalogStrings(parsed)) {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(parsed, null, 2), 'utf8');
    }
    return parsed;
  } catch {
    const initialCopy = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as TrazoDatabaseSchema;
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialCopy, null, 2), 'utf8');
    return initialCopy;
  }
}

export function writeDatabase(db: TrazoDatabaseSchema): void {
  ensureDirectories();
  const tempPath = `${DB_FILE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_FILE_PATH);
}

export function getIntegrationStatusSummary() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const mercadoPagoConfigured = Boolean(
    process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN.trim().length > 10
  );
  const mercadoPagoWebhookSecretConfigured = Boolean(
    process.env.MP_WEBHOOK_SECRET && process.env.MP_WEBHOOK_SECRET.trim().length > 5
  );
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 10
  );

  return {
    database: {
      activeEngine: supabaseConfigured
        ? 'Supabase PostgreSQL + RLS'
        : 'Motor Relacional Local Persistente (data/trazo_db.runtime.json) — Migración SQL lista en supabase/migrations/0001_trazo_schema.sql',
      supabaseConfigured,
    },
    privateStorage: {
      activeEngine: supabaseConfigured
        ? 'Supabase Private Storage Bucket'
        : 'Bóveda Privada Local fuera de /public (data/private_storage) con enlaces HMAC temporales',
      supabaseConfigured,
    },
    mercadoPago: {
      configured: mercadoPagoConfigured,
      webhookSecretConfigured: mercadoPagoWebhookSecretConfigured,
      statusLabel: mercadoPagoConfigured
        ? 'Credenciales configuradas'
        : 'Integración server-side e idempotencia operativas — Pendiente cargar MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET del comercio',
    },
    transactionalEmail: {
      configured: emailConfigured,
      statusLabel: emailConfigured
        ? 'Proveedor Resend activo'
        : 'Plantillas y disparadores listos — Pendiente cargar RESEND_API_KEY (no simula envíos falsos)',
    },
  };
}

// -----------------------------------------------------------------------------
// CATALOG & SETTINGS QUERIES
// -----------------------------------------------------------------------------
export function getPublicCatalog() {
  const db = readDatabase();
  const categories = [...db.categories]
    .filter((c) => c.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  const products = [...db.products].filter(
    (p) => p.is_published && p.availability_status !== 'archived'
  );
  return {
    categories,
    products,
    settings: db.store_settings,
  };
}

export function getProductBySlug(slug: string): {
  product: Product | null;
  category: Category | null;
  settings: StoreSettings;
} {
  const db = readDatabase();
  const product =
    db.products.find(
      (p) => p.slug === slug && p.is_published && p.availability_status !== 'archived'
    ) || null;
  const category = product
    ? db.categories.find((c) => c.id === product.category_id) || null
    : null;
  return { product, category, settings: db.store_settings };
}

export function setSandboxTestPricesMode(enabled: boolean): StoreSettings {
  const db = readDatabase();
  db.store_settings.sandbox_test_prices_enabled = Boolean(enabled);
  db.store_settings.updated_at = new Date().toISOString();
  writeDatabase(db);
  return db.store_settings;
}

export function updateStoreSettings(
  updater: (current: StoreSettings) => StoreSettings
): StoreSettings {
  const db = readDatabase();
  db.store_settings = updater(db.store_settings);
  db.store_settings.updated_at = new Date().toISOString();
  writeDatabase(db);
  return db.store_settings;
}

export function upsertProductByAdmin(productInput: Product): Product {
  const db = readDatabase();
  const now = new Date().toISOString();
  const idx = db.products.findIndex((p) => p.id === productInput.id);
  const updated: Product = {
    ...productInput,
    updated_at: now,
    created_at: idx >= 0 ? db.products[idx].created_at : now,
  };
  if (idx >= 0) {
    db.products[idx] = updated;
  } else {
    db.products.push(updated);
  }
  writeDatabase(db);
  return updated;
}

export function upsertCategoryByAdmin(categoryInput: Category): Category {
  const db = readDatabase();
  const idx = db.categories.findIndex((c) => c.id === categoryInput.id);
  if (idx >= 0) {
    db.categories[idx] = categoryInput;
  } else {
    db.categories.push(categoryInput);
  }
  writeDatabase(db);
  return categoryInput;
}

// -----------------------------------------------------------------------------
// PRIVATE FILE STORAGE (Bóveda fuera de /public)
// -----------------------------------------------------------------------------
export function savePrivateFile(params: {
  ownerToken: string;
  orderId?: string | null;
  purpose: PrivateFileRecord['purpose'];
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
  widthPx?: number | null;
  heightPx?: number | null;
  lowResolutionWarning?: boolean;
}): PrivateFileRecord {
  ensureDirectories();
  const db = readDatabase();
  const id = `file_${generateSecureToken(12)}`;
  const ext = path.extname(params.originalFilename).replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
  const safeStorageName = `${id}${ext}`;
  const fullStoragePath = path.join(PRIVATE_STORAGE_DIR, safeStorageName);

  fs.writeFileSync(fullStoragePath, params.buffer);

  const retentionDays = db.store_settings.file_retention_days || 90;
  const retentionDate = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const record: PrivateFileRecord = {
    id,
    owner_token: params.ownerToken,
    order_id: params.orderId || null,
    purpose: params.purpose,
    original_filename: params.originalFilename.replace(/[^\w.\- ()]/g, '_'),
    mime_type: params.mimeType,
    size_bytes: params.buffer.length,
    width_px: params.widthPx ?? null,
    height_px: params.heightPx ?? null,
    low_resolution_warning: Boolean(params.lowResolutionWarning),
    storage_path: safeStorageName,
    sha256_hash: computeSha256(params.buffer),
    retention_expires_at: retentionDate,
    is_deleted: false,
    created_at: new Date().toISOString(),
  };

  db.private_files.push(record);
  writeDatabase(db);
  return record;
}

export function getPrivateFileRecord(fileId: string): PrivateFileRecord | null {
  const db = readDatabase();
  return db.private_files.find((f) => f.id === fileId && !f.is_deleted) || null;
}

export function readPrivateFileBytes(record: PrivateFileRecord): Buffer | null {
  ensureDirectories();
  const fullPath = path.join(PRIVATE_STORAGE_DIR, path.basename(record.storage_path));
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

export function deletePrivateFileByAdmin(fileId: string): boolean {
  const db = readDatabase();
  const file = db.private_files.find((f) => f.id === fileId);
  if (!file) return false;
  const fullPath = path.join(PRIVATE_STORAGE_DIR, path.basename(file.storage_path));
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // ignore if already removed
    }
  }
  file.is_deleted = true;
  writeDatabase(db);
  return true;
}

// -----------------------------------------------------------------------------
// SERVER-SIDE CART & ORDER VALIDATION AND CREATION
// Never trusts client prices or totals!
// -----------------------------------------------------------------------------
export interface ServerValidatedOrderLineInput {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  design_help_requested: boolean;
  customization_summary: string;
  customization_payload: CustomizationPayload;
  file_ids: string[];
}

export function validateAndComputeCartOnServer(params: {
  items: ServerValidatedOrderLineInput[];
  discountCode?: string | null;
  deliveryMethodId?: string | null;
}): {
  valid: boolean;
  error?: string;
  hasUnpricedItems: boolean;
  isSandboxPricingActive: boolean;
  validatedItems: Array<{
    product: Product;
    categoryName: string;
    variantName: string | null;
    variantId: string | null;
    quantity: number;
    unitPriceArs: number | null;
    designHelpSurchargeArs: number;
    lineTotalArs: number | null;
    requiresDesignApproval: boolean;
    customizationSummary: string;
    customizationPayload: CustomizationPayload;
    fileIds: string[];
  }>;
  subtotalArs: number;
  discountArs: number;
  appliedDiscountCode: string | null;
  shippingMethod: StoreSettings['shipping_methods'][0] | null;
  shippingCostArs: number | null;
  shippingRequiresQuote: boolean;
  totalArs: number;
} {
  const db = readDatabase();
  const sandboxEnabled = db.store_settings.sandbox_test_prices_enabled;

  if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
    return {
      valid: false,
      error: 'El carrito está vacío.',
      hasUnpricedItems: false,
      isSandboxPricingActive: sandboxEnabled,
      validatedItems: [],
      subtotalArs: 0,
      discountArs: 0,
      appliedDiscountCode: null,
      shippingMethod: null,
      shippingCostArs: null,
      shippingRequiresQuote: false,
      totalArs: 0,
    };
  }

  let hasUnpricedItems = false;
  let subtotalArs = 0;
  const validatedItems = [];

  for (const line of params.items) {
    const product = db.products.find(
      (p) =>
        p.id === line.product_id &&
        p.is_published &&
        p.availability_status !== 'archived'
    );
    if (!product) {
      return {
        valid: false,
        error: `Uno de los productos seleccionados ya no está disponible en el catálogo.`,
        hasUnpricedItems: false,
        isSandboxPricingActive: sandboxEnabled,
        validatedItems: [],
        subtotalArs: 0,
        discountArs: 0,
        appliedDiscountCode: null,
        shippingMethod: null,
        shippingCostArs: null,
        shippingRequiresQuote: false,
        totalArs: 0,
      };
    }

    if (product.availability_status === 'out_of_stock') {
      return {
        valid: false,
        error: `El producto "${product.name}" se encuentra temporalmente sin cupo de producción.`,
        hasUnpricedItems: false,
        isSandboxPricingActive: sandboxEnabled,
        validatedItems: [],
        subtotalArs: 0,
        discountArs: 0,
        appliedDiscountCode: null,
        shippingMethod: null,
        shippingCostArs: null,
        shippingRequiresQuote: false,
        totalArs: 0,
      };
    }

    const qty = Math.floor(Number(line.quantity) || 0);
    const minQty = product.min_quantity ?? 1;
    if (qty < minQty) {
      return {
        valid: false,
        error: `La cantidad mínima para "${product.name}" es de ${minQty} unidad(es).`,
        hasUnpricedItems: false,
        isSandboxPricingActive: sandboxEnabled,
        validatedItems: [],
        subtotalArs: 0,
        discountArs: 0,
        appliedDiscountCode: null,
        shippingMethod: null,
        shippingCostArs: null,
        shippingRequiresQuote: false,
        totalArs: 0,
      };
    }

    if (product.quantity_multiple > 1 && qty % product.quantity_multiple !== 0) {
      return {
        valid: false,
        error: `"${product.name}" se comercializa en múltiplos de ${product.quantity_multiple} unidades.`,
        hasUnpricedItems: false,
        isSandboxPricingActive: sandboxEnabled,
        validatedItems: [],
        subtotalArs: 0,
        discountArs: 0,
        appliedDiscountCode: null,
        shippingMethod: null,
        shippingCostArs: null,
        shippingRequiresQuote: false,
        totalArs: 0,
      };
    }

    if (product.stock_or_quota !== null && qty > product.stock_or_quota) {
      return {
        valid: false,
        error: `La cantidad solicitada para "${product.name}" supera el cupo disponible (${product.stock_or_quota}).`,
        hasUnpricedItems: false,
        isSandboxPricingActive: sandboxEnabled,
        validatedItems: [],
        subtotalArs: 0,
        discountArs: 0,
        appliedDiscountCode: null,
        shippingMethod: null,
        shippingCostArs: null,
        shippingRequiresQuote: false,
        totalArs: 0,
      };
    }

    const variant = line.variant_id
      ? product.variants.find((v) => v.id === line.variant_id && v.is_enabled) || null
      : product.variants.find((v) => v.is_enabled) || null;

    // Regla comercial: El stand para eventos tiene su propio flujo de consulta salvo paquete con precio oficial fijo
    if (
      product.customizer_type === 'event_stand' &&
      product.base_price_ars === null &&
      (!variant || variant.price_ars === null)
    ) {
      return {
        valid: false,
        error: `El producto "${product.name}" se cotiza a medida según fecha, localidad e invitados desde la sección Eventos y Presupuestos.`,
        hasUnpricedItems: false,
        isSandboxPricingActive: sandboxEnabled,
        validatedItems: [],
        subtotalArs: 0,
        discountArs: 0,
        appliedDiscountCode: null,
        shippingMethod: null,
        shippingCostArs: null,
        shippingRequiresQuote: false,
        totalArs: 0,
      };
    }

    // Validate photo magnet quantities if magnet_photos are provided
    if (product.customizer_type === 'magnets_5x5') {
      const photos = line.customization_payload?.magnet_photos || [];
      if (photos.length === 0) {
        return {
          valid: false,
          error: `Debés cargar al menos una foto para personalizar los "${product.name}".`,
          hasUnpricedItems: false,
          isSandboxPricingActive: sandboxEnabled,
          validatedItems: [],
          subtotalArs: 0,
          discountArs: 0,
          appliedDiscountCode: null,
          shippingMethod: null,
          shippingCostArs: null,
          shippingRequiresQuote: false,
          totalArs: 0,
        };
      }
      const expectedTotalPhotos = variant?.pack_units ? variant.pack_units * qty : qty;
      const assignedPhotos = photos.reduce(
        (acc, p) => acc + Math.max(1, Math.floor(Number(p.quantity_assigned) || 1)),
        0
      );
      if (assignedPhotos !== expectedTotalPhotos) {
        return {
          valid: false,
          error: `En "${product.name}", la suma de copias asignadas a tus fotos (${assignedPhotos}) debe coincidir con el total de imanes seleccionados (${expectedTotalPhotos}).`,
          hasUnpricedItems: false,
          isSandboxPricingActive: sandboxEnabled,
          validatedItems: [],
          subtotalArs: 0,
          discountArs: 0,
          appliedDiscountCode: null,
          shippingMethod: null,
          shippingCostArs: null,
          shippingRequiresQuote: false,
          totalArs: 0,
        };
      }
    }

    // Validate design_upload products on the server so empty customizations cannot bypass client checks
    if (product.customizer_type === 'design_upload') {
      const payload = line.customization_payload;
      const hasFile =
        (Array.isArray(line.file_ids) && line.file_ids.length > 0) ||
        Boolean(payload?.design_files && payload.design_files.length > 0);
      const hasDesignHelp =
        Boolean(line.design_help_requested) ||
        Boolean(payload?.design_help_requested);
      const hasWrittenBrief = Boolean(
        payload?.custom_text?.trim() ||
          payload?.color_notes?.trim() ||
          payload?.observations?.trim()
      );

      if (!hasFile && !hasDesignHelp && !hasWrittenBrief) {
        return {
          valid: false,
          error: `En "${product.name}", debés adjuntar tu archivo de diseño, escribir los textos/indicaciones o marcar "Solicitar ayuda con el diseño".`,
          hasUnpricedItems: false,
          isSandboxPricingActive: sandboxEnabled,
          validatedItems: [],
          subtotalArs: 0,
          discountArs: 0,
          appliedDiscountCode: null,
          shippingMethod: null,
          shippingCostArs: null,
          shippingRequiresQuote: false,
          totalArs: 0,
        };
      }
    }

    // Verify that any referenced file_ids exist in private_files
    const verifiedFileIds = (line.file_ids || []).filter((fid) =>
      db.private_files.some((pf) => pf.id === fid)
    );

    const resolvedPrice = resolveEffectiveProductPrice(product, variant, sandboxEnabled);
    const tierPrice = calculateQuantityTierPrice(
      product,
      resolvedPrice.unitPriceArs,
      qty
    );

    const designSurcharge =
      line.design_help_requested && product.customization_config.allow_design_help
        ? resolvedPrice.designHelpSurchargeArs
        : 0;

    let lineTotalArs: number | null = null;
    if (tierPrice.finalUnitPriceArs !== null) {
      lineTotalArs = tierPrice.finalUnitPriceArs * qty + designSurcharge;
      subtotalArs += lineTotalArs;
    } else {
      hasUnpricedItems = true;
    }

    const category = db.categories.find((c) => c.id === product.category_id);

    validatedItems.push({
      product,
      categoryName: category?.name || 'Catálogo Trazo',
      variantName: variant?.name || null,
      variantId: variant?.id || null,
      quantity: qty,
      unitPriceArs: tierPrice.finalUnitPriceArs,
      designHelpSurchargeArs: designSurcharge,
      lineTotalArs,
      requiresDesignApproval:
        product.customization_config.requires_design_approval ||
        Boolean(line.design_help_requested),
      customizationSummary: line.customization_summary,
      customizationPayload: line.customization_payload,
      fileIds: verifiedFileIds,
    });
  }

  // Discount coupon validation
  let discountArs = 0;
  let appliedDiscountCode: string | null = null;
  if (params.discountCode && !hasUnpricedItems) {
    const cleanCode = params.discountCode.trim().toUpperCase();
    const coupon = db.store_settings.discount_coupons.find(
      (c) => c.is_active && c.code.toUpperCase() === cleanCode
    );
    if (coupon) {
      discountArs = Math.round(subtotalArs * (coupon.discount_percent / 100));
      appliedDiscountCode = coupon.code;
    }
  }

  // Shipping method validation
  const shippingMethod =
    db.store_settings.shipping_methods.find(
      (m) => m.id === params.deliveryMethodId && m.is_enabled
    ) ||
    db.store_settings.shipping_methods.find((m) => m.is_enabled) ||
    null;

  const shippingCostArs =
    shippingMethod && !shippingMethod.requires_quote && shippingMethod.price_ars !== null
      ? shippingMethod.price_ars
      : null;

  const shippingRequiresQuote = Boolean(shippingMethod?.requires_quote);
  const totalArs = Math.max(0, subtotalArs - discountArs + (shippingCostArs ?? 0));

  return {
    valid: true,
    hasUnpricedItems,
    isSandboxPricingActive: sandboxEnabled,
    validatedItems,
    subtotalArs,
    discountArs,
    appliedDiscountCode,
    shippingMethod,
    shippingCostArs,
    shippingRequiresQuote,
    totalArs,
  };
}

export function createOrderOnServer(params: {
  items: ServerValidatedOrderLineInput[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMethodId: string;
  shippingAddress: Order['shipping_address'];
  billingInfo: Order['billing_info'];
  customerNotes: string;
  discountCode?: string | null;
  paymentMethod: Order['payment_method'];
  ownerSessionToken: string;
}): {
  success: boolean;
  error?: string;
  order?: Order;
} {
  const validation = validateAndComputeCartOnServer({
    items: params.items,
    discountCode: params.discountCode,
    deliveryMethodId: params.deliveryMethodId,
  });

  if (!validation.valid || !validation.shippingMethod) {
    return {
      success: false,
      error: validation.error || 'No se pudo validar el pedido.',
    };
  }

  // REGLA ESTRICTA: Si un producto no tiene precio configurado, prohibir pago directo
  if (validation.hasUnpricedItems && params.paymentMethod !== 'quote_only') {
    return {
      success: false,
      error:
        'Uno o más productos no tienen precio configurado para cobro directo. Debés enviarlos bajo la modalidad "Solicitar presupuesto" o habilitar las tarifas en el Panel Administrador.',
    };
  }

  if (
    validation.shippingMethod.requires_shipping_address &&
    (!params.shippingAddress?.street_and_number ||
      !params.shippingAddress?.locality ||
      !params.shippingAddress?.province ||
      !params.shippingAddress?.postal_code)
  ) {
    return {
      success: false,
      error:
        'Por favor completá dirección, localidad, provincia y código postal para el envío a domicilio.',
    };
  }

  const db = readDatabase();
  const now = new Date().toISOString();
  const orderId = `ord_${generateSecureToken(10)}`;
  const orderNumber = generateOrderNumber();
  const accessToken = generateSecureToken(24); // 48 hex chars cryptographic token
  const accessCode = generateAccessCode();

  const orderItems: OrderItemSnapshot[] = validation.validatedItems.map((item, idx) => ({
    id: `item_${orderId}_${idx + 1}`,
    order_id: orderId,
    product_id: item.product.id,
    product_slug_snapshot: item.product.slug,
    product_name_snapshot: item.product.name,
    category_name_snapshot: item.categoryName,
    variant_id: item.variantId,
    variant_name_snapshot: item.variantName,
    confirmed_specs_snapshot: {
      dimensions: item.product.confirmed_dimensions,
      material: item.product.confirmed_material,
      finish: item.product.confirmed_finish,
    },
    quantity: item.quantity,
    unit_price_ars_snapshot: item.unitPriceArs ?? 0,
    design_help_surcharge_ars_snapshot: item.designHelpSurchargeArs,
    line_total_ars_snapshot: item.lineTotalArs ?? 0,
    requires_design_approval: item.requiresDesignApproval,
    customization_summary: item.customizationSummary,
    customization_payload: item.customizationPayload,
    file_ids: item.fileIds,
  }));

  const anyRequiresDesignApproval = orderItems.some((i) => i.requires_design_approval);

  // Separate production time summary from shipping transit time summary
  const prodTimes = validation.validatedItems
    .map((v) => v.product.estimated_production_text)
    .filter(Boolean);
  const estimatedProductionSummary =
    prodTimes.length > 0
      ? prodTimes.join(' · ')
      : 'Plazo de producción artesanal a confirmar por Trazo al revisar tus archivos (editable desde Panel Admin)';

  const estimatedShippingSummary =
    validation.shippingMethod.estimated_transit_text ||
    'Tiempo de transporte según correo/operador (independiente del tiempo de producción)';

  const initialEvents: OrderEvent[] = [
    {
      id: `evt_${generateSecureToken(8)}`,
      order_id: orderId,
      actor: 'customer',
      event_type: 'pedido_creado',
      description:
        validation.hasUnpricedItems || params.paymentMethod === 'quote_only'
          ? `Solicitud de pedido / presupuesto ${orderNumber} registrada correctamente.`
          : `Pedido ${orderNumber} creado con modalidad de pago ${params.paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Transferencia bancaria'}.`,
      metadata: {
        is_sandbox_order: validation.isSandboxPricingActive,
        requires_design_approval: anyRequiresDesignApproval,
      },
      created_at: now,
    },
  ];

  const order: Order = {
    id: orderId,
    order_number: orderNumber,
    access_token: accessToken,
    access_code: accessCode,
    owner_session_token: params.ownerSessionToken,
    order_type:
      validation.hasUnpricedItems || params.paymentMethod === 'quote_only'
        ? 'quote_request'
        : 'purchase',
    customer_name: params.customerName.trim(),
    customer_email: params.customerEmail.trim().toLowerCase(),
    customer_phone: params.customerPhone.trim(),
    delivery_method_id: validation.shippingMethod.id,
    delivery_method_snapshot: validation.shippingMethod,
    shipping_address: params.shippingAddress,
    billing_info: params.billingInfo,
    customer_notes: params.customerNotes.trim(),
    subtotal_ars: validation.subtotalArs,
    discount_ars: validation.discountArs,
    discount_code: validation.appliedDiscountCode,
    shipping_cost_ars: validation.shippingCostArs,
    shipping_requires_quote: validation.shippingRequiresQuote,
    total_ars: validation.totalArs,
    currency: 'ARS',
    is_sandbox_order: validation.isSandboxPricingActive,
    payment_method: validation.hasUnpricedItems ? 'quote_only' : params.paymentMethod,
    payment_status: 'pending',
    production_status: 'pedido_recibido',
    requires_design_approval: anyRequiresDesignApproval,
    design_approved_at: anyRequiresDesignApproval ? null : now,
    design_approved_by: anyRequiresDesignApproval ? null : 'not_required_for_product',
    estimated_production_summary: estimatedProductionSummary,
    estimated_shipping_summary: estimatedShippingSummary,
    shipping_carrier: null,
    shipping_tracking_code: null,
    transfer_receipt_file_id: null,
    admin_internal_notes: '',
    items: orderItems,
    design_revisions: [],
    events: initialEvents,
    payments: [],
    created_at: now,
    updated_at: now,
  };

  // Associate uploaded private files with this order
  const allFileIds = new Set<string>();
  for (const item of orderItems) {
    item.file_ids.forEach((fid) => allFileIds.add(fid));
    item.customization_payload?.magnet_photos?.forEach((mp) => {
      if (mp.file_id) allFileIds.add(mp.file_id);
    });
    item.customization_payload?.design_files?.forEach((df) => {
      if (df.file_id) allFileIds.add(df.file_id);
    });
  }

  for (const fileRecord of db.private_files) {
    if (allFileIds.has(fileRecord.id)) {
      fileRecord.order_id = orderId;
    }
  }

  db.orders.unshift(order);
  writeDatabase(db);

  return { success: true, order };
}

// -----------------------------------------------------------------------------
// ORDER QUERIES & SECURE ACCESS (No predictable order number lookup!)
// -----------------------------------------------------------------------------
export function getOrderByAccessToken(accessToken: string): Order | null {
  if (!accessToken || accessToken.length < 24) return null;
  const db = readDatabase();
  return db.orders.find((o) => o.access_token === accessToken) || null;
}

export function lookupOrderWithVerification(params: {
  orderNumber: string;
  email: string;
  accessCode: string;
}): Order | null {
  const db = readDatabase();
  const cleanNum = params.orderNumber.trim().toUpperCase();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanCode = params.accessCode.trim().toUpperCase();

  return (
    db.orders.find(
      (o) =>
        o.order_number.toUpperCase() === cleanNum &&
        o.customer_email.toLowerCase() === cleanEmail &&
        o.access_code.toUpperCase() === cleanCode
    ) || null
  );
}

export function getAllOrdersForAdmin(): Order[] {
  const db = readDatabase();
  return db.orders;
}

export function getOrderByIdForAdmin(orderId: string): Order | null {
  const db = readDatabase();
  return db.orders.find((o) => o.id === orderId) || null;
}

// -----------------------------------------------------------------------------
// MERCADO PAGO & PAYMENT IDEMPOTENCY
// -----------------------------------------------------------------------------
export function processVerifiedPaymentNotification(params: {
  orderId: string;
  provider: 'mercadopago' | 'bank_transfer';
  providerPaymentId: string;
  idempotencyKey: string;
  amountArs: number;
  currency: string;
  status: PaymentStatus;
  verificationSummary: Record<string, unknown>;
  actor: 'payment_webhook' | 'admin';
}): {
  success: boolean;
  deduplicated: boolean;
  error?: string;
  order?: Order;
} {
  const db = readDatabase();
  const order = db.orders.find((o) => o.id === params.orderId);
  if (!order) {
    return { success: false, deduplicated: false, error: 'Pedido no encontrado.' };
  }

  // 1. Check idempotency key or same provider_payment_id with same status
  const existingByIdempotency = order.payments.find(
    (p) =>
      p.idempotency_key === params.idempotencyKey ||
      (p.provider_payment_id === params.providerPaymentId && p.status === params.status)
  );
  if (existingByIdempotency) {
    return {
      success: true,
      deduplicated: true,
      order,
    };
  }

  // 2. Verify currency and amount match order total
  if (params.currency !== 'ARS') {
    return {
      success: false,
      deduplicated: false,
      error: `Moneda inválida (${params.currency}). Se esperaba ARS.`,
    };
  }

  if (Math.round(params.amountArs) !== Math.round(order.total_ars)) {
    return {
      success: false,
      deduplicated: false,
      error: `El importe del pago (${params.amountArs}) no coincide con el total del pedido (${order.total_ars}).`,
    };
  }

  const now = new Date().toISOString();
  const paymentRecord: PaymentRecord = {
    id: `pay_${generateSecureToken(8)}`,
    order_id: order.id,
    provider: params.provider,
    provider_payment_id: params.providerPaymentId,
    idempotency_key: params.idempotencyKey,
    amount_ars: params.amountArs,
    currency: 'ARS',
    status: params.status,
    raw_verification_summary: params.verificationSummary,
    verified_by_admin: params.actor === 'admin' ? 'Administrador Trazo' : null,
    created_at: now,
    updated_at: now,
  };

  order.payments.push(paymentRecord);
  order.payment_status = params.status;
  order.updated_at = now;

  // Transition production status to en_revision_diseno if paid and currently pedido_recibido
  if (params.status === 'paid' && order.production_status === 'pedido_recibido') {
    order.production_status = order.requires_design_approval
      ? 'en_revision_diseno'
      : 'aprobado_para_producir';
  }

  order.events.unshift({
    id: `evt_${generateSecureToken(8)}`,
    order_id: order.id,
    actor: params.actor,
    event_type: `pago_${params.status}`,
    description:
      params.status === 'paid'
        ? `Pago confirmado (${params.provider === 'mercadopago' ? 'Mercado Pago' : 'Transferencia bancaria'}) por $${params.amountArs} ARS. Operación: ${params.providerPaymentId}.`
        : `Estado de pago actualizado a "${params.status}" (${params.providerPaymentId}).`,
    metadata: {
      provider: params.provider,
      provider_payment_id: params.providerPaymentId,
      idempotency_key: params.idempotencyKey,
    },
    created_at: now,
  });

  writeDatabase(db);
  return {
    success: true,
    deduplicated: false,
    order,
  };
}

// -----------------------------------------------------------------------------
// BANK TRANSFER RECEIPT UPLOAD & ADMIN VALIDATION
// Never auto-approves payment simply because an image was uploaded!
// -----------------------------------------------------------------------------
export function attachTransferReceiptToOrder(params: {
  accessToken: string;
  fileId: string;
}): { success: boolean; error?: string; order?: Order } {
  const db = readDatabase();
  const order = db.orders.find((o) => o.access_token === params.accessToken);
  if (!order) {
    return { success: false, error: 'Pedido no encontrado.' };
  }
  const file = db.private_files.find((f) => f.id === params.fileId);
  if (!file) {
    return { success: false, error: 'Archivo de comprobante no encontrado.' };
  }

  const now = new Date().toISOString();
  file.order_id = order.id;
  order.transfer_receipt_file_id = file.id;

  // REGLA ESTRICTA: No aprobar automáticamente por subir una imagen.
  if (order.payment_status !== 'paid') {
    order.payment_status = 'transfer_proof_uploaded';
  }
  order.updated_at = now;

  order.events.unshift({
    id: `evt_${generateSecureToken(8)}`,
    order_id: order.id,
    actor: 'customer',
    event_type: 'comprobante_transferencia_subido',
    description: `El cliente adjuntó el comprobante "${file.original_filename}". El pago permanece pendiente hasta validación administrativa.`,
    metadata: { file_id: file.id },
    created_at: now,
  });

  writeDatabase(db);
  return { success: true, order };
}

export function validateTransferByAdmin(params: {
  orderId: string;
  decision: 'approve' | 'reject';
  adminEmail: string;
  notes?: string;
}): { success: boolean; error?: string; order?: Order } {
  const db = readDatabase();
  const order = db.orders.find((o) => o.id === params.orderId);
  if (!order) {
    return { success: false, error: 'Pedido no encontrado.' };
  }

  const status: PaymentStatus = params.decision === 'approve' ? 'paid' : 'rejected';
  const idempotencyKey = `transfer_${order.id}_${status}_${Date.now()}`;

  return processVerifiedPaymentNotification({
    orderId: order.id,
    provider: 'bank_transfer',
    providerPaymentId: `TRF-${order.order_number}`,
    idempotencyKey,
    amountArs: order.total_ars,
    currency: 'ARS',
    status,
    verificationSummary: {
      verified_by: params.adminEmail,
      notes: params.notes || '',
      receipt_file_id: order.transfer_receipt_file_id,
    },
    actor: 'admin',
  });
}

// -----------------------------------------------------------------------------
// DESIGN REVIEW, PROPOSALS & APPROVAL GATE
// -----------------------------------------------------------------------------
export function addDesignRevisionByAdmin(params: {
  orderId: string;
  title: string;
  adminNotes: string;
  previewFileId?: string | null;
  requestFileCorrections?: boolean;
}): { success: boolean; error?: string; order?: Order; revision?: DesignRevision } {
  const db = readDatabase();
  const order = db.orders.find((o) => o.id === params.orderId);
  if (!order) {
    return { success: false, error: 'Pedido no encontrado.' };
  }

  const now = new Date().toISOString();
  const nextVersion =
    order.design_revisions.length > 0
      ? Math.max(...order.design_revisions.map((r) => r.version_number)) + 1
      : 1;

  const revision: DesignRevision = {
    id: `rev_${generateSecureToken(8)}`,
    order_id: order.id,
    version_number: nextVersion,
    title: params.title.trim() || `Propuesta de diseño v${nextVersion}`,
    admin_notes: params.adminNotes.trim(),
    preview_file_id: params.previewFileId || null,
    status: params.requestFileCorrections ? 'changes_requested' : 'pending_customer_review',
    customer_feedback: null,
    decided_at: null,
    created_at: now,
  };

  if (params.previewFileId) {
    const f = db.private_files.find((file) => file.id === params.previewFileId);
    if (f) f.order_id = order.id;
  }

  order.design_revisions.unshift(revision);
  order.production_status = params.requestFileCorrections
    ? 'archivos_pendientes'
    : 'esperando_aprobacion_cliente';
  order.updated_at = now;

  order.events.unshift({
    id: `evt_${generateSecureToken(8)}`,
    order_id: order.id,
    actor: 'admin',
    event_type: params.requestFileCorrections
      ? 'correccion_archivos_solicitada'
      : 'propuesta_diseno_enviada',
    description: params.requestFileCorrections
      ? `Administración solicitó correcciones de archivos (v${nextVersion}): ${params.adminNotes}`
      : `Se cargó la propuesta de diseño v${nextVersion} ("${revision.title}") esperando aprobación del cliente.`,
    metadata: { version_number: nextVersion, revision_id: revision.id },
    created_at: now,
  });

  writeDatabase(db);
  return { success: true, order, revision };
}

export function submitCustomerDesignDecision(params: {
  accessToken: string;
  revisionId: string;
  decision: 'approve' | 'request_changes';
  feedback?: string;
}): { success: boolean; error?: string; order?: Order } {
  const db = readDatabase();
  const order = db.orders.find((o) => o.access_token === params.accessToken);
  if (!order) {
    return { success: false, error: 'Pedido no encontrado.' };
  }

  const revision = order.design_revisions.find((r) => r.id === params.revisionId);
  if (!revision) {
    return { success: false, error: 'Versión de diseño no encontrada.' };
  }

  const now = new Date().toISOString();
  revision.customer_feedback = (params.feedback || '').trim() || null;
  revision.decided_at = now;

  if (params.decision === 'approve') {
    revision.status = 'approved';
    order.design_approved_at = now;
    order.design_approved_by = `${order.customer_name} (Cliente via enlace seguro)`;
    order.production_status = 'aprobado_para_producir';

    order.events.unshift({
      id: `evt_${generateSecureToken(8)}`,
      order_id: order.id,
      actor: 'customer',
      event_type: 'diseno_aprobado_cliente',
      description: `El cliente aprobó la propuesta de diseño v${revision.version_number} ("${revision.title}"). Pedido habilitado para entrar en producción.`,
      metadata: {
        revision_id: revision.id,
        version_number: revision.version_number,
        feedback: revision.customer_feedback,
      },
      created_at: now,
    });
  } else {
    revision.status = 'changes_requested';
    order.design_approved_at = null;
    order.design_approved_by = null;
    order.production_status = 'en_revision_diseno';

    order.events.unshift({
      id: `evt_${generateSecureToken(8)}`,
      order_id: order.id,
      actor: 'customer',
      event_type: 'cambios_diseno_solicitados',
      description: `El cliente solicitó ajustes sobre la propuesta v${revision.version_number}: "${revision.customer_feedback || 'Sin comentarios adicionales'}".`,
      metadata: {
        revision_id: revision.id,
        version_number: revision.version_number,
      },
      created_at: now,
    });
  }

  order.updated_at = now;
  writeDatabase(db);
  return { success: true, order };
}

// -----------------------------------------------------------------------------
// PRODUCTION STATUS UPDATES (Enforces Design Approval Gate!)
// -----------------------------------------------------------------------------
const GATED_PRODUCTION_STATES: ProductionStatus[] = [
  'aprobado_para_producir',
  'en_produccion',
  'listo_para_retirar',
  'despachado',
  'entregado',
];

export function updateOrderByAdmin(params: {
  orderId: string;
  productionStatus?: ProductionStatus;
  shippingCarrier?: string | null;
  shippingTrackingCode?: string | null;
  adminInternalNotes?: string;
  registerManualDesignApproval?: boolean;
  adminEmail: string;
}): { success: boolean; error?: string; order?: Order } {
  const db = readDatabase();
  const order = db.orders.find((o) => o.id === params.orderId);
  if (!order) {
    return { success: false, error: 'Pedido no encontrado.' };
  }

  const now = new Date().toISOString();

  if (params.registerManualDesignApproval) {
    order.design_approved_at = now;
    order.design_approved_by = `Registrado por administración (${params.adminEmail})`;
    if (order.design_revisions[0]) {
      order.design_revisions[0].status = 'approved';
      order.design_revisions[0].decided_at = now;
    }
    order.events.unshift({
      id: `evt_${generateSecureToken(8)}`,
      order_id: order.id,
      actor: 'admin',
      event_type: 'aprobacion_diseno_registrada_admin',
      description: `Administración (${params.adminEmail}) registró la aprobación del diseño del cliente.`,
      metadata: {},
      created_at: now,
    });
  }

  if (params.productionStatus && params.productionStatus !== order.production_status) {
    // REGLA ESTRICTA: No comenzar la producción si el producto requiere aprobación y todavía no fue registrada
    if (
      order.requires_design_approval &&
      !order.design_approved_at &&
      GATED_PRODUCTION_STATES.includes(params.productionStatus)
    ) {
      return {
        success: false,
        error:
          'Bloqueo de seguridad: Este pedido contiene productos personalizados que requieren aprobación de diseño y todavía no fue registrada la conformidad del cliente. No es posible avanzar a producción ni despacho sin aprobación previa.',
      };
    }

    const prevStatus = order.production_status;
    order.production_status = params.productionStatus;
    order.events.unshift({
      id: `evt_${generateSecureToken(8)}`,
      order_id: order.id,
      actor: 'admin',
      event_type: 'estado_produccion_actualizado',
      description: `Estado de producción actualizado de "${prevStatus}" a "${params.productionStatus}".`,
      metadata: { previous: prevStatus, next: params.productionStatus },
      created_at: now,
    });
  }

  if (params.shippingCarrier !== undefined) {
    order.shipping_carrier = params.shippingCarrier ? params.shippingCarrier.trim() : null;
  }

  if (params.shippingTrackingCode !== undefined) {
    const prevTrack = order.shipping_tracking_code;
    order.shipping_tracking_code = params.shippingTrackingCode
      ? params.shippingTrackingCode.trim()
      : null;
    if (order.shipping_tracking_code && order.shipping_tracking_code !== prevTrack) {
      order.events.unshift({
        id: `evt_${generateSecureToken(8)}`,
        order_id: order.id,
        actor: 'admin',
        event_type: 'seguimiento_envio_registrado',
        description: `Se registró el seguimiento de envío: ${order.shipping_carrier || 'Transporte'} — Código: ${order.shipping_tracking_code}.`,
        metadata: {
          carrier: order.shipping_carrier,
          tracking_code: order.shipping_tracking_code,
        },
        created_at: now,
      });
    }
  }

  if (params.adminInternalNotes !== undefined) {
    order.admin_internal_notes = params.adminInternalNotes;
  }

  order.updated_at = now;
  writeDatabase(db);
  return { success: true, order };
}

// -----------------------------------------------------------------------------
// EVENT TATTOO STAND & CUSTOM QUOTES
// -----------------------------------------------------------------------------
export function createQuoteRequest(params: {
  requestType: QuoteRequest['request_type'];
  customerName: string;
  customerContact: string;
  customerEmail?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  eventLocality?: string | null;
  estimatedGuests?: number | null;
  themeOrIdea?: string | null;
  productSlug?: string | null;
  productName?: string | null;
  requestedQuantity?: number | null;
  observations?: string;
  customizationPayload?: CustomizationPayload | null;
  fileIds?: string[];
}): QuoteRequest {
  const db = readDatabase();
  const now = new Date().toISOString();
  const quote: QuoteRequest = {
    id: `quo_${generateSecureToken(8)}`,
    reference_code: generateQuoteReference(),
    request_type: params.requestType,
    customer_name: params.customerName.trim(),
    customer_contact: params.customerContact.trim(),
    customer_email: params.customerEmail?.trim() || null,
    event_type: params.eventType?.trim() || null,
    event_date: params.eventDate?.trim() || null,
    event_locality: params.eventLocality?.trim() || null,
    estimated_guests: params.estimatedGuests ?? null,
    theme_or_idea: params.themeOrIdea?.trim() || null,
    product_slug: params.productSlug || null,
    product_name: params.productName || null,
    requested_quantity: params.requestedQuantity ?? null,
    observations: (params.observations || '').trim(),
    customization_payload: params.customizationPayload || null,
    file_ids: params.fileIds || [],
    status: 'nuevo',
    admin_notes: '',
    created_at: now,
    updated_at: now,
  };

  // Vincular archivos privados adjuntos a la solicitud de presupuesto
  if (quote.file_ids.length > 0) {
    for (const fid of quote.file_ids) {
      const fileRecord = db.private_files.find((f) => f.id === fid);
      if (fileRecord && !fileRecord.order_id) {
        fileRecord.order_id = quote.id;
      }
    }
  }

  db.quote_requests.unshift(quote);
  writeDatabase(db);
  return quote;
}

export function getAllQuoteRequestsForAdmin(): QuoteRequest[] {
  const db = readDatabase();
  return db.quote_requests;
}

export function updateQuoteRequestByAdmin(params: {
  quoteId: string;
  status?: QuoteStatus;
  adminNotes?: string;
}): QuoteRequest | null {
  const db = readDatabase();
  const quote = db.quote_requests.find((q) => q.id === params.quoteId);
  if (!quote) return null;
  if (params.status) quote.status = params.status;
  if (params.adminNotes !== undefined) quote.admin_notes = params.adminNotes;
  quote.updated_at = new Date().toISOString();
  writeDatabase(db);
  return quote;
}

// -----------------------------------------------------------------------------
// ADMIN METRICS (Strict Rule: Never include unpaid orders in collected sales!)
// -----------------------------------------------------------------------------
export function computeAdminMetrics() {
  const db = readDatabase();
  const activeOrders = db.orders.filter((o) => o.production_status !== 'cancelado');

  // REGLA ESTRICTA: No incluir pedidos impagos dentro de las ventas cobradas.
  const paidOrders = activeOrders.filter((o) => o.payment_status === 'paid');
  const confirmedSalesArs = paidOrders.reduce((sum, o) => sum + o.total_ars, 0);
  const confirmedProductsSoldCount = paidOrders.reduce(
    (sum, o) => sum + o.items.reduce((acc, item) => acc + item.quantity, 0),
    0
  );

  const pendingDesignOrdersCount = activeOrders.filter((o) =>
    [
      'archivos_pendientes',
      'en_revision_diseno',
      'esperando_aprobacion_cliente',
    ].includes(o.production_status)
  ).length;

  const inProductionOrdersCount = activeOrders.filter((o) =>
    ['aprobado_para_producir', 'en_produccion'].includes(o.production_status)
  ).length;

  const readyForDeliveryOrdersCount = activeOrders.filter((o) =>
    ['listo_para_retirar', 'despachado'].includes(o.production_status)
  ).length;

  const unpaidOrPendingReviewOrdersCount = activeOrders.filter(
    (o) => o.payment_status !== 'paid'
  ).length;

  const sandboxOrdersCount = db.orders.filter((o) => o.is_sandbox_order).length;
  const officialOrdersCount = db.orders.filter((o) => !o.is_sandbox_order).length;

  return {
    totalOrdersReceived: db.orders.length,
    officialOrdersCount,
    sandboxOrdersCount,
    confirmedPaidOrdersCount: paidOrders.length,
    confirmedSalesArs,
    confirmedProductsSoldCount,
    pendingDesignOrdersCount,
    inProductionOrdersCount,
    readyForDeliveryOrdersCount,
    unpaidOrPendingReviewOrdersCount,
    totalQuoteRequests: db.quote_requests.length,
  };
}
