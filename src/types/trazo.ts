export type PaymentStatus =
  | 'pending'
  | 'transfer_proof_uploaded'
  | 'in_process'
  | 'paid'
  | 'rejected'
  | 'refunded';

export type ProductionStatus =
  | 'pedido_recibido'
  | 'archivos_pendientes'
  | 'en_revision_diseno'
  | 'esperando_aprobacion_cliente'
  | 'aprobado_para_producir'
  | 'en_produccion'
  | 'listo_para_retirar'
  | 'despachado'
  | 'entregado'
  | 'cancelado';

export type QuoteStatus =
  | 'nuevo'
  | 'contactado'
  | 'presupuestado'
  | 'confirmado'
  | 'descartado';

export type CustomizerType =
  | 'magnets_5x5'
  | 'design_upload'
  | 'entrepreneur_kit'
  | 'gift_box'
  | 'event_stand';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  badge_text: string | null;
  illustration_key:
    | 'magnets'
    | 'stickers'
    | 'pins'
    | 'cards'
    | 'tags_packaging'
    | 'entrepreneur_kits'
    | 'gifts_boxes';
  display_order: number;
  is_active: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  dimensions_label: string | null;
  material_label: string | null;
  finish_label: string | null;
  pack_units: number | null;
  price_ars: number | null;
  sandbox_test_price_ars?: number | null;
  is_confirmed_spec: boolean;
  is_enabled: boolean;
  display_order: number;
}

export interface QuantityTier {
  id: string;
  product_id: string;
  min_qty: number;
  max_qty: number | null;
  unit_price_ars: number | null;
  discount_percent: number;
  label: string;
}

export interface ProductCustomizationConfig {
  allow_photo_upload: boolean;
  allow_logo_upload: boolean;
  allow_custom_text: boolean;
  allow_color_notes: boolean;
  allow_observations: boolean;
  allow_variants: boolean;
  allow_design_help: boolean;
  design_help_price_ars: number | null;
  sandbox_design_help_price_ars?: number | null;
  requires_design_approval: boolean;
  file_instructions: string;
}

export interface ProductImageSlot {
  id: string;
  url: string | null; // null cuando aún no se subió foto real autorizada
  alt: string;
  caption: string;
  is_real_authorized_photo: boolean;
  illustration_variant: string;
  display_order: number;
}

