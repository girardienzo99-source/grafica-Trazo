import { NextRequest, NextResponse } from 'next/server';
import { validateAndComputeCartOnServer } from '@/lib/db/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validateAndComputeCartOnServer({
      items: body.items || [],
      discountCode: body.discountCode || null,
      deliveryMethodId: body.deliveryMethodId || null,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Error al revalidar el carrito en el servidor.' },
      { status: 400 }
    );
  }
}
