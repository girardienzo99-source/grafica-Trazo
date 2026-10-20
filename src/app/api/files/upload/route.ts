import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  createSignedFileUrl,
  isAdminRequest,
  validateAndSanitizeUploadedFile,
} from '@/lib/security/auth-and-tokens';
import { savePrivateFile } from '@/lib/db/store';
import { PrivateFileRecord } from '@/types/trazo';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'local-client';
    const rate = checkRateLimit(`upload:${ip}`, 40, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Demasiadas cargas seguidas. Por favor aguardá ${rate.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const ownerToken = String(formData.get('owner_token') || '').trim();
    const purposeRaw = String(formData.get('purpose') || 'customer_photo').trim();
    const widthPxRaw = formData.get('width_px');
    const heightPxRaw = formData.get('height_px');

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo.' },
        { status: 400 }
      );
    }

    const adminStatus = await isAdminRequest();
    if (purposeRaw === 'admin_design_proposal' && !adminStatus.authenticated) {
      return NextResponse.json(
        { error: 'No autorizado para subir propuestas de diseño.' },
        { status: 403 }
      );
    }

    if (!ownerToken && !adminStatus.authenticated) {
      return NextResponse.json(
        { error: 'Falta identificador seguro de sesión para resguardar el archivo privado.' },
        { status: 400 }
      );
    }

    const validPurposes: PrivateFileRecord['purpose'][] = [
      'customer_photo',
      'customer_design',
      'transfer_receipt',
      'admin_design_proposal',
    ];
    const purpose: PrivateFileRecord['purpose'] = validPurposes.includes(
      purposeRaw as PrivateFileRecord['purpose']
    )
      ? (purposeRaw as PrivateFileRecord['purpose'])
      : 'customer_photo';

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    const validation = validateAndSanitizeUploadedFile({
      buffer: rawBuffer,
      declaredMime: file.type,
      originalFilename: file.name,
    });

    if (!validation.valid || !validation.sanitizedBuffer || !validation.detectedMime) {
      return NextResponse.json(
        { error: validation.error || 'Archivo inválido.' },
        { status: 400 }
      );
    }

    const widthPx = widthPxRaw ? Number(widthPxRaw) : null;
    const heightPx = heightPxRaw ? Number(heightPxRaw) : null;
    // Para imanes de 5x5 cm (~300 DPI = 590x590 px), avisar si es menor a 590 px
    const lowResolutionWarning =
      widthPx !== null &&
      heightPx !== null &&
      widthPx > 0 &&
      heightPx > 0 &&
      (widthPx < 590 || heightPx < 590);

    const effectiveOwner = adminStatus.authenticated ? 'admin' : ownerToken;

    const saved = savePrivateFile({
      ownerToken: effectiveOwner,
      purpose,
      originalFilename: file.name,
      mimeType: validation.detectedMime,
      buffer: validation.sanitizedBuffer,
      widthPx,
      heightPx,
      lowResolutionWarning,
    });

    const signedTemporaryUrl = createSignedFileUrl(
      saved.id,
      effectiveOwner,
      900
    );

    return NextResponse.json({
      success: true,
      file: {
        id: saved.id,
        original_filename: saved.original_filename,
        mime_type: saved.mime_type,
        size_bytes: saved.size_bytes,
        width_px: saved.width_px,
        height_px: saved.height_px,
        low_resolution_warning: saved.low_resolution_warning,
        signed_url: signedTemporaryUrl,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar y resguardar el archivo privado.' },
      { status: 500 }
    );
  }
}
