'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PackageSearch,
  Lock,
  ArrowRight,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatARS, formatDateTimeAR } from '@/lib/utils/format';

export default function OrderTrackingLookupPage() {
  const router = useRouter();
  const { savedOrderLinks } = useStore();

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [directTokenInput, setDirectTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          email,
          accessCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(
          data.error ||
            'No pudimos encontrar el pedido con esos datos. Verificá el número de pedido, tu correo y el código de acceso.'
        );
        setLoading(false);
        return;
      }
      router.push(data.redirectUrl);
    } catch {
      setError('Error de conexión al consultar el pedido.');
      setLoading(false);
    }
  };

  const handleDirectTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = directTokenInput
      .trim()
      .replace(/^.*\/pedidos\//, '')
      .split('?')[0];
    if (cleaned.length < 24) {
      setError('El enlace de seguimiento ingresado no es válido.');
      return;
    }
    router.push(`/pedidos/${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-[#FFFFFF] px-3.5 py-1 text-xs font-medium text-[#1C1917]">
          <Lock className="h-3.5 w-3.5 text-[#57534E]" />
          Seguimiento de pedido
        </div>
        <h1 className="font-display mt-3 text-3xl font-medium text-[#1C1917] sm:text-4xl">
          Consultá el estado de tu pedido y tu muestra digital
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-[#57534E] sm:text-sm">
          Ingresá tu número de pedido, el correo electrónico con el que compraste y tu código de acceso de 6 caracteres, o pegá directamente el enlace de seguimiento que recibiste al confirmar.
        </p>
      </div>

      {/* Pedidos guardados en este dispositivo */}
      {savedOrderLinks.length > 0 && (
        <section className="mt-8 rounded-3xl border border-[#E7E5E4] bg-[#F4F1EA] p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-medium text-[#1C1917]">
            <Clock className="h-4 w-4 text-[#57534E]" />
            Tus pedidos recientes en este dispositivo
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {savedOrderLinks.map((saved) => (
              <Link
                key={saved.accessToken}
                href={`/pedidos/${saved.accessToken}`}
                className="flex items-center justify-between rounded-2xl border border-[#D6D3D1] bg-[#FFFFFF] p-4 transition hover:border-[#1C1917]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1C1917]">
                    Pedido {saved.orderNumber}
                  </p>
                  <p className="text-[11px] text-[#57534E]">
                    {formatDateTimeAR(saved.createdAt)} · Código:{' '}
                    <strong className="text-[#1C1917]">{saved.accessCode}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#1C1917]">
                    {saved.totalArs > 0
                      ? formatARS(saved.totalArs)
                      : 'Presupuesto'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#1C1917]" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Opción 1: Número de pedido + email + código */}
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-[#57534E]" />
            <h2 className="font-display text-lg font-medium text-[#1C1917]">
              Ingresar con los datos de mi pedido
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#57534E]">
            Completá los tres datos que te mostramos al confirmar tu pedido.
          </p>

          <form onSubmit={handleLookupSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="lookup-order-number"
                className="block text-xs font-medium text-[#1C1917]"
              >
                Número de pedido *
              </label>
              <input
                id="lookup-order-number"
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ej: TRZ-2026-123456"
                className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs uppercase text-[#1C1917]"
              />
            </div>

            <div>
              <label
                htmlFor="lookup-email"
                className="block text-xs font-medium text-[#1C1917]"
              >
                Correo electrónico *
              </label>
              <input
                id="lookup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuemail@ejemplo.com"
                className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
              />
            </div>

            <div>
              <label
                htmlFor="lookup-code"
                className="block text-xs font-medium text-[#1C1917]"
              >
                Código de acceso (6 caracteres) *
              </label>
              <input
                id="lookup-code"
                type="text"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Ej: K8M4P2"
                className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs uppercase text-[#1C1917]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
            >
              {loading ? 'Buscando tu pedido...' : 'Ver mi pedido'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Opción 2: Enlace directo */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <h2 className="font-display text-lg font-medium text-[#1C1917]">
                Tengo mi enlace de seguimiento
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#57534E]">
              Pegá el enlace de seguimiento que guardaste al confirmar tu pedido.
            </p>

            <form onSubmit={handleDirectTokenSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="direct-token-input"
                  className="block text-xs font-medium text-[#1C1917]"
                >
                  Enlace de seguimiento
                </label>
                <input
                  id="direct-token-input"
                  type="text"
                  value={directTokenInput}
                  onChange={(e) => setDirectTokenInput(e.target.value)}
                  placeholder="Pegá aquí tu enlace /pedidos/..."
                  className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                />
              </div>
              <button
                type="submit"
                className="min-h-[44px] w-full rounded-full border border-[#D6D3D1] bg-[#FAF8F5] py-2.5 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
              >
                Abrir mi pedido
              </button>
            </form>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs text-[#57534E]">
            <p className="font-semibold text-[#1C1917]">
              Privacidad de tus fotos y archivos
            </p>
            <p className="mt-1 leading-relaxed">
              Solicitamos tu código de acceso o enlace personal para que nadie más pueda ver tus fotografías o diseños.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-700" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
