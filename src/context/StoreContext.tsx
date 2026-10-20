'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CartItem,
  Category,
  Product,
  StoreSettings,
} from '@/types/trazo';
import { INITIAL_SEED_DATA } from '@/lib/db/seed-data';

const CART_STORAGE_KEY = 'trazo_cart_v1';
const SESSION_TOKEN_KEY = 'trazo_owner_session_token_v1';
const RECENT_ORDERS_KEY = 'trazo_recent_order_tokens_v1';

export interface SavedOrderLink {
  orderNumber: string;
  accessToken: string;
  accessCode: string;
  createdAt: string;
  totalArs: number;
}

interface StoreContextValue {
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
  isLoadingCatalog: boolean;
  sandboxTestPricesEnabled: boolean;
  toggleSandboxTestPrices: (enabled: boolean) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  ownerSessionToken: string;
  cart: CartItem[];
  cartCount: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addOrUpdateCartItem: (
    item: Omit<CartItem, 'cart_item_id' | 'added_at'>,
    replaceCartItemId?: string | null
  ) => CartItem;
  updateCartItemQuantity: (cartItemId: string, newQuantity: number) => void;
  removeCartItem: (cartItemId: string) => void;
  clearCart: () => void;
  savedOrderLinks: SavedOrderLink[];
  registerSavedOrderLink: (link: SavedOrderLink) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function buildCustomizationSignature(
  item: Pick<
    CartItem,
    | 'product_id'
    | 'variant_id'
    | 'design_help_requested'
    | 'customization_payload'
    | 'file_ids'
  >
): string {
  const payload = item.customization_payload;
  const magnetSig = (payload.magnet_photos || [])
    .map(
      (p) =>
        `${p.file_id || p.filename}:${p.quantity_assigned}:${p.crop.zoom.toFixed(2)}:${p.crop.offsetX.toFixed(0)}:${p.crop.offsetY.toFixed(0)}`
    )
    .join('|');
  const designSig = (payload.design_files || [])
    .map((d) => d.file_id || d.filename)
    .join('|');

  return [
    item.product_id,
    item.variant_id || 'no-var',
    item.design_help_requested ? 'help:1' : 'help:0',
    (payload.custom_text || '').trim(),
    (payload.color_notes || '').trim(),
    (payload.observations || '').trim(),
    (payload.selected_dimensions || '').trim(),
    (payload.selected_material || '').trim(),
    (payload.selected_finish || '').trim(),
    magnetSig,
    designSig,
    (item.file_ids || []).join(','),
  ].join('::');
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(
    INITIAL_SEED_DATA.categories
  );
  const [products, setProducts] = useState<Product[]>(
    INITIAL_SEED_DATA.products
  );
  const [settings, setSettings] = useState<StoreSettings>(
    INITIAL_SEED_DATA.store_settings
  );
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [ownerSessionToken, setOwnerSessionToken] = useState<string>('');
  const [savedOrderLinks, setSavedOrderLinks] = useState<SavedOrderLink[]>([]);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.products) setProducts(data.products);
        if (data.settings) setSettings(data.settings);
      }
    } catch {
      // Keep seed fallback if offline
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    // Load persistent cart, session token, and recent order tokens from localStorage
    try {
      let token = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!token || token.length < 16) {
        token =
          'sess_' +
          Math.random().toString(36).slice(2) +
          Date.now().toString(36);
        localStorage.setItem(SESSION_TOKEN_KEY, token);
      }
      setOwnerSessionToken(token);

      const rawCart = localStorage.getItem(CART_STORAGE_KEY);
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }

      const rawOrders = localStorage.getItem(RECENT_ORDERS_KEY);
      if (rawOrders) {
        const parsedOrders = JSON.parse(rawOrders);
        if (Array.isArray(parsedOrders)) {
          setSavedOrderLinks(parsedOrders);
        }
      }
    } catch {
      // Ignore storage errors
    }
    setIsHydrated(true);
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore quota errors
    }
  }, [cart, isHydrated]);

  const toggleSandboxTestPrices = useCallback(async (enabled: boolean) => {
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandbox_test_prices_enabled: enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  /**
   * REGLA ESTRICTA DEL CARRITO:
   * "No mezclar en una sola línea productos iguales con fotos o diseños diferentes."
   * Si replaceCartItemId está presente (modo editar personalización), actualiza esa línea.
   * Si no, compara customization_signature: solo suma cantidad si la personalización y archivos son idénticos;
   * si tienen fotos o diseños distintos, crea una nueva línea independiente en el carrito.
   */
  const addOrUpdateCartItem = useCallback(
    (
      itemInput: Omit<CartItem, 'cart_item_id' | 'added_at'>,
      replaceCartItemId?: string | null
    ): CartItem => {
      const signature = buildCustomizationSignature(itemInput);
      const now = new Date().toISOString();
      let createdOrUpdatedItem: CartItem | null = null;

      setCart((prev) => {
        if (replaceCartItemId) {
          const idx = prev.findIndex((c) => c.cart_item_id === replaceCartItemId);
          if (idx >= 0) {
            const updated: CartItem = {
              ...itemInput,
              customization_signature: signature,
              cart_item_id: replaceCartItemId,
              added_at: prev[idx].added_at,
            };
            createdOrUpdatedItem = updated;
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }
        }

        // Only merge if customization_signature is 100% identical AND it's not a custom photo magnet pack with per-photo counts
        const hasUniqueFiles =
          (itemInput.customization_payload.magnet_photos?.length || 0) > 0 ||
          (itemInput.customization_payload.design_files?.length || 0) > 0;

        const existingIndex = !hasUniqueFiles
          ? prev.findIndex((c) => c.customization_signature === signature)
          : -1;

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const updated: CartItem = {
            ...existing,
            quantity: existing.quantity + itemInput.quantity,
            unit_price_ars: itemInput.unit_price_ars,
          };
          createdOrUpdatedItem = updated;
          const copy = [...prev];
          copy[existingIndex] = updated;
          return copy;
        }

        const newItem: CartItem = {
          ...itemInput,
          customization_signature: signature,
          cart_item_id:
            'line_' +
            Math.random().toString(36).slice(2, 9) +
            '_' +
            Date.now().toString(36),
          added_at: now,
        };
        createdOrUpdatedItem = newItem;
        return [...prev, newItem];
      });

      return (
        createdOrUpdatedItem || {
          ...itemInput,
          customization_signature: signature,
          cart_item_id: 'line_' + Date.now(),
          added_at: now,
        }
      );
    },
    []
  );

  const updateCartItemQuantity = useCallback(
    (cartItemId: string, newQuantity: number) => {
      if (newQuantity < 1) return;
      const safeQty = Math.floor(newQuantity);
      setCart((prev) =>
        prev.map((item) => {
          if (item.cart_item_id !== cartItemId) return item;

          // Si el ítem es imanes 5x5 con fotos cargadas, sincronizar las copias asignadas para evitar desfase con el servidor
          if (
            item.customization_payload?.customizer_type === 'magnets_5x5' &&
            item.customization_payload.magnet_photos &&
            item.customization_payload.magnet_photos.length > 0
          ) {
            const prod = products.find((p) => p.id === item.product_id);
            const variant = prod?.variants.find((v) => v.id === item.variant_id);
            const packUnits = variant?.pack_units || null;
            const expectedTotal = packUnits ? packUnits * safeQty : safeQty;

            const currentPhotos = item.customization_payload.magnet_photos;
            const otherPhotosSum = currentPhotos
              .slice(0, -1)
              .reduce((acc, p) => acc + p.quantity_assigned, 0);

            if (expectedTotal >= currentPhotos.length) {
              const updatedPhotos = currentPhotos.map((p, idx) => {
                if (idx < currentPhotos.length - 1) return p;
                return {
                  ...p,
                  quantity_assigned: Math.max(1, expectedTotal - otherPhotosSum),
                };
              });
              const updatedSummary = item.customization_summary.replace(
                /\(\d+\s*copias?\s*totales\)/i,
                `(${expectedTotal} copias totales)`
              );
              return {
                ...item,
                quantity: safeQty,
                customization_summary: updatedSummary,
                customization_payload: {
                  ...item.customization_payload,
                  magnet_photos: updatedPhotos,
                },
              };
            }
          }

          return {
            ...item,
            quantity: safeQty,
          };
        })
      );
    },
    [products]
  );

  const removeCartItem = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cart_item_id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const registerSavedOrderLink = useCallback((link: SavedOrderLink) => {
    setSavedOrderLinks((prev) => {
      const filtered = prev.filter((o) => o.accessToken !== link.accessToken);
      const next = [link, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      categories,
      products,
      settings,
      isLoadingCatalog,
      sandboxTestPricesEnabled: settings.sandbox_test_prices_enabled,
      toggleSandboxTestPrices,
      refreshCatalog,
      ownerSessionToken,
      cart,
      cartCount,
      isCartDrawerOpen,
      setIsCartDrawerOpen,
      addOrUpdateCartItem,
      updateCartItemQuantity,
      removeCartItem,
      clearCart,
      savedOrderLinks,
      registerSavedOrderLink,
    }),
    [
      categories,
      products,
      settings,
      isLoadingCatalog,
      toggleSandboxTestPrices,
      refreshCatalog,
      ownerSessionToken,
      cart,
      cartCount,
      isCartDrawerOpen,
      addOrUpdateCartItem,
      updateCartItemQuantity,
      removeCartItem,
      clearCart,
      savedOrderLinks,
      registerSavedOrderLink,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore debe usarse dentro de un StoreProvider');
  }
  return ctx;
}
