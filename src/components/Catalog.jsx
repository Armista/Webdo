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
    openAdminPortal,
  } = useStore();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const getCategoryCount = (slug) => {
    if (slug === "all") return products.length;
    if (slug === "Ofertas RD$") {
      return products.filter((p) => p.isOffer || (p.oldPrice && p.oldPrice > p.price)).length;
    }
    return products.filter((p) => p.category === slug).length;
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
        {/* Sidebar de Filtros */}
        <aside
          className={`catalog-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}
          id="catalogSidebar"
        >
          <div className="sidebar-sticky-inner">
            <div className="sidebar-header">
              <h2 className="sidebar-title">
                <i className="fa-solid fa-sliders" /> Filtros Técnicos
              </h2>
              <button type="button" className="btn-text-link" onClick={handleResetAll}>
                Restablecer
              </button>
            </div>

            {/* Filtro por Categoría */}
            <div className="filter-group">
              <h3 className="filter-group-title">Categoría</h3>
              <div className="filter-options-list">
                {CATEGORIES.map((cat) => (
                  <label key={cat.slug} className="custom-checkbox-label">
                    <input
                      type="radio"
                      name="sidebarCatRadio"
                      checked={filters.category === cat.slug}
                      onChange={() => updateFilters({ category: cat.slug })}
                    />
                    <span className="custom-checkbox" style={{ borderRadius: "50%" }} />
                    <span className="checkbox-text">{cat.name}</span>
                    <span className="filter-count-badge">{getCategoryCount(cat.slug)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Rango de Precio */}
            <div className="filter-group">
              <div className="filter-group-header-flex">
                <h3 className="filter-group-title">Rango de Precio</h3>
                <span className="price-slider-label">
                  Hasta RD$ {filters.maxPrice.toLocaleString()}
                </span>
              </div>
              <div className="price-slider-container">
                <input
                  type="range"
                  min="500"
                  max={MAX_PRICE}
                  step="250"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilters({ maxPrice: Number(e.target.value) })}
                  className="price-slider"
                />
                <div className="price-slider-limits">
                  <span>RD$ 500</span>
                  <span>RD$ 25,000</span>
                </div>
              </div>
            </div>

            {/* Disponibilidad */}
            <div className="filter-group">
              <h3 className="filter-group-title">Disponibilidad</h3>
              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.stockOnly}
                  onChange={(e) => updateFilters({ stockOnly: e.target.checked })}
                />
                <span className="custom-checkbox" />
                <span className="checkbox-text">Solo en Stock</span>
              </label>
            </div>
          </div>
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
                <i className="fa-solid fa-filter" /> Filtros
              </button>
              <span className="results-counter">
                Mostrando <strong>{filteredProducts.length}</strong> de{" "}
                <strong>{products.length}</strong> repuestos
              </span>
            </div>
            <div className="toolbar-right">
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
            <div className="products-grid">
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
                        <i className="fa-solid fa-car" />
                        <span>
                          Compatibilidad: <strong>{compText || "Universal"}</strong>
                        </span>
                      </div>

                      <div className="product-card-footer">
                        <div className="price-container">
                          <div>
                            <span className="price-currency">RD$</span>
                            <span className="price-value">
                              {formatRD(prod.price).replace("RD$", "").trim()}
                            </span>
                          </div>
                          {prod.oldPrice && (
                            <small
                              style={{
                                textDecoration: "line-through",
                                color: "var(--text-light-muted)",
                                fontSize: "0.75rem",
                              }}
                            >
                              RD$ {prod.oldPrice.toLocaleString()}
                            </small>
                          )}
                        </div>

                        <div className="card-action-buttons">
                          <button
                            type="button"
                            className="btn btn-detail"
                            onClick={() => setProductModalId(prod.id)}
                            title="Ver detalles técnicos del repuesto"
                          >
                            <i className="fa-regular fa-eye" /> Detalle
                          </button>
                          <button
                            type="button"
                            className="btn btn-cotizar"
                            onClick={() => openWhatsApp(buildQuoteMessage(prod, activeVehicle))}
                            title="Cotizar por WhatsApp con Código de Almacén"
                          >
                            <i className="fa-brands fa-whatsapp" /> Cotizar
                          </button>
                          <button
                            type="button"
                            className="btn-quick-add"
                            onClick={() => addToCart(prod.id, 1)}
                            title="Agregar al carrito"
                          >
                            <i className="fa-solid fa-cart-plus" />
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
                  <h3>Catálogo Listo para Demostración</h3>
                  <p>
                    Actualmente no hay repuestos registrados en el sistema. Puedes agregar
                    productos en tiempo real desde el <strong>Panel de Administrador</strong>.
                  </p>
                  <div className="empty-state-actions">
                    <button type="button" className="btn btn-primary" onClick={openAdminPortal}>
                      <i className="fa-solid fa-user-shield" /> Abrir Panel de Administrador
                    </button>
                  </div>
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
