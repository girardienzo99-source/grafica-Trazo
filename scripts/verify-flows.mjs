/**
 * Script de Verificación Integral End-to-End — Trazo Espacio Gráfico
 * Comprueba automáticamente los recorridos comerciales, de seguridad y de interfaz sobre el servidor real.
 */

const BASE_URL = process.env.VERIFY_BASE_URL || 'http://localhost:3000';

// Minimal valid 1x1 PNG buffer (magic bytes: 89 50 4E 47 0D 0A 1A 0A)
const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const VALID_PNG_BUFFER = Buffer.from(VALID_PNG_BASE64, 'base64');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ FALLÓ VERIFICACIÓN: ${message}`);
  }
  console.log(`✅ OK: ${message}`);
}

async function uploadTestPng(filename, ownerToken, purpose = 'customer_photo') {
  const form = new FormData();
  const blob = new Blob([VALID_PNG_BUFFER], { type: 'image/png' });
  form.append('file', blob, filename);
  form.append('owner_token', ownerToken);
  form.append('purpose', purpose);
  form.append('width_px', '800');
  form.append('height_px', '800');

  const res = await fetch(`${BASE_URL}/api/files/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  assert(res.ok && data.file?.id, `Archivo privado "${filename}" subido con ID ${data.file?.id}`);
  return data.file;
}

