import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as db from "../services/dataService";
import { MAX_PRICE } from "../config/store";
import { filterProducts } from "../utils/products";

const StoreContext = createContext(null);

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const DEFAULT_FILTERS = {
  category: "all",
  search: "",
  maxPrice: MAX_PRICE,
  stockOnly: false,
  sortBy: "relevance",
};

/** Traduce errores de Supabase / red a mensajes claros en español */
function friendlyError(err, fallback) {
  if (!err) return fallback;
  if (err.code === "23505") return "Ya existe un registro con ese código (SKU o marca duplicada).";
  if (err.code === "42501" || /row-level security/i.test(err.message || ""))
    return "Permiso denegado. Inicia sesión como administrador.";
  if (/quota|exceeded/i.test(err.message || ""))
    return "El almacenamiento local del navegador está lleno. Conecta Supabase o usa imágenes por enlace.";
  return fallback;
}

export function StoreProvider({ children }) {
  /* ---------------- Datos del catálogo ---------------- */
  const [products, setProducts] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- Estado del cliente ---------------- */
  const [cart, setCart] = useState(() => readJSON("webdo_cart", []));
  const [activeVehicle, setActiveVehicle] = useState(() => readJSON("webdo_active_vehicle", null));
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isAdmin, setIsAdmin] = useState(false);

  /* ---------------- UI: modales, drawers y toasts ---------------- */
  const [productModalId, setProductModalId] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [garageOpen, setGarageOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [productForm, setProductForm] = useState(null); // null | { productId: string|null }
  const [toasts, setToasts] = useState([]);
  const toastSeq = useRef(0);

  const showToast = useCallback((message, type = "info") => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, message, type, leaving: false }]);
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 3000);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3300);
  }, []);

  /* ---------------- Carga inicial ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, v, g] = await Promise.all([db.listProducts(), db.listVehicles(), db.listGallery()]);
        if (cancelled) return;
        setProducts(p);
        setVehicles(v);
        setGallery(g);
      } catch (err) {
        console.error("Error cargando datos:", err);
        if (!cancelled) showToast("No se pudo conectar con la base de datos", "info");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    db.hasSession().then((ok) => !cancelled && setIsAdmin(ok));
    const unsubscribe = db.onAuthChange((ok) => setIsAdmin(ok));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [showToast]);

  /* ---------------- Persistencia local del cliente ---------------- */
  useEffect(() => localStorage.setItem("webdo_cart", JSON.stringify(cart)), [cart]);
  useEffect(() => {
    if (activeVehicle) localStorage.setItem("webdo_active_vehicle", JSON.stringify(activeVehicle));
    else localStorage.removeItem("webdo_active_vehicle");
  }, [activeVehicle]);

  // Bloquear scroll del body cuando hay drawers abiertos
  useEffect(() => {
    const anyDrawer = cartOpen || mobileMenuOpen;
    document.body.style.overflow = anyDrawer ? "hidden" : "";
  }, [cartOpen, mobileMenuOpen]);

  /* ---------------- Filtros ---------------- */
  const updateFilters = useCallback((patch) => setFilters((f) => ({ ...f, ...patch })), []);
  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filteredProducts = useMemo(
    () => filterProducts(products, filters, activeVehicle),
    [products, filters, activeVehicle]
  );

  /* ---------------- Carrito ---------------- */
  const addToCart = useCallback(
    (productId, qty = 1) => {
      const prod = products.find((p) => p.id === productId);
      if (!prod) return;
      setCart((prev) => {
        const existing = prev.find((i) => i.id === productId);
        if (existing) return prev.map((i) => (i.id === productId ? { ...i, quantity: i.quantity + qty } : i));
        return [
          ...prev,
          {
            id: prod.id,
            name: prod.name,
            sku: prod.sku || "N/A",
            oem: prod.oem,
            price: prod.price,
            image: prod.images?.[0] || "",
            quantity: qty,
          },
        ];
      });
      showToast(`¡Agregado: ${prod.name.substring(0, 28)}...!`, "success");
    },
    [products, showToast]
  );

  const updateCartQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((id) => setCart((prev) => prev.filter((i) => i.id !== id)), []);
  const clearCart = useCallback(() => {
    setCart([]);
    showToast("Carrito vaciado", "info");
  }, [showToast]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  /* ---------------- Admin: sesión ---------------- */
  const openAdminPortal = useCallback(() => {
    if (isAdmin) setAdminPanelOpen(true);
    else setAdminLoginOpen(true);
  }, [isAdmin]);

  const login = useCallback(
    async (user, pass) => {
      const { ok, error } = await db.signIn(user, pass);
      if (ok) {
        setIsAdmin(true);
        setAdminLoginOpen(false);
        setAdminPanelOpen(true);
        showToast("¡Acceso concedido al panel de administrador!", "success");
      } else {
        showToast("Credenciales de administrador incorrectas", "info");
      }
      return { ok, error };
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    await db.signOut();
    setIsAdmin(false);
    setAdminPanelOpen(false);
    setProductForm(null);
    showToast("Sesión de administrador cerrada", "info");
  }, [showToast]);

  /* ---------------- Admin: productos ---------------- */
  const saveProduct = useCallback(
    async (product) => {
      try {
        const saved = await db.upsertProduct(product);
        setProducts((prev) => {
          const idx = prev.findIndex((p) => p.id === saved.id);
          if (idx >= 0) return prev.map((p) => (p.id === saved.id ? saved : p));
          return [saved, ...prev];
        });
        return true;
      } catch (err) {
        console.error(err);
        showToast(friendlyError(err, "Error al guardar el repuesto"), "info");
        return false;
      }
    },
    [showToast]
  );

  const removeProduct = useCallback(
    async (id) => {
      try {
        await db.deleteProduct(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast("Repuesto eliminado del sistema", "info");
      } catch (err) {
        console.error(err);
        showToast(friendlyError(err, "Error al eliminar el repuesto"), "info");
      }
    },
    [showToast]
  );

  const clearProducts = useCallback(async () => {
    try {
      await db.deleteAllProducts();
      setProducts([]);
      showToast("Catálogo vaciado", "info");
    } catch (err) {
      console.error(err);
      showToast(friendlyError(err, "Error al vaciar el catálogo"), "info");
    }
  }, [showToast]);

  /* ---------------- Admin: vehículos ---------------- */
  const saveMake = useCallback(
    async (make, models) => {
      try {
        await db.upsertVehicleMake(make, models);
        setVehicles((prev) => ({ ...prev, [make]: { models } }));
        return true;
      } catch (err) {
        console.error(err);
        showToast(friendlyError(err, "Error al guardar la marca"), "info");
        return false;
      }
    },
    [showToast]
  );

  const removeMake = useCallback(
    async (make) => {
      try {
        await db.deleteVehicleMake(make);
        setVehicles((prev) => {
          const next = { ...prev };
          delete next[make];
          return next;
        });
        showToast(`Marca ${make} eliminada de la plataforma`, "info");
      } catch (err) {
        console.error(err);
        showToast(friendlyError(err, "Error al eliminar la marca"), "info");
      }
    },
    [showToast]
  );

  const clearVehicles = useCallback(async () => {
    try {
      await db.deleteAllVehicles();
      setVehicles({});
      showToast("Marcas vehiculares vaciadas", "info");
    } catch (err) {
      console.error(err);
      showToast(friendlyError(err, "Error al vaciar las marcas"), "info");
    }
  }, [showToast]);

  /* ---------------- Admin: galería ---------------- */
  /** Sube archivos, los registra en la galería y devuelve los elementos creados */
  const uploadToGallery = useCallback(
    async (files) => {
      const created = [];
      for (const file of files) {
        try {
          const { url, name, size } = await db.uploadImage(file);
          created.push(await db.addGalleryItem({ name, url, size }));
        } catch (err) {
          console.error(err);
          showToast(friendlyError(err, `Error al subir ${file.name}`), "info");
        }
      }
      if (created.length) setGallery((prev) => [...created, ...prev]);
      return created;
    },
    [showToast]
  );

  const addGalleryUrl = useCallback(
    async (url, name) => {
      try {
        const item = await db.addGalleryItem({ name, url, size: "Enlace Web" });
        setGallery((prev) => [item, ...prev]);
        return true;
      } catch (err) {
        console.error(err);
        showToast(friendlyError(err, "Error al guardar la imagen"), "info");
        return false;
      }
    },
    [showToast]
  );

  const removeGalleryItem = useCallback(
    async (item) => {
      const inUse = products.some((p) => (p.images || []).includes(item.dataUrl));
      if (inUse) {
        showToast("Esta imagen está asignada a un repuesto. Cámbiala primero.", "info");
        return;
      }
      try {
        await db.deleteGalleryItem(item);
        setGallery((prev) => prev.filter((g) => g.id !== item.id));
        showToast("Imagen eliminada de la galería", "info");
      } catch (err) {
        console.error(err);
        showToast(friendlyError(err, "Error al eliminar la imagen"), "info");
      }
    },
    [products, showToast]
  );

  const value = {
    // datos
    products,
    vehicles,
    gallery,
    loading,
    filteredProducts,
    // cliente
    filters,
    updateFilters,
    resetFilters,
    activeVehicle,
    setActiveVehicle,
    cart,
    cartCount,
    cartSubtotal,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    // ui
    productModalId,
    setProductModalId,
    cartOpen,
    setCartOpen,
    garageOpen,
    setGarageOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    adminLoginOpen,
    setAdminLoginOpen,
    adminPanelOpen,
    setAdminPanelOpen,
    productForm,
    setProductForm,
    toasts,
    showToast,
    // admin
    isAdmin,
    openAdminPortal,
    login,
    logout,
    saveProduct,
    removeProduct,
    clearProducts,
    saveMake,
    removeMake,
    clearVehicles,
    uploadToGallery,
    addGalleryUrl,
    removeGalleryItem,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}
