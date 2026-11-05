import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  formatRD,
  getWhatsAppUrl,
  scrollToCatalog,
  STORE_CONFIG,
} from "../config/store";
import { useStore } from "../context/StoreContext";

const HEADER_WA_MSG = "Hola Webdo, quiero hacer una consulta técnica de repuestos";

export default function Header() {
  const {
    filters,
    updateFilters,
    resetFilters,
    activeVehicle,
    setActiveVehicle,
    cartCount,
    cartSubtotal,
    setCartOpen,
    setGarageOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    openAdminPortal,
  } = useStore();

  const [bump, setBump] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCount.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      prevCount.current = cartCount;
      return () => clearTimeout(t);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  const handleSelectCategory = (slug) => {
    updateFilters({ category: slug });
    setMobileMenuOpen(false);
    scrollToCatalog();
  };

  const handleResetHome = (e) => {
    e.preventDefault();
    setActiveVehicle(null);
    resetFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const garageLabel = activeVehicle
    ? `${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.year})`
    : "Seleccionar Vehículo";

  const mobileGarageLabel = activeVehicle
    ? `${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.year})`
    : "Ninguno seleccionado";

  return (
    <>
      {/* Topbar Dominicana */}
      <div className="topbar">
        <div className="container topbar-content">
          <div className="topbar-left">
            <span className="topbar-item">
              <i className="fa-solid fa-location-dot" />
              <span className="js-address-text">{STORE_CONFIG.address}</span>
            </span>
            <span className="topbar-divider">|</span>
            <span className="topbar-item highlight">
              <i className="fa-solid fa-truck-fast" />
              <span>Envíos a todo Santo Domingo y el interior del país</span>
            </span>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="topbar-admin-btn"
              onClick={openAdminPortal}
              title="Acceso de Administrador"
            >
              <i className="fa-solid fa-lock" /> <span>Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header Principal */}
      <header className="main-header" id="mainHeader">
        <div className="container header-container">
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label="Abrir Menú"
            onClick={() => setMobileMenuOpen(true)}
          >
            <i className="fa-solid fa-bars" />
          </button>

          {/* Logo */}
          <a
            href="#hero"
            className="brand-logo"
            aria-label="Webdo Autopartes Home"
            onClick={handleResetHome}
          >
            <i className="fa-solid fa-gears logo-icon" />
            <span className="logo-text">
              Web<span className="logo-accent">do</span>
            </span>
            <span className="logo-badge">REPUESTOS RD</span>
          </a>

          {/* Buscador Global */}
          <div className="global-search-wrapper">
            <form className="search-form" onSubmit={(e) => e.preventDefault()}>
              <i className="fa-solid fa-magnifying-glass search-icon" />
              <input
                type="search"
                className="search-input"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                placeholder="Buscar por nombre, código OEM, SKU o modelo..."
                autoComplete="off"
                aria-label="Buscar repuestos"
              />
              {filters.search && (
                <button
                  type="button"
                  className="clear-search-btn"
                  title="Limpiar búsqueda"
                  onClick={() => updateFilters({ search: "" })}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </form>
          </div>

          {/* Acciones de Cabecera */}
          <div className="header-actions">
            {/* Botón Mi Garaje */}
            <button
              type="button"
              className="garage-btn"
              onClick={() => setGarageOpen(true)}
              title="Configurar y ver mi vehículo"
            >
              <i className="fa-solid fa-car-side" />
              <div className="garage-text-group">
                <span className="garage-label">Mi Garaje</span>
                <span className="garage-vehicle-name">{garageLabel}</span>
              </div>
            </button>

            {/* Botón Carrito Reactivo */}
            <button
              type="button"
              className="cart-trigger-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Abrir Carrito"
            >
              <div className="cart-icon-wrapper">
                <i className="fa-solid fa-cart-shopping" />
                <span className={`cart-badge ${bump ? "bump" : ""}`}>{cartCount}</span>
              </div>
              <div className="cart-btn-info">
                <span className="cart-label">Carrito</span>
                <span className="cart-total-preview">{formatRD(cartSubtotal)}</span>
              </div>
            </button>

            {/* Botón Directo WhatsApp Header */}
            <a
              href={getWhatsAppUrl(HEADER_WA_MSG)}
              target="_blank"
              rel="noopener noreferrer"
              className="header-whatsapp-btn"
              title="Escribir por WhatsApp"
            >
              <i className="fa-brands fa-whatsapp" />
              <span className="whatsapp-btn-text js-phone-display">{STORE_CONFIG.displayPhone}</span>
            </a>
          </div>
        </div>

        {/* Mega Menú de Categorías */}
        <nav className="categories-nav" id="categoriesNav">
          <div className="container nav-container">
            <ul className="categories-list" id="categoryMenu">
              {CATEGORIES.map((cat) => (
                <li key={cat.slug} className="nav-item">
                  <button
                    type="button"
                    className={`nav-btn ${cat.slug === "Ofertas RD$" ? "highlight-offer" : ""} ${
                      filters.category === cat.slug ? "active" : ""
                    }`}
                    onClick={() => handleSelectCategory(cat.slug)}
                  >
                    <i className={`fa-solid ${cat.icon}`} />{" "}
                    {cat.slug === "Cuerpo/Enfriamiento" ? "Cuerpo / Enfriamiento" : cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Menú */}
      <div
        className={`mobile-drawer-overlay ${mobileMenuOpen ? "active" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside className={`mobile-drawer ${mobileMenuOpen ? "active" : ""}`}>
        <div className="mobile-drawer-header">
          <div className="brand-logo">
            <i className="fa-solid fa-gears logo-icon" />
            <span className="logo-text">
              Web<span className="logo-accent">do</span>
            </span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="mobile-drawer-content">
          <div className="mobile-garage-box">
            <span className="mobile-garage-title">
              <i className="fa-solid fa-car" /> Vehículo seleccionado:
            </span>
            <span className="mobile-garage-name">{mobileGarageLabel}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={() => {
                setMobileMenuOpen(false);
                setGarageOpen(true);
              }}
            >
              Cambiar Vehículo
            </button>
          </div>

          <div className="mobile-nav-heading">Categorías de Repuestos</div>
          <ul className="mobile-nav-list">
            {CATEGORIES.map((cat) => (
              <li key={cat.slug} className="mobile-nav-item">
                <button
                  type="button"
                  className={filters.category === cat.slug ? "active" : ""}
                  onClick={() => handleSelectCategory(cat.slug)}
                >
                  <i className={`fa-solid ${cat.icon}`} /> {cat.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="mobile-contact-box">
            <p>
              <i className="fa-solid fa-location-dot" />{" "}
              <span className="js-address-text">{STORE_CONFIG.address}</span>
            </p>
            <p>
              <i className="fa-solid fa-phone" />{" "}
              <span className="js-phone-display">{STORE_CONFIG.displayPhone}</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
