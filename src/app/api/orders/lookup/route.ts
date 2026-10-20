import { NextRequest, NextResponse } from 'next/server';
import { lookupOrderWithVerification } from '@/lib/db/store';
import { checkRateLimit } from '@/lib/security/auth-and-tokens';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'local-client';
    const rate = checkRateLimit(`order_lookup:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Demasiados intentos de consulta. Aguardá ${rate.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const orderNumber = String(body.orderNumber || '').trim();
    const email = String(body.email || '').trim();
    const accessCode = String(body.accessCode || '').trim();

    // REGLA DE SEGURIDAD: No permitir acceso usando solamente un número de pedido predecible.
    if (!orderNumber || !email || !accessCode) {
      return NextResponse.json(
        {
          error:
            'Por seguridad, para consultar un pedido sin el enlace directo debés ingresar el Número de Pedido, el Correo Electrónico y el Código de Verificación de 6 caracteres.',
        },
        { status: 400 }
      );
    }

    const order = lookupOrderWithVerification({
      orderNumber,
      email,
      accessCode,
    });

    if (!order) {
      return NextResponse.json(
        {
          error:
            'No encontramos un pedido que coincida con esa combinación de número, correo y código de verificación.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: order.access_token,
      redirectUrl: `/pedidos/${order.access_token}`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al verificar los datos del pedido.' },
      { status: 500 }
    );
  }
}
