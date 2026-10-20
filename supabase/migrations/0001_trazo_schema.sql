-- =============================================================================
-- TRAZO ESPACIO GRÁFICO — ESQUEMA POSTGRESQL & SUPABASE RLS (0001_trazo_schema.sql)
-- Modela: Categorías, Productos, Variantes, Opciones de Personalización,
-- Escalas de Precio por Cantidad, Archivos Privados, Pedidos y Líneas Inmutables,
-- Pagos e Idempotencia, Revisiones y Aprobaciones de Diseño, Envíos,
-- Consultas de Eventos/Presupuestos y Configuración del Comercio.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS DE ESTADO
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM (
    'pending',
    'transfer_proof_uploaded',
    'in_process',
    'paid',
    'rejected',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE production_status_enum AS ENUM (
    'pedido_recibido',
    'archivos_pendientes',
    'en_revision_diseno',
    'esperando_aprobacion_cliente',
    'aprobado_para_producir',
    'en_produccion',
    'listo_para_retirar',
    'despachado',
    'entregado',
    'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quote_status_enum AS ENUM (
    'nuevo',
    'contactado',
    'presupuestado',
    'confirmado',
    'descartado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. CATEGORÍAS DEL CATÁLOGO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  badge_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. PRODUCTOS Y CONFIGURACIÓN DE PERSONALIZACIÓN
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Precio en ARS: NULL significa "Pendiente de configuración -> Solicitar presupuesto"
  base_price_ars NUMERIC(12, 2) CHECK (base_price_ars IS NULL OR base_price_ars >= 0),
  is_test_price BOOLEAN NOT NULL DEFAULT FALSE,
  -- Especificaciones confirmadas vs pendientes
  confirmed_dimensions TEXT,
  confirmed_material TEXT,
  confirmed_finish TEXT,
  -- Reglas de cantidad y producción
  min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
  quantity_multiple INTEGER NOT NULL DEFAULT 1 CHECK (quantity_multiple >= 1),
  estimated_production_text TEXT, -- NULL si está pendiente de confirmación
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'quote_only', 'out_of_stock', 'archived')),
  stock_or_quota INTEGER, -- NULL = sin límite fijo de cupo
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  customizer_type TEXT NOT NULL DEFAULT 'standard' CHECK (customizer_type IN ('magnets_5x5', 'design_upload', 'entrepreneur_kit', 'gift_box', 'event_stand')),
  -- Configuración administrable de campos de personalización
  customization_config JSONB NOT NULL DEFAULT '{
    "allow_photo_upload": false,
    "allow_logo_upload": true,
    "allow_custom_text": true,
    "allow_color_notes": true,
    "allow_observations": true,
    "allow_variants": true,
    "allow_design_help": true,
    "design_help_price_ars": null,
    "requires_design_approval": true,
    "file_instructions": "Adjuntá tu archivo en buena calidad (PNG, JPG, PDF o vectorial)."
  }'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. VARIANTES DE PRODUCTO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dimensions_label TEXT,
  material_label TEXT,
  finish_label TEXT,
  pack_units INTEGER, -- ej. pack de 6, 9, 12 imanes si se configura
  price_ars NUMERIC(12, 2) CHECK (price_ars IS NULL OR price_ars >= 0),
  is_confirmed_spec BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 5. ESCALAS DE PRECIO POR CANTIDAD
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_quantity_tiers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL CHECK (min_qty >= 1),
  max_qty INTEGER,
  unit_price_ars NUMERIC(12, 2),
  discount_percent NUMERIC(5, 2) CHECK (discount_percent >= 0 AND discount_percent <= 100),
  label TEXT
);

-- -----------------------------------------------------------------------------
-- 6. ARCHIVOS PRIVADOS (Fotos de clientes, Logos, Comprobantes, Bocetos de diseño)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private_files (
  id TEXT PRIMARY KEY,
  owner_token TEXT NOT NULL, -- Token criptográfico de sesión/pedido propietario
  order_id TEXT,
  purpose TEXT NOT NULL CHECK (purpose IN ('customer_photo', 'customer_design', 'transfer_receipt', 'admin_design_proposal')),
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 15728640),
  width_px INTEGER,
  height_px INTEGER,
  low_resolution_warning BOOLEAN NOT NULL DEFAULT FALSE,
  storage_path TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  retention_expires_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. PEDIDOS (Con separación estricta de estado de pago y estado de producción)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL, -- Ej: TRZ-2026-8492 (No suficiente por sí solo para ver el pedido)
  access_token TEXT UNIQUE NOT NULL, -- Token criptográfico de 48+ caracteres para consulta segura
  access_code TEXT NOT NULL,         -- Código de verificación secundario de 6 caracteres
  order_type TEXT NOT NULL DEFAULT 'purchase' CHECK (order_type IN ('purchase', 'quote_request')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_method_id TEXT NOT NULL,
  delivery_method_Snapshot JSONB NOT NULL,
  shipping_address JSONB, -- calle, localidad, provincia, cp
  billing_info JSONB,     -- cuit/dni, razon social (solo cuando se solicita)
  customer_notes TEXT,
  -- Importes calculados y revalidados exclusivamente en el servidor
  subtotal_ars NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_code TEXT,
  shipping_cost_ars NUMERIC(12, 2), -- NULL si requiere cotización manual
  shipping_requires_quote BOOLEAN NOT NULL DEFAULT FALSE,
  total_ars NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  -- Estados separados
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mercadopago', 'bank_transfer', 'quote_only')),
  payment_status payment_status_enum NOT NULL DEFAULT 'pending',
  production_status production_status_enum NOT NULL DEFAULT 'pedido_recibido',
  -- Regla de bloqueo de producción hasta aprobación de diseño
  requires_design_approval BOOLEAN NOT NULL DEFAULT TRUE,
  design_approved_at TIMESTAMPTZ,
  design_approved_by TEXT,
  -- Seguimiento logístico y notas internas
  estimated_production_summary TEXT,
  estimated_shipping_summary TEXT,
  shipping_carrier TEXT,
  shipping_tracking_code TEXT,
  transfer_receipt_file_id TEXT REFERENCES private_files(id),
  admin_internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: Nunca permitir pasar a en_produccion si requiere aprobación y no está aprobada
  CONSTRAINT chk_design_approval_before_production CHECK (
    NOT (
      requires_design_approval = TRUE
      AND design_approved_at IS NULL
      AND production_status IN ('aprobado_para_producir', 'en_produccion', 'listo_para_retirar', 'despachado', 'entregado')
    )
  )
);