export interface Product {
  id: string;
  slug: string;
  category_id: string;
  name: string;
  short_description: string;
  description: string;
  // Si base_price_ars es null, el producto muestra "Solicitar presupuesto" y bloquea el pago directo
  base_price_ars: number | null;
  // Tarifa técnica opcional para cuando se activa el Modo Entorno de Prueba (Sandbox)
  sandbox_test_price_ars: number | null;
  is_test_price: boolean;
  confirmed_dimensions: string | null;
  confirmed_material: string | null;
  confirmed_finish: string | null;
  min_quantity: number | null; // null si no hay cantidad mínima oficial confirmada (usa 1 por defecto)
  quantity_multiple: number;
  estimated_production_text: string | null; // null hasta que el administrador configure el plazo real
  availability_status:
    | 'available'
    | 'available_on_order'
    | 'limited_quota'
    | 'paused'
    | 'quote_only'
    | 'out_of_stock'
    | 'archived';
  stock_or_quota: number | null;
  min_stock_alert?: number | null;
  sku?: string | null;
  is_featured: boolean;
  is_published: boolean;
  customizer_type: CustomizerType;
  customization_config: ProductCustomizationConfig;
  variants: ProductVariant[];
  quantity_tiers: QuantityTier[];
  images: ProductImageSlot[];
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

export interface MagnetPhotoItem {
  id: string;
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width_px: number;
  height_px: number;
  low_resolution_warning: boolean;
  quantity_assigned: number;
  crop: {
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
  cropped_preview_data_url: string;
}

export interface UploadedDesignReference {
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width_px?: number;
  height_px?: number;
  low_resolution_warning?: boolean;
  preview_data_url?: string;
}

export interface CustomizationPayload {
  customizer_type: CustomizerType;
  selected_dimensions?: string | null;
  selected_material?: string | null;
  selected_finish?: string | null;
  custom_text?: string;
  color_notes?: string;
  observations?: string;
  design_help_requested: boolean;
  magnet_photos?: MagnetPhotoItem[];
  design_files?: UploadedDesignReference[];
}

export interface CartItem {
  cart_item_id: string;
  customization_signature: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  category_name: string;
  variant_id: string | null;
  variant_name: string | null;
  confirmed_specs: {
    dimensions: string | null;
    material: string | null;
    finish: string | null;
  };
  quantity: number;
  unit_price_ars: number | null;
  design_help_requested: boolean;
  design_help_surcharge_ars: number;
  requires_design_approval: boolean;
  customization_summary: string;
  customization_payload: CustomizationPayload;
  file_ids: string[];
  added_at: string;
}

export interface ShippingMethodConfig {
  id: string;
  name: string;
  type: 'pickup_rio_cuarto' | 'home_delivery_national' | 'custom_zone';
  description: string;
  zone_label: string;
  price_ars: number | null; // null cuando requiere cotización manual
  requires_quote: boolean;
  estimated_transit_text: string | null; // Separado del tiempo de producción
  requires_shipping_address: boolean;
  is_enabled: boolean;
}

export interface PrivateFileRecord {
  id: string;
  owner_token: string;
  order_id: string | null;
  purpose: 'customer_photo' | 'customer_design' | 'transfer_receipt' | 'admin_design_proposal';
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width_px: number | null;
  height_px: number | null;
  low_resolution_warning: boolean;
  storage_path: string;
  sha256_hash: string;
  retention_expires_at: string;
  is_deleted: boolean;
  created_at: string;
}

export interface OrderItemSnapshot {
  id: string;
  order_id: string;
  product_id: string;
  product_slug_snapshot: string;
  product_name_snapshot: string;
  category_name_snapshot: string;
  variant_id: string | null;
  variant_name_snapshot: string | null;
  confirmed_specs_snapshot: {
    dimensions: string | null;
    material: string | null;
    finish: string | null;
  };
  quantity: number;
  unit_price_ars_snapshot: number;
  design_help_surcharge_ars_snapshot: number;
  line_total_ars_snapshot: number;
  requires_design_approval: boolean;
  customization_summary: string;
  customization_payload: CustomizationPayload;
  file_ids: string[];
}

export interface DesignRevision {
  id: string;
  order_id: string;
  version_number: number;
  title: string;
  admin_notes: string;
  preview_file_id: string | null;
  preview_svg_summary?: string | null;
  status: 'pending_customer_review' | 'approved' | 'changes_requested';
  customer_feedback: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  actor: 'system' | 'customer' | 'admin' | 'payment_webhook';
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  provider: 'mercadopago' | 'bank_transfer';
  provider_payment_id: string | null;
  idempotency_key: string;
  amount_ars: number;
  currency: 'ARS';
  status: PaymentStatus;
  raw_verification_summary: Record<string, unknown>;
  verified_by_admin: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  access_token: string;
  access_code: string;
  owner_session_token: string;
  order_type: 'purchase' | 'quote_request';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_method_id: string;
  delivery_method_snapshot: ShippingMethodConfig;
  shipping_address: {
    street_and_number: string;
    apartment_or_ref?: string;
    locality: string;
    province: string;
    postal_code: string;
  } | null;
  billing_info: {
    needs_invoice: boolean;
    tax_id_or_dni?: string;
    business_name?: string;
    tax_condition?: string;
  } | null;
  customer_notes: string;
  subtotal_ars: number;
  discount_ars: number;
  discount_code: string | null;
  shipping_cost_ars: number | null;
  shipping_requires_quote: boolean;
  total_ars: number;
  currency: 'ARS';
  is_sandbox_order: boolean;
  payment_method: 'mercadopago' | 'bank_transfer' | 'quote_only';
  payment_status: PaymentStatus;
  production_status: ProductionStatus;
  requires_design_approval: boolean;
  design_approved_at: string | null;
  design_approved_by: string | null;
  estimated_production_summary: string;
  estimated_shipping_summary: string;
  shipping_carrier: string | null;
  shipping_tracking_code: string | null;
  transfer_receipt_file_id: string | null;
  admin_internal_notes: string;
  items: OrderItemSnapshot[];
  design_revisions: DesignRevision[];
  events: OrderEvent[];
  payments: PaymentRecord[];
  created_at: string;
  updated_at: string;
}

export interface QuoteRequest {
  id: string;
  reference_code: string;
  request_type: 'tattoo_stand_event' | 'custom_bulk_order' | 'unpriced_product';
  customer_name: string;
  customer_contact: string;
  customer_email: string | null;
  event_type: string | null;
  event_date: string | null;
  event_locality: string | null;
  estimated_guests: number | null;
  theme_or_idea: string | null;
  product_slug: string | null;
  product_name: string | null;
  requested_quantity: number | null;
  observations: string;
  customization_payload: CustomizationPayload | null;
  file_ids: string[];
  status: QuoteStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface AuthorizedTestimonial {
  id: string;
  customer_name: string;
  locality: string;
  product_purchased: string;
  comment: string;
  is_authorized_real: boolean;
  is_published: boolean;
  created_at: string;
}

export interface GalleryWorkItem {
  id: string;
  title: string;
  category_label: string;
  description: string;
  image_url: string | null; // null cuando aún no se subió foto real autorizada
  is_authorized_real_work: boolean;
  is_published: boolean;
  display_order: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'pedidos' | 'archivos' | 'envios' | 'pagos' | 'eventos';
  display_order: number;
  is_published: boolean;
}

export interface DiscountCoupon {
  code: string;
  description: string;
  discount_percent: number;
  is_active: boolean;
}

export type CashMovementCategory =
  | 'venta_online'
  | 'venta_mostrador'
  | 'sena_evento'
  | 'insumos_papel_iman'
  | 'gastos_taller'
  | 'envios_correo'
  | 'otro';

export type CashPaymentMethod =
  | 'mercadopago'
  | 'transferencia'
  | 'efectivo'
  | 'otro';

export interface CashMovement {
  id: string;
  type: 'ingreso' | 'egreso';
  category: CashMovementCategory;
  payment_method: CashPaymentMethod;
  amount_ars: number;
  description: string;
  order_id?: string | null;
  order_number?: string | null;
  recorded_by: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  delta: number;
  previous_stock: number | null;
  new_stock: number | null;
  reason: string;
  order_id?: string | null;
  recorded_by: string;
  created_at: string;
}

export interface MercadoPagoStoreConfig {
  is_enabled: boolean;
  sandbox_mode: boolean;
  public_key: string | null;
  access_token?: string | null;
  webhook_secret?: string | null;
  account_label: string | null;
  has_access_token?: boolean;
  has_webhook_secret?: boolean;
  updated_at?: string | null;
}

export interface StoreSettings {
  id: 'default';
  brand_name: string;
  alt_brand_name: string;
  city: string;
  province: string;
  country: string;
  exact_address: string | null; // null hasta confirmación oficial
  whatsapp_number: string;
  whatsapp_url: string;
  instagram_url: string;
  instagram_handle: string;
  email: string;
  logo_url: string | null;
  hero_config: {
    title: string;
    description: string;
    primary_cta_text: string;
    secondary_cta_text: string;
    badge_1: string;
    badge_2: string;
    badge_3: string;
    hero_real_photo_url: string | null;
  };
  theme_palette: {
    background_ivory: string;
    surface_paper: string;
    text_ink: string;
    accent_yellow: string;
    accent_yellow_soft: string;
    accent_terracotta: string;
  };
  shipping_methods: ShippingMethodConfig[];
  bank_transfer_config: {
    is_configured: boolean;
    bank_name: string | null;
    account_holder: string | null;
    cbu_or_cvu: string | null;
    alias: string | null;
    cuit: string | null;
    instructions: string;
  };
  mercadopago_config?: MercadoPagoStoreConfig;
  discount_coupons: DiscountCoupon[];
  faqs: FaqItem[];
  gallery_items: GalleryWorkItem[];
  authorized_testimonials: AuthorizedTestimonial[];
  policies: {
    privacy_policy: {
      title: string;
      is_validated_by_merchant: boolean;
      content: string;
    };
    terms_and_conditions: {
      title: string;
      is_validated_by_merchant: boolean;
      content: string;
    };
    shipping_and_delivery: {
      title: string;
      is_validated_by_merchant: boolean;
      content: string;
    };
    returns_and_cancellations: {
      title: string;
      is_validated_by_merchant: boolean;
      content: string;
    };
  };
  active_campaign: {
    is_active: boolean;
    title: string;
    description: string;
    cta_text: string;
    cta_url: string;
  } | null;
  sandbox_test_prices_enabled: boolean;
  file_retention_days: number;
  updated_at: string;
}

export interface TrazoDatabaseSchema {
  categories: Category[];
  products: Product[];
  private_files: PrivateFileRecord[];
  orders: Order[];
  quote_requests: QuoteRequest[];
  cash_movements?: CashMovement[];
  stock_movements?: StockMovement[];
  store_settings: StoreSettings;
}