async function runVerification() {
  console.log('==============================================================');
  console.log('INICIANDO VERIFICACIÓN END-TO-END DE TRAZO ESPACIO GRÁFICO');
  console.log('==============================================================');

  // 0. Verificar que un usuario público no puede alterar el modo Sandbox en /api/catalog
  const unauthPatchRes = await fetch(`${BASE_URL}/api/catalog`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sandbox_test_prices_enabled: true }),
  });
  assert(
    unauthPatchRes.status === 401,
    'Seguridad verificada: Público no autenticado no puede activar ni desactivar tarifas Sandbox (HTTP 401)'
  );

  // Autenticar sesión administrativa para las pruebas de configuración
  const adminLoginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'Trazoografica@gmail.com',
      password: 'trazo-admin-2026',
    }),
  });
  const setCookieHeader = adminLoginRes.headers.get('set-cookie');
  assert(adminLoginRes.ok && setCookieHeader, 'Inicio de sesión en Panel Administrador exitoso');

  const adminHeaders = {
    'Content-Type': 'application/json',
    Cookie: setCookieHeader,
  };

  // 1. Verificar Modo Oficial (Sin precios ficticios -> Cotización limpia)
  await fetch(`${BASE_URL}/api/catalog`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ sandbox_test_prices_enabled: false }),
  });

  const catRes = await fetch(`${BASE_URL}/api/catalog`);
  const catData = await catRes.json();
  assert(
    catData.categories.length === 7 && catData.products.length === 10,
    'Catálogo cargado con las 7 categorías y los 10 productos reales observados'
  );
  assert(
    catData.products.every(
      (p) =>
        p.images?.length > 0 &&
        p.images[0].url?.endsWith('.jpg') &&
        p.images[0].is_real_authorized_photo === true
    ),
    'Los 10 productos del catálogo cuentan con fotografías reales (.jpg) sin imágenes en blanco ni esquemas SVG'
  );

  // Verificar que las páginas públicas no exponen textos técnicos ni credenciales de prueba
  const routesToInspect = [
    '/',
    '/tienda',
    '/tienda/imanes-personalizados-5x5',
    '/politicas',
    '/admin',
  ];
  const forbiddenPhrases = [
    'A configurar en panel',
    'Precio pendiente de configuración oficial',
    'Foto editable en Admin',
    'Términos y condiciones (editables)',
    'trazo-admin-2026',
  ];
  for (const route of routesToInspect) {
    const pageRes = await fetch(`${BASE_URL}${route}`);
    const html = await pageRes.text();
    for (const phrase of forbiddenPhrases) {
      assert(
        !html.includes(phrase),
        `Ruta ${route} libre de texto interno o credencial expuesta ("${phrase}")`
      );
    }
  }

  // 2. Subir archivos privados de dos clientes distintos y verificar aislamiento de seguridad
  const clientASession = 'sess_cliente_A_seguro_12345';
  const clientBSession = 'sess_cliente_B_otro_99999';

  const photoA1 = await uploadTestPng('foto-vacaciones-1.png', clientASession, 'customer_photo');
  const photoA2 = await uploadTestPng('foto-cumple-2.png', clientASession, 'customer_photo');
  const designA = await uploadTestPng('logo-emprendimiento.png', clientASession, 'customer_design');

  // Cliente A puede acceder con su enlace temporal firmado
  const validFileRes = await fetch(`${BASE_URL}${photoA1.signed_url}`);
  assert(
    validFileRes.status === 200,
    'El propietario puede consultar su archivo privado mediante enlace temporal firmado'
  );

  // Cliente B intenta acceder al archivo de Cliente A sin firma válida o alterando el scope -> 403
  const tamperedUrl = photoA1.signed_url.replace(clientASession, clientBSession);
  const forbiddenRes1 = await fetch(`${BASE_URL}${tamperedUrl}`);
  const forbiddenRes2 = await fetch(`${BASE_URL}/api/files/${photoA1.id}`);
  assert(
    forbiddenRes1.status === 403 && forbiddenRes2.status === 403,
    'Seguridad verificada: Se impide el acceso a archivos privados de otro cliente (HTTP 403)'
  );

  // 3. Habilitar tarifas de entorno de prueba (Sandbox) desde sesión Admin y validar carrito con variantes/diseños separados
  await fetch(`${BASE_URL}/api/catalog`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ sandbox_test_prices_enabled: true }),
  });

  const lineItems = [
    {
      product_id: 'prod-imanes-5x5',
      variant_id: 'var-imanes-unidad',
      quantity: 2,
      design_help_requested: false,
      customization_summary: 'Medida: 5 × 5 cm · 2 fotos distintas (1 copia c/u)',
      customization_payload: {
        customizer_type: 'magnets_5x5',
        design_help_requested: false,
        magnet_photos: [
          {
            id: 'mp1',
            file_id: photoA1.id,
            filename: photoA1.original_filename,
            mime_type: 'image/png',
            size_bytes: 100,
            width_px: 800,
            height_px: 800,
            low_resolution_warning: false,
            quantity_assigned: 1,
            crop: { zoom: 1, offsetX: 0, offsetY: 0 },
            cropped_preview_data_url: 'data:image/png;base64,' + VALID_PNG_BASE64,
          },
          {
            id: 'mp2',
            file_id: photoA2.id,
            filename: photoA2.original_filename,
            mime_type: 'image/png',
            size_bytes: 100,
            width_px: 800,
            height_px: 800,
            low_resolution_warning: false,
            quantity_assigned: 1,
            crop: { zoom: 1.2, offsetX: 5, offsetY: 0 },
            cropped_preview_data_url: 'data:image/png;base64,' + VALID_PNG_BASE64,
          },
        ],
      },
      file_ids: [photoA1.id, photoA2.id],
    },
    {
      product_id: 'prod-planchas-stickers',
      variant_id: 'var-stickers-std',
      quantity: 2,
      design_help_requested: false,
      customization_summary: 'Plancha Stickers Diseño A — @marca.uno',
      customization_payload: {
        customizer_type: 'design_upload',
        custom_text: '@marca.uno',
        design_help_requested: false,
        design_files: [
          {
            file_id: designA.id,
            filename: designA.original_filename,
            mime_type: 'image/png',
            size_bytes: 100,
          },
        ],
      },
      file_ids: [designA.id],
    },
    {
      product_id: 'prod-planchas-stickers',
      variant_id: 'var-stickers-std',
      quantity: 1,
      design_help_requested: true,
      customization_summary: 'Plancha Stickers Diseño B — Necesita diseño',
      customization_payload: {
        customizer_type: 'design_upload',
        custom_text: 'Feria Río Cuarto',
        design_help_requested: true,
      },
      file_ids: [],
    },
  ];

  const cartValRes = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: lineItems,
      discountCode: 'TRAZOTEST10',
      deliveryMethodId: 'ship-pickup-rio-cuarto',
    }),
  });
  const cartValData = await cartValRes.json();
  assert(
    cartValData.valid && cartValData.validatedItems.length === 3 && cartValData.totalArs > 0,
    `Carrito revalidado en servidor con 3 líneas separadas para diseños distintos. Total ARS: $${cartValData.totalArs}`
  );

  // 4. Crear Pedido #1 con Mercado Pago y probar Webhook firmado + Idempotencia ante duplicados
  const createMpOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: lineItems,
      customerName: 'Lucía Fernández',
      customerEmail: 'lucia.fernandez@ejemplo.com.ar',
      customerPhone: '+54 9 358 411 2233',
      deliveryMethodId: 'ship-pickup-rio-cuarto',
      shippingAddress: null,
      billingInfo: { needs_invoice: false },
      customerNotes: 'Retiro por la tarde en Río Cuarto.',
      discountCode: 'TRAZOTEST10',
      paymentMethod: 'mercadopago',
      ownerSessionToken: clientASession,
    }),
  });
  const mpOrderData = await createMpOrderRes.json();
  const mpOrder = mpOrderData.order;
  assert(
    createMpOrderRes.ok && mpOrder?.access_token && mpOrder?.payment_status === 'pending',
    `Pedido Mercado Pago ${mpOrder?.order_number} creado con estado de pago 'pending'`
  );

  // Obtener preferencia y firma criptográfica del servidor
  const prefRes = await fetch(`${BASE_URL}/api/payments/mercadopago/preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: mpOrder.access_token }),
  });
  const prefData = await prefRes.json();
  const helper = prefData.sandboxTestHelper;
  assert(
    prefRes.ok && helper?.xSignature,
    'Preferencia Mercado Pago creada desde servidor con firma HMAC para webhook de prueba'
  );

  // Enviar 1ra notificación de webhook firmada
  const webhookRes1 = await fetch(
    `${BASE_URL}/api/payments/mercadopago/webhook?data.id=${encodeURIComponent(helper.paymentId)}`,
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
  const webhookData1 = await webhookRes1.json();
  assert(
    webhookRes1.ok && webhookData1.paymentStatus === 'paid' && webhookData1.deduplicated === false,
    'Primera notificación de pago Mercado Pago acreditada y verificada en servidor'
  );

  // Enviar 2da notificación de webhook IDÉNTICA (duplicada) -> Verificar idempotencia
  const webhookRes2 = await fetch(
    `${BASE_URL}/api/payments/mercadopago/webhook?data.id=${encodeURIComponent(helper.paymentId)}`,
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
  const webhookData2 = await webhookRes2.json();
  assert(
    webhookRes2.ok && webhookData2.deduplicated === true && webhookData2.paymentsCount === 1,
    'Idempotencia verificada: Notificación de pago duplicada detectada sin duplicar registros (paymentsCount === 1)'
  );

  // 5. Crear Pedido #2 con Transferencia Bancaria, subir comprobante y verificar que NO se aprueba solo
  const createTrfOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [lineItems[1]],
      customerName: 'Martín Pereyra',
      customerEmail: 'martin.pereyra@ejemplo.com.ar',
      customerPhone: '+54 9 358 500 1122',
      deliveryMethodId: 'ship-cordoba-prov',
      shippingAddress: {
        street_and_number: 'Av. España 320',
        locality: 'Río Cuarto',
        province: 'Córdoba',
        postal_code: '5800',
      },
      billingInfo: { needs_invoice: false },
      customerNotes: 'Envío por comisionista.',
      paymentMethod: 'bank_transfer',
      ownerSessionToken: clientBSession,
    }),
  });
  const trfOrder = (await createTrfOrderRes.json()).order;
  const receiptFile = await uploadTestPng('comprobante-banco.png', clientBSession, 'transfer_receipt');

  const attachReceiptRes = await fetch(`${BASE_URL}/api/orders/${trfOrder.access_token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'attach_transfer_receipt',
      fileId: receiptFile.id,
    }),
  });
  const attachReceiptData = await attachReceiptRes.json();
  assert(
    attachReceiptRes.ok &&
      attachReceiptData.order.payment_status === 'transfer_proof_uploaded' &&
      attachReceiptData.order.payment_status !== 'paid',
    'Transferencia bancaria: Subir comprobante deja el pedido en validación administrativa y NUNCA lo da por pagado automáticamente'
  );

  // 6. Verificar en Panel Administrador métricas, transferencia y bloqueo de producción
  const blockedProdRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      action: 'update_order_production',
      orderId: mpOrder.id,
      productionStatus: 'en_produccion',
    }),
  });
  assert(
    blockedProdRes.status === 400,
    'Bloqueo de producción verificado: No permite pasar a "en_produccion" sin aprobación de diseño registrada'
  );

  // Administrador envía propuesta de diseño v1
  const sendRevRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      action: 'add_design_revision',
      orderId: mpOrder.id,
      title: 'Propuesta v1 Plancha de Stickers',
      adminNotes: 'Muestra lista a escala real.',
    }),
  });
  const sendRevData = await sendRevRes.json();
  const revisionId = sendRevData.revision?.id;
  assert(
    sendRevRes.ok && revisionId && sendRevData.order.production_status === 'esperando_aprobacion_cliente',
    'Administrador adjuntó propuesta de diseño v1; pedido pasó a "esperando_aprobacion_cliente"'
  );

  // Cliente revisa y aprueba el diseño desde su enlace seguro
  const approveDesignRes = await fetch(`${BASE_URL}/api/orders/${mpOrder.access_token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'design_decision',
      revisionId,
      decision: 'approve',
      feedback: '¡Me encanta cómo quedó el diseño, aprobado para producir!',
    }),
  });
  const approveDesignData = await approveDesignRes.json();
  assert(
    approveDesignRes.ok &&
      approveDesignData.order.production_status === 'aprobado_para_producir' &&
      Boolean(approveDesignData.order.design_approved_at),
    'Cliente aprobó el diseño desde su enlace seguro; pedido habilitado en "aprobado_para_producir"'
  );

  // Ahora el Administrador SÍ puede pasar el pedido a 'en_produccion'
  const allowedProdRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      action: 'update_order_production',
      orderId: mpOrder.id,
      productionStatus: 'en_produccion',
    }),
  });
  assert(
    allowedProdRes.ok,
    'Con el diseño aprobado, el Administrador pudo avanzar el pedido a "en_produccion"'
  );

  // Validar transferencia bancaria del Pedido #2 desde Admin
  const validateTrfRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      action: 'validate_transfer',
      orderId: trfOrder.id,
      decision: 'approve',
      notes: 'Acreditación bancaria verificada.',
    }),
  });
  const validateTrfData = await validateTrfRes.json();
  assert(
    validateTrfRes.ok && validateTrfData.order.payment_status === 'paid',
    'Administrador validó la transferencia bancaria y confirmó el pago'
  );

  // 7. Consultar estado del pedido y comprobar que no se puede acceder solo con número de pedido
  const badLookupRes = await fetch(`${BASE_URL}/api/orders/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: mpOrder.order_number,
      email: '',
      accessCode: '',
    }),
  });
  assert(
    badLookupRes.status === 400,
    'Seguridad verificada: Se rechaza la consulta de pedido usando únicamente el número de pedido'
  );

  const validLookupRes = await fetch(`${BASE_URL}/api/orders/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: mpOrder.order_number,
      email: mpOrder.customer_email,
      accessCode: mpOrder.access_code,
    }),
  });
  const validLookupData = await validLookupRes.json();
  assert(
    validLookupRes.ok && validLookupData.accessToken === mpOrder.access_token,
    'Consulta de pedido con verificación de 3 factores exitosa'
  );

  // 8. Solicitar presupuesto para el Stand Creativo de Tatuajes Temporales para Eventos (con archivo privado de referencia)
  const quoteRes = await fetch(`${BASE_URL}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestType: 'tattoo_stand_event',
      customerName: 'Sofía Domínguez',
      customerContact: '+54 9 358 499 8877',
      eventType: 'Casamiento / Boda',
      eventDate: '2027-03-20',
      eventLocality: 'Río Cuarto, Córdoba',
      estimatedGuests: 140,
      themeOrIdea: 'Tatuajes con frases de los novios y dibujos de nuestras mascotas',
      observations: 'Salón en zona oeste de Río Cuarto.',
      fileIds: [designA.id],
    }),
  });
  const quoteData = await quoteRes.json();
  assert(
    quoteRes.ok &&
      quoteData.quote?.reference_code &&
      quoteData.quote?.file_ids?.includes(designA.id),
    `Consulta para Stand de Tatuajes Temporales con archivo privado guardada en el panel (${quoteData.quote?.reference_code})`
  );

  // 9. Verificar validación del servidor contra personalización vacía en productos design_upload
  const emptyDesignValRes = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          product_id: 'prod-planchas-stickers',
          variant_id: 'var-stickers-circular',
          quantity: 2,
          design_help_requested: false,
          customization_summary: 'Sin datos',
          customization_payload: {
            customizer_type: 'design_upload',
            variant_id: 'var-stickers-circular',
            variant_name: 'Stickers troquelados circulares / con forma',
            design_file_id: null,
            design_filename: null,
            design_files: [],
            custom_text: '',
            color_preferences: '',
            observations: '',
            design_help_requested: false,
          },
          file_ids: [],
        },
      ],
      deliveryMethodId: 'ship-pickup-rio-cuarto',
    }),
  });
  const emptyDesignValData = await emptyDesignValRes.json();
  assert(
    emptyDesignValData.valid === false && Boolean(emptyDesignValData.error),
    'Seguridad servidor verificada: Se rechazan líneas de carrito sin archivo, texto ni solicitud de diseño'
  );

  // 10. Verificar bloqueo del servidor ante intento de compra directa del Stand de Tatuajes sin paquete fijo
  const standCartValRes = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          product_id: 'prod-stand-tatuajes-eventos',
          variant_id: 'var-stand-evento',
          quantity: 1,
          design_help_requested: false,
          customization_summary: 'Stand evento',
          customization_payload: {
            customizer_type: 'event_stand',
            variant_id: 'var-stand-evento',
            variant_name: 'Stand Creativo para Evento (A cotizar)',
            design_file_id: null,
            design_filename: null,
            custom_text: '',
            color_preferences: '',
            observations: '',
            design_help_requested: false,
          },
          file_ids: [],
        },
      ],
      deliveryMethodId: 'ship-pickup-rio-cuarto',
    }),
  });
  const standCartValData = await standCartValRes.json();
  assert(
    standCartValData.valid === false && Boolean(standCartValData.error),
    'Regla comercial en servidor verificada: El Stand de Eventos exige cotización a medida salvo precio oficial configurado'
  );

  // 11. Verificar que el Panel Admin requiere sesión autenticada (401 sin cookie) y expone métricas separadas
  const unauthAdminRes = await fetch(`${BASE_URL}/api/admin/dashboard`);
  assert(
    unauthAdminRes.status === 401,
    'Seguridad servidor verificada: El endpoint /api/admin/dashboard rechaza accesos sin sesión (HTTP 401)'
  );

  const authAdminRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Cookie: setCookieHeader },
  });
  const authAdminData = await authAdminRes.json();
  assert(
    authAdminRes.ok &&
      typeof authAdminData.metrics?.sandboxOrdersCount === 'number' &&
      Boolean(authAdminData.adminSignedFilesMap?.[designA.id]?.signed_url),
    'Panel Admin autenticado expone métricas separadas (Oficial vs Sandbox) y enlaces firmados de archivos en presupuestos'
  );

  // Restaurar Modo Oficial (sin precios ficticios) tras la prueba técnica
  await fetch(`${BASE_URL}/api/catalog`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ sandbox_test_prices_enabled: false }),
  });

  console.log('==============================================================');
  console.log('🎉 TODOS LOS RECORRIDOS DE VERIFICACIÓN PASARON EXITOSAMENTE');
  console.log('==============================================================');
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