-- -----------------------------------------------------------------------------
-- 8. LÍNEAS DE PEDIDO INMUTABLES (Snapshot de producto, variante, opciones y precio)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  -- Copia congelada al momento de la compra
  product_name_snapshot TEXT NOT NULL,
  category_name_snapshot TEXT NOT NULL,
  variant_id TEXT,
  variant_name_snapshot TEXT,
  confirmed_specs_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price_ars_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
  design_help_surcharge_ars_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total_ars_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
  requires_design_approval BOOLEAN NOT NULL DEFAULT TRUE,
  customization_summary TEXT NOT NULL,
  customization_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- -----------------------------------------------------------------------------
-- 9. PAGOS E IDEMPOTENCIA DE NOTIFICACIONES (Mercado Pago & Transferencias)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'bank_transfer')),
  provider_payment_id TEXT UNIQUE, -- Evita duplicar cobros de MP
  idempotency_key TEXT UNIQUE NOT NULL,
  amount_ars NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status payment_status_enum NOT NULL,
  raw_verification_summary JSONB NOT NULL DEFAULT '{}'::jsonb, -- Sin secretos ni tarjetas
  verified_by_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. PROPUESTAS DE DISEÑO Y APROBACIONES (Historial de versiones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS design_revisions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  title TEXT NOT NULL,
  admin_notes TEXT NOT NULL,
  preview_file_id TEXT REFERENCES private_files(id),
  status TEXT NOT NULL CHECK (status IN ('pending_customer_review', 'approved', 'changes_requested')),
  customer_feedback TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, version_number)
);

-- -----------------------------------------------------------------------------
-- 11. HISTORIAL DE EVENTOS DEL PEDIDO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor TEXT NOT NULL CHECK (actor IN ('system', 'customer', 'admin', 'payment_webhook')),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. CONSULTAS DE STAND CREATIVO DE EVENTOS Y PRESUPUESTOS ESPECIALES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY,
  reference_code TEXT UNIQUE NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('tattoo_stand_event', 'custom_bulk_order', 'unpriced_product')),
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  customer_email TEXT,
  event_type TEXT,
  event_date TEXT,
  event_locality TEXT,
  estimated_guests INTEGER,
  theme_or_idea TEXT,
  product_slug TEXT,
  requested_quantity INTEGER,
  observations TEXT,
  customization_payload JSONB,
  status quote_status_enum NOT NULL DEFAULT 'nuevo',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 13. CONFIGURACIÓN DEL COMERCIO, ENVÍOS, FAQ, GALERÍA Y POLÍTICAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brand_name TEXT NOT NULL DEFAULT 'Trazo Espacio Gráfico',
  alt_brand_name TEXT NOT NULL DEFAULT 'Trazo Gráfica',
  city TEXT NOT NULL DEFAULT 'Río Cuarto',
  province TEXT NOT NULL DEFAULT 'Córdoba',
  country TEXT NOT NULL DEFAULT 'Argentina',
  exact_address TEXT, -- NULL hasta confirmación del comercio
  whatsapp_number TEXT NOT NULL DEFAULT '+54 9 358 510 4732',
  whatsapp_url TEXT NOT NULL DEFAULT 'https://wa.me/5493585104732',
  instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/trazo.grafica/',
  instagram_handle TEXT NOT NULL DEFAULT '@trazo.grafica',
  email TEXT NOT NULL DEFAULT 'Trazoografica@gmail.com',
  hero_config JSONB NOT NULL,
  theme_palette JSONB NOT NULL,
  shipping_methods JSONB NOT NULL,
  bank_transfer_config JSONB NOT NULL,
  faqs JSONB NOT NULL,
  gallery_items JSONB NOT NULL,
  authorized_testimonials JSONB NOT NULL,
  policies JSONB NOT NULL,
  active_campaign JSONB,
  sandbox_test_prices_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) — SEGURIDAD EN BASE DE DATOS
-- -----------------------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_quantity_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública únicamente de catálogo publicado y configuración pública
CREATE POLICY "Public read active categories" ON categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read published products" ON products FOR SELECT USING (is_published = TRUE AND availability_status <> 'archived');
CREATE POLICY "Public read enabled variants" ON product_variants FOR SELECT USING (is_enabled = TRUE);
CREATE POLICY "Public read quantity tiers" ON product_quantity_tiers FOR SELECT USING (TRUE);
CREATE POLICY "Public read store settings" ON store_settings FOR SELECT USING (id = 'default');

-- Pedidos, Archivos Privados, Pagos, Diseños y Presupuestos:
-- CERO acceso directo desde cliente anónimo (todo pasa por el servidor con validación de access_token o rol admin).
-- El rol service_role en el backend de Next.js administra las operaciones verificadas.
