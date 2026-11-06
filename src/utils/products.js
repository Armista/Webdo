import { formatRD, STORE_CONFIG } from "../config/store";

/* ==========================================================================
   COMPATIBILIDAD Y FILTROS
   ========================================================================== */
export function checkVehicleMatch(product, vehicle) {
  if (!vehicle || !vehicle.make) return true;
  return (product.compatibility || []).some((c) => {
    const makeMatch = c.make.toLowerCase() === vehicle.make.toLowerCase();
    const modelMatch = vehicle.model ? c.model.toLowerCase() === vehicle.model.toLowerCase() : true;
    const yearMatch = vehicle.year ? (c.years || []).includes(parseInt(vehicle.year, 10)) : true;
    return makeMatch && modelMatch && yearMatch;
  });
}

export function filterProducts(products, filters, activeVehicle) {
  const { category, search, maxPrice, stockOnly, sortBy } = filters;
  let list = [...products];

  if (category !== "all") {
    list =
      category === "Ofertas RD$"
        ? list.filter((p) => p.isOffer || (p.oldPrice && p.oldPrice > p.price))
        : list.filter(
            (p) =>
              p.category === category ||
              (p.category === "Cuerpo/Enfriamiento" &&
                (category === "Cuerpo" || category === "Enfriamiento"))
          );
  }

  const q = search.toLowerCase().trim();
  if (q) {
    list = list.filter((p) =>
      [p.name, p.oem, p.sku, p.location].some((v) => v && v.toLowerCase().includes(q)) ||
      (p.crossReferences || []).some((c) => c.toLowerCase().includes(q)) ||
      (p.compatibility || []).some(
        (c) => c.make.toLowerCase().includes(q) || c.model.toLowerCase().includes(q)
      )
    );
  }

  list = list.filter((p) => p.price <= maxPrice);
  if (stockOnly) list = list.filter((p) => p.inStock);
  if (activeVehicle) list = list.filter((p) => checkVehicleMatch(p, activeVehicle));

  switch (sortBy) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "bestseller":
      list.sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0));
      break;
    default:
      list.sort((a, b) => (b.isOffer ? 1 : 0) - (a.isOffer ? 1 : 0));
  }
  return list;
}

/* ==========================================================================
   COMPATIBILIDAD VEHICULAR: TEXTO <-> ESTRUCTURA
   "Toyota Corolla 2009-2019, Land Rover Defender 2020"
   ========================================================================== */
const DEFAULT_YEARS = Array.from({ length: 20 }, (_, i) => 2005 + i);

export function parseCompatibility(text, knownMakes = []) {
  const entries = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return [{ make: "Universal", model: "Multimodelo", years: DEFAULT_YEARS, engine: "Estándar" }];
  }

  // Ordenamos las marcas conocidas de más larga a más corta para soportar marcas con espacios
  const makesByLength = [...knownMakes].sort((a, b) => b.length - a.length);

  return entries.map((entry) => {
    let rest = entry;
    let make = makesByLength.find((m) => entry.toLowerCase().startsWith(m.toLowerCase() + " "));
    if (make) {
      rest = entry.slice(make.length).trim();
    } else {
      const parts = entry.split(/\s+/);
      make = parts.shift() || "Universal";
      rest = parts.join(" ");
    }

    let years = DEFAULT_YEARS;
    const range = rest.match(/(\d{4})\s*-\s*(\d{4})$/);
    const single = rest.match(/(?:^|\s)(\d{4})$/);
    if (range) {
      const [y1, y2] = [Number(range[1]), Number(range[2])];
      years = [];
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) years.push(y);
      rest = rest.slice(0, range.index).trim();
    } else if (single) {
      years = [Number(single[1])];
      rest = rest.slice(0, single.index).trim();
    }

    return { make, model: rest || "General", years, engine: "Gasolina / Diesel" };
  });
}

export function formatCompatibility(compatibility = []) {
  return compatibility
    .map((c) => {
      const ys = c.years || [];
      if (ys.length === 0) return `${c.make} ${c.model}`;
      const min = Math.min(...ys);
      const max = Math.max(...ys);
      return `${c.make} ${c.model} ${min === max ? min : `${min}-${max}`}`;
    })
    .join(", ");
}

/* ==========================================================================
   MENSAJES DE WHATSAPP (incluyen el Código Interno / SKU)
   ========================================================================== */
export function buildQuoteMessage(prod, vehicle) {
  const skuCode = prod.sku || (prod.oem ? `OEM-${prod.oem}` : "REP-WEBDO");
  const vehDesc = vehicle
    ? `\n*Vehículo:* ${vehicle.make} ${vehicle.model} (${vehicle.year})`
    : "";
  return (
    `*COTIZACIÓN DE REPUESTO - WEBDO RD* \u{1F697}\u{1F527}\n` +
    `------------------------------------\n` +
    `*Pieza:* ${prod.name}\n` +
    `*Código Interno / SKU:* ${skuCode}\n` +
    `*OEM:* ${prod.oem}\n` +
    `*Precio:* ${formatRD(prod.price)}` +
    vehDesc +
    `\n------------------------------------\n` +
    `Hola Webdo Autopartes, me interesa este repuesto con código *${skuCode}*. ¿Tienen disponibilidad en almacén para entrega o retiro?`
  );
}

export function buildOrderMessage({ name, deliveryOption, location, vehicle, cart }) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let msg = `*NUEVO PEDIDO DE AUTOPARTES - WEBDO RD* \u{1F697}\u{1F527}\n`;
  msg += `------------------------------------\n`;
  msg += `*Cliente:* ${name}\n`;
  if (deliveryOption === "delivery") {
    msg += `*Método de Entrega:* Envío a Domicilio / Taller\n`;
    msg += `*Ubicación / Sector:* ${location}\n`;
  } else {
    msg += `*Método de Entrega:* Retiro en tienda física (${STORE_CONFIG.shortAddress})\n`;
  }
  if (vehicle) {
    msg += `*Vehículo:* ${vehicle.make} ${vehicle.model} (${vehicle.year})\n`;
  }
  msg += `------------------------------------\n`;
  msg += `*LISTA DE REPUESTOS:*\n`;
  cart.forEach((item, idx) => {
    msg += `${idx + 1}. [${item.quantity}x] *${item.name}*\n   • Código / SKU: *${item.sku || "N/A"}* | OEM: ${item.oem} | ${formatRD(item.price * item.quantity)}\n`;
  });
  msg += `------------------------------------\n`;
  msg += `*TOTAL A PAGAR:* ${formatRD(subtotal)}\n`;
  msg +=
    deliveryOption === "delivery"
      ? `*Modalidad:* Envío a domicilio / Taller\n`
      : `*Modalidad:* Retiro en sucursal Santo Domingo\n`;
  msg += `Por favor confirmarme la disponibilidad para procesar la orden.`;
  return msg;
}
