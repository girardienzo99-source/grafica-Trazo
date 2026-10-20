'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  ZoomIn,
  FileCheck2,
  MessageCircle,
  ShieldCheck,
  Crop,
  X,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import {
  MagnetPhotoItem,
  UploadedDesignReference,
} from '@/types/trazo';
import {
  buildSafeWhatsAppUrl,
  calculateQuantityTierPrice,
  formatARS,
  resolveEffectiveProductPrice,
} from '@/lib/utils/format';
import { ProductCraftVisual } from '@/components/visuals/ProductCraftVisual';

/**
 * Generates a square 1:1 cropped data URL preview for a 5x5 cm photo magnet
 * and extracts the natural pixel dimensions of the image.
 */
async function renderSquareMagnetPreview(
  imageSrc: string,
  crop: { zoom: number; offsetX: number; offsetY: number }
): Promise<{
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth || img.width || 600;
      const naturalHeight = img.naturalHeight || img.height || 600;
      const canvas = document.createElement('canvas');
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: imageSrc, naturalWidth, naturalHeight });
        return;
      }

      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, size, size);

      const minSide = Math.min(naturalWidth, naturalHeight);
      const cropSide = minSide / Math.max(1, crop.zoom);
      const maxOffsetX = Math.max(0, (naturalWidth - cropSide) / 2);
      const maxOffsetY = Math.max(0, (naturalHeight - cropSide) / 2);

      const sx =
        (naturalWidth - cropSide) / 2 + (crop.offsetX / 50) * maxOffsetX;
      const sy =
        (naturalHeight - cropSide) / 2 + (crop.offsetY / 50) * maxOffsetY;

      ctx.drawImage(
        img,
        Math.max(0, Math.min(naturalWidth - cropSide, sx)),
        Math.max(0, Math.min(naturalHeight - cropSide, sy)),
        cropSide,
        cropSide,
        0,
        0,
        size,
        size
      );

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.88),
        naturalWidth,
        naturalHeight,
      });
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = imageSrc;
  });
}

function ProductDetailContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editCartItemId = searchParams.get('editCartItem');

  const {
    products,
    categories,
    cart,
    ownerSessionToken,
    sandboxTestPricesEnabled,
    addOrUpdateCartItem,
    setIsCartDrawerOpen,
  } = useStore();

  const product = useMemo(
    () => products.find((p) => p.slug === params.slug) || null,
    [products, params.slug]
  );

  const category = useMemo(
    () =>
      product
        ? categories.find((c) => c.id === product.category_id) || null
        : null,
    [product, categories]
  );

  const enabledVariants = useMemo(
    () => (product ? product.variants.filter((v) => v.is_enabled) : []),
    [product]
  );

  // Customization State
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [customText, setCustomText] = useState<string>('');
  const [colorNotes, setColorNotes] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [designHelpRequested, setDesignHelpRequested] =
    useState<boolean>(false);

  // Magnet 5x5 multi-photo state
  const [magnetPhotos, setMagnetPhotos] = useState<MagnetPhotoItem[]>([]);
  const [activeCropPhotoId, setActiveCropPhotoId] = useState<string | null>(
    null
  );
  const rawPhotoSourcesRef = useRef<Record<string, string>>({});

  // Uploaded design/logo files for Stickers, Pins, Cards, Tags, Kits
  const [designFiles, setDesignFiles] = useState<UploadedDesignReference[]>([]);

  // UI Feedback & Field-level validation state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = useState<{
    quantity?: string;
    files?: string;
  }>({});
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [quoteSentCode, setQuoteSentCode] = useState<string | null>(null);
  const [quoteCustomerName, setQuoteCustomerName] = useState<string>('');
  const [quoteCustomerContact, setQuoteCustomerContact] = useState<string>('');
  const [showInlineQuoteModal, setShowInlineQuoteModal] =
    useState<boolean>(false);
  const [hydratedDraft, setHydratedDraft] = useState<boolean>(false);

  const draftStorageKey = product ? `trazo_draft_${product.slug}` : null;

  // Initialize default variant & minimum quantity, or hydrate from editCartItemId or sessionStorage draft
  useEffect(() => {
    if (!product) return;

    if (editCartItemId) {
      const existingLine = cart.find((c) => c.cart_item_id === editCartItemId);
      if (existingLine && existingLine.product_id === product.id) {
        setSelectedVariantId(
          existingLine.variant_id || enabledVariants[0]?.id || null
        );
        setQuantity(existingLine.quantity);
        setCustomText(existingLine.customization_payload.custom_text || '');
        setColorNotes(existingLine.customization_payload.color_notes || '');
        setObservations(existingLine.customization_payload.observations || '');
        setDesignHelpRequested(existingLine.design_help_requested);
        if (existingLine.customization_payload.magnet_photos) {
          setMagnetPhotos(existingLine.customization_payload.magnet_photos);
          existingLine.customization_payload.magnet_photos.forEach((mp) => {
            rawPhotoSourcesRef.current[mp.id] = mp.cropped_preview_data_url;
          });
        }
        if (existingLine.customization_payload.design_files) {
          setDesignFiles(existingLine.customization_payload.design_files);
        }
        setHydratedDraft(true);
        return;
      }
    }

    // Attempt to restore draft from sessionStorage
    if (draftStorageKey && typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(draftStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setSelectedVariantId(
              parsed.selectedVariantId || enabledVariants[0]?.id || null
            );
            setQuantity(parsed.quantity || product.min_quantity || 1);
            setCustomText(parsed.customText || '');
            setColorNotes(parsed.colorNotes || '');
            setObservations(parsed.observations || '');
            setDesignHelpRequested(Boolean(parsed.designHelpRequested));
            if (Array.isArray(parsed.magnetPhotos)) {
              setMagnetPhotos(parsed.magnetPhotos);
              parsed.magnetPhotos.forEach((mp: MagnetPhotoItem) => {
                rawPhotoSourcesRef.current[mp.id] = mp.cropped_preview_data_url;
              });
              if (parsed.magnetPhotos[0]) {
                setActiveCropPhotoId(parsed.magnetPhotos[0].id);
              }
            }
            if (Array.isArray(parsed.designFiles)) {
              setDesignFiles(parsed.designFiles);
            }
            setHydratedDraft(true);
            return;
          }
        }
      } catch {
        // ignore storage parse issues
      }
    }

    setSelectedVariantId(enabledVariants[0]?.id || null);
    setQuantity(product.min_quantity ?? 1);
    setHydratedDraft(true);
  }, [product, enabledVariants, editCartItemId, cart, draftStorageKey]);

  // Persist draft in sessionStorage to prevent accidental loss of customization
  useEffect(() => {
    if (!hydratedDraft || !draftStorageKey || editCartItemId) return;
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          selectedVariantId,
          quantity,
          customText,
          colorNotes,
          observations,
          designHelpRequested,
          magnetPhotos,
          designFiles,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [
    hydratedDraft,
    draftStorageKey,
    editCartItemId,
    selectedVariantId,
    quantity,
    customText,
    colorNotes,
    observations,
    designHelpRequested,
    magnetPhotos,
    designFiles,
  ]);

  useEffect(() => {
    if (!lightboxOpen && !showInlineQuoteModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
        setShowInlineQuoteModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, showInlineQuoteModal]);

  const selectedVariant = useMemo(
    () =>
      enabledVariants.find((v) => v.id === selectedVariantId) ||
      enabledVariants[0] ||
      null,
    [enabledVariants, selectedVariantId]
  );

  const resolvedPrice = useMemo(() => {
    if (!product) {
      return {
        unitPriceArs: null,
        isSandboxPrice: false,
        designHelpSurchargeArs: 0,
      };
    }
    return resolveEffectiveProductPrice(
      product,
      selectedVariant,
      sandboxTestPricesEnabled
    );
  }, [product, selectedVariant, sandboxTestPricesEnabled]);

  const tierCalculation = useMemo(() => {
    if (!product) {
      return {
        finalUnitPriceArs: null,
        appliedTierLabel: null,
        discountPercent: 0,
      };
    }
    return calculateQuantityTierPrice(
      product,
      resolvedPrice.unitPriceArs,
      quantity
    );
  }, [product, resolvedPrice.unitPriceArs, quantity]);

  const activeDesignSurcharge =
    designHelpRequested && product?.customization_config.allow_design_help
      ? resolvedPrice.designHelpSurchargeArs
      : 0;

  const estimatedTotalArs =
    tierCalculation.finalUnitPriceArs !== null
      ? tierCalculation.finalUnitPriceArs * quantity + activeDesignSurcharge
      : null;

  // For 5x5 cm magnets: calculate expected total copies vs assigned copies across uploaded photos
  const expectedMagnetUnits = useMemo(() => {
    if (!product || product.customizer_type !== 'magnets_5x5') return 0;
    const packUnits = selectedVariant?.pack_units || 1;
    return packUnits * quantity;
  }, [product, selectedVariant, quantity]);

  const assignedMagnetUnits = useMemo(
    () =>
      magnetPhotos.reduce(
        (sum, item) => sum + Math.max(1, item.quantity_assigned),
        0
      ),
    [magnetPhotos]
  );

  // Process a single photo file into a MagnetPhotoItem
  const processSingleMagnetFile = async (
    file: File
  ): Promise<MagnetPhotoItem | null> => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError(
        `El archivo "${file.name}" no es una imagen JPG, PNG o WEBP válida.`
      );
      return null;
    }

    const localDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });

    const initialCrop = { zoom: 1, offsetX: 0, offsetY: 0 };
    const previewInfo = await renderSquareMagnetPreview(
      localDataUrl,
      initialCrop
    );

    const form = new FormData();
    form.append('file', file);
    form.append('owner_token', ownerSessionToken || 'anonymous-session');
    form.append('purpose', 'customer_photo');
    form.append('width_px', String(previewInfo.naturalWidth));
    form.append('height_px', String(previewInfo.naturalHeight));

    const res = await fetch('/api/files/upload', {
      method: 'POST',
      body: form,
    });

    const data = await res.json();
    if (!res.ok || !data.file) {
      setUploadError(data.error || `Error al subir "${file.name}".`);
      return null;
    }

    const itemId =
      'mp_' +
      Math.random().toString(36).slice(2, 9) +
      '_' +
      Date.now().toString(36);
    rawPhotoSourcesRef.current[itemId] = localDataUrl;

    return {
      id: itemId,
      file_id: data.file.id,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      width_px: previewInfo.naturalWidth,
      height_px: previewInfo.naturalHeight,
      low_resolution_warning: Boolean(data.file.low_resolution_warning),
      quantity_assigned: 1,
      crop: initialCrop,
      cropped_preview_data_url: previewInfo.dataUrl,
    };
  };

  // Upload handler for Magnet Photos (5x5 cm)
  const handleMagnetPhotosUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setValidationMessage(null);
    setFieldErrors({});

    try {
      const newlyUploaded: MagnetPhotoItem[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgressText(
          `Procesando foto ${i + 1} de ${fileList.length}: ${file.name}...`
        );
        const item = await processSingleMagnetFile(file);
        if (item) {
          newlyUploaded.push(item);
        }
      }

      if (newlyUploaded.length > 0) {
        setMagnetPhotos((prev) => {
          const combined = [...prev, ...newlyUploaded];
          if (!selectedVariant?.pack_units) {
            const totalCopies = combined.reduce(
              (acc, p) => acc + p.quantity_assigned,
              0
            );
            setQuantity(Math.max(product?.min_quantity ?? 1, totalCopies));
          }
          return combined;
        });
        if (!activeCropPhotoId) {
          setActiveCropPhotoId(newlyUploaded[0].id);
        }
      }
    } catch {
      setUploadError('Ocurrió un error al procesar las fotografías.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  // Replace a specific magnet photo keeping its position and assigned quantity
  const handleReplaceMagnetPhoto = async (
    photoId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText(`Reemplazando con ${file.name}...`);
    setUploadError(null);

    try {
      const replacement = await processSingleMagnetFile(file);
      if (replacement) {
        setMagnetPhotos((prev) =>
          prev.map((item) =>
            item.id === photoId
              ? {
                  ...replacement,
                  quantity_assigned: item.quantity_assigned,
                }
              : item
          )
        );
        setActiveCropPhotoId(replacement.id);
      }
    } catch {
      setUploadError('No se pudo reemplazar la fotografía.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  // Update crop for a specific magnet photo
  const updateMagnetPhotoCrop = useCallback(
    async (
      photoId: string,
      newCrop: { zoom: number; offsetX: number; offsetY: number }
    ) => {
      const src = rawPhotoSourcesRef.current[photoId];
      if (!src) return;
      try {
        const preview = await renderSquareMagnetPreview(src, newCrop);
        setMagnetPhotos((prev) =>
          prev.map((item) =>
            item.id === photoId
              ? {
                  ...item,
                  crop: newCrop,
                  cropped_preview_data_url: preview.dataUrl,
                }
              : item
          )
        );
      } catch {
        // ignore
      }
    },
    []
  );

  // Reorder magnet photo
  const moveMagnetPhoto = (index: number, direction: -1 | 1) => {
    setMagnetPhotos((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  // Change assigned quantity of a magnet photo
  const updateMagnetPhotoAssignedQty = (photoId: string, newQty: number) => {
    const safeQty = Math.max(1, Math.floor(newQty));
    setMagnetPhotos((prev) => {
      const updated = prev.map((p) =>
        p.id === photoId ? { ...p, quantity_assigned: safeQty } : p
      );
      if (!selectedVariant?.pack_units) {
        const sum = updated.reduce((acc, p) => acc + p.quantity_assigned, 0);
        setQuantity(Math.max(product?.min_quantity ?? 1, sum));
      }
      return updated;
    });
  };

  // Remove magnet photo
  const removeMagnetPhoto = (photoId: string) => {
    setMagnetPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== photoId);
      if (activeCropPhotoId === photoId) {
        setActiveCropPhotoId(updated[0]?.id || null);
      }
      if (!selectedVariant?.pack_units && updated.length > 0) {
        const sum = updated.reduce((acc, p) => acc + p.quantity_assigned, 0);
        setQuantity(Math.max(product?.min_quantity ?? 1, sum));
      }
      return updated;
    });
  };

  // Upload handler for Design / Logo files (Stickers, Pins, Cards, Hang-tags)
  const handleDesignFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setValidationMessage(null);
    setFieldErrors({});

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgressText(
          `Subiendo archivo ${i + 1} de ${fileList.length}: ${file.name}...`
        );
        const form = new FormData();
        form.append('file', file);
        form.append('owner_token', ownerSessionToken || 'anonymous-session');
        form.append('purpose', 'customer_design');

        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();
        if (!res.ok || !data.file) {
          setUploadError(data.error || `No se pudo subir "${file.name}".`);
          continue;
        }

        setDesignFiles((prev) => [
          ...prev,
          {
            file_id: data.file.id,
            filename: data.file.original_filename,
            mime_type: data.file.mime_type,
            size_bytes: data.file.size_bytes,
            preview_data_url: data.file.signed_url,
          },
        ]);
      }
    } catch {
      setUploadError('Error al subir el archivo de diseño.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-medium text-[#1C1917]">
          Producto no encontrado
        </h1>
        <p className="mt-2 text-xs text-[#57534E]">
          El producto que buscás no está disponible o cambió de dirección.
        </p>
        <Link
          href="/tienda"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-6 py-3 text-xs font-medium text-[#FAF8F5]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>
      </div>
    );
  }

  // Confirmed commercial attributes (only show confirmed fields; never show empty "A configurar en panel" boxes)
  const confirmedSpecsList = [
    product.confirmed_dimensions
      ? { label: 'Medida', value: product.confirmed_dimensions }
      : null,
    product.confirmed_material
      ? { label: 'Material', value: product.confirmed_material }
      : null,
    product.confirmed_finish
      ? { label: 'Terminación', value: product.confirmed_finish }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const buildCustomizationSummaryText = (): string => {
    const parts: string[] = [];
    if (product.confirmed_dimensions) {
      parts.push(`Medida: ${product.confirmed_dimensions}`);
    }
    if (product.confirmed_material) {
      parts.push(`Material: ${product.confirmed_material}`);
    }
    if (product.confirmed_finish) {
      parts.push(`Terminación: ${product.confirmed_finish}`);
    }
    if (product.customizer_type === 'magnets_5x5') {
      const lowResCount = magnetPhotos.filter(
        (m) => m.low_resolution_warning
      ).length;
      parts.push(
        `${magnetPhotos.length} foto(s) cargada(s) (${assignedMagnetUnits} imanes 5×5 cm en total${
          lowResCount > 0 ? `, ${lowResCount} con aviso de baja resolución` : ''
        })`
      );
    }
    if (designFiles.length > 0) {
      parts.push(
        `Diseño adjunto: ${designFiles.map((d) => d.filename).join(', ')}`
      );
    }
    if (designHelpRequested) {
      parts.push('Solicita armado / ayuda con el diseño');
    }
    if (customText.trim()) {
      parts.push(`Texto/frase: "${customText.trim()}"`);
    }
    if (colorNotes.trim()) {
      parts.push(`Colores: ${colorNotes.trim()}`);
    }
    if (observations.trim()) {
      parts.push(`Notas: ${observations.trim()}`);
    }
    return parts.join(' · ') || 'Personalización estándar';
  };

  const validateCustomizationBeforeAction = (): boolean => {
    setValidationMessage(null);
    const nextFieldErrors: { quantity?: string; files?: string } = {};

    const minQty = product.min_quantity ?? 1;
    if (quantity < minQty) {
      const msg = `La cantidad mínima para este producto es de ${minQty} unidad(es).`;
      nextFieldErrors.quantity = msg;
      setFieldErrors(nextFieldErrors);
      setValidationMessage(msg);
      return false;
    }

    if (
      product.quantity_multiple > 1 &&
      quantity % product.quantity_multiple !== 0
    ) {
      const msg = `Este producto debe encargarse en múltiplos de ${product.quantity_multiple} unidades.`;
      nextFieldErrors.quantity = msg;
      setFieldErrors(nextFieldErrors);
      setValidationMessage(msg);
      return false;
    }

    if (product.customizer_type === 'magnets_5x5') {
      if (magnetPhotos.length === 0) {
        const msg =
          'Subí al menos una fotografía para armar tus imanes de 5 × 5 cm.';
        nextFieldErrors.files = msg;
        setFieldErrors(nextFieldErrors);
        setValidationMessage(msg);
        return false;
      }
      if (assignedMagnetUnits !== expectedMagnetUnits) {
        const msg = `Tenés ${assignedMagnetUnits} copia(s) asignadas entre tus fotos, pero la opción seleccionada corresponde a ${expectedMagnetUnits} imanes. Ajustá las copias por foto o usá el botón "Igualar cantidad".`;
        nextFieldErrors.files = msg;
        setFieldErrors(nextFieldErrors);
        setValidationMessage(msg);
        return false;
      }
    } else {
      const hasFile = designFiles.length > 0;
      const hasText =
        customText.trim().length > 0 || observations.trim().length > 0;
      if (!hasFile && !designHelpRequested && !hasText) {
        const msg =
          'Subí tu archivo, escribí el texto a personalizar o marcá la opción "Necesito ayuda con el diseño".';
        nextFieldErrors.files = msg;
        setFieldErrors(nextFieldErrors);
        setValidationMessage(msg);
        return false;
      }
    }

    setFieldErrors({});
    return true;
  };

  const handleAddToCart = () => {
    if (!validateCustomizationBeforeAction()) return;

    const allFileIds = [
      ...magnetPhotos.map((m) => m.file_id),
      ...designFiles.map((d) => d.file_id),
    ].filter(Boolean);

    addOrUpdateCartItem(
      {
        customization_signature: '',
        product_id: product.id,
        product_slug: product.slug,
        product_name: product.name,
        category_name: category?.name || 'Catálogo Trazo',
        variant_id: selectedVariant?.id || null,
        variant_name: selectedVariant?.name || null,
        confirmed_specs: {
          dimensions: product.confirmed_dimensions,
          material: product.confirmed_material,
          finish: product.confirmed_finish,
        },
        quantity,
        unit_price_ars: tierCalculation.finalUnitPriceArs,
        design_help_requested: designHelpRequested,
        design_help_surcharge_ars: activeDesignSurcharge,
        requires_design_approval:
          product.customization_config.requires_design_approval ||
          designHelpRequested,
        customization_summary: buildCustomizationSummaryText(),
        customization_payload: {
          customizer_type: product.customizer_type,
          selected_dimensions: product.confirmed_dimensions,
          selected_material: product.confirmed_material,
          selected_finish: product.confirmed_finish,
          custom_text: customText.trim(),
          color_notes: colorNotes.trim(),
          observations: observations.trim(),
          design_help_requested: designHelpRequested,
          magnet_photos:
            product.customizer_type === 'magnets_5x5'
              ? magnetPhotos
              : undefined,
          design_files: designFiles.length > 0 ? designFiles : undefined,
        },
        file_ids: allFileIds,
      },
      editCartItemId
    );

    if (draftStorageKey && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(draftStorageKey);
    }

    if (editCartItemId) {
      router.push('/carrito');
    } else {
      setIsCartDrawerOpen(true);
    }
  };

  const handleSubmitDirectQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteCustomerName.trim() || !quoteCustomerContact.trim()) return;

    const allFileIds = [
      ...magnetPhotos.map((m) => m.file_id),
      ...designFiles.map((d) => d.file_id),
    ].filter(Boolean);

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'unpriced_product',
        customerName: quoteCustomerName,
        customerContact: quoteCustomerContact,
        productSlug: product.slug,
        productName: product.name,
        requestedQuantity: quantity,
        observations: buildCustomizationSummaryText(),
        customizationPayload: {
          customizer_type: product.customizer_type,
          custom_text: customText,
          color_notes: colorNotes,
          observations,
          design_help_requested: designHelpRequested,
          magnet_photos: magnetPhotos,
          design_files: designFiles,
        },
        fileIds: allFileIds,
      }),
    });

    const data = await res.json();
    if (res.ok && data.quote) {
      setQuoteSentCode(data.quote.reference_code);
      if (draftStorageKey && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(draftStorageKey);
      }
    }
  };

  const activeCropPhoto =
    magnetPhotos.find((m) => m.id === activeCropPhotoId) ||
    magnetPhotos[0] ||
    null;

  const hasRealConfirmedPrice =
    product.base_price_ars !== null &&
    product.base_price_ars > 0 &&
    !product.is_test_price;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: 'Trazo Espacio Gráfico',
    },
    ...(hasRealConfirmedPrice
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'ARS',
            price: product.base_price_ars,
            availability:
              product.availability_status === 'available'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/PreOrder',
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Migas de pan */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
        <div className="flex items-center gap-2">
          <Link
            href="/tienda"
            className="inline-flex items-center gap-1 font-medium text-[#1C1917] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tienda
          </Link>
          <span>/</span>
          {category && (
            <>
              <Link
                href={`/tienda?categoria=${encodeURIComponent(category.slug)}`}
                className="hover:underline"
              >
                {category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="font-medium text-[#1C1917]">{product.name}</span>
        </div>

        {editCartItemId && (
          <span className="rounded-full bg-[#F4F1EA] px-3 py-1 text-xs font-medium text-[#1C1917]">
            Modificando ítem de tu pedido
          </span>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* COLUMNA IZQUIERDA: IMAGEN PRINCIPAL, VISTA PREVIA ORIENTATIVA E INFORMACIÓN PLEGABLE */}
        <div className="space-y-6 lg:col-span-5">
          <div className="relative overflow-hidden rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF]">
            <ProductCraftVisual
              variant={product.images[0]?.illustration_variant || 'stickers'}
              imageUrl={product.images[0]?.url}
              isAuthorizedRealPhoto={product.images[0]?.is_real_authorized_photo}
              alt={product.images[0]?.alt || product.name}
              caption={product.images[0]?.caption}
              priority
              className="h-72 w-full sm:h-96"
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FFFFFF]/95 px-3.5 py-1.5 text-xs font-medium text-[#1C1917] shadow-xs transition hover:bg-[#1C1917] hover:text-[#FAF8F5]"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              Ampliar imagen
            </button>
          </div>

          {/* Vista previa orientativa en vivo */}
          <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#1C1917]">
                Vista previa orientativa
              </span>
              <span className="rounded-full bg-[#F4F1EA] px-2.5 py-0.5 text-[10px] font-medium text-[#57534E]">
                En vivo
              </span>
            </div>

            {product.customizer_type === 'magnets_5x5' ? (
              <div className="mt-4">
                {magnetPhotos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D6D3D1] bg-[#FAF8F5] p-5 text-center text-xs text-[#57534E]">
                    Subí tus fotos en el Paso 2 para ver aquí tus imanes cuadrados de <strong>5 × 5 cm</strong> encuadrados en tiempo real.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {magnetPhotos.map((mp) => (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() => setActiveCropPhotoId(mp.id)}
                        className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-[#FFFFFF] p-1 transition ${
                          activeCropPhoto?.id === mp.id
                            ? 'border-[#1C1917]'
                            : 'border-[#E7E5E4]'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mp.cropped_preview_data_url}
                          alt={mp.filename}
                          className="h-full w-full rounded-lg object-cover"
                        />
                        <span className="absolute top-1.5 left-1.5 rounded bg-[#1C1917]/80 px-1.5 py-0.5 text-[9px] font-medium text-[#FAF8F5]">
                          5×5 cm
                        </span>
                        <span className="absolute right-1.5 bottom-1.5 rounded bg-[#FAF8F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#1C1917]">
                          ×{mp.quantity_assigned}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#D6D3D1] bg-[#FAF8F5] p-4 text-xs text-[#57534E]">
                <p className="font-semibold text-[#1C1917]">{product.name}</p>
                {customText.trim() ? (
                  <p className="font-display mt-2 rounded-lg border border-[#E7E5E4] bg-[#FFFFFF] p-3 text-sm font-medium text-[#1C1917]">
                    “{customText}”
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-[#78716C]">
                    Completá textos, colores o adjuntá tu diseño en el Paso 2 para ver el resumen de tu pieza.
                  </p>
                )}
                {colorNotes.trim() && (
                  <p className="mt-2 text-[11px] text-[#1C1917]">
                    <strong>Colores indicados:</strong> {colorNotes}
                  </p>
                )}
                {designFiles.length > 0 && (
                  <p className="mt-2 text-[11px] font-medium text-emerald-800">
                    Archivos adjuntos ({designFiles.length}):{' '}
                    {designFiles.map((f) => f.filename).join(', ')}
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-[#78716C]">
              {product.customization_config.requires_design_approval ||
              designHelpRequested
                ? 'Antes de pasar a producción te enviamos la muestra digital para tu aprobación.'
                : 'Tus fotografías se producen respetando el encuadre cuadrado 5 × 5 cm seleccionado.'}
            </p>
          </div>

          {/* Información secundaria agrupada en desplegables limpios */}
          <div className="space-y-2.5">
            <details className="group rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[#1C1917]">
                <span>Plazos de producción y modalidades de entrega</span>
                <ChevronDown className="h-4 w-4 text-[#57534E] transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-2 border-t border-[#E7E5E4] pt-3 text-xs leading-relaxed text-[#57534E]">
                <p>
                  <strong className="text-[#1C1917]">Plazo de producción:</strong>{' '}
                  {product.estimated_production_text
                    ? product.estimated_production_text
                    : 'Confirmamos el plazo al revisar tu pedido.'}
                </p>
                <p>
                  <strong className="text-[#1C1917]">Entrega:</strong> Retiro coordinado en{' '}
                  <strong className="text-[#1C1917]">Río Cuarto, Córdoba</strong> o envío a todo el país (el tiempo de correo corre por separado del tiempo de producción).
                </p>
              </div>
            </details>

            <details className="group rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[#1C1917]">
                <span>Privacidad de tus fotos y archivos</span>
                <ChevronDown className="h-4 w-4 text-[#57534E] transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 flex items-start gap-2 border-t border-[#E7E5E4] pt-3 text-xs leading-relaxed text-[#57534E]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <span>
                  Tus fotos y diseños se almacenan de forma privada únicamente para producir tu pedido y nunca se publican sin tu permiso.
                </span>
              </div>
            </details>
          </div>
        </div>

        {/* COLUMNA DERECHA: FLUJO GUIADO EN 3 PASOS */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
            {/* Encabezado y atributos confirmados (sin cajas "A configurar en panel") */}
            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <span className="text-xs font-medium tracking-wider text-[#78716C] uppercase">
                  {category.name}
                </span>
              )}
              {confirmedSpecsList.map((spec) => (
                <span
                  key={spec.label}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] bg-[#FAF8F5] px-3 py-0.5 text-xs font-medium text-[#1C1917]"
                >
                  <CheckCircle2 className="h-3 w-3 text-[#57534E]" />
                  {spec.label}: {spec.value}
                </span>
              ))}
            </div>

            <h1 className="font-display mt-2.5 text-2xl font-medium text-[#1C1917] sm:text-3xl">
              {product.name}
            </h1>

            <p className="mt-2 text-xs leading-relaxed text-[#57534E] sm:text-sm">
              {product.description}
            </p>

            {/* Estado comercial: Precio publicado o Cotización personalizada */}
            <div className="mt-5 rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4">
              {tierCalculation.finalUnitPriceArs !== null ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span
                        data-testid="product-unit-price"
                        className="font-display text-2xl font-semibold text-[#1C1917]"
                      >
                        {formatARS(tierCalculation.finalUnitPriceArs)}
                      </span>
                      <span className="text-xs text-[#57534E]">
                        por unidad / pack
                      </span>
                    </div>
                    {tierCalculation.appliedTierLabel && (
                      <p className="mt-1 text-xs font-medium text-emerald-800">
                        ✓ Escala aplicada: {tierCalculation.appliedTierLabel} (-
                        {tierCalculation.discountPercent}%)
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="block text-[11px] text-[#57534E]">
                      Total estimado:
                    </span>
                    <span
                      data-testid="product-total-price"
                      className="font-display text-xl font-semibold text-[#1C1917]"
                    >
                      {formatARS(estimatedTotalArs)}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-[#1C1917]">
                    Cotización personalizada según tu pedido
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#57534E]">
                    Completá los 3 pasos con tus opciones o archivos y enviá tu solicitud de presupuesto sin pago online. Te confirmaremos el importe y el plazo de producción.
                  </p>
                </div>
              )}
            </div>

            {/* PASO 1: ELEGÍ PRESENTACIÓN Y CANTIDAD */}
            <section
              aria-labelledby="step-1-heading"
              className="mt-6 space-y-4 border-t border-[#E7E5E4] pt-6"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-display flex h-6 w-6 items-center justify-center rounded-full bg-[#1C1917] text-xs font-semibold text-[#FAF8F5]">
                  1
                </span>
                <h2
                  id="step-1-heading"
                  className="text-sm font-semibold text-[#1C1917]"
                >
                  Elegí presentación y cantidad
                </h2>
              </div>

              {product.customization_config.allow_variants &&
                enabledVariants.length > 0 && (
                  <div>
                    <label
                      htmlFor="variant-select"
                      className="block text-xs font-medium text-[#1C1917]"
                    >
                      Presentación
                    </label>
                    <select
                      id="variant-select"
                      value={selectedVariant?.id || ''}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-3 text-xs font-medium text-[#1C1917]"
                    >
                      {enabledVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                          {v.dimensions_label ? ` — ${v.dimensions_label}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <label
                    htmlFor="product-quantity-input"
                    className="block text-xs font-medium text-[#1C1917]"
                  >
                    {selectedVariant?.pack_units && selectedVariant.pack_units > 1
                      ? `Cantidad de packs (${selectedVariant.pack_units} unidades por pack)`
                      : 'Cantidad solicitada'}
                  </label>
                  <span className="text-[11px] text-[#57534E]">
                    {selectedVariant?.pack_units && selectedVariant.pack_units > 1
                      ? `${quantity} pack(s) = ${expectedMagnetUnits} imanes de 5 × 5 cm en total`
                      : product.min_quantity
                      ? `Mínimo: ${product.min_quantity} u.`
                      : 'Indicá las unidades que necesitás'}
                  </span>
                </div>

                <div className="inline-flex items-center rounded-xl border border-[#D6D3D1] bg-[#FAF8F5]">
                  <button
                    type="button"
                    aria-label="Restar cantidad"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.max(
                          product.min_quantity ?? 1,
                          q - (product.quantity_multiple || 1)
                        )
                      )
                    }
                    className="min-h-[42px] px-3.5 py-2 text-sm font-semibold text-[#1C1917]"
                  >
                    -
                  </button>
                  <input
                    id="product-quantity-input"
                    type="number"
                    min={product.min_quantity ?? 1}
                    step={product.quantity_multiple || 1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(
                          product.min_quantity ?? 1,
                          Math.floor(Number(e.target.value) || 1)
                        )
                      )
                    }
                    className="w-16 bg-transparent text-center text-sm font-semibold text-[#1C1917] focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Sumar cantidad"
                    onClick={() =>
                      setQuantity((q) => q + (product.quantity_multiple || 1))
                    }
                    className="min-h-[42px] px-3.5 py-2 text-sm font-semibold text-[#1C1917]"
                  >
                    +
                  </button>
                </div>
              </div>

              {fieldErrors.quantity && (
                <p className="text-xs font-medium text-rose-700">
                  {fieldErrors.quantity}
                </p>
              )}
            </section>

            {/* PASO 2: SUBÍ TUS ARCHIVOS O PEDÍ AYUDA */}
            {product.customizer_type !== 'event_stand' && (
              <section
                aria-labelledby="step-2-heading"
                className="mt-6 space-y-5 border-t border-[#E7E5E4] pt-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display flex h-6 w-6 items-center justify-center rounded-full bg-[#1C1917] text-xs font-semibold text-[#FAF8F5]">
                      2
                    </span>
                    <h2
                      id="step-2-heading"
                      className="text-sm font-semibold text-[#1C1917]"
                    >
                      {product.customizer_type === 'magnets_5x5'
                        ? 'Subí y encuadrá tus fotos (5 × 5 cm)'
                        : 'Subí tus archivos o pedí ayuda'}
                    </h2>
                  </div>

                  {product.customizer_type === 'magnets_5x5' && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        assignedMagnetUnits === expectedMagnetUnits &&
                        magnetPhotos.length > 0
                          ? 'bg-emerald-50 text-emerald-900'
                          : 'bg-[#F4F1EA] text-[#1C1917]'
                      }`}
                    >
                      Imanes asignados: {assignedMagnetUnits} de{' '}
                      {expectedMagnetUnits}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#57534E]">
                  {product.customization_config.file_instructions}
                </p>

                {product.customizer_type === 'magnets_5x5' ? (
                  <>
                    {/* Subida múltiple para imanes 5x5 */}
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#1C1917] bg-[#FAF8F5] p-6 text-center transition hover:bg-[#F4F1EA]">
                      <Upload className="h-6 w-6 text-[#57534E]" />
                      <span className="mt-2 text-xs font-medium text-[#1C1917]">
                        {isUploading
                          ? uploadProgressText || 'Subiendo tus fotografías...'
                          : 'Elegir una o varias fotografías (JPG, PNG, WEBP)'}
                      </span>
                      <span className="mt-1 text-[11px] text-[#78716C]">
                        Podés elegir cuántas copias querés de cada foto y ajustar el recorte 5 × 5 cm
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleMagnetPhotosUpload}
                        disabled={isUploading}
                        className="sr-only"
                      />
                    </label>

                    {magnetPhotos.length > 0 && (
                      <div className="space-y-3">
                        {assignedMagnetUnits !== expectedMagnetUnits && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D6D3D1] bg-[#F4F1EA] p-3 text-xs text-[#1C1917]">
                            <span>
                              Asignaste <strong>{assignedMagnetUnits}</strong>{' '}
                              imán(es) entre tus fotos y la selección actual es de{' '}
                              <strong>{expectedMagnetUnits}</strong> imanes.
                            </span>
                            {!selectedVariant?.pack_units && (
                              <button
                                type="button"
                                onClick={() => setQuantity(assignedMagnetUnits)}
                                className="rounded-lg bg-[#1C1917] px-3 py-1.5 text-[11px] font-medium text-[#FAF8F5]"
                              >
                                Igualar cantidad a {assignedMagnetUnits}
                              </button>
                            )}
                          </div>
                        )}

                        {magnetPhotos.map((mp, idx) => (
                          <div
                            key={mp.id}
                            className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-3.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#D6D3D1] bg-[#FFFFFF]">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={mp.cropped_preview_data_url}
                                    alt={mp.filename}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#1C1917]">
                                    Foto #{idx + 1}: {mp.filename}
                                  </p>
                                  <p className="text-[11px] text-[#57534E]">
                                    {mp.width_px} × {mp.height_px} px · Recorte 5 × 5 cm
                                  </p>
                                  {mp.low_resolution_warning ? (
                                    <p className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100/80 px-2 py-0.5 text-[10px] font-medium text-amber-950">
                                      <AlertTriangle className="h-3 w-3 text-amber-800" />
                                      Resolución baja (menor a 600×600 px): recomendamos usar la foto original sin reenviar por redes
                                    </p>
                                  ) : (
                                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Buena resolución para 5 × 5 cm
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Controles: Copias, Encuadrar, Reemplazar, Reordenar, Quitar */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <div className="flex items-center gap-1 rounded-xl border border-[#D6D3D1] bg-[#FFFFFF] px-2.5 py-1">
                                  <span className="text-[10px] font-medium text-[#57534E]">
                                    Copias:
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Restar copia de esta foto"
                                    onClick={() =>
                                      updateMagnetPhotoAssignedQty(
                                        mp.id,
                                        mp.quantity_assigned - 1
                                      )
                                    }
                                    className="px-1.5 text-xs font-semibold text-[#1C1917]"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-semibold text-[#1C1917]">
                                    {mp.quantity_assigned}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Sumar copia de esta foto"
                                    onClick={() =>
                                      updateMagnetPhotoAssignedQty(
                                        mp.id,
                                        mp.quantity_assigned + 1
                                      )
                                    }
                                    className="px-1.5 text-xs font-semibold text-[#1C1917]"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setActiveCropPhotoId(mp.id)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-[#D6D3D1] bg-[#FFFFFF] px-2.5 py-1.5 text-[11px] font-medium text-[#1C1917] hover:border-[#1C1917]"
                                >
                                  <Crop className="h-3.5 w-3.5 text-[#57534E]" />
                                  Encuadrar
                                </button>

                                <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#D6D3D1] bg-[#FFFFFF] px-2.5 py-1.5 text-[11px] font-medium text-[#1C1917] hover:border-[#1C1917]">
                                  <RefreshCw className="h-3.5 w-3.5 text-[#57534E]" />
                                  <span>Reemplazar</span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) =>
                                      handleReplaceMagnetPhoto(mp.id, e)
                                    }
                                    disabled={isUploading}
                                    className="sr-only"
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => moveMagnetPhoto(idx, -1)}
                                  disabled={idx === 0}
                                  aria-label="Subir posición de foto"
                                  className="rounded-lg border border-[#D6D3D1] bg-[#FFFFFF] p-1.5 text-[#1C1917] disabled:opacity-40"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => moveMagnetPhoto(idx, 1)}
                                  disabled={idx === magnetPhotos.length - 1}
                                  aria-label="Bajar posición de foto"
                                  className="rounded-lg border border-[#D6D3D1] bg-[#FFFFFF] p-1.5 text-[#1C1917] disabled:opacity-40"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeMagnetPhoto(mp.id)}
                                  aria-label={`Quitar foto ${mp.filename}`}
                                  className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Herramienta de recorte interactivo 5x5 cm */}
                    {activeCropPhoto && (
                      <div className="rounded-2xl border border-[#E7E5E4] bg-[#FFFFFF] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#1C1917]">
                            Ajustar encuadre 5 × 5 cm: {activeCropPhoto.filename}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              updateMagnetPhotoCrop(activeCropPhoto.id, {
                                zoom: 1,
                                offsetX: 0,
                                offsetY: 0,
                              })
                            }
                            className="text-[11px] font-medium text-[#57534E] underline hover:text-[#1C1917]"
                          >
                            Restablecer centrado
                          </button>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[11px] font-medium text-[#57534E]">
                              Zoom ({activeCropPhoto.crop.zoom.toFixed(1)}×)
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="2.5"
                              step="0.1"
                              value={activeCropPhoto.crop.zoom}
                              onChange={(e) =>
                                updateMagnetPhotoCrop(activeCropPhoto.id, {
                                  ...activeCropPhoto.crop,
                                  zoom: Number(e.target.value),
                                })
                              }
                              className="mt-1 w-full accent-[#1C1917]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-[#57534E]">
                              Posición horizontal ({activeCropPhoto.crop.offsetX}%)
                            </label>
                            <input
                              type="range"
                              min="-50"
                              max="50"
                              step="5"
                              value={activeCropPhoto.crop.offsetX}
                              onChange={(e) =>
                                updateMagnetPhotoCrop(activeCropPhoto.id, {
                                  ...activeCropPhoto.crop,
                                  offsetX: Number(e.target.value),
                                })
                              }
                              className="mt-1 w-full accent-[#1C1917]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-[#57534E]">
                              Posición vertical ({activeCropPhoto.crop.offsetY}%)
                            </label>
                            <input
                              type="range"
                              min="-50"
                              max="50"
                              step="5"
                              value={activeCropPhoto.crop.offsetY}
                              onChange={(e) =>
                                updateMagnetPhotoCrop(activeCropPhoto.id, {
                                  ...activeCropPhoto.crop,
                                  offsetY: Number(e.target.value),
                                })
                              }
                              className="mt-1 w-full accent-[#1C1917]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(product.customization_config.allow_logo_upload ||
                      product.customization_config.allow_photo_upload) && (
                      <div>
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#1C1917] bg-[#FAF8F5] p-5 text-center transition hover:bg-[#F4F1EA]">
                          <Upload className="h-5 w-5 text-[#57534E]" />
                          <span className="mt-1.5 text-xs font-medium text-[#1C1917]">
                            {isUploading
                              ? uploadProgressText || 'Subiendo archivo...'
                              : 'Subir diseño, logo o referencia (PNG, JPG, PDF, SVG, WEBP)'}
                          </span>
                          <span className="mt-0.5 text-[11px] text-[#78716C]">
                            Máx. 10 MB por archivo · Almacenamiento privado
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf,image/svg+xml"
                            multiple
                            onChange={handleDesignFileUpload}
                            disabled={isUploading}
                            className="sr-only"
                          />
                        </label>

                        {designFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {designFiles.map((df) => (
                              <div
                                key={df.file_id}
                                className="flex items-center justify-between rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] px-3.5 py-2 text-xs"
                              >
                                <span className="inline-flex items-center gap-2 font-medium text-[#1C1917]">
                                  <FileCheck2 className="h-4 w-4 text-emerald-700" />
                                  {df.filename}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDesignFiles((prev) =>
                                      prev.filter(
                                        (item) => item.file_id !== df.file_id
                                      )
                                    )
                                  }
                                  className="text-rose-700 hover:underline"
                                >
                                  Quitar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {product.customization_config.allow_design_help && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#D6D3D1] bg-[#FAF8F5] p-4">
                        <input
                          type="checkbox"
                          checked={designHelpRequested}
                          onChange={(e) =>
                            setDesignHelpRequested(e.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 rounded accent-[#1C1917]"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-[#1C1917]">
                            Necesito ayuda con el diseño / armado del original
                          </span>
                          {resolvedPrice.designHelpSurchargeArs > 0 ? (
                            <span className="ml-2 rounded bg-[#FFFFFF] px-2 py-0.5 text-[10px] font-semibold text-[#1C1917]">
                              +{formatARS(resolvedPrice.designHelpSurchargeArs)}
                            </span>
                          ) : (
                            <span className="ml-2 text-[11px] text-[#57534E]">
                              (Se cotiza según el armado solicitado)
                            </span>
                          )}
                          <p className="mt-0.5 text-[11px] text-[#57534E]">
                            Armamos la propuesta con tus indicaciones y te enviamos la muestra digital antes de producir.
                          </p>
                        </div>
                      </label>
                    )}
                  </>
                )}

                {/* Campos de texto, colores y observaciones */}
                <div className="space-y-3.5 pt-2">
                  {product.customization_config.allow_custom_text && (
                    <div>
                      <label
                        htmlFor="custom-text-input"
                        className="block text-xs font-medium text-[#1C1917]"
                      >
                        Texto, nombres, frase o Instagram a incluir
                      </label>
                      <input
                        id="custom-text-input"
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Ej: @mi.marca · ¡Gracias por tu compra! · Cumple de Martina"
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>
                  )}

                  {product.customization_config.allow_color_notes && (
                    <div>
                      <label
                        htmlFor="color-notes-input"
                        className="block text-xs font-medium text-[#1C1917]"
                      >
                        Colores o estilo buscado
                      </label>
                      <input
                        id="color-notes-input"
                        type="text"
                        value={colorNotes}
                        onChange={(e) => setColorNotes(e.target.value)}
                        placeholder="Ej: Tonos neutros, tipografía delicada..."
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>
                  )}

                  {product.customization_config.allow_observations && (
                    <div>
                      <label
                        htmlFor="observations-input"
                        className="block text-xs font-medium text-[#1C1917]"
                      >
                        Indicaciones adicionales o fecha en que lo necesitás
                      </label>
                      <textarea
                        id="observations-input"
                        rows={2}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Contanos cualquier detalle útil para preparar tu pedido..."
                        className="mt-1.5 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#1C1917]"
                      />
                    </div>
                  )}
                </div>

                {fieldErrors.files && (
                  <p className="text-xs font-medium text-rose-700">
                    {fieldErrors.files}
                  </p>
                )}
              </section>
            )}

            {/* PASO 3: REVISÁ TU PEDIDO Y CONTINUÁ */}
            <section
              aria-labelledby="step-3-heading"
              className="mt-6 space-y-4 border-t border-[#E7E5E4] pt-6"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-display flex h-6 w-6 items-center justify-center rounded-full bg-[#1C1917] text-xs font-semibold text-[#FAF8F5]">
                  3
                </span>
                <h2
                  id="step-3-heading"
                  className="text-sm font-semibold text-[#1C1917]"
                >
                  Revisá tu pedido
                </h2>
              </div>

              <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF8F5] p-4 text-xs text-[#57534E]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#1C1917]">
                    {product.name}
                    {selectedVariant ? ` · ${selectedVariant.name}` : ''}
                  </span>
                  <span className="font-semibold text-[#1C1917]">
                    Cantidad: {quantity}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed">
                  {buildCustomizationSummaryText()}
                </p>
              </div>

              {(uploadError || validationMessage) && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                  <span>{uploadError || validationMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {product.customizer_type === 'event_stand' ? (
                  <Link
                    href="/eventos"
                    className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
                  >
                    Consultar disponibilidad de fecha
                  </Link>
                ) : tierCalculation.finalUnitPriceArs !== null ? (
                  <button
                    type="button"
                    data-testid="add-to-cart-button"
                    onClick={handleAddToCart}
                    className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {editCartItemId
                      ? 'Guardar cambios en mi pedido'
                      : `Agregar al pedido · ${formatARS(estimatedTotalArs)}`}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      data-testid="request-quote-button"
                      onClick={() => {
                        if (validateCustomizationBeforeAction()) {
                          setShowInlineQuoteModal(true);
                        }
                      }}
                      className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
                    >
                      Solicitar presupuesto con mi personalización
                    </button>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-5 py-3 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
                    >
                      Sumar a mi lista a cotizar
                    </button>
                  </>
                )}

                <a
                  href={buildSafeWhatsAppUrl({
                    context: 'product',
                    productName: product.name,
                    variantName: selectedVariant?.name,
                    quantity,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-5 py-3 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar por WhatsApp
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR MÓVIL DE RESUMEN Y ACCIÓN PRINCIPAL */}
      {product.customizer_type !== 'event_stand' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E5E4] bg-[#FFFFFF]/95 px-4 py-3 shadow-lg backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#1C1917]">
                {product.name} (×{quantity})
              </p>
              <p className="text-[11px] text-[#57534E]">
                {estimatedTotalArs !== null
                  ? formatARS(estimatedTotalArs)
                  : 'Cotización personalizada'}
              </p>
            </div>
            {tierCalculation.finalUnitPriceArs !== null ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="shrink-0 rounded-full bg-[#1C1917] px-4 py-2.5 text-xs font-medium text-[#FAF8F5]"
              >
                {editCartItemId ? 'Guardar cambios' : 'Agregar al pedido'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (validateCustomizationBeforeAction()) {
                    setShowInlineQuoteModal(true);
                  }
                }}
                className="shrink-0 rounded-full bg-[#1C1917] px-4 py-2.5 text-xs font-medium text-[#FAF8F5]"
              >
                Solicitar presupuesto
              </button>
            )}
          </div>
        </div>
      )}

      {/* PRODUCTOS COMPLEMENTARIOS */}
      <section className="mt-14 border-t border-[#E7E5E4] pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wider text-[#78716C] uppercase">
              Completá tu pedido
            </span>
            <h2 className="font-display mt-1 text-2xl font-medium text-[#1C1917]">
              Otros productos personalizados de Trazo
            </h2>
          </div>
          <Link
            href="/tienda"
            className="rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#1C1917] hover:border-[#1C1917]"
          >
            Ver todo el catálogo →
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products
            .filter((p) => p.is_published && p.id !== product.id)
            .slice(0, 3)
            .map((rel) => (
              <Link
                key={rel.id}
                href={
                  rel.customizer_type === 'event_stand'
                    ? '/eventos'
                    : `/tienda/${rel.slug}`
                }
                className="sticker-card group flex flex-col justify-between overflow-hidden rounded-2xl"
              >
                <ProductCraftVisual
                  variant={rel.images[0]?.illustration_variant || 'stickers'}
                  imageUrl={rel.images[0]?.url}
                  isAuthorizedRealPhoto={rel.images[0]?.is_real_authorized_photo}
                  alt={rel.name}
                  className="h-44 w-full border-b border-[#E7E5E4]"
                />
                <div className="p-4">
                  <p className="font-display text-base font-medium text-[#1C1917] group-hover:text-[#57534E]">
                    {rel.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#57534E]">
                    {rel.short_description}
                  </p>
                  <span className="mt-3 inline-block text-xs font-medium text-[#1C1917] underline underline-offset-4">
                    Ver producto →
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* Modal para Solicitar Presupuesto directo */}
      {showInlineQuoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Solicitar presupuesto personalizado"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInlineQuoteModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-medium text-[#1C1917]">
                Solicitar presupuesto personalizado
              </h3>
              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => setShowInlineQuoteModal(false)}
                className="rounded-lg p-1.5 text-[#57534E] hover:bg-[#F4F1EA] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {quoteSentCode ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
                  <p className="font-semibold">
                    ¡Solicitud enviada! Código: {quoteSentCode}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Recibimos tu pedido con las opciones y archivos que cargaste. Te contactaremos a la brevedad con el presupuesto final.
                  </p>
                </div>
                <a
                  href={buildSafeWhatsAppUrl({
                    context: 'quote',
                    quoteReference: quoteSentCode,
                    productName: product.name,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] py-3 text-xs font-medium text-[#FAF8F5]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Continuar por WhatsApp ({quoteSentCode})
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmitDirectQuote} className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-[#57534E]">
                  Dejanos tu nombre y WhatsApp o correo para enviarte la cotización de tu pedido con las opciones y archivos que cargaste.
                </p>
                <div>
                  <label className="block text-xs font-medium text-[#1C1917]">
                    Tu nombre y apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteCustomerName}
                    onChange={(e) => setQuoteCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C1917]">
                    WhatsApp o correo electrónico *
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteCustomerContact}
                    onChange={(e) => setQuoteCustomerContact(e.target.value)}
                    placeholder="+54 9 358 ..."
                    className="mt-1 w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1917]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#1C1917] px-5 py-3 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
                >
                  Enviar solicitud de presupuesto
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Galería Ampliable */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/80 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista ampliada de ${product.name}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[#E7E5E4] bg-[#FAF8F5] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1C1917]">
                {product.name}
              </p>
              <button
                type="button"
                aria-label="Cerrar vista ampliada"
                onClick={() => setLightboxOpen(false)}
                className="rounded-full bg-[#1C1917] p-1.5 text-[#FAF8F5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ProductCraftVisual
              variant={product.images[0]?.illustration_variant || 'stickers'}
              imageUrl={product.images[0]?.url}
              isAuthorizedRealPhoto={product.images[0]?.is_real_authorized_photo}
              alt={product.name}
              caption={product.images[0]?.caption}
              className="h-[440px] w-full rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm font-medium text-[#57534E]">
          Cargando producto...
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}
