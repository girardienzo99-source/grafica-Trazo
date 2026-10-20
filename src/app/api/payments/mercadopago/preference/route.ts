import { NextRequest, NextResponse } from 'next/server';
import {
  getEffectiveMercadoPagoCredentials,
  getOrderByAccessToken,
} from '@/lib/db/store';
import {
  buildMercadoPagoWebhookSignature,
  getAppSecret,
} from '@/lib/security/auth-and-tokens';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = String(body.accessToken || '').trim();
    const order = getOrderByAccessToken(accessToken);

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado o token inválido.' },
        { status: 404 }
      );
    }

    if (order.order_type === 'quote_request' || order.total_ars <= 0) {
      return NextResponse.json(
        {
          error:
            'Este pedido contiene productos pendientes de cotización y no admite cobro directo hasta definir el presupuesto.',
        },
        { status: 400 }
      );
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
      /\/$/,
      ''
    );

    const mpCreds = getEffectiveMercadoPagoCredentials();
    const mpAccessToken = mpCreds.accessToken;

    // Construir preferencia según documentación oficial de Mercado Pago Checkout Pro
    const preferencePayload = {
      external_reference: order.id,
      statement_descriptor: 'TRAZO GRAFICA',
      items: [
        {
          id: order.order_number,
          title: `Pedido ${order.order_number} — Trazo Espacio Gráfico`,
          description: order.items
            .map((i) => `${i.quantity}x ${i.product_name_snapshot}`)
            .join(', ')
            .slice(0, 240),
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Number(order.total_ars),
        },
      ],
      payer: {
        name: order.customer_name,
        email: order.customer_email,
      },
      back_urls: {
        // IMPORTANTE: Visitar esta URL de retorno NUNCA marca el pedido como pagado;
        // solo el webhook verificado confirma el pago.
        success: `${siteUrl}/pedidos/${order.access_token}?mp_return=success`,
        pending: `${siteUrl}/pedidos/${order.access_token}?mp_return=pending`,
        failure: `${siteUrl}/pedidos/${order.access_token}?mp_return=failure`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/payments/mercadopago/webhook`,
    };

    // Si las credenciales reales de Mercado Pago están configuradas, crear preferencia oficial
    if (mpAccessToken && mpAccessToken.length > 10) {
      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pref_${order.id}_${order.total_ars}`,
        },
        body: JSON.stringify(preferencePayload),
      });

      if (!mpRes.ok) {
        return NextResponse.json(
          {
            error:
              'Mercado Pago rechazó la creación de la preferencia. Verificá que MP_ACCESS_TOKEN sea válido.',
          },
          { status: 502 }
        );
      }

      const mpData = (await mpRes.json()) as {
        id: string;
        init_point: string;
        sandbox_init_point?: string;
      };

      return NextResponse.json({
        success: true,
        credentialsConfigured: true,
        preferenceId: mpData.id,
        initPoint: mpData.init_point,
        sandboxInitPoint: mpData.sandbox_init_point,
      });
    }

    // Si faltan credenciales en .env, informar con transparencia sin simular cobros reales,
    // y proveer cabeceras firmadas para probar el Webhook e Idempotencia en entorno de prueba (Sandbox).
    const testPaymentId = `mp_test_${order.order_number.replace(/[^A-Z0-9]/gi, '')}`;
    const testRequestId = `req_${order.id}`;
    const testTs = String(Math.floor(Date.now() / 1000));
    const webhookSecret = mpCreds.webhookSecret || getAppSecret();
    const testSignature = buildMercadoPagoWebhookSignature(
      testPaymentId,
      testRequestId,
      testTs,
      webhookSecret
    );

    return NextResponse.json({
      success: true,
      credentialsConfigured: false,
      message:
        'Integración oficial de Mercado Pago preparada en servidor. Podés conectar tu cuenta pegando tu Access Token y Public Key en la pestaña Mercado Pago del Panel Administrador.',
      preferencePayloadPreview: preferencePayload,
      sandboxTestHelper: {
        available: true,
        paymentId: testPaymentId,
        requestId: testRequestId,
        xSignature: testSignature,
        amountArs: order.total_ars,
        currency: 'ARS',
        externalReference: order.id,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al preparar la preferencia de Mercado Pago.' },
      { status: 500 }
    );
  }
}
