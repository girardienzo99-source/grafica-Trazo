import crypto from 'crypto';
import { cookies } from 'next/headers';

const DEFAULT_DEV_SECRET = 'trazo-espacio-grafico-dev-secret-key-rio-cuarto-2026-hmac';

export function getAppSecret(): string {
  return process.env.APP_SECRET_KEY && process.env.APP_SECRET_KEY.length >= 16
    ? process.env.APP_SECRET_KEY
    : DEFAULT_DEV_SECRET;
}

export function generateSecureToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomInt(100000, 999999);
  return `TRZ-${year}-${rand}`;
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

export function generateQuoteReference(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomInt(10000, 99999);
  return `PRE-${year}-${rand}`;
}

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates a temporary signed URL for a private file.
 * Binds the signature to the fileId, expiration timestamp, and authorized viewer context.
 */
export function createSignedFileUrl(
  fileId: string,
  authorizedScope: string, // 'admin' or order.access_token or file.owner_token
  ttlSeconds = 900 // 15 minutes temporary link
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileId}:${authorizedScope}:${exp}`;
  const sig = crypto
    .createHmac('sha256', getAppSecret())
    .update(payload)
    .digest('hex');
  const params = new URLSearchParams({
    scope: authorizedScope,
    exp: String(exp),
    sig,
  });
  return `/api/files/${encodeURIComponent(fileId)}?${params.toString()}`;
}

export function verifySignedFileParams(
  fileId: string,
  scope: string,
  expStr: string,
  sig: string
): boolean {
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${fileId}:${scope}:${exp}`;
  const expected = crypto
    .createHmac('sha256', getAppSecret())
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// ADMIN AUTHENTICATION SESSION (HTTP-Only Signed Cookie)
// -----------------------------------------------------------------------------
export const ADMIN_COOKIE_NAME = 'trazo_admin_session';

export function getExpectedAdminCredentials(): {
  email: string;
  password: string;
  isDefaultDevCredentials: boolean;
} {
  const envEmail = process.env.ADMIN_EMAIL?.trim();
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  if (envEmail && envPass) {
    return {
      email: envEmail,
      password: envPass,
      isDefaultDevCredentials: false,
    };
  }
  return {
    email: 'Trazoografica@gmail.com',
    password: 'trazo-admin-2026',
    isDefaultDevCredentials: true,
  };
}

export function createAdminSessionToken(email: string): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12; // 12 hours
  const data = Buffer.from(JSON.stringify({ email, role: 'admin', exp })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getAppSecret())
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): {
  authenticated: boolean;
  email?: string;
} {
  if (!token || !token.includes('.')) {
    return { authenticated: false };
  }
  const [data, sig] = token.split('.');
  if (!data || !sig) return { authenticated: false };

  const expectedSig = crypto
    .createHmac('sha256', getAppSecret())
    .update(data)
    .digest('base64url');

  try {
    const validSig = crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expectedSig)
    );
    if (!validSig) return { authenticated: false };

    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (parsed.role !== 'admin' || typeof parsed.exp !== 'number') {
      return { authenticated: false };
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return { authenticated: false };
    }
    return { authenticated: true, email: parsed.email };
  } catch {
    return { authenticated: false };
  }
}

export async function isAdminRequest(): Promise<{
  authenticated: boolean;
  email?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    return verifyAdminSessionToken(token);
  } catch {
    return { authenticated: false };
  }
}

// -----------------------------------------------------------------------------
// MERCADO PAGO WEBHOOK SIGNATURE VALIDATION
// Per official Mercado Pago documentation:
// Manifest format: "id:[data.id];request-id:[x-request-id];ts:[ts];"
// -----------------------------------------------------------------------------
export function buildMercadoPagoWebhookSignature(
  dataId: string,
  requestId: string,
  ts: string,
  webhookSecret: string
): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto
    .createHmac('sha256', webhookSecret)
    .update(manifest)
    .digest('hex');
  return `ts=${ts},v1=${v1}`;
}

