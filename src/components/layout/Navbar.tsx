'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  ArrowRight,
  PackageSearch,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { TrazoBrandLogo } from '@/components/visuals/TrazoBrandLogo';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    settings,
    cartCount,
    setIsCartDrawerOpen,
    sandboxTestPricesEnabled,
    products,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen && !searchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, searchOpen]);

  // El panel de administración tiene su propia interfaz independiente
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Inicio' },
    { href: '/tienda', label: 'Tienda' },
    { href: '/kits-emprendedores', label: 'Kits para emprendedores' },
    { href: '/eventos', label: 'Eventos' },
    { href: '/como-comprar', label: 'Cómo comprar' },
    { href: '/contacto', label: 'Contacto' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(q ? `/tienda?q=${encodeURIComponent(q)}` : '/tienda');
  };

  const quickResults = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.is_published &&
            (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.short_description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 4)
    : [];

  return (
    <>
      {/* Barra superior informativa limpia y breve */}
      <div className="border-b border-[#292524] bg-[#1C1917] px-4 py-2 text-xs text-[#FAF8F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <p className="truncate font-medium text-[#E7E5E4]">
            Hecho en {settings.city}, {settings.province}
            <span className="mx-2 text-[#78716C]">·</span>
            <span>Retiro coordinado y envíos a todo el país</span>
          </p>

          <Link
            href="/pedidos/seguimiento"
            className="inline-flex shrink-0 items-center gap-1.5 font-medium text-[#FAF8F5] underline-offset-4 transition hover:underline"
          >
            <PackageSearch className="h-3.5 w-3.5 text-[#D6D3D1]" />
            <span>Seguimiento de pedido</span>
          </Link>
        </div>
      </div>

      {/* Aviso informativo sólo si el administrador activó tarifas de prueba desde /admin */}
      {sandboxTestPricesEnabled && (
        <div
          role="status"
          aria-live="polite"
          data-testid="sandbox-global-banner"
          className="border-b border-[#D6D3D1] bg-[#F4F1EA] px-4 py-2 text-xs text-[#1C1917]"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
            <p className="font-medium">
              <strong>Modo de prueba activo desde Administración:</strong> Los importes visibles son tarifas técnicas de prueba para validar el carrito y el checkout.
            </p>
          </div>
        </div>
      )}

      {/* Encabezado principal */}
      <header className="sticky top-0 z-40 border-b border-[#E7E5E4] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 focus:outline-none"
          >
            <TrazoBrandLogo size="md" variant="dark" />
          </Link>

          {/* Navegación Desktop */}
          <nav
            aria-label="Navegación principal"
            className="hidden lg:flex lg:items-center lg:gap-1"
          >
            {navItems.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-[#1C1917] text-[#FAF8F5]'
                      : 'text-[#1C1917] hover:bg-[#F4F1EA]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Acciones: Buscador + Carrito + Menú móvil (objetivos táctiles >= 44x44px) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Abrir buscador de productos"
              aria-expanded={searchOpen}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full border border-[#D6D3D1] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#1C1917] transition hover:border-[#1C1917]"
            >
              <Search className="h-4 w-4 text-[#57534E]" />
              <span className="hidden sm:inline">Buscar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              aria-label={`Carrito de compras con ${cartCount} productos`}
              className="relative inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FAF8F5] transition hover:bg-[#292524]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Tu pedido</span>
              <span
                data-testid="navbar-cart-count"
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FAF8F5] px-1.5 text-[11px] font-semibold text-[#1C1917]"
              >
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#D6D3D1] bg-[#FFFFFF] p-2.5 text-[#1C1917] lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Barra desplegable de búsqueda */}
        {searchOpen && (
          <div className="border-t border-[#E7E5E4] bg-[#FFFFFF] px-4 py-4 shadow-md">
            <div className="mx-auto max-w-3xl">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <label htmlFor="header-search-input" className="sr-only">
                  Buscar productos personalizados en Trazo
                </label>
                <div className="relative flex-1">
                  <input
                    id="header-search-input"
                    type="search"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar imanes 5×5, stickers, pines, tarjetas, etiquetas..."
                    className="w-full rounded-xl border border-[#D6D3D1] bg-[#FAF8F5] py-2.5 pr-9 pl-4 text-sm text-[#1C1917] placeholder:text-[#78716C]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-[#78716C] hover:text-[#1C1917]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-[#1C1917] px-5 py-2.5 text-sm font-medium text-[#FAF8F5] hover:bg-[#292524]"
                >
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="min-h-[44px] rounded-xl border border-[#D6D3D1] px-3.5 py-2.5 text-xs font-medium text-[#57534E] hover:border-[#1C1917] hover:text-[#1C1917]"
                >
                  Cerrar
                </button>
              </form>

              {quickResults.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {quickResults.map((prod) => (
                    <Link
                      key={prod.id}
                      href={`/tienda/${prod.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center justify-between rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] p-3 text-left transition hover:border-[#1C1917]"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#1C1917]">
                          {prod.name}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-[#57534E]">
                          {prod.short_description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#57534E]" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menú móvil */}
        {mobileMenuOpen && (
          <nav
            aria-label="Navegación móvil"
            className="border-t border-[#E7E5E4] bg-[#FAF8F5] px-4 py-4 lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={` flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-medium ${
                      active
                        ? 'bg-[#1C1917] text-[#FAF8F5]'
                        : 'text-[#1C1917] hover:bg-[#F4F1EA]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/pedidos/seguimiento"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D6D3D1] bg-[#FFFFFF] px-4 py-2.5 text-sm font-medium text-[#1C1917]"
              >
                <PackageSearch className="h-4 w-4 text-[#57534E]" />
                Seguimiento de mi pedido
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
