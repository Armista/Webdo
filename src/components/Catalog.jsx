import { useState } from "react";
import { CATEGORIES, formatRD, MAX_PRICE, openWhatsApp } from "../config/store";
import { useStore } from "../context/StoreContext";
import { buildQuoteMessage, checkVehicleMatch } from "../utils/products";

export default function Catalog() {
  const {
    products,
    filteredProducts,
    filters,
    updateFilters,
    resetFilters,
    activeVehicle,
    setActiveVehicle,
    addToCart,
    setProductModalId,
    isAdmin,
    openAdminPortal,
  } = useStore();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const getTypeDisplayLabel = (slug) => {
    if (slug === "all") return "TODAS";
    if (slug === "Cuerpo/Enfriamiento") return "ENFRIAMIENTO";
    if (slug === "Ofertas RD$") return "OFERTAS";
    return slug.toUpperCase();
  };

  const handleResetAll = () => {
    setActiveVehicle(null);
    resetFilters();
  };

  /* Chips de filtros activos */
  const chips = [];
  if (filters.category !== "all") {
    chips.push({
      key: "cat",
      label: `Categoría: ${filters.category}`,
      onRemove: () => updateFilters({ category: "all" }),
    });
  }
  if (filters.search.trim() !== "") {
    chips.push({
      key: "q",
      label: `Búsqueda: "${filters.search}"`,
      onRemove: () => updateFilters({ search: "" }),
    });
  }
  if (filters.maxPrice < MAX_PRICE) {
    chips.push({
      key: "price",
      label: `Hasta RD$ ${filters.maxPrice.toLocaleString()}`,
      onRemove: () => updateFilters({ maxPrice: MAX_PRICE }),
    });
  }
  if (filters.stockOnly) {
    chips.push({
      key: "stock",
      label: "Solo en Stock",
      onRemove: () => updateFilters({ stockOnly: false }),
    });
  }

  return (
    <main className="catalog-section" id="catalogo">
      <div className="container catalog-layout">
        {/* Overlay para cerrar filtros en móvil / iPad */}
        <div
          className={`sidebar-mobile-overlay ${mobileSidebarOpen ? "active" : ""}`}
          onClick={() => setMobileSidebarOpen(false)}
        />

        {/* Sidebar de Filtros Integrado al Estilo de la Página */}
        <aside
          className={`catalog-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}
          id="catalogSidebar"
        >
          <div className="sidebar-filter-header">
            <span className="sidebar-filter-title">
              <i className="fa-solid fa-filter" /> Filtros
            </span>
            {filters.category !== "all" && (
              <button
                type="button"
                className="sidebar-reset-link"
                onClick={() => updateFilters({ category: "all" })}
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              className="sidebar-close-mobile"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Cerrar filtros"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {/* Lista Vertical Alineada a la Izquierda con Efecto Growing Fade-In Naranja */}
          <nav className="sidebar-types-menu" aria-label="Filtros por tipo de repuesto">
            {CATEGORIES.map((cat) => {
              const isActive = filters.category === cat.slug;
              return (
                <button
                  type="button"
                  key={cat.slug}
                  className={`sidebar-type-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    updateFilters({ category: cat.slug });
                    setMobileSidebarOpen(false);
                  }}
                >
                  <span className="sidebar-type-text">{getTypeDisplayLabel(cat.slug)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Grid Principal de Catálogo */}
        <section className="catalog-main">
          <div className="catalog-toolbar">
            <div className="toolbar-left">
              <button
                type="button"
                className="mobile-filter-btn"
                onClick={() => setMobileSidebarOpen((v) => !v)}
              >
                <i className="fa-solid fa-filter" /> Categorías
              </button>
              <span className="results-counter">
                Mostrando <strong>{filteredProducts.length}</strong> de{" "}
                <strong>{products.length}</strong> repuestos
              </span>
            </div>
            <div className="toolbar-right">
              <button
                type="button"
                className={`toolbar-stock-pill ${filters.stockOnly ? "active" : ""}`}
                onClick={() => updateFilters({ stockOnly: !filters.stockOnly })}
              >
                <i
                  className={`fa-solid ${
                    filters.stockOnly ? "fa-circle-check" : "fa-boxes-stacked"
                  }`}
                />
                <span>Solo en Stock</span>
              </button>
              <label htmlFor="sortSelect" className="sort-label">
                <i className="fa-solid fa-arrow-down-short-wide" /> Ordenar:
              </label>
              <select
                id="sortSelect"
                className="sort-select"
                value={filters.sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value })}
              >
                <option value="relevance">Relevancia</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="bestseller">Más Vendidos</option>
              </select>
            </div>
          </div>

          {/* Chips de filtros activos */}
          <div className="active-filter-chips">
            {chips.map((chip) => (
              <span key={chip.key} className="filter-chip">
                {chip.label}{" "}
                <button type="button" onClick={chip.onRemove}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </span>
            ))}
          </div>

          {/* Grid de Tarjetas */}
          {filteredProducts.length > 0 ? (
            <div className="products-grid" key={filters.category}>
              {filteredProducts.map((prod) => {
                const isCompatible = activeVehicle
                  ? checkVehicleMatch(prod, activeVehicle)
                  : false;
                const compText = (prod.compatibility || [])
                  .map((c) => `${c.make} ${c.model}`)
                  .slice(0, 2)
                  .join(", ");

                return (
                  <article key={prod.id} className="product-card" data-id={prod.id}>
                    <div
                      className="card-media-wrapper"
                      onClick={() => setProductModalId(prod.id)}
                    >
                      <img
                        src={prod.images?.[0] || ""}
                        alt={prod.name}
                        className="product-card-img"
                        loading="lazy"
                      />
                      {!prod.inStock && (
                        <div className="card-top-badges">
                          <span className="stock-badge low-stock">
                            <i className="fa-solid fa-ban" /> Agotado
                          </span>
                        </div>
                      )}
                      {isCompatible && (
                        <div className="compatible-tag">
                          <i className="fa-solid fa-circle-check" /> Calza en tu{" "}
                          {activeVehicle.make} {activeVehicle.model}
                        </div>
                      )}
                    </div>

                    <div className="product-card-body">
                      <div className="oem-code-wrapper">
                        <span className="oem-label">OEM:</span>
                        <span className="oem-number">{prod.oem}</span>
                      </div>

                      <h3
                        className="product-title"
                        title={prod.name}
                        onClick={() => setProductModalId(prod.id)}
                      >
                        {prod.name}
                      </h3>

                      <div className="product-compatibility-snippet">
                        <span className="compat-pill-text">
                          <i className="fa-solid fa-car" /> Compatibilidad:{" "}
                          <strong>{compText || "Universal"}</strong>
                        </span>
                      </div>

                      <div className="product-card-footer">
                        <div className="price-container">
                          {prod.oldPrice && prod.oldPrice > prod.price && (
                            <span className="old-price-strike">
                              RD$ {prod.oldPrice.toLocaleString()}
                            </span>
                          )}
                          <div className="main-price-line">
                            <span className="price-currency">RD$</span>
                            <span className="price-value">
                              {formatRD(prod.price).replace("RD$", "").trim()}
                            </span>
                          </div>
                        </div>

                        <div className="card-action-buttons">
                          <button
                            type="button"
                            className="btn btn-detail"
                            onClick={() => setProductModalId(prod.id)}
                            title="Ver detalles técnicos del repuesto"
                          >
                            <i className="fa-regular fa-eye" />
                            <span>Detalle</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-cotizar"
                            onClick={() => openWhatsApp(buildQuoteMessage(prod, activeVehicle))}
                            title="Cotizar por WhatsApp con Código de Almacén"
                          >
                            <i className="fa-brands fa-whatsapp" />
                            <span>Cotizar</span>
                          </button>
                          <button
                            type="button"
                            className="btn-quick-add"
                            onClick={() => addToCart(prod.id, 1)}
                            title="Agregar al carrito"
                          >
                            <i className="fa-solid fa-cart-shopping" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Estado Vacío */
            <div className="empty-state-box">
              {products.length === 0 ? (
                <>
                  <div className="empty-icon">
                    <i className="fa-solid fa-box-open" />
                  </div>
                  <h3>Catálogo en Actualización</h3>
                  <p>
                    Actualmente estamos actualizando el inventario de repuestos. Si buscas una pieza
                    específica, escríbenos directamente por WhatsApp para cotización inmediata.
                  </p>
                  {isAdmin && (
                    <div className="empty-state-actions">
                      <button type="button" className="btn btn-primary" onClick={openAdminPortal}>
                        <i className="fa-solid fa-sliders" /> Abrir Panel de Administrador
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="empty-icon">
                    <i className="fa-solid fa-screwdriver-wrench" />
                  </div>
                  <h3>No encontramos repuestos con los criterios seleccionados</h3>
                  <p>Prueba ajustando los filtros de búsqueda o categoría.</p>
                  <div className="empty-state-actions">
                    <button type="button" className="btn btn-primary" onClick={handleResetAll}>
                      Ver Todos los Repuestos
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
