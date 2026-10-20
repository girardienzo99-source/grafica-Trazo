import { NextRequest, NextResponse } from 'next/server';
import {
  createSignedFileUrl,
  isAdminRequest,
} from '@/lib/security/auth-and-tokens';
import {
  addCashMovementByAdmin,
  addDesignRevisionByAdmin,
  adjustProductStockByAdmin,
  computeAdminMetrics,
  deleteCashMovementByAdmin,
  deletePrivateFileByAdmin,
  deleteProductByAdmin,
  getEffectiveMercadoPagoCredentials,
  getIntegrationStatusSummary,
  readDatabase,
  setSandboxTestPricesMode,
  updateOrderByAdmin,
  updateQuoteRequestByAdmin,
  updateStoreSettings,
  upsertCategoryByAdmin,
  upsertProductByAdmin,
  validateTransferByAdmin,
} from '@/lib/db/store';
import { sendTransactionalOrderEmail } from '@/lib/notifications/email';

export async function GET(request: NextRequest) {
  const adminStatus = await isAdminRequest();
  if (!adminStatus.authenticated) {
    return NextResponse.json(
      { error: 'Acceso restringido al Panel Administrador de Trazo Espacio Gráfico.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  const db = readDatabase();

  // Exportación de pedidos en CSV
  if (format === 'csv') {
    const header = [
      'Numero_Pedido',
      'Fecha',
      'Cliente',
      'Email',
      'Telefono',
      'Modalidad_Entrega',
      'Estado_Pago',
      'Estado_Produccion',
      'Requiere_Aprobacion_Diseno',
      'Diseno_Aprobado_En',
      'Subtotal_ARS',
      'Descuento_ARS',
      'Envio_ARS',
      'Total_ARS',
      'Seguimiento_Envio',
    ];
    const rows = db.orders.map((o) => [
      o.order_number,
      o.created_at,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      o.customer_email,
      `"${o.customer_phone}"`,
      `"${o.delivery_method_snapshot.name.replace(/"/g, '""')}"`,
      o.payment_status,
      o.production_status,
      o.requires_design_approval ? 'SI' : 'NO',
      o.design_approved_at || '',
      o.subtotal_ars,
      o.discount_ars,
      o.shipping_cost_ars ?? 'A_COTIZAR',
      o.total_ars,
      `"${(o.shipping_tracking_code || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pedidos-trazo-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Generar enlaces temporales firmados con scope 'admin' para todos los archivos privados activos
  const adminSignedFilesMap: Record<
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
  > = {};

  for (const f of db.private_files) {
    if (!f.is_deleted) {
      adminSignedFilesMap[f.id] = {
        id: f.id,
        original_filename: f.original_filename,
        mime_type: f.mime_type,
        size_bytes: f.size_bytes,
        width_px: f.width_px,
        height_px: f.height_px,
        low_resolution_warning: f.low_resolution_warning,
        purpose: f.purpose,
        order_id: f.order_id,
        created_at: f.created_at,
        retention_expires_at: f.retention_expires_at,
        signed_url: createSignedFileUrl(f.id, 'admin', 1800),
      };
    }
  }

  return NextResponse.json({
    adminEmail: adminStatus.email,
    metrics: computeAdminMetrics(),
    integrations: getIntegrationStatusSummary(),
    categories: db.categories,
    products: db.products,
    orders: db.orders,
    quoteRequests: db.quote_requests,
    storeSettings: db.store_settings,
    cashMovements: db.cash_movements || [],
    stockMovements: db.stock_movements || [],
    adminSignedFilesMap,
  });
}

export async function POST(request: NextRequest) {
  const adminStatus = await isAdminRequest();
  if (!adminStatus.authenticated || !adminStatus.email) {
    return NextResponse.json(
      { error: 'No autorizado. Iniciá sesión en el Panel Administrador.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'upsert_product') {
      const product = upsertProductByAdmin(body.product);
      return NextResponse.json({ success: true, product });
    }

    if (action === 'delete_product') {
      const deleted = deleteProductByAdmin(String(body.productId || ''));
      if (!deleted) {
        return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'adjust_stock') {
      const product = adjustProductStockByAdmin({
        productId: String(body.productId || ''),
        newStock:
          body.newStock === null || body.newStock === '' || body.newStock === undefined
            ? null
            : Number(body.newStock),
        minStockAlert:
          body.minStockAlert === null ||
          body.minStockAlert === '' ||
          body.minStockAlert === undefined
            ? null
            : Number(body.minStockAlert),
        sku: body.sku !== undefined ? String(body.sku || '') : undefined,
        reason: body.reason ? String(body.reason) : undefined,
        adminEmail: adminStatus.email,
      });
      if (!product) {
        return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
      }
      const db = readDatabase();
      return NextResponse.json({
        success: true,
        product,
        stockMovements: db.stock_movements || [],
      });
    }

    if (action === 'add_cash_movement') {
      const res = addCashMovementByAdmin({
        type: body.type === 'egreso' ? 'egreso' : 'ingreso',
        category: body.category || 'otro',
        payment_method: body.payment_method || 'efectivo',
        amount_ars: Number(body.amount_ars || 0),
        description: String(body.description || ''),
        order_id: body.order_id || null,
        order_number: body.order_number || null,
        adminEmail: adminStatus.email,
      });
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      const db = readDatabase();
      return NextResponse.json({
        success: true,
        movement: res.movement,
        cashMovements: db.cash_movements || [],
      });
    }

    if (action === 'delete_cash_movement') {
      const deleted = deleteCashMovementByAdmin(String(body.movementId || ''));
      const db = readDatabase();
      return NextResponse.json({
        success: deleted,
        cashMovements: db.cash_movements || [],
      });
    }

    if (action === 'save_mercadopago_config') {
      const mpConfig = body.mercadopagoConfig || {};
      const now = new Date().toISOString();
      const updated = updateStoreSettings((curr) => {
        const prevMp = curr.mercadopago_config || {
          is_enabled: false,
          sandbox_mode: true,
          public_key: null,
          access_token: null,
          webhook_secret: null,
          account_label: null,
          updated_at: now,
        };
        const nextAccessToken =
          mpConfig.access_token !== undefined
            ? String(mpConfig.access_token || '').trim() || null
            : prevMp.access_token || null;
        const nextWebhookSecret =
          mpConfig.webhook_secret !== undefined
            ? String(mpConfig.webhook_secret || '').trim() || null
            : prevMp.webhook_secret || null;
        const nextPublicKey =
          mpConfig.public_key !== undefined
            ? String(mpConfig.public_key || '').trim() || null
            : prevMp.public_key || null;

        return {
          ...curr,
          mercadopago_config: {
            is_enabled:
              mpConfig.is_enabled !== undefined
                ? Boolean(mpConfig.is_enabled)
                : Boolean(nextAccessToken && nextAccessToken.length > 10),
            sandbox_mode:
              mpConfig.sandbox_mode !== undefined
                ? Boolean(mpConfig.sandbox_mode)
                : Boolean(nextAccessToken?.startsWith('TEST-')),
            public_key: nextPublicKey,
            access_token: nextAccessToken,
            webhook_secret: nextWebhookSecret,
            account_label:
              mpConfig.account_label !== undefined
                ? String(mpConfig.account_label || '').trim() || null
                : prevMp.account_label || null,
            has_access_token: Boolean(nextAccessToken && nextAccessToken.length > 10),
            has_webhook_secret: Boolean(
              nextWebhookSecret && nextWebhookSecret.length > 5
            ),
            updated_at: now,
          },
        };
      });

      return NextResponse.json({
        success: true,
        storeSettings: updated,
        integrations: getIntegrationStatusSummary(),
      });
    }

    if (action === 'test_mercadopago_connection') {
      const providedToken = String(body.accessToken || '').trim();
      const effective = getEffectiveMercadoPagoCredentials();
      const tokenToTest = providedToken || effective.accessToken;

      if (!tokenToTest || tokenToTest.length <= 10) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Pegá primero tu Access Token de Mercado Pago (APP_USR-... o TEST-...) para verificar la conexión.',
          },
          { status: 400 }
        );
      }

      try {
        const mpRes = await fetch('https://api.mercadopago.com/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenToTest}`,
          },
        });

        if (!mpRes.ok) {
          return NextResponse.json(
            {
              success: false,
              error: `Mercado Pago respondió con estado ${mpRes.status}. Verificá que el Access Token sea válido y pertenezca a tu aplicación en Mercado Pago Developers.`,
            },
            { status: 400 }
          );
        }

        const mpUser = (await mpRes.json()) as {
          id?: number;
          nickname?: string;
          email?: string;
          site_id?: string;
        };

        return NextResponse.json({
          success: true,
          message: `Conexión verificada con éxito. Cuenta Mercado Pago: ${mpUser.nickname || mpUser.email || mpUser.id} (${mpUser.site_id || 'MLA'}).`,
          account: {
            id: mpUser.id,
            nickname: mpUser.nickname,
            email: mpUser.email,
            siteId: mpUser.site_id,
          },
        });
      } catch {
        return NextResponse.json(
          {
            success: false,
            error:
              'No se pudo contactar con api.mercadopago.com en este momento. Las credenciales quedaron guardadas en el servidor.',
          },
          { status: 502 }
        );
      }
    }

    if (action === 'upsert_category') {
      const category = upsertCategoryByAdmin(body.category);
      return NextResponse.json({ success: true, category });
    }

    if (action === 'toggle_sandbox_prices') {
      const settings = setSandboxTestPricesMode(Boolean(body.enabled));
      return NextResponse.json({ success: true, settings });
    }

    if (action === 'validate_transfer') {
      const res = validateTransferByAdmin({
        orderId: body.orderId,
        decision: body.decision === 'approve' ? 'approve' : 'reject',
        adminEmail: adminStatus.email,
        notes: body.notes,
      });
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      let emailNotification = null;
      if (body.decision === 'approve' && res.order) {
        emailNotification = await sendTransactionalOrderEmail(
          res.order,
          'pago_confirmado'
        );
      }
      return NextResponse.json({
        success: true,
        order: res.order,
        metrics: computeAdminMetrics(),
        emailNotification,
      });
    }

    if (action === 'add_design_revision') {
      const res = addDesignRevisionByAdmin({
        orderId: body.orderId,
        title: body.title || 'Muestra digital de diseño',
        adminNotes: body.adminNotes || '',
        previewFileId: body.previewFileId || null,
        requestFileCorrections: Boolean(body.requestFileCorrections),
      });
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      let emailNotification = null;
      if (res.order && !body.requestFileCorrections) {
        emailNotification = await sendTransactionalOrderEmail(
          res.order,
          'diseno_pendiente_aprobacion',
          {
            designRevisionVersion: res.revision?.version_number,
            designNotes: body.adminNotes,
          }
        );
      }
      return NextResponse.json({
        success: true,
        order: res.order,
        revision: res.revision,
        emailNotification,
      });
    }

    if (action === 'update_order_production') {
      const res = updateOrderByAdmin({
        orderId: body.orderId,
        productionStatus: body.productionStatus,
        shippingCarrier: body.shippingCarrier,
        shippingTrackingCode: body.shippingTrackingCode,
        adminInternalNotes: body.adminInternalNotes,
        registerManualDesignApproval: Boolean(body.registerManualDesignApproval),
        adminEmail: adminStatus.email,
      });
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }

      let emailNotification = null;
      if (res.order && body.productionStatus === 'listo_para_retirar') {
        emailNotification = await sendTransactionalOrderEmail(
          res.order,
          'pedido_listo'
        );
      } else if (res.order && body.productionStatus === 'despachado') {
        emailNotification = await sendTransactionalOrderEmail(
          res.order,
          'pedido_despachado'
        );
      }

      return NextResponse.json({
        success: true,
        order: res.order,
        metrics: computeAdminMetrics(),
        emailNotification,
      });
    }

    if (action === 'update_quote') {
      const quote = updateQuoteRequestByAdmin({
        quoteId: body.quoteId,
        status: body.status,
        adminNotes: body.adminNotes,
      });
      if (!quote) {
        return NextResponse.json({ error: 'Consulta no encontrada.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, quote });
    }

    if (action === 'update_store_settings') {
      const updated = updateStoreSettings((curr) => ({
        ...curr,
        ...body.settingsPatch,
      }));
      return NextResponse.json({ success: true, storeSettings: updated });
    }

    if (action === 'delete_private_file') {
      const deleted = deletePrivateFileByAdmin(String(body.fileId || ''));
      return NextResponse.json({ success: deleted });
    }

    return NextResponse.json({ error: 'Acción administrativa inválida.' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: 'Error al ejecutar la operación administrativa.' },
      { status: 500 }
    );
  }
}
