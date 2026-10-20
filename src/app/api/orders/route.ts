import { NextRequest, NextResponse } from 'next/server';
import { createOrderOnServer } from '@/lib/db/store';
import { checkRateLimit } from '@/lib/security/auth-and-tokens';
import { sendTransactionalOrderEmail } from '@/lib/notifications/email';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'local-client';
    const rate = checkRateLimit(`order_create:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Demasiados intentos seguidos. Por favor aguardá ${rate.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    if (!body.customerName?.trim() || !body.customerEmail?.trim() || !body.customerPhone?.trim()) {
      return NextResponse.json(
        { error: 'Por favor completá nombre y apellido, correo electrónico y teléfono.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customerEmail.trim())) {
      return NextResponse.json(
        { error: 'Por favor ingresá un correo electrónico válido.' },
        { status: 400 }
      );
    }

    const result = createOrderOnServer({
      items: body.items || [],
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      deliveryMethodId: body.deliveryMethodId,
      shippingAddress: body.shippingAddress || null,
      billingInfo: body.billingInfo || null,
      customerNotes: body.customerNotes || '',
      discountCode: body.discountCode || null,
      paymentMethod: body.paymentMethod || 'bank_transfer',
      ownerSessionToken: body.ownerSessionToken || 'anonymous-session',
    });

    if (!result.success || !result.order) {
      return NextResponse.json(
        { error: result.error || 'No se pudo procesar el pedido.' },
        { status: 400 }
      );
    }

    // Trigger transactional email (strictly reports sent: false if provider is not configured)
    const emailNotification = await sendTransactionalOrderEmail(
      result.order,
      'pedido_recibido'
    );

    return NextResponse.json({
      success: true,
      order: result.order,
      emailNotification,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno al crear el pedido.' },
      { status: 500 }
    );
  }
}
