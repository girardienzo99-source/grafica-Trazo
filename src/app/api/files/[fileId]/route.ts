import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderByAccessToken,
  getPrivateFileRecord,
  readPrivateFileBytes,
} from '@/lib/db/store';
import {
  isAdminRequest,
  verifySignedFileParams,
} from '@/lib/security/auth-and-tokens';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const record = getPrivateFileRecord(fileId);
  if (!record) {
    return NextResponse.json(
      { error: 'Archivo privado no encontrado.' },
      { status: 404 }
    );
  }

  // 1. Check if requester is authenticated Admin
  const adminStatus = await isAdminRequest();
  let authorized = adminStatus.authenticated;

  // 2. Otherwise verify temporary HMAC signature and ownership scope
  if (!authorized) {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || '';
    const exp = searchParams.get('exp') || '';
    const sig = searchParams.get('sig') || '';

    const validSignature = verifySignedFileParams(fileId, scope, exp, sig);
    if (validSignature) {
      if (scope === 'admin') {
        authorized = true;
      } else if (scope === record.owner_token) {
        authorized = true;
      } else if (record.order_id) {
        // Check if scope is the cryptographic access_token of the order that owns this file
        const order = getOrderByAccessToken(scope);
        if (order && order.id === record.order_id) {
          authorized = true;
        }
      }
    }
  }

  if (!authorized) {
    return NextResponse.json(
      {
        error:
          'Acceso denegado: Este archivo pertenece a un pedido privado y requiere un enlace temporal firmado válido.',
      },
      { status: 403 }
    );
  }

  const bytes = readPrivateFileBytes(record);
  if (!bytes) {
    return NextResponse.json(
      { error: 'El contenido del archivo ya no se encuentra disponible.' },
      { status: 404 }
    );
  }

  const safeFilename = record.original_filename.replace(/["\\\r\n]/g, '_');

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': record.mime_type,
      'Content-Length': String(bytes.length),
      // Force attachment for SVG/PDF or sandboxed inline for raster images
      'Content-Disposition':
        record.mime_type === 'image/svg+xml' || record.mime_type === 'application/pdf'
          ? `attachment; filename="${safeFilename}"`
          : `inline; filename="${safeFilename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; sandbox",
    },
  });
}
