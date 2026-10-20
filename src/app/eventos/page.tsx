'use client';

import React, { useState } from 'react';
import {
  CalendarHeart,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Layers,
  Upload,
  FileCheck2,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { buildSafeWhatsAppUrl } from '@/lib/utils/format';
import { ProductCraftVisual } from '@/components/visuals/ProductCraftVisual';

export default function EventosYPresupuestosPage() {
  const { ownerSessionToken } = useStore();
  const [activeTab, setActiveTab] = useState<'tattoo_stand' | 'bulk_custom'>(
    'tattoo_stand'
  );

  // Stand de tatuajes temporales form state
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [eventType, setEventType] = useState('Casamiento / Boda');
  const [eventDate, setEventDate] = useState('');
  const [eventLocality, setEventLocality] = useState('Río Cuarto, Córdoba');
  const [estimatedGuests, setEstimatedGuests] = useState('100');
  const [themeOrIdea, setThemeOrIdea] = useState('');
  const [observations, setObservations] = useState('');

  // Bulk custom quote state
  const [bulkProductName, setBulkProductName] = useState(
    'Pines / Stickers / Etiquetas por cantidad'
  );
  const [bulkQuantity, setBulkQuantity] = useState('100');
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ id: string; filename: string }>
  >([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<{
    reference_code: string;
    disclaimer: string;
  } | null>(null);

  const handleQuoteFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('owner_token', ownerSessionToken || 'guest_quote_session');
      form.append('purpose', 'customer_design');
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.file) {
        setError(data.error || 'No se pudo adjuntar el archivo de referencia.');
      } else {
        setUploadedFiles((prev) => [
          ...prev,
          { id: data.file.id, filename: data.file.original_filename },
        ]);
      }
    } catch {
      setError('Error al subir el archivo de referencia.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType:
            activeTab === 'tattoo_stand'
              ? 'tattoo_stand_event'
              : 'custom_bulk_order',
          customerName,
          customerContact,
          customerEmail: customerEmail || null,
          eventType: activeTab === 'tattoo_stand' ? eventType : null,
          eventDate: activeTab === 'tattoo_stand' ? eventDate : null,
          eventLocality: activeTab === 'tattoo_stand' ? eventLocality : null,
          estimatedGuests:
            activeTab === 'tattoo_stand' ? Number(estimatedGuests) : null,
          themeOrIdea,
          productName:
            activeTab === 'bulk_custom'
              ? bulkProductName
              : 'Stand creativo de tatuajes temporales',
          requestedQuantity:
            activeTab === 'bulk_custom' ? Number(bulkQuantity) : null,
          observations,
          fileIds: uploadedFiles.map((f) => f.id),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.quote) {
        setError(data.error || 'No se pudo enviar la consulta.');
        setSubmitting(false);
        return;
      }

      setSubmittedQuote({
        reference_code: data.quote.reference_code,
        disclaimer: data.disclaimer,
      });
      setSubmitting(false);
    } catch {
      setError('Error de conexión al enviar la consulta.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
      {/* Presentación del Stand Creativo de Tatuajes Temporales */}
      <div className="overflow-hidden rounded-3xl border border-[#1C1917] bg-[#1C1917] text-[#FAF8F5]">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#A8A29E] uppercase">
              <CalendarHeart className="h-3.5 w-3.5 text-[#FAF8F5]" />
              Eventos y celebraciones · Trazo Espacio Gráfico
            </span>
            <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-[#FAF8F5] sm:text-5xl">
              Stand creativo de tatuajes temporales para eventos
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#D6D3D1] sm:text-base">
              Una propuesta creativa y personalizada para casamientos, 15 años, cumpleaños, aniversarios y eventos corporativos en Río Cuarto y región. Diseñamos los tatuajes temporales a medida con las frases, íconos y estilo de los protagonistas.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#292524] bg-[#292524]/70 p-4 text-xs">
                <p className="font-semibold text-[#FAF8F5]">
                  Diseños personalizados
                </p>
                <p className="mt-1 text-[#D6D3D1]">
                  Creamos los tatuajes temporales según la temática y los protagonistas de la celebración.
                </p>
              </div>
              <div className="rounded-2xl border border-[#292524] bg-[#292524]/70 p-4 text-xs">
                <p className="font-semibold text-[#FAF8F5]">
                  Cotización según tu evento
                </p>
                <p className="mt-1 text-[#D6D3D1]">
                  Armamos la propuesta de acuerdo con la fecha, localidad y cantidad estimada de invitados.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <ProductCraftVisual
              variant="tattoo_stand"
              imageUrl="/images/trazo/producto-stand-tatuajes.jpg"
              isAuthorizedRealPhoto={true}
              alt="Stand creativo de tatuajes temporales de Trazo Espacio Gráfico"
              className="h-72 w-full rounded-2xl border border-[#292524]"
            />
          </div>
        </div>
      </div>

      {/* Cómo funciona en 4 momentos */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            step: '1',
            title: 'Consultás tu fecha',
            desc: 'Indicanos fecha, localidad y cantidad estimada de invitados para verificar disponibilidad.',
          },
          {
            step: '2',
            title: 'Definimos la temática',
            desc: 'Creamos tatuajes temporales personalizados con frases, íconos o logos de los agasajados.',
          },
          {
            step: '3',
            title: 'Revisás la muestra',
            desc: 'Te compartimos la muestra digital de los diseños antes de producirlos.',
          },
          {
            step: '4',
            title: 'Disfrutan en el evento',
            desc: 'Una propuesta divertida para que tus invitados se lleven un recuerdo único.',
          },
        ].map((item) => (
          <div
            key={item.step}
            className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5"
          >
            <span className="font-display inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1C1917] text-xs font-semibold text-[#FAF8F5]">
              {item.step}
            </span>
            <h2 className="mt-3 text-sm font-semibold text-[#1C1917]">
              {item.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Selector de Tipo de Consulta */}
      <div id="presupuesto-especial" className="mx-auto max-w-4xl">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tattoo_stand');
              setSubmittedQuote(null);
            }}
            className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-medium transition ${
              activeTab === 'tattoo_stand'
                ? 'border-[#1C1917] bg-[#1C1917] text-[#FAF8F5]'
                : 'border-[#D6D3D1] bg-[#FFFFFF] text-[#57534E] hover:border-[#1C1917]'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            1. Consultar Stand de Tatuajes Temporales
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('bulk_custom');
              setSubmittedQuote(null);
            }}
            className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-medium transition ${
              activeTab === 'bulk_custom'
                ? 'border-[#1C1917] bg-[#1C1917] text-[#FAF8F5]'
                : 'border-[#D6D3D1] bg-[#FFFFFF] text-[#57534E] hover:border-[#1C1917]'
            }`}
          >
            <Layers className="h-4 w-4" />
            2. Presupuesto por cantidad o pedido especial
          </button>
        </div>

        {/* Formulario */}
        <div className="mt-6 rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-10">
          {submittedQuote ? (
            <div
              data-testid="event-quote-confirmation"
              className="space-y-5 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-medium text-[#1C1917]">
                ¡Consulta recibida! Código: {submittedQuote.reference_code}
              </h2>
              <p className="mx-auto max-w-xl rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs leading-relaxed text-[#57534E]">
                {submittedQuote.disclaimer}
              </p>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <a
                  href={buildSafeWhatsAppUrl({
                    context: 'event_stand',
                    quoteReference: submittedQuote.reference_code,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-6 py-3 text-xs font-medium text-[#FAF8F5]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Continuar por WhatsApp ({submittedQuote.reference_code})
                </a>
                <button
                  type="button"
                  onClick={() => setSubmittedQuote(null)}
                  className="rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-5 py-3 text-xs font-medium text-[#1C1917]"
                >
                  Enviar otra consulta
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-medium text-[#1C1917]">
                  {activeTab === 'tattoo_stand'
                    ? 'Consultar disponibilidad y presupuesto del Stand'
                    : 'Solicitar presupuesto por cantidad o a medida'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
                  Completá los datos de tu evento o pedido. Te responderemos a la brevedad para confirmar disponibilidad de fecha y presupuesto (el envío de la consulta no implica reserva automática).
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="event-customer-name"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Nombre y apellido *
                  </label>
                  <input
                    id="event-customer-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="event-customer-contact"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Teléfono / WhatsApp de contacto *
                  </label>
                  <input
                    id="event-customer-contact"
                    type="text"
                    required
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="+54 9 358 ..."
                    className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                {activeTab === 'tattoo_stand' ? (
                  <>
                    <div>
                      <label
                        htmlFor="event-type"
                        className="block text-xs font-medium text-[#1C1917]"
                      >
                        Tipo de evento *
                      </label>
                      <select
                        id="event-type"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs font-medium text-[#1C1917]"
                      >
                        <option value="Casamiento / Boda">
                          Casamiento / Boda
                        </option>
                        <option value="Fiesta de 15 años">
                          Fiesta de 15 años
                        </option>
                        <option value="Cumpleaños / Aniversario">
                          Cumpleaños / Aniversario
                        </option>
                        <option value="Evento Corporativo / Marca">
                          Evento Corporativo / Marca
                        </option>
                        <option value="Feria / Festival">
                          Feria / Festival
                        </option>
                        <option value="Otro festejo">Otro festejo</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="event-date"
                        className="block text-xs font-medium text-[#1C1917]"
                      >
                        Fecha del evento *
                      </label>
                      <input
                        id="event-date"
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="event-locality"
                        className="block text-xs font-medium text-[#1C1917]"
                      >
                        Localidad *
                      </label>
                      <input
                        id="event-locality"
                        type="text"
                        required
                        value={eventLocality}
                        onChange={(e) => setEventLocality(e.target.value)}
                        placeholder="Ej: Río Cuarto, Córdoba"
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="event-guests"
                        className="block text-xs font-medium text-[#1C1917]"
                      >
                        Cantidad estimada de invitados *
                      </label>
                      <input
                        id="event-guests"
                        type="number"
                        min="10"
                        required
                        value={estimatedGuests}
                        onChange={(e) => setEstimatedGuests(e.target.value)}
                        placeholder="Ej: 120"
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#1C1917]">
                        Producto o pieza buscada *
                      </label>
                      <input
                        type="text"
                        required
                        value={bulkProductName}
                        onChange={(e) => setBulkProductName(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#1C1917]">
                        Cantidad estimada *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={bulkQuantity}
                        onChange={(e) => setBulkQuantity(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="event-theme"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Idea o temática para los diseños
                  </label>
                  <input
                    id="event-theme"
                    type="text"
                    value={themeOrIdea}
                    onChange={(e) => setThemeOrIdea(e.target.value)}
                    placeholder="Ej: Frases de los novios, mascotas, ilustraciones, logo de la marca..."
                    className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="event-email"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Correo electrónico (opcional)
                  </label>
                  <input
                    id="event-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="tuemail@ejemplo.com"
                    className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="event-observations"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    Observaciones adicionales
                  </label>
                  <textarea
                    id="event-observations"
                    rows={3}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Contanos horario estimado, salón o cualquier detalle que quieras sumar..."
                    className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#1C1917]">
                    Adjuntar logo, boceto o referencia visual (opcional)
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]">
                      <Upload className="h-3.5 w-3.5" />
                      <span>
                        {uploadingFile
                          ? 'Subiendo archivo...'
                          : 'Seleccionar imagen, PDF o SVG (máx. 10 MB)'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf,image/svg+xml"
                        onChange={handleQuoteFileUpload}
                        disabled={uploadingFile}
                        className="sr-only"
                      />
                    </label>
                    {uploadedFiles.map((uf) => (
                      <span
                        key={uf.id}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-900"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        {uf.filename}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                data-testid="submit-event-quote-button"
                disabled={submitting}
                className="w-full rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
              >
                {submitting
                  ? 'Enviando consulta...'
                  : 'Enviar consulta y solicitar presupuesto'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
