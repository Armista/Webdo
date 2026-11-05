/* ============================================================================
   CONFIGURACIÓN CENTRAL DE CONTACTO Y WHATSAPP
   >>> SOLO CAMBIA TU NÚMERO AQUÍ UNA VEZ Y SE ACTUALIZA EN TODA LA PÁGINA <<<
   ============================================================================ */
export const STORE_CONFIG = {
  // 1. Número de WhatsApp para recibir pedidos y consultas
  // (Formato internacional: código país + número, sin signos, sin espacios ni guiones)
  whatsappPhone: "18294291017",

  // 2. Número visible con formato para el público en Santo Domingo
  displayPhone: "(829)-429-1017",

  // 3. Dirección y datos de la tienda física
  address: "Av. 27 de Febrero #245, casi esq. Abraham Lincoln, Piantini, Santo Domingo, D.N.",
  shortAddress: "Av. 27 de Febrero #245, Piantini",
  storeName: "Webdo Autopartes RD",

  // 4. Credenciales SOLO para el modo demo local (cuando Supabase no está configurado).
  //    Con Supabase activo, el login usa usuarios reales de Supabase Auth.
  demoAdminUser: "admin",
  demoAdminPass: "webdo2026",
};

export const CATEGORIES = [
  { name: "Todas las Piezas", slug: "all", icon: "fa-border-all" },
  { name: "Motor", slug: "Motor", icon: "fa-engine" },
  { name: "Frenos", slug: "Frenos", icon: "fa-compact-disc" },
  { name: "Suspensión", slug: "Suspensión", icon: "fa-arrows-up-down" },
  { name: "Electricidad", slug: "Electricidad", icon: "fa-bolt" },
  { name: "Transmisión", slug: "Transmisión", icon: "fa-gear" },
  { name: "Cuerpo/Enfriamiento", slug: "Cuerpo/Enfriamiento", icon: "fa-snowflake" },
  { name: "Accesorios", slug: "Accesorios", icon: "fa-sliders" },
  { name: "Ofertas RD$", slug: "Ofertas RD$", icon: "fa-tag" },
];

// Categorías asignables a un producto (sin "Todas")
export const PRODUCT_CATEGORIES = CATEGORIES.filter((c) => c.slug !== "all").map((c) => c.slug);

export const MAX_PRICE = 25000;

const currentYear = new Date().getFullYear();
export const YEARS = Array.from({ length: currentYear + 2 - 2000 }, (_, i) => String(currentYear + 1 - i));

/** Genera cualquier enlace de WhatsApp utilizando el número centralizado */
export function getWhatsAppUrl(message = "") {
  const textParam = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${STORE_CONFIG.whatsappPhone}${textParam}`;
}

/** Abre WhatsApp directamente en una nueva pestaña */
export function openWhatsApp(message = "") {
  window.open(getWhatsAppUrl(message), "_blank", "noopener");
}

/** Formatea moneda en Pesos Dominicanos (RD$) */
export function formatRD(amount) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number(amount) || 0)
    .replace("DOP", "RD$");
}

export function scrollToCatalog() {
  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
}
