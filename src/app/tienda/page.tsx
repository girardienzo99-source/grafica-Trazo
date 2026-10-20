'use client';

import React, { Suspense, useMemo, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  CalendarHeart,
  ArrowRight,
  Layers,
  MessageCircle,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/catalog/ProductCard';
import {
  buildSafeWhatsAppUrl,
  resolveEffectiveProductPrice,
} from '@/lib/utils/format';

type SortOption =
  | 'featured'
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc';

function CatalogContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get('categoria') || 'all';
  const initialSearch = searchParams.get('q') || '';
  const initialSort = (searchParams.get('orden') as SortOption) || 'featured';
  const initialFeatured = searchParams.get('destacados') === '1';

  const { categories, products, sandboxTestPricesEnabled } = useStore();

  const [selectedCategory, setSelectedCategory] =
    useState<string>(initialCategory);
  const [searchText, setSearchText] = useState<string>(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(initialFeatured);

  useEffect(() => {
    setSelectedCategory(searchParams.get('categoria') || 'all');
    setSearchText(searchParams.get('q') || '');
    setSortBy((searchParams.get('orden') as SortOption) || 'featured');
    setOnlyFeatured(searchParams.get('destacados') === '1');
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (next: {
      categoria?: string;
      q?: string;
      orden?: SortOption;
      destacados?: boolean;
    }) => {
      const cat = next.categoria ?? selectedCategory;
      const q = next.q ?? searchText;
      const orden = next.orden ?? sortBy;
      const dest = next.destacados ?? onlyFeatured;

      const params = new URLSearchParams();
      if (cat && cat !== 'all') params.set('categoria', cat);
      if (q.trim()) params.set('q', q.trim());
      if (orden && orden !== 'featured') params.set('orden', orden);
      if (dest) params.set('destacados', '1');

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, selectedCategory, searchText, sortBy, onlyFeatured]
  );

  const publishedProducts = useMemo(
    () => products.filter((p) => p.is_published),
    [products]
  );

  // Verificar si existen precios publicados para mostrar u ocultar el orden por precio
  const hasPublishedPrices = useMemo(
    () =>
      publishedProducts.some(
        (p) =>
          resolveEffectiveProductPrice(
            p,
            p.variants[0],
            sandboxTestPricesEnabled
          ).unitPriceArs !== null
      ),
    [publishedProducts, sandboxTestPricesEnabled]
  );

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.slug === selectedCategory),
    [categories, selectedCategory]
  );

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const list = publishedProducts.filter((p) => {
      if (selectedCategory !== 'all') {
        const cat = categories.find((c) => c.id === p.category_id);
        if (
          cat?.slug !== selectedCategory &&
          p.category_id !== selectedCategory
        ) {
          return false;
        }
      }
      if (onlyFeatured && !p.is_featured) {
        return false;
      }
      if (query) {
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = p.short_description.toLowerCase().includes(query);
        const matchFull = p.description.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchFull) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'featured' || (!hasPublishedPrices && sortBy.startsWith('price_'))) {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return a.name.localeCompare(b.name, 'es-AR');
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'es-AR');
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name, 'es-AR');
      }

      const priceA = resolveEffectiveProductPrice(
        a,
        a.variants[0],
        sandboxTestPricesEnabled
      ).unitPriceArs;
      const priceB = resolveEffectiveProductPrice(
        b,
        b.variants[0],
        sandboxTestPricesEnabled
      ).unitPriceArs;

      if (priceA === null && priceB === null)
        return a.name.localeCompare(b.name, 'es-AR');
      if (priceA === null) return 1;
      if (priceB === null) return -1;

      return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
    });
  }, [
    publishedProducts,
    categories,
    selectedCategory,
    onlyFeatured,
    searchText,
    sortBy,
    hasPublishedPrices,
    sandboxTestPricesEnabled,
  ]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchText.trim().length > 0 ||
    onlyFeatured ||
    sortBy !== 'featured';

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSearchText('');
    setOnlyFeatured(false);
    setSortBy('featured');
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* 1. ENCABEZADO CORTO Y ORIENTADO AL COMPRADOR */}
      <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-[0.14em] text-[#78716C] uppercase">
              Tienda online · Río Cuarto y envíos a todo el país
            </span>
            <h1 className="font-display mt-1 text-2xl font-medium text-[#1C1917] sm:text-4xl">
              {activeCategoryObj ? activeCategoryObj.name : 'Catálogo de productos personalizados'}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#57534E] sm:text-sm">
              {activeCategoryObj
                ? activeCategoryObj.description
                : 'Elegí tu producto, indicá cantidades y subí tus fotos o archivos para encargar o solicitar tu presupuesto a medida.'}
            </p>
          </div>

          <span className="rounded-full border border-[#E7E5E4] bg-[#FAF8F5] px-3.5 py-1.5 text-xs font-medium text-[#57534E]">
            {filteredProducts.length} de {publishedProducts.length} productos
          </span>
        </div>

        {/* 2. CATEGORÍAS COMPACTAS */}
        <div
          role="tablist"
          aria-label="Filtrar por categoría"
          className="mt-5 flex flex-wrap gap-2"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              updateUrlParams({ categoria: 'all' });
            }}
            className={`min-h-[38px] rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              selectedCategory === 'all'
                ? 'border-[#1C1917] bg-[#1C1917] text-[#FAF8F5]'
                : 'border-[#D6D3D1] bg-[#FAF8F5] text-[#1C1917] hover:border-[#1C1917]'
            }`}
          >
            Todos ({publishedProducts.length})
          </button>

          {categories.map((cat) => {
            const active = selectedCategory === cat.slug;
            const count = publishedProducts.filter(
              (p) => p.category_id === cat.id
            ).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  updateUrlParams({ categoria: cat.slug });
                }}
                className={`min-h-[38px] rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-[#1C1917] bg-[#1C1917] text-[#FAF8F5]'
                    : 'border-[#D6D3D1] bg-[#FAF8F5] text-[#1C1917] hover:border-[#1C1917]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* 3. BUSCADOR CON LIMPIAR (X) Y ORDENAMIENTO */}
        <div className="mt-5 grid gap-3 border-t border-[#E7E5E4] pt-5 sm:grid-cols-12">
          <div className="relative sm:col-span-6">
            <label htmlFor="catalog-search" className="sr-only">
              Buscar por nombre o descripción
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#78716C]" />
            <input
              id="catalog-search"
              type="search"
              value={searchText}
              onChange={(e) => {
                const val = e.target.value;
                setSearchText(val);
                updateUrlParams({ q: val });
              }}
              placeholder="Buscar imanes 5×5, stickers, pines, tarjetas, etiquetas..."
              className="w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] py-2.5 pr-9 pl-10 text-xs text-[#1C1917] placeholder:text-[#78716C]"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  updateUrlParams({ q: '' });
                }}
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-[#78716C] hover:bg-[#E7E5E4] hover:text-[#1C1917]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center sm:col-span-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#1C1917]">
              <input
                type="checkbox"
                checked={onlyFeatured}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setOnlyFeatured(checked);
                  updateUrlParams({ destacados: checked });
                }}
                className="h-4 w-4 rounded accent-[#1C1917]"
              />
              <span>Solo destacados</span>
            </label>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="catalog-sort" className="sr-only">
              Ordenar productos
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => {
                const nextSort = e.target.value as SortOption;
                setSortBy(nextSort);
                updateUrlParams({ orden: nextSort });
              }}
              className="w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-2.5 text-xs font-medium text-[#1C1917]"
            >
              <option value="featured">Ordenar: Destacados</option>
              <option value="name_asc">Nombre: A → Z</option>
              <option value="name_desc">Nombre: Z → A</option>
              {hasPublishedPrices && (
                <>
                  <option value="price_asc">Precio: Menor a Mayor</option>
                  <option value="price_desc">Precio: Mayor a Menor</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* 4. CHIPS DE FILTROS ACTIVOS Y RESTABLECER */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E7E5E4] pt-4 text-xs">
            <span className="text-[#78716C]">Filtros activos:</span>

            {activeCategoryObj && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-1 font-medium text-[#1C1917]">
                Categoría: {activeCategoryObj.name}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    updateUrlParams({ categoria: 'all' });
                  }}
                  aria-label="Quitar filtro de categoría"
                  className="text-[#78716C] hover:text-[#1C1917]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {searchText.trim() && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-1 font-medium text-[#1C1917]">
                Búsqueda: “{searchText.trim()}”
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('');
                    updateUrlParams({ q: '' });
                  }}
                  aria-label="Quitar filtro de búsqueda"
                  className="text-[#78716C] hover:text-[#1C1917]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {onlyFeatured && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FAF8F5] px-3 py-1 font-medium text-[#1C1917]">
                Solo destacados
                <button
                  type="button"
                  onClick={() => {
                    setOnlyFeatured(false);
                    updateUrlParams({ destacados: false });
                  }}
                  aria-label="Quitar filtro de destacados"
                  className="text-[#78716C] hover:text-[#1C1917]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto font-medium text-[#1C1917] underline underline-offset-4 hover:text-[#57534E]"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* 5. GRILLA DE PRODUCTOS */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#FFFFFF] p-12 text-center">
          <p className="font-display text-lg font-medium text-[#1C1917]">
            No encontramos productos con esos filtros
          </p>
          <p className="mt-1 text-xs text-[#57534E]">
            Probá limpiando la búsqueda o restableciendo los filtros para ver todo el catálogo.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5]"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product, index) => {
            const cat = categories.find((c) => c.id === product.category_id);
            return (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={cat?.name}
                priority={index < 3}
              />
            );
          })}
        </div>
      )}

      {/* 6. ACCESOS COMPLEMENTARIOS A KITS Y EVENTOS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#E7E5E4] bg-[#F4F1EA] p-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#78716C] uppercase">
            <Layers className="h-4 w-4 text-[#1C1917]" />
            Combos para marcas
          </span>
          <h2 className="font-display mt-1.5 text-xl font-medium text-[#1C1917]">
            ¿Querés combinar stickers, etiquetas de ropa y tarjetas?
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
            Elegí qué piezas necesita tu marca en nuestra sección de Kits para Emprendedores y recibí una cotización integral.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/kits-emprendedores"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-[#FAF8F5]"
            >
              Armar kit para mi marca
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={buildSafeWhatsAppUrl({
                context: 'product',
                productName: 'Combo Emprendedor',
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-4 py-2.5 text-xs font-medium text-[#1C1917]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Consultar por WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-[#1C1917] bg-[#1C1917] p-6 text-[#FAF8F5]">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-[#A8A29E] uppercase">
            <CalendarHeart className="h-4 w-4" />
            Eventos y festejos
          </span>
          <h2 className="font-display mt-1.5 text-xl font-medium text-[#FAF8F5]">
            Stand de tatuajes temporales y recuerdos para fiestas
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#D6D3D1]">
            ¿Organizás un casamiento, 15 años, cumpleaños o evento corporativo? Consultá disponibilidad de fecha y cantidad de invitados.
          </p>
          <div className="mt-4">
            <Link
              href="/eventos"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] px-5 py-2.5 text-xs font-medium text-[#1C1917]"
            >
              Consultar por mi evento
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TiendaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm font-medium text-[#57534E]">
          Cargando catálogo de Trazo Espacio Gráfico...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
