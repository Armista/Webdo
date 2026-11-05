/**
 * ============================================================================
 * CAPA DE DATOS
 * Usa Supabase cuando VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY están definidos.
 * Si no, funciona en "modo demo local" con localStorage (mismo comportamiento
 * que la versión HTML original). Todas las funciones son asíncronas para que
 * los componentes no dependan del backend usado.
 * ============================================================================
 */
import { supabase, isSupabaseEnabled } from "../lib/supabaseClient";
import { processImageFile, dataUrlToBlob } from "../lib/imageUtils";
import { STORE_CONFIG } from "../config/store";

export const backendMode = isSupabaseEnabled ? "supabase" : "local";

const LS_KEYS = {
  products: "webdo_products_db",
  vehicles: "webdo_vehicles_db",
  gallery: "webdo_media_gallery",
  session: "webdo_admin_logged",
};
const BUCKET = "product-images";

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const shortDate = (d) =>
  new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short" });

/* ----------------------------------------------------------------------------
   PRODUCTOS
   ---------------------------------------------------------------------------- */
const productFromRow = (r) => ({
  id: r.id,
  name: r.name,
  sku: r.sku,
  oem: r.oem,
  location: r.location || "",
  category: r.category,
  price: Number(r.price),
  oldPrice: r.old_price != null ? Number(r.old_price) : null,
  inStock: r.in_stock,
  isBestseller: r.is_bestseller,
  isOffer: r.is_offer,
  images: r.images || [],
  compatibility: r.compatibility || [],
  crossReferences: r.cross_references || [],
  specs: r.specs || {},
  description: r.short_desc || r.description || "",
  shortDesc: r.short_desc || r.description || "",
});

const productToRow = (p) => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  oem: p.oem,
  location: p.location || null,
  category: p.category,
  price: p.price,
  old_price: p.oldPrice ?? null,
  in_stock: p.inStock,
  is_bestseller: Boolean(p.isBestseller),
  is_offer: Boolean(p.isOffer),
  images: p.images || [],
  compatibility: p.compatibility || [],
  cross_references: p.crossReferences || [],
  specs: p.specs || {},
  short_desc: p.description || p.shortDesc || "",
});

export async function listProducts() {
  if (!isSupabaseEnabled) return readLS(LS_KEYS.products, []);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(productFromRow);
}

export async function upsertProduct(product) {
  if (!isSupabaseEnabled) {
    const list = readLS(LS_KEYS.products, []);
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx >= 0) list[idx] = product;
    else list.unshift(product);
    writeLS(LS_KEYS.products, list);
    return product;
  }
  const { data, error } = await supabase
    .from("products")
    .upsert(productToRow(product))
    .select()
    .single();
  if (error) throw error;
  return productFromRow(data);
}

export async function deleteProduct(id) {
  if (!isSupabaseEnabled) {
    writeLS(LS_KEYS.products, readLS(LS_KEYS.products, []).filter((p) => p.id !== id));
    return;
  }
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllProducts() {
  if (!isSupabaseEnabled) {
    writeLS(LS_KEYS.products, []);
    return;
  }
  const { error } = await supabase.from("products").delete().neq("id", "");
  if (error) throw error;
}

/* ----------------------------------------------------------------------------
   MARCAS Y MODELOS DE VEHÍCULOS  →  { "Toyota": { models: ["Corolla", ...] } }
   ---------------------------------------------------------------------------- */
export async function listVehicles() {
  if (!isSupabaseEnabled) return readLS(LS_KEYS.vehicles, {});
  const { data, error } = await supabase
    .from("vehicle_catalog")
    .select("make, models")
    .order("make", { ascending: true });
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.make, { models: r.models || [] }]));
}

export async function upsertVehicleMake(make, models) {
  if (!isSupabaseEnabled) {
    const all = readLS(LS_KEYS.vehicles, {});
    all[make] = { models };
    writeLS(LS_KEYS.vehicles, all);
    return;
  }
  const { error } = await supabase
    .from("vehicle_catalog")
    .upsert({ make, models }, { onConflict: "make" });
  if (error) throw error;
}