export function verifyMercadoPagoWebhookSignature(params: {
  xSignatureHeader: string | null;
  xRequestIdHeader: string | null;
  dataId: string;
  webhookSecret: string;
}): boolean {
  const { xSignatureHeader, xRequestIdHeader, dataId, webhookSecret } = params;
  if (!xSignatureHeader || !xRequestIdHeader || !dataId || !webhookSecret) {
    return false;
  }

  const parts = xSignatureHeader.split(',');
  let ts = '';
  let v1 = '';
  for (const part of parts) {
    const [k, v] = part.trim().split('=');
    if (k === 'ts') ts = v || '';
    if (k === 'v1') v1 = v || '';
  }
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestIdHeader};ts:${ts};`;
  const expectedV1 = crypto
    .createHmac('sha256', webhookSecret)
    .update(manifest)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(expectedV1, 'hex')
    );
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// FILE VALIDATION & SANITIZATION (Magic Bytes, Size, SVG Script Stripping)
// -----------------------------------------------------------------------------
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/svg+xml',
]);

export function validateAndSanitizeUploadedFile(params: {
  buffer: Buffer;
  declaredMime: string;
  originalFilename: string;
}): {
  valid: boolean;
  error?: string;
  sanitizedBuffer?: Buffer;
  detectedMime?: string;
} {
  const { buffer, declaredMime, originalFilename } = params;

  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'El archivo está vacío.' };
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: 'El archivo supera el tamaño máximo permitido de 10 MB.',
    };
  }

  // Block dangerous extensions regardless of declared MIME
  const lowerName = originalFilename.toLowerCase();
  const forbiddenExtensions = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.mjs', '.cjs',
    '.html', '.htm', '.php', '.py', '.dll', '.vbs', '.scr', '.jar',
  ];
  if (forbiddenExtensions.some((ext) => lowerName.endsWith(ext))) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido por motivos de seguridad.',
    };
  }

  if (!ALLOWED_MIMES.has(declaredMime)) {
    return {
      valid: false,
      error: 'Formato no admitido. Permitimos JPG, PNG, WEBP, PDF o SVG.',
    };
  }

  // Verify binary magic bytes
  if (declaredMime === 'image/jpeg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, error: 'El contenido del archivo no coincide con una imagen JPEG válida.' };
    }
    return { valid: true, sanitizedBuffer: buffer, detectedMime: 'image/jpeg' };
  }

  if (declaredMime === 'image/png') {
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buffer.length < 8 || !pngSig.every((b, idx) => buffer[idx] === b)) {
      return { valid: false, error: 'El contenido del archivo no coincide con una imagen PNG válida.' };
    }
    return { valid: true, sanitizedBuffer: buffer, detectedMime: 'image/png' };
  }

  if (declaredMime === 'image/webp') {
    if (
      buffer.length < 12 ||
      buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
      buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
    ) {
      return { valid: false, error: 'El contenido del archivo no coincide con una imagen WEBP válida.' };
    }
    return { valid: true, sanitizedBuffer: buffer, detectedMime: 'image/webp' };
  }

  if (declaredMime === 'application/pdf') {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return { valid: false, error: 'El contenido del archivo no coincide con un documento PDF válido.' };
    }
    return { valid: true, sanitizedBuffer: buffer, detectedMime: 'application/pdf' };
  }

  if (declaredMime === 'image/svg+xml') {
    const text = buffer.toString('utf8');
    if (!text.includes('<svg')) {
      return { valid: false, error: 'El archivo SVG no contiene una estructura <svg> válida.' };
    }
    // Reject SVGs with embedded scripts, event handlers, or foreignObject
    const dangerousPatterns = [
      /<script\b/i,
      /javascript:/i,
      /data:text\/html/i,
      /\bon[a-z]+\s*=/i,
      /<foreignObject\b/i,
      /<iframe\b/i,
      /<embed\b/i,
      /<object\b/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        return {
          valid: false,
          error: 'El archivo SVG contiene elementos activos o scripts no permitidos por seguridad.',
        };
      }
    }
    return {
      valid: true,
      sanitizedBuffer: Buffer.from(text, 'utf8'),
      detectedMime: 'image/svg+xml',
    };
  }

  return { valid: false, error: 'Formato de archivo no válido.' };
}

// -----------------------------------------------------------------------------
// RATE LIMITER (Protección contra intentos y cargas abusivas)
// -----------------------------------------------------------------------------
interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
