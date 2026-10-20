import { Order } from '@/types/trazo';
import { formatARS } from '@/lib/utils/format';

export type TransactionalEmailType =
  | 'pedido_recibido'
  | 'pago_confirmado'
  | 'diseno_pendiente_aprobacion'
  | 'pedido_listo'
  | 'pedido_despachado';

export interface EmailSendResult {
  attempted: boolean;
  sent: boolean;
  providerConfigured: boolean;
  eventType: TransactionalEmailType;
  recipientEmail: string;
  subject: string;
  userFacingMessage: string;
  providerMessageId?: string;
}

export function isEmailProviderConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 10
  );
}

export async function sendTransactionalOrderEmail(
  order: Order,
  eventType: TransactionalEmailType,
  extraContext?: {
    designRevisionVersion?: number;
    designNotes?: string;
  }
): Promise<EmailSendResult> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
  const secureOrderUrl = `${siteUrl}/pedidos/${order.access_token}`;

  const subjects: Record<TransactionalEmailType, string> = {
    pedido_recibido: `Trazo Espacio Gráfico — Recibimos tu pedido ${order.order_number}`,
    pago_confirmado: `Trazo Espacio Gráfico — Pago confirmado del pedido ${order.order_number}`,
    diseno_pendiente_aprobacion: `Trazo Espacio Gráfico — Tenés una muestra de diseño para aprobar (${order.order_number})`,
    pedido_listo: `Trazo Espacio Gráfico — ¡Tu pedido ${order.order_number} está listo para retirar!`,
    pedido_despachado: `Trazo Espacio Gráfico — Tu pedido ${order.order_number} fue despachado`,
  };

  const subject = subjects[eventType];
  const providerConfigured = isEmailProviderConfigured();

  // REGLA ESTRICTA: No mostrar "correo enviado" si el servicio no confirmó el envío.
  if (!providerConfigured) {
    return {
      attempted: false,
      sent: false,
      providerConfigured: false,
      eventType,
      recipientEmail: order.customer_email,
      subject,
      userFacingMessage:
        'Notificación registrada en el historial del pedido. El envío de correo automático está pendiente de configurar la credencial RESEND_API_KEY en el servidor.',
    };
  }

  const htmlBody = buildTransactionalEmailHtml(
    order,
    eventType,
    secureOrderUrl,
    extraContext
  );

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:
          process.env.EMAIL_FROM ||
          'Trazo Espacio Gráfico <notificaciones@trazografica.com.ar>',
        reply_to: process.env.EMAIL_REPLY_TO || 'Trazoografica@gmail.com',
        to: [order.customer_email],
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      return {
        attempted: true,
        sent: false,
        providerConfigured: true,
        eventType,
        recipientEmail: order.customer_email,
        subject,
        userFacingMessage:
          'El proveedor de correo rechazó la solicitud; el estado del pedido ya está actualizado en tu enlace seguro.',
      };
    }

    const data = (await response.json()) as { id?: string };
    return {
      attempted: true,
      sent: true,
      providerConfigured: true,
      eventType,
      recipientEmail: order.customer_email,
      subject,
      providerMessageId: data.id,
      userFacingMessage: `Correo de confirmación enviado a ${order.customer_email}.`,
    };
  } catch {
    return {
      attempted: true,
      sent: false,
      providerConfigured: true,
      eventType,
      recipientEmail: order.customer_email,
      subject,
      userFacingMessage:
        'No se pudo confirmar la conexión con el servidor de correo. Podés seguir todo el estado desde el enlace seguro del pedido.',
    };
  }
}

function buildTransactionalEmailHtml(
  order: Order,
  eventType: TransactionalEmailType,
  secureOrderUrl: string,
  extraContext?: {
    designRevisionVersion?: number;
    designNotes?: string;
  }
): string {
  const headlineByEvent: Record<TransactionalEmailType, string> = {
    pedido_recibido: `¡Hola ${order.customer_name}! Recibimos tu pedido ${order.order_number}.`,
    pago_confirmado: `¡Pago confirmado para tu pedido ${order.order_number}!`,
    diseno_pendiente_aprobacion: `Subimos la propuesta de diseño v${extraContext?.designRevisionVersion || 1} para tu pedido ${order.order_number}.`,
    pedido_listo: `¡Tu pedido ${order.order_number} ya está listo en Río Cuarto!`,
    pedido_despachado: `¡Tu pedido ${order.order_number} está en camino!`,
  };

  const detailByEvent: Record<TransactionalEmailType, string> = {
    pedido_recibido:
      'Guardá tu enlace seguro para consultar el avance, subir el comprobante si elegiste transferencia o aprobar la muestra de diseño cuando corresponda.',
    pago_confirmado:
      'El pago fue acreditado correctamente. Nuestro equipo continuará con la revisión de archivos y preparación de tu pedido.',
    diseno_pendiente_aprobacion:
      'Recordá que no comenzamos la producción hasta que registres tu aprobación del diseño desde el enlace seguro de tu pedido.',
    pedido_listo:
      'Podés coordinar el retiro en Río Cuarto escribiéndonos por WhatsApp o consultando los detalles en el seguimiento.',
    pedido_despachado: `Empresa de transporte: ${order.shipping_carrier || 'Confirmada en el seguimiento'} — Código de seguimiento: ${order.shipping_tracking_code || 'Ver en el enlace del pedido'}.`,
  };

  return `
    <div style="font-family: sans-serif; background-color: #F8FAFC; color: #18181B; padding: 32px;">
      <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 28px; border: 1px solid #E2E8F0;">
        <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A; margin: 0 0 8px;">
          Trazo Espacio Gráfico · Río Cuarto, Córdoba
        </p>
        <h1 style="font-size: 22px; margin: 0 0 12px; color: #18181B;">
          ${headlineByEvent[eventType]}
        </h1>
        <p style="font-size: 15px; line-height: 1.6; color: #3F3F46;">
          ${detailByEvent[eventType]}
        </p>
        <div style="background: #F8FAFC; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px;"><strong>Pedido:</strong> ${order.order_number}</p>
          <p style="margin: 0 0 6px;"><strong>Importe total:</strong> ${order.order_type === 'quote_request' ? 'Solicitud de presupuesto a cotizar' : formatARS(order.total_ars)}</p>
          <p style="margin: 0;"><strong>Código de verificación:</strong> ${order.access_code}</p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${secureOrderUrl}" style="display: inline-block; background-color: #E2E8F0; color: #18181B; font-weight: bold; text-decoration: none; padding: 12px 22px; border-radius: 999px;">
            Consultar mi pedido de forma segura
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="font-size: 13px; color: #71717A; margin: 0;">
          WhatsApp: +54 9 358 510 4732 · Instagram: @trazo.grafica · Correo: Trazoografica@gmail.com
        </p>
      </div>
    </div>
  `;
}
