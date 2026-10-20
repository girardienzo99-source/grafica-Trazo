import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderByIdForAdmin,
  processVerifiedPaymentNotification,
} from '@/lib/db/store';
import {
  getAppSecret,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/security/auth-and-tokens';
import { sendTransactionalOrderEmail } from '@/lib/notifications/email';
import { PaymentStatus } from '@/types/trazo';

function mapMpStatus(mpStatus: string): PaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'paid';
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'in_process';
    case 'rejected':
    case 'cancelled':
      return 'rejected';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'pending';
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    const dataId = String(
      url.searchParams.get('data.id') ||
        body?.data?.id ||
        body?.id ||
        ''
    ).trim();

    if (!dataId) {
      return NextResponse.json(
        { error: 'Notificación de webhook sin data.id.' },
        { status: 400 }
      );
    }

    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const webhookSecret = process.env.MP_WEBHOOK_SECRET?.trim() || getAppSecret();

    // 1. Validar firma criptográfica HMAC-SHA256 según documentación oficial de Mercado Pago
    const isSignatureValid = verifyMercadoPagoWebhookSignature({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
      webhookSecret,
    });

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          error:
            'Firma de notificación (x-signature) inválida o ausente. Operación rechazada por seguridad.',
        },
        { status: 401 }
      );
    }

    const mpAccessToken = process.env.MP_ACCESS_TOKEN?.trim();

    let verifiedExternalReference = '';
    let verifiedAmountArs = 0;
    let verifiedCurrency = '';
    let verifiedMpStatus = '';
    let verificationSource = '';

    // 2. Confirmar el pago consultando al proveedor (o verificar payload firmado de sandbox cuando no hay MP_ACCESS_TOKEN)
    if (mpAccessToken && mpAccessToken.length > 10 && !body?.sandbox_simulation) {
      const mpPaymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
          },
        }
      );

      if (!mpPaymentRes.ok) {
        return NextResponse.json(
          { error: 'No se pudo confirmar la existencia del pago en Mercado Pago.' },
          { status: 502 }
        );
      }

      const paymentData = (await mpPaymentRes.json()) as {
        id: number | string;
        status: string;
        transaction_amount: number;
        currency_id: string;
        external_reference: string;
      };

      verifiedExternalReference = String(paymentData.external_reference || '');
      verifiedAmountArs = Number(paymentData.transaction_amount || 0);
      verifiedCurrency = String(paymentData.currency_id || '');
      verifiedMpStatus = String(paymentData.status || '');
      verificationSource = 'mercadopago_api_v1_payments';
    } else if (body?.sandbox_simulation && (!mpAccessToken || mpAccessToken.length <= 10)) {
      // Entorno de prueba sin MP_ACCESS_TOKEN con firma x-signature ya validada criptográficamente con el secreto del servidor
      verifiedExternalReference = String(body.external_reference || '');
      verifiedAmountArs = Number(body.transaction_amount || 0);
      verifiedCurrency = String(body.currency_id || 'ARS');
      verifiedMpStatus = String(body.status || 'approved');
      verificationSource = 'sandbox_signed_webhook_test';
    } else {
      return NextResponse.json(
        {
          error:
            'MP_ACCESS_TOKEN no configurado para consultar el pago en producción.',
        },
        { status: 503 }
      );
    }

    const order = getOrderByIdForAdmin(verifiedExternalReference);
    if (!order) {
      return NextResponse.json(
        { error: 'El pedido asociado a external_reference no existe.' },
        { status: 404 }
      );
    }

    const mappedStatus = mapMpStatus(verifiedMpStatus);
    const idempotencyKey = `mp_${dataId}_${mappedStatus}`;

    // 3. Procesar con idempotencia estricta y verificación de importe y moneda
    const result = processVerifiedPaymentNotification({
      orderId: order.id,
      provider: 'mercadopago',
      providerPaymentId: dataId,
      idempotencyKey,
      amountArs: verifiedAmountArs,
      currency: verifiedCurrency,
      status: mappedStatus,
      verificationSummary: {
        source: verificationSource,
        mp_status: verifiedMpStatus,
        request_id: xRequestId,
      },
      actor: 'payment_webhook',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Enviar notificación de pago confirmado únicamente si no es duplicado y pasó a 'paid'
    if (!result.deduplicated && mappedStatus === 'paid' && result.order) {
      await sendTransactionalOrderEmail(result.order, 'pago_confirmado');
    }

    return NextResponse.json({
      success: true,
      deduplicated: result.deduplicated,
      paymentStatus: result.order?.payment_status,
      productionStatus: result.order?.production_status,
      paymentsCount: result.order?.payments.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar el webhook de Mercado Pago.' },
      { status: 500 }
    );
  }
}
