import { NextRequest, NextResponse } from 'next/server';
import {
  attachTransferReceiptToOrder,
  getOrderByAccessToken,
  getPrivateFileRecord,
  readDatabase,
  submitCustomerDesignDecision,
} from '@/lib/db/store';
import { createSignedFileUrl } from '@/lib/security/auth-and-tokens';

function enrichOrderWithSignedUrls(token: string) {
  const order = getOrderByAccessToken(token);
  if (!order) return null;

  const db = readDatabase();
  const signedFilesMap: Record<
    string,
    {
      id: string;
      original_filename: string;
      mime_type: string;
      width_px: number | null;
      height_px: number | null;
      low_resolution_warning: boolean;
      signed_url: string;
    }
  > = {};

  const collectFile = (fid: string | null | undefined) => {
    if (!fid || signedFilesMap[fid]) return;
    const rec = getPrivateFileRecord(fid);
    if (rec && (rec.order_id === order.id || rec.owner_token === order.owner_session_token)) {
      signedFilesMap[fid] = {
        id: rec.id,
        original_filename: rec.original_filename,
        mime_type: rec.mime_type,
        width_px: rec.width_px,
        height_px: rec.height_px,
        low_resolution_warning: rec.low_resolution_warning,
        signed_url: createSignedFileUrl(rec.id, order.access_token, 900),
      };
    }
  };

  for (const item of order.items) {
    item.file_ids.forEach(collectFile);
    item.customization_payload?.magnet_photos?.forEach((p) => collectFile(p.file_id));
    item.customization_payload?.design_files?.forEach((d) => collectFile(d.file_id));
  }

  collectFile(order.transfer_receipt_file_id);
  for (const rev of order.design_revisions) {
    collectFile(rev.preview_file_id);
  }

  // Strip internal admin notes before sending to customer
  const { admin_internal_notes: _unused, ...publicOrder } = order;
  void _unused;

  return {
    order: publicOrder,
    signedFilesMap,
    bankTransferConfig: db.store_settings.bank_transfer_config,
    whatsappNumber: db.store_settings.whatsapp_number,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const payload = enrichOrderWithSignedUrls(token);
  if (!payload) {
    return NextResponse.json(
      {
        error:
          'Enlace de pedido inválido o no autorizado. Recordá que los pedidos solo pueden consultarse mediante su enlace seguro criptográfico.',
      },
      { status: 404 }
    );
  }
  return NextResponse.json(payload);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const action = body.action;

    if (action === 'attach_transfer_receipt') {
      const fileId = String(body.fileId || '').trim();
      if (!fileId) {
        return NextResponse.json(
          { error: 'Debés adjuntar un archivo de comprobante válido.' },
          { status: 400 }
        );
      }
      const res = attachTransferReceiptToOrder({
        accessToken: token,
        fileId,
      });
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message:
          'Comprobante recibido correctamente. El estado del pago se mantiene pendiente hasta que administración valide la acreditación.',
        ...enrichOrderWithSignedUrls(token),
      });
    }

    if (action === 'design_decision') {
      const revisionId = String(body.revisionId || '').trim();
      const decision = body.decision === 'approve' ? 'approve' : 'request_changes';
      const feedback = String(body.feedback || '');

      const res = submitCustomerDesignDecision({
        accessToken: token,
        revisionId,
        decision,
        feedback,
      });

      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message:
          decision === 'approve'
            ? '¡Diseño aprobado! Tu pedido quedó habilitado para pasar a producción.'
            : 'Registramos tus comentarios para ajustar la muestra de diseño.',
        ...enrichOrderWithSignedUrls(token),
      });
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: 'Error al procesar la actualización del pedido.' },
      { status: 500 }
    );
  }
}
