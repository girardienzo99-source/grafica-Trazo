import { NextRequest, NextResponse } from 'next/server';
import { createQuoteRequest } from '@/lib/db/store';
import { checkRateLimit } from '@/lib/security/auth-and-tokens';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'local-client';
    const rate = checkRateLimit(`quote:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Demasiadas solicitudes seguidas. Aguardá ${rate.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const customerName = String(body.customerName || '').trim();
    const customerContact = String(body.customerContact || '').trim();

    if (!customerName || !customerContact) {
      return NextResponse.json(
        { error: 'Por favor completá tu nombre y un medio de contacto (WhatsApp o correo).' },
        { status: 400 }
      );
    }

    const requestType =
      body.requestType === 'custom_bulk_order'
        ? 'custom_bulk_order'
        : body.requestType === 'unpriced_product'
        ? 'unpriced_product'
        : 'tattoo_stand_event';

    if (requestType === 'tattoo_stand_event') {
      if (!body.eventType?.trim() || !body.eventDate?.trim() || !body.eventLocality?.trim()) {
        return NextResponse.json(
          {
            error:
              'Para consultar por el Stand Creativo de Tatuajes Temporales completá tipo de evento, fecha estimada y localidad.',
          },
          { status: 400 }
        );
      }
    }

    const quote = createQuoteRequest({
      requestType,
      customerName,
      customerContact,
      customerEmail: body.customerEmail || null,
      eventType: body.eventType || null,
      eventDate: body.eventDate || null,
      eventLocality: body.eventLocality || null,
      estimatedGuests: body.estimatedGuests ? Number(body.estimatedGuests) : null,
      themeOrIdea: body.themeOrIdea || null,
      productSlug: body.productSlug || null,
      productName: body.productName || null,
      requestedQuantity: body.requestedQuantity ? Number(body.requestedQuantity) : null,
      observations: body.observations || '',
      customizationPayload: body.customizationPayload || null,
      fileIds: Array.isArray(body.fileIds) ? body.fileIds : [],
    });

    return NextResponse.json({
      success: true,
      quote,
      disclaimer:
        'Tu consulta fue registrada en el panel de Trazo Espacio Gráfico. Importante: el envío de esta solicitud no implica confirmación de disponibilidad ni reserva de fecha hasta que el comercio te lo confirme.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al registrar la consulta de presupuesto.' },
      { status: 500 }
    );
  }
}