export async function deleteVehicleMake(make) {
  if (!isSupabaseEnabled) {
    const all = readLS(LS_KEYS.vehicles, {});
    delete all[make];
    writeLS(LS_KEYS.vehicles, all);
    return;
  }
  const { error } = await supabase.from("vehicle_catalog").delete().eq("make", make);
  if (error) throw error;
}

export async function deleteAllVehicles() {
  if (!isSupabaseEnabled) {
    writeLS(LS_KEYS.vehicles, {});
    return;
  }
  const { error } = await supabase.from("vehicle_catalog").delete().neq("make", "");
  if (error) throw error;
}

/* ----------------------------------------------------------------------------
   GALERÍA E IMÁGENES
   ---------------------------------------------------------------------------- */
const galleryFromRow = (r) => ({
  id: r.id,
  name: r.name,
  dataUrl: r.data_url,
  size: r.size || "",
  date: shortDate(r.created_at),
});

export async function listGallery() {
  if (!isSupabaseEnabled) return readLS(LS_KEYS.gallery, []);
  const { data, error } = await supabase
    .from("media_gallery")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(galleryFromRow);
}

/**
 * Comprime una imagen y la sube.
 * - Supabase: se guarda en el bucket "product-images" y devuelve su URL pública.
 * - Local: devuelve la imagen como dataURL (base64).
 */
export async function uploadImage(file) {
  const processed = await processImageFile(file);
  if (!isSupabaseEnabled) {
    return { url: processed.dataUrl, name: processed.name, size: processed.size };
  }
  const blob = dataUrlToBlob(processed.dataUrl);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, name: processed.name, size: Math.round(blob.size / 1024) + " KB" };
}

export async function addGalleryItem({ name, url, size }) {
  if (!isSupabaseEnabled) {
    const item = {
      id: "gal_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      name,
      dataUrl: url,
      size,
      date: shortDate(Date.now()),
    };
    writeLS(LS_KEYS.gallery, [item, ...readLS(LS_KEYS.gallery, [])]);
    return item;
  }
  const { data, error } = await supabase
    .from("media_gallery")
    .insert({ name, data_url: url, size })
    .select()
    .single();
  if (error) throw error;
  return galleryFromRow(data);
}

export async function deleteGalleryItem(item) {
  if (!isSupabaseEnabled) {
    writeLS(LS_KEYS.gallery, readLS(LS_KEYS.gallery, []).filter((g) => g.id !== item.id));
    return;
  }
  const { error } = await supabase.from("media_gallery").delete().eq("id", item.id);
  if (error) throw error;

  // Si la imagen vive en nuestro bucket, también borramos el archivo.
  // (No se borra si algún repuesto todavía la usa; se valida en el contexto.)
  const marker = `/object/public/${BUCKET}/`;
  const pos = item.dataUrl?.indexOf(marker) ?? -1;
  if (pos >= 0) {
    const path = decodeURIComponent(item.dataUrl.slice(pos + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  }
}

/* ----------------------------------------------------------------------------
   AUTENTICACIÓN DE ADMINISTRADOR
   ---------------------------------------------------------------------------- */
export async function signIn(user, pass) {
  // 1. Acceso rápido de administrador (admin / webdo2026)
  if (user === STORE_CONFIG.demoAdminUser && pass === STORE_CONFIG.demoAdminPass) {
    sessionStorage.setItem(LS_KEYS.session, "true");
    return { ok: true, error: null };
  }
  // 2. Si Supabase está habilitado y el usuario ingresa un correo de Supabase Auth
  if (isSupabaseEnabled) {
    const { error } = await supabase.auth.signInWithPassword({ email: user, password: pass });
    if (!error) return { ok: true, error: null };
  }
  return { ok: false, error: "Usuario o contraseña incorrectos" };
}

export async function signOut() {
  sessionStorage.removeItem(LS_KEYS.session);
  if (isSupabaseEnabled) {
    await supabase.auth.signOut();
  }
}

export async function hasSession() {
  if (sessionStorage.getItem(LS_KEYS.session) === "true") return true;
  if (!isSupabaseEnabled) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export function onAuthChange(callback) {
  if (!isSupabaseEnabled) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const localLogged = sessionStorage.getItem(LS_KEYS.session) === "true";
    callback(Boolean(session) || localLogged);
  });
  return () => data.subscription.unsubscribe();
}
