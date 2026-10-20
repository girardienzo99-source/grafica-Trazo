import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicCatalog,
  setSandboxTestPricesMode,
} from '@/lib/db/store';
import { isAdminRequest } from '@/lib/security/auth-and-tokens';

export async function GET() {
  const data = getPublicCatalog();
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  try {
    const adminAuth = await isAdminRequest();
    if (!adminAuth.authenticated) {
      return NextResponse.json(
        {
          error:
            'No autorizado. El modo de prueba técnica (Sandbox) solo puede activarse desde el Panel de Administración.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (typeof body.sandbox_test_prices_enabled === 'boolean') {
      const settings = setSandboxTestPricesMode(body.sandbox_test_prices_enabled);
      return NextResponse.json({
        success: true,
        sandbox_test_prices_enabled: settings.sandbox_test_prices_enabled,
        settings,
      });
    }
    return NextResponse.json(
      { error: 'Parámetro inválido.' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el modo del catálogo.' },
      { status: 500 }
    );
  }
}
