import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  checkRateLimit,
  createAdminSessionToken,
  getExpectedAdminCredentials,
  isAdminRequest,
} from '@/lib/security/auth-and-tokens';

export async function GET() {
  const status = await isAdminRequest();
  const creds = getExpectedAdminCredentials();
  const isStrictProdMissingCreds =
    (process.env.VERCEL_ENV === 'production' ||
      process.env.TRAZO_STRICT_PRODUCTION === 'true') &&
    creds.isDefaultDevCredentials;

  return NextResponse.json({
    authenticated: status.authenticated,
    email: status.email || null,
    productionCredentialsMissing: isStrictProdMissingCreds,
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'local-client';
    const rate = checkRateLimit(`admin_login:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Demasiados intentos de inicio de sesión. Aguardá ${rate.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    const expected = getExpectedAdminCredentials();
    if (
      (process.env.VERCEL_ENV === 'production' ||
        process.env.TRAZO_STRICT_PRODUCTION === 'true') &&
      expected.isDefaultDevCredentials
    ) {
      return NextResponse.json(
        {
          error:
            'Acceso deshabilitado por seguridad: configurá ADMIN_EMAIL, ADMIN_PASSWORD y APP_SECRET_KEY en las variables de entorno de producción.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (
      email !== expected.email.toLowerCase() ||
      password !== expected.password
    ) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken(expected.email);
    const response = NextResponse.json({
      success: true,
      email: expected.email,
    });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar la autenticación.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
