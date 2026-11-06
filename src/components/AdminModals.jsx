import { useEffect, useRef, useState } from "react";
import { formatRD, PRODUCT_CATEGORIES, STORE_CONFIG } from "../config/store";
import { useStore } from "../context/StoreContext";
import { isSupabaseEnabled } from "../lib/supabaseClient";
import { formatCompatibility, parseCompatibility } from "../utils/products";

/** Limpia el nombre de archivo de una imagen para usarlo como nombre del repuesto */
function formatImageNameAsProductTitle(rawName = "") {
  if (!rawName) return "";
  const withoutExt = rawName
    .replace(/\.(jpe?g|png|webp|gif|avif|svg|bmp)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!withoutExt) return "";
  return withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1);
}

/* ==========================================================================
   1. MODAL DE LOGIN DE ADMINISTRADOR
   ========================================================================== */
function AdminLoginModal() {
  const { adminLoginOpen, closeAdminLogin, login } = useStore();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!adminLoginOpen) return null;

  const handleClose = () => {
    setLoginError(false);
    closeAdminLogin();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { ok } = await login(user.trim(), pass.trim());
    setSubmitting(false);
    if (ok) {
      setUser("");
      setPass("");
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  return (
    <div
      className="modal-backdrop active"
      id="adminLoginModalBackdrop"
    >
      <div className="modal-dialog admin-login-dialog" role="dialog" aria-modal="true">
        <button type="button" className="modal-close-btn" onClick={handleClose}>
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="admin-login-content">
          <div className="modal-icon-header">
            <i className="fa-solid fa-user-shield" />
            <h3>Acceso Administrativo</h3>
            <p>Introduce tus credenciales para gestionar el catálogo y productos de Webdo.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="adminUsername">
                <i className="fa-solid fa-user" /> Usuario
              </label>
              <input
                type="text"
                id="adminUsername"
                className="form-control"
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setLoginError(false);
                }}
                placeholder="Usuario administrador..."
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminPassword">
                <i className="fa-solid fa-key" /> Contraseña
              </label>
              <input
                type="password"
                id="adminPassword"
                className="form-control"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setLoginError(false);
                }}
                placeholder="Contraseña..."
                required
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <span
                className="field-error-text"
                style={{ display: "flex", marginBottom: "12px", marginTop: "6px" }}
              >
                Usuario o contraseña incorrectos
              </span>
            )}

            <button
              type="submit"
              className="btn btn-primary w-100"
              style={{ marginTop: "10px" }}
              disabled={submitting}
            >
              <i className="fa-solid fa-right-to-bracket" />{" "}
              {submitting ? "Verificando..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. PANEL DE CONTROL DE ADMINISTRADOR (3 PESTAÑAS)
   ========================================================================== */
function AdminPanelModal({ onSelectGalleryImageForProduct }) {
  const {
    products,
    vehicles,
    gallery,
    adminPanelOpen,
    closeAdminPanel,
    setProductForm,
    logout,
    removeProduct,
    clearProducts,
    saveMake,
    removeMake,
    clearVehicles,
    uploadToGallery,
    addGalleryUrl,
    removeGalleryItem,
    showToast,
  } = useStore();

  const [tab, setTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  // Formulario nueva marca y modelos
  const [newMake, setNewMake] = useState("");
  const [newModels, setNewModels] = useState("");
  const [inlineModelByMake, setInlineModelByMake] = useState({});

  // Formulario galería por URL
  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const galleryFileRef = useRef(null);

  if (!adminPanelOpen) return null;

  const handleClose = () => closeAdminPanel();

  /* --- Métricas del Inventario --- */
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.inStock).length;
  const uniqueCats = new Set(products.map((p) => p.category)).size;
  const totalVal = products.reduce((acc, p) => acc + p.price, 0);

  /* --- Filtrado de tabla de productos --- */
  const q = search.toLowerCase().trim();
  let list = [...products];
  if (catFilter !== "all") {
    if (catFilter === "Ofertas RD$") {
      list = list.filter((p) => p.isOffer || (p.oldPrice && p.oldPrice > p.price));
    } else if (catFilter === "Cuerpo" || catFilter === "Enfriamiento") {
      list = list.filter(
        (p) => p.category === catFilter || p.category === "Cuerpo/Enfriamiento"
      );
    } else {
      list = list.filter((p) => p.category === catFilter);
    }
  }
  if (q) {
    list = list.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.oem && p.oem.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }

  /* --- Acciones de Vehículos --- */
  const handleAddVehicle = async () => {
    const cleanMake = newMake.trim();
    const rawModels = newModels
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    if (!cleanMake || rawModels.length === 0) {
      showToast("Ingresa la marca y al menos un modelo", "info");
      return;
    }

    const existingKey = Object.keys(vehicles).find(
      (k) => k.toLowerCase() === cleanMake.toLowerCase()
    );
    const actualKey = existingKey || cleanMake;
    const currentModels = existingKey ? vehicles[existingKey].models : [];
    const merged = Array.from(new Set([...currentModels, ...rawModels]));

    const ok = await saveMake(actualKey, merged);
    if (ok) {
      setNewMake("");
      setNewModels("");
      showToast(`¡Vehículo registrado! Marca: ${actualKey}`, "success");
    }
  };

  const handleAddModelToMake = async (make) => {
    const modelName = (inlineModelByMake[make] || "").trim();
    if (!modelName) {
      showToast("Ingresa el nombre del modelo", "info");
      return;
    }
    const current = vehicles[make]?.models || [];
    if (current.includes(modelName)) {
      showToast(`El modelo ya está registrado en ${make}`, "info");
      return;
    }
    const ok = await saveMake(make, [...current, modelName]);
    if (ok) {
      setInlineModelByMake((prev) => ({ ...prev, [make]: "" }));
      showToast(`Modelo '${modelName}' agregado a ${make}`, "success");
    }
  };

  const handleDeleteModel = async (make, model) => {
    const current = vehicles[make]?.models || [];
    const updated = current.filter((m) => m !== model);
    const ok = await saveMake(make, updated);
    if (ok) showToast(`Modelo '${model}' eliminado de ${make}`, "info");
  };

  /* --- Acciones de Galería --- */
  const handleGalleryFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    showToast(`Cargando ${files.length} archivo(s)...`, "info");
    const created = await uploadToGallery(files);
    if (created.length) {
      showToast(`¡${created.length} imagen(es) agregada(s) a la galería!`, "success");
    }
    e.target.value = "";
  };

  const handleGalleryAddUrl = async () => {
    const url = urlInput.trim();
    if (!url) {
      showToast("Ingresa la URL de la imagen", "info");
      return;
    }
    const name = urlName.trim() || `repuesto_${Date.now().toString().slice(-4)}.jpg`;
    const ok = await addGalleryUrl(url, name);
    if (ok) {
      setUrlInput("");
      setUrlName("");
      showToast("Imagen agregada a la galería", "success");
    }
  };

  const makes = Object.keys(vehicles);

  return (
    <div
      className="modal-backdrop active"
      id="adminPanelModalBackdrop"
    >
      <div className="modal-dialog admin-panel-dialog" role="dialog" aria-modal="true">
        <button type="button" className="modal-close-btn" onClick={handleClose}>
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="admin-panel-header">
          <div className="admin-header-title">
            <i className="fa-solid fa-sliders" />
            <div>
              <h3>Panel de Control Webdo</h3>
              <span className="admin-user-badge">
                <i className="fa-solid fa-circle-check" /> Sesión activa: Administrador{" "}
                {isSupabaseEnabled ? "• Supabase Cloud" : ""}
              </span>
            </div>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setProductForm({ productId: null, initialImage: "" })}
            >
              <i className="fa-solid fa-circle-plus" /> Nuevo Repuesto
            </button>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              title="Vaciar catálogo para iniciar demo desde 0"
              onClick={() => {
                if (
                  window.confirm("¿Deseas vaciar el catálogo completo para iniciar la demo desde 0?")
                ) {
                  clearProducts();
                }
              }}
            >
              <i className="fa-solid fa-trash-can" /> Vaciar Catálogo
            </button>
            <button type="button" className="btn btn-sm btn-text-danger" onClick={logout}>
              <i className="fa-solid fa-power-off" /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Barra de Pestañas de Navegación del Panel */}
        <div className="admin-tabs-nav">
          <button
            type="button"
            className={`admin-tab-btn ${tab === "inventory" ? "active" : ""}`}
            onClick={() => setTab("inventory")}
          >
            <i className="fa-solid fa-boxes-stacked" /> Repuestos (Inventario)
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "vehicles" ? "active" : ""}`}
            onClick={() => setTab("vehicles")}
          >
            <i className="fa-solid fa-car-side" /> Gestión de Vehículos
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === "gallery" ? "active" : ""}`}
            onClick={() => setTab("gallery")}
          >
            <i className="fa-solid fa-images" /> Galería de Medios
          </button>
        </div>

        {/* PESTAÑA 1: INVENTARIO DE REPUESTOS */}
        {tab === "inventory" && (
          <div className="admin-tab-pane active">
            <div className="admin-metrics-row">
              <div className="admin-metric-card">
                <span className="metric-label">Total Repuestos</span>
                <strong className="metric-val">{totalProducts}</strong>
              </div>
              <div className="admin-metric-card">
                <span className="metric-label">En Stock</span>
                <strong className="metric-val text-success">{inStockCount}</strong>
              </div>
              <div className="admin-metric-card">
                <span className="metric-label">Categorías Activas</span>
                <strong className="metric-val">{uniqueCats}</strong>
              </div>
              <div className="admin-metric-card">
                <span className="metric-label">Valor del Inventario</span>
                <strong className="metric-val text-accent">{formatRD(totalVal)}</strong>
              </div>
            </div>

            <div className="admin-table-toolbar">
              <input
                type="text"
                className="form-control-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nombre, OEM o código SKU..."
              />
              <select
                className="form-control-sm custom-select-sm"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="all">Todas las categorías</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-table-container">
              <table className="admin-products-table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Pieza / OEM</th>
                    <th>Código / SKU</th>
                    <th>Categoría</th>
                    <th>Precio (RD$)</th>
                    <th>Estado</th>
                    <th style={{ textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: "center",
                          padding: "45px 20px",
                          color: "var(--text-muted)",
                        }}
                      >
                        <i
                          className="fa-solid fa-boxes-stacked"
                          style={{
                            fontSize: "2.4rem",
                            color: "var(--accent-color)",
                            marginBottom: "12px",
                            display: "block",
                          }}
                        />
                        <h4 style={{ color: "#ffffff", marginBottom: "6px" }}>
                          Inventario Listo para Demostración
                        </h4>
                        <p style={{ fontSize: "0.9rem", marginBottom: "16px" }}>
                          Actualmente no hay repuestos registrados en el sistema.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setProductForm({ productId: null, initialImage: "" })}
                        >
                          <i className="fa-solid fa-plus" /> Agregar Primer Repuesto
                        </button>
                      </td>
                    </tr>
                  ) : list.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: "center",
                          padding: "30px",
                          color: "var(--text-muted)",
                        }}
                      >
                        No se encontraron repuestos con los criterios de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    list.map((prod) => (
                      <tr key={prod.id}>
                        <td>
                          <img
                            src={prod.images?.[0] || ""}
                            alt={prod.name}
                            className="admin-table-img"
                          />
                        </td>
                        <td>
                          <div className="admin-prod-cell">
                            <strong className="admin-prod-name" title={prod.name}>
                              {prod.name}
                            </strong>
                            <span className="admin-prod-oem">OEM: {prod.oem}</span>
                          </div>
                        </td>
                        <td>
                          <span className="sku-badge">
                            <i className="fa-solid fa-barcode" /> {prod.sku || "N/A"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {prod.category}
                          </span>
                        </td>
                        <td>
                          <strong>{formatRD(prod.price)}</strong>
                        </td>
                        <td>
                          <span
                            className={`stock-badge ${prod.inStock ? "in-stock" : "low-stock"}`}
                          >
                            {prod.inStock ? "En Stock" : "Agotado"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions-cell">
                            <button
                              type="button"
                              className="btn-admin-action edit"
                              title="Editar producto e imagen"
                              onClick={() =>
                                setProductForm({ productId: prod.id, initialImage: "" })
                              }
                            >
                              <i className="fa-solid fa-pen-to-square" />
                            </button>
                            <button
                              type="button"
                              className="btn-admin-action delete"
                              title="Eliminar producto"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `¿Estás seguro de que deseas eliminar el repuesto "${prod.name}" (OEM: ${prod.oem})? Esta acción se guardará de inmediato.`
                                  )
                                ) {
                                  removeProduct(prod.id);
                                }
                              }}
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: GESTIÓN DE VEHÍCULOS Y MARCAS */}
        {tab === "vehicles" && (
          <div className="admin-tab-pane active">
            <div className="admin-section-intro">
              <div>
                <h4 className="section-title">
                  <i className="fa-solid fa-car-side" /> Catálogo de Marcas y Modelos
                </h4>
                <p className="section-desc">
                  Cualquier marca o modelo que agregues aquí se sincroniza automáticamente con el
                  buscador del Hero, el selector de Mi Garaje y las opciones de compatibilidad de
                  los repuestos.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                title="Vaciar marcas para iniciar demo desde 0"
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Deseas vaciar todas las marcas de vehículos para iniciar la demo desde 0?"
                    )
                  ) {
                    clearVehicles();
                  }
                }}
              >
                <i className="fa-solid fa-trash-can" /> Vaciar Marcas
              </button>
            </div>

            <div className="admin-vehicle-card-form">
              <div className="form-title-row">
                <i className="fa-solid fa-circle-plus" />
                <h5>Añadir Marca y Modelos</h5>
              </div>
              <div className="admin-vehicle-form-inputs">
                <div className="form-group">
                  <label htmlFor="adminNewMakeInput">
                    Marca del Vehículo <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="adminNewMakeInput"
                    className="form-control"
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    placeholder="Ej: Chevrolet, Ford, Mazda, Kia..."
                  />
                </div>
                <div className="form-group flex-2">
                  <label htmlFor="adminNewModelsInput">
                    Modelo(s) a Registrar <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="adminNewModelsInput"
                    className="form-control"
                    value={newModels}
                    onChange={(e) => setNewModels(e.target.value)}
                    placeholder="Ej: Tahoe, Silverado, Cruze (separados por coma)"
                  />
                </div>
                <div className="form-group flex-btn">
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    onClick={handleAddVehicle}
                  >
                    <i className="fa-solid fa-plus" /> Guardar Vehículo
                  </button>
                </div>
              </div>
              <small className="form-hint">
                <i className="fa-solid fa-circle-info" /> Puedes agregar una nueva marca o escribir
                el nombre de una marca existente para añadirle más modelos.
              </small>
            </div>

            <div className="admin-vehicles-grid">
              {makes.length === 0 ? (
                <div className="empty-state-box" style={{ gridColumn: "1/-1" }}>
                  <h3>No hay marcas configuradas</h3>
                  <p>Usa el formulario superior para añadir marcas y modelos.</p>
                </div>
              ) : (
                makes.map((make) => {
                  const models = vehicles[make]?.models || [];
                  return (
                    <div key={make} className="vehicle-make-card">
                      <div className="vehicle-make-header">
                        <div className="vehicle-make-name">
                          <i className="fa-solid fa-car" />
                          <span>{make}</span>
                          <span className="vehicle-count-badge">{models.length} modelos</span>
                        </div>
                        <button
                          type="button"
                          className="btn-delete-brand"
                          title="Eliminar marca completa"
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Estás seguro de que deseas eliminar la marca ${make} y todos sus modelos?`
                              )
                            ) {
                              removeMake(make);
                            }
                          }}
                        >
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </div>

                      <div className="vehicle-models-list">
                        {models.map((mod) => (
                          <span key={mod} className="model-chip">
                            {mod}
                            <button
                              type="button"
                              className="model-chip-del"
                              title="Eliminar modelo"
                              onClick={() => handleDeleteModel(make, mod)}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="add-model-mini-form">
                        <input
                          type="text"
                          className="form-control-sm"
                          placeholder="Añadir modelo..."
                          value={inlineModelByMake[make] || ""}
                          onChange={(e) =>
                            setInlineModelByMake((prev) => ({
                              ...prev,
                              [make]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddModelToMake(make);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddModelToMake(make)}
                        >
                          <i className="fa-solid fa-plus" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: GALERÍA DE MEDIOS */}
        {tab === "gallery" && (
          <div className="admin-tab-pane active">
            <div className="admin-section-intro">
              <div>
                <h4 className="section-title">
                  <i className="fa-solid fa-images" /> Galería de Medios y Repuestos
                </h4>
                <p className="section-desc">
                  Sube fotos de repuestos desde tu PC o ingresa enlaces para guardarlas en el
                  sistema. Puedes descargarlas directamente a tu dispositivo o usarlas en cualquier
                  repuesto.
                </p>
              </div>
              <div className="gallery-header-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => galleryFileRef.current?.click()}
                >
                  <i className="fa-solid fa-cloud-arrow-up" /> Subir Fotos desde mi PC
                </button>
                <input
                  ref={galleryFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleGalleryFileUpload}
                />
              </div>
            </div>

            <div className="gallery-upload-card">
              <div className="gallery-url-upload-form">
                <input
                  type="url"
                  className="form-control-sm"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="O pega el enlace web de una imagen (https://...)"
                />
                <input
                  type="text"
                  className="form-control-sm"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                  placeholder="Nombre descriptivo (Ej: Bomba Toyota)"
                />
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={handleGalleryAddUrl}
                >
                  <i className="fa-solid fa-plus" /> Guardar en Galería
                </button>
              </div>
            </div>

            <div className="admin-gallery-grid">
              {gallery.length === 0 ? (
                <div className="empty-state-box" style={{ gridColumn: "1/-1" }}>
                  <h3>No hay imágenes en la galería</h3>
                  <p>Sube imágenes desde tu PC o pega URLs para guardarlas en el sistema.</p>
                </div>
              ) : (
                gallery.map((img) => (
                  <div key={img.id} className="gallery-card">
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="gallery-card-thumb"
                      loading="lazy"
                    />
                    <div className="gallery-card-info">
                      <div className="gallery-card-name" title={img.name}>
                        {img.name}
                      </div>
                      <div className="gallery-card-meta">
                        {img.date || "Reciente"} &bull; {img.size || ""}
                      </div>
                    </div>
                    <div className="gallery-card-actions">
                      <button
                        type="button"
                        className="btn-use-img"
                        title="Usar esta imagen en el repuesto"
                        onClick={() => onSelectGalleryImageForProduct(img)}
                      >
                        <i className="fa-solid fa-check" /> Usar
                      </button>
                      <a
                        href={img.dataUrl}
                        download={img.name || "repuesto-webdo.jpg"}
                        className="btn-download-img"
                        title="Descargar imagen a mi dispositivo"
                      >
                        <i className="fa-solid fa-download" /> Descargar
                      </a>
                      <button
                        type="button"
                        className="btn-delete-img"
                        title="Eliminar de galería"
                        onClick={() => {
                          if (window.confirm("¿Deseas eliminar esta imagen de la galería?")) {
                            removeGalleryItem(img);
                          }
                        }}
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   3. MODAL CREAR / EDITAR REPUESTO
   ========================================================================== */
function AdminProductFormModal({ externalImage, clearExternalImage }) {
  const {
    products,
    vehicles,
    gallery,
    productForm,
    setProductForm,
    saveProduct,
    uploadToGallery,
    showToast,
  } = useStore();

  const editingProd =
    productForm?.productId ? products.find((p) => p.id === productForm.productId) : null;

  const [name, setName] = useState("");
  const [oem, setOem] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Motor");
  const [inStock, setInStock] = useState("true");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [compat, setCompat] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [imageTab, setImageTab] = useState("upload"); // "upload" | "gallery" | "url"
  const [customUrl, setCustomUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  // Asistente de compatibilidad
  const [pickerMake, setPickerMake] = useState("");
  const [pickerModel, setPickerModel] = useState("");
  const [pickerYears, setPickerYears] = useState("2010-2024");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!productForm) return;
    setImageTab("upload");
    setUploadedFileName("");
    setUploadingImg(false);
    setPickerMake("");
    setPickerModel("");
    setPickerYears("2010-2024");

    if (editingProd) {
      const existingImg = editingProd.images?.[0] || "";
      setName(editingProd.name || "");
      setOem(editingProd.oem || "");
      setSku(
        editingProd.sku || `WBD-${Math.floor(1000 + Math.random() * 9000)}`
      );
      setCategory(editingProd.category || "Motor");
      setInStock(editingProd.inStock ? "true" : "false");
      setPrice(String(editingProd.price ?? ""));
      setOldPrice(editingProd.oldPrice ? String(editingProd.oldPrice) : "");
      setCompat(formatCompatibility(editingProd.compatibility || []));
      setDesc(editingProd.shortDesc || editingProd.description || "");
      setImage(existingImg);
      setCustomUrl(existingImg.startsWith("http") ? existingImg : "");
    } else {
      const initImg = productForm.initialImage || "";
      const initName = productForm.initialName || "";
      const initFile = productForm.initialFileName || "";
      setName(initName);
      setOem("");
      setSku(`WBD-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory("Motor");
      setInStock("true");
      setPrice("");
      setOldPrice("");
      setCompat("");
      setDesc("");
      setImage(initImg);
      setUploadedFileName(initFile);
      setCustomUrl(initImg.startsWith("http") ? initImg : "");
    }
  }, [productForm, editingProd]);

  useEffect(() => {
    if (externalImage) {
      const imgUrl = typeof externalImage === "string" ? externalImage : externalImage.dataUrl || "";
      const rawImgName = typeof externalImage === "object" ? externalImage.name || "" : "";
      const cleanTitle = formatImageNameAsProductTitle(rawImgName);
      setImage(imgUrl);
      setUploadedFileName(rawImgName || "Seleccionada de la galería");
      if (cleanTitle) {
        setName(cleanTitle);
      }
      clearExternalImage();
    }
  }, [externalImage, clearExternalImage]);

  if (!productForm) return null;

  const makes = Object.keys(vehicles);
  const pickerModels = pickerMake && vehicles[pickerMake] ? vehicles[pickerMake].models : [];

  const handleClose = () => setProductForm(null);

  const handleAddCompatVehicle = () => {
    if (!pickerMake || !pickerModel) {
      showToast("Por favor selecciona una marca y un modelo", "info");
      return;
    }
    const years = pickerYears.trim() || "2010-2024";
    const snippet = `${pickerMake} ${pickerModel} ${years}`;
    setCompat((prev) => (prev.trim() ? `${prev.trim()}, ${snippet}` : snippet));
    showToast(`Añadido: ${pickerMake} ${pickerModel}`, "success");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    showToast("Subiendo y optimizando imagen...", "info");
    try {
      const created = await uploadToGallery([file]);
      if (created[0]) {
        setImage(created[0].dataUrl);
        setUploadedFileName(file.name);
        const cleanTitle = formatImageNameAsProductTitle(created[0].name || file.name);
        if (cleanTitle && !name.trim()) {
          setName(cleanTitle);
        }
        showToast("¡Imagen cargada y lista!", "success");
      }
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image.trim()) {
      showToast("Selecciona o sube una imagen para el repuesto", "info");
      return;
    }

    const numPrice = Number(price);
    const numOldPrice = oldPrice ? Number(oldPrice) : null;
    const cleanOem = oem.trim().toUpperCase();
    const cleanSku = sku.trim().toUpperCase();
    const parsedCompat = parseCompatibility(compat, makes);

    const payload = {
      id: editingProd ? editingProd.id : `PROD-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      sku: cleanSku,
      location: "",
      oem: cleanOem,
      category,
      price: numPrice,
      oldPrice: numOldPrice,
      inStock: inStock === "true",
      isOffer: Boolean(numOldPrice && numOldPrice > numPrice) || category === "Ofertas RD$",
      isBestseller: editingProd ? editingProd.isBestseller : false,
      images: [image.trim()],
      description: desc.trim(),
      shortDesc: desc.trim(),
      specs: editingProd
        ? {
            ...editingProd.specs,
            "Código Interno / SKU": cleanSku,
          }
        : {
            "Código Interno / SKU": cleanSku,
          },
      crossReferences: editingProd ? editingProd.crossReferences : [cleanOem],
      compatibility: parsedCompat,
    };

    const ok = await saveProduct(payload);
    if (ok) {
      showToast(
        editingProd ? "Repuesto actualizado con éxito" : "¡Nuevo repuesto publicado!",
        "success"
      );
      handleClose();
    }
  };

  return (
    <div
      className="modal-backdrop active"
      id="adminProductFormModalBackdrop"
    >
      <div className="modal-dialog admin-form-dialog" role="dialog" aria-modal="true">
        <button type="button" className="modal-close-btn" onClick={handleClose}>
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="modal-icon-header">
          <i className="fa-solid fa-wrench" />
          <h3>
            {editingProd
              ? `Modificar Repuesto: ${editingProd.name.substring(0, 32)}...`
              : "Agregar Nuevo Repuesto"}
          </h3>
          <p>
            Configura o modifica todos los detalles técnicos, precio, compatibilidad vehicular e
            imagen del repuesto.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            {/* Columna Izquierda: Datos del Repuesto */}
            <div className="admin-form-col">
              <div className="form-group">
                <label htmlFor="adminProdName">
                  Nombre de la Pieza <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="adminProdName"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Bomba de Agua con Empaque..."
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="adminProdOem">
                    Número de Parte OEM <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="adminProdOem"
                    className="form-control uppercase"
                    value={oem}
                    onChange={(e) => setOem(e.target.value)}
                    placeholder="Ej: 16100-39466"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="adminProdSku">
                    Código Interno / SKU <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="adminProdSku"
                    className="form-control uppercase"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ej: WBD-MOT-01"
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="adminProdCategory">
                    Categoría <span className="required-star">*</span>
                  </label>
                  <select
                    id="adminProdCategory"
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="adminProdStock">
                    Disponibilidad <span className="required-star">*</span>
                  </label>
                  <select
                    id="adminProdStock"
                    className="form-control"
                    value={inStock}
                    onChange={(e) => setInStock(e.target.value)}
                  >
                    <option value="true">En Stock</option>
                    <option value="false">Agotado</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="adminProdPrice">
                    Precio en Pesos (RD$) <span className="required-star">*</span>
                  </label>
                  <input
                    type="number"
                    id="adminProdPrice"
                    className="form-control"
                    min="1"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ej: 3850"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="adminProdOldPrice">Precio Anterior / Oferta (RD$)</label>
                  <input
                    type="number"
                    id="adminProdOldPrice"
                    className="form-control"
                    min="0"
                    step="any"
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    placeholder="Opcional (para tachar)"
                  />
                </div>
              </div>

              {/* Asistente de Compatibilidad Vehicular Adaptable */}
              <div className="form-group compat-helper-box">
                <label className="compat-helper-label">
                  <span>
                    <i className="fa-solid fa-car-side" /> Vehículos Compatibles
                  </span>
                  <small className="text-muted">(Se adapta a las marcas creadas)</small>
                </label>

                <div className="compat-quick-picker-row">
                  <select
                    className="form-control-sm"
                    value={pickerMake}
                    onChange={(e) => {
                      setPickerMake(e.target.value);
                      setPickerModel("");
                    }}
                  >
                    <option value="">
                      {makes.length === 0
                        ? "(Sin marcas registradas - Añadir en Admin)"
                        : "Selecciona Marca..."}
                    </option>
                    {makes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-control-sm"
                    value={pickerModel}
                    onChange={(e) => setPickerModel(e.target.value)}
                    disabled={!pickerMake}
                  >
                    <option value="">Selecciona Modelo...</option>
                    {pickerModels.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    className="form-control-sm"
                    placeholder="Años (ej: 2012-2020)"
                    value={pickerYears}
                    onChange={(e) => setPickerYears(e.target.value)}
                  />

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={handleAddCompatVehicle}
                    title="Añadir vehículo a la lista"
                  >
                    <i className="fa-solid fa-plus" /> Añadir
                  </button>
                </div>

                <input
                  type="text"
                  className="form-control mt-2"
                  value={compat}
                  onChange={(e) => setCompat(e.target.value)}
                  placeholder="Ej: Toyota Corolla 2009-2019, Honda Civic 2012-2016..."
                />
                <small className="form-hint">
                  Puedes usar los selectores de arriba para añadir marcas registradas o escribir
                  directamente separado por comas.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="adminProdDesc">Descripción y Especificaciones Técnicas</label>
                <textarea
                  id="adminProdDesc"
                  className="form-control"
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Detalles de instalación, especificaciones, material..."
                />
              </div>
            </div>

            {/* Columna Derecha: Sistema de Imagen y Vista Previa */}
            <div className="admin-form-col">
              <div className="form-group">
                <label className="d-flex justify-content-between align-items-center">
                  <span>
                    Imagen Principal del Repuesto <span className="required-star">*</span>
                  </span>
                  {image && (
                    <span className="image-ready-badge">
                      <i className="fa-solid fa-circle-check" /> Imagen lista
                    </span>
                  )}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />

                {/* Vista Previa Interactiva Arriba */}
                <div className="image-preview-wrapper">
                  <div
                    className={`image-preview-box ${image ? "has-image" : "empty-clickable"}`}
                    onClick={() => !image && fileInputRef.current?.click()}
                  >
                    {!image ? (
                      <div className="preview-placeholder">
                        <div className="preview-icon-circle">
                          <i className="fa-solid fa-cloud-arrow-up" />
                        </div>
                        <strong>Sin imagen seleccionada</strong>
                        <span>
                          Haz clic aquí para subir una foto desde tu dispositivo o elige una opción
                          debajo
                        </span>
                      </div>
                    ) : (
                      <>
                        <img src={image} alt="Vista Previa" />
                        <div className="preview-overlay-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <i className="fa-solid fa-camera-rotate" /> Cambiar Foto
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-light"
                            onClick={() => {
                              setImage("");
                              setCustomUrl("");
                              setUploadedFileName("");
                            }}
                          >
                            <i className="fa-solid fa-trash-can" /> Quitar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pestañas Limpias de Origen de Imagen */}
                <div className="image-source-tabs">
                  <button
                    type="button"
                    className={`image-source-tab ${imageTab === "upload" ? "active" : ""}`}
                    onClick={() => setImageTab("upload")}
                  >
                    <i className="fa-solid fa-upload" /> Subir Archivo
                  </button>
                  <button
                    type="button"
                    className={`image-source-tab ${imageTab === "gallery" ? "active" : ""}`}
                    onClick={() => setImageTab("gallery")}
                  >
                    <i className="fa-solid fa-images" /> Galería ({gallery.length})
                  </button>
                  <button
                    type="button"
                    className={`image-source-tab ${imageTab === "url" ? "active" : ""}`}
                    onClick={() => setImageTab("url")}
                  >
                    <i className="fa-solid fa-link" /> Enlace Web
                  </button>
                </div>

                {/* Panel 1: Subir desde PC / Celular */}
                {imageTab === "upload" && (
                  <div className="image-input-methods">
                    <button
                      type="button"
                      className="btn btn-outline-primary w-100"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImg}
                    >
                      <i className="fa-solid fa-cloud-arrow-up" />{" "}
                      {uploadingImg
                        ? "Subiendo imagen..."
                        : "Seleccionar Foto desde PC / Celular"}
                    </button>
                    {uploadedFileName && (
                      <div className="uploaded-file-pill">
                        <i className="fa-solid fa-file-image" />
                        <span>{uploadedFileName}</span>
                      </div>
                    )}
                    <small className="form-hint" style={{ textAlign: "center", display: "block" }}>
                      Formatos aceptados: JPG, PNG, WEBP. La foto se guarda automáticamente en tu
                      galería.
                    </small>
                  </div>
                )}

                {/* Panel 2: Elegir de la Galería Guardada */}
                {imageTab === "gallery" && (
                  <div className="admin-mini-gallery-picker">
                    <div className="mini-gallery-title">
                      Haz clic en una foto para asignarla al repuesto:
                    </div>
                    <div className="mini-gallery-grid">
                      {gallery.length === 0 ? (
                        <div className="mini-gallery-empty">
                          <i className="fa-regular fa-images" />
                          <span>No hay imágenes guardadas en la galería todavía.</span>
                        </div>
                      ) : (
                        gallery.map((img) => {
                          const isSelected = image === img.dataUrl;
                          return (
                            <button
                              type="button"
                              key={img.id}
                              className={`mini-gallery-item ${isSelected ? "selected" : ""}`}
                              title={img.name}
                              onClick={() => {
                                setImage(img.dataUrl);
                                setUploadedFileName(img.name || "Imagen de galería");
                                const cleanTitle = formatImageNameAsProductTitle(img.name);
                                if (cleanTitle) {
                                  setName(cleanTitle);
                                }
                                showToast(
                                  cleanTitle
                                    ? `Imagen y nombre "${cleanTitle}" aplicados`
                                    : "Imagen seleccionada de la galería",
                                  "success"
                                );
                              }}
                            >
                              <img
                                src={img.dataUrl}
                                alt={img.name}
                                className="mini-gallery-thumb"
                              />
                              {isSelected && (
                                <span className="mini-gallery-check">
                                  <i className="fa-solid fa-check" />
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Panel 3: Pegar Enlace Web (URL) */}
                {imageTab === "url" && (
                  <div className="image-input-methods">
                    <label
                      htmlFor="adminProdImgUrl"
                      style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
                    >
                      Pega la dirección web (URL) de la imagen:
                    </label>
                    <input
                      type="text"
                      id="adminProdImgUrl"
                      className="form-control"
                      value={customUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomUrl(val);
                        setImage(val.trim());
                        setUploadedFileName("");
                      }}
                      placeholder="https://ejemplo.com/foto-repuesto.jpg"
                    />
                    <small className="form-hint" style={{ textAlign: "center", display: "block" }}>
                      La vista previa superior mostrará la imagen automáticamente al pegar el enlace.
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary w-100">
              <i className="fa-solid fa-floppy-disk" /> Guardar Repuesto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   EXPORTACIÓN UNIFICADA DE LOS MODALES DE ADMINISTRACIÓN
   ========================================================================== */
export default function AdminModals() {
  const { productForm, setProductForm, showToast } = useStore();
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  const handleUseGalleryImage = (imgObjOrUrl) => {
    const dataUrl = typeof imgObjOrUrl === "string" ? imgObjOrUrl : imgObjOrUrl?.dataUrl || "";
    const rawName = typeof imgObjOrUrl === "object" ? imgObjOrUrl?.name || "" : "";
    const cleanTitle = formatImageNameAsProductTitle(rawName);

    if (productForm) {
      setSelectedGalleryImage({ dataUrl, name: rawName });
      showToast(
        cleanTitle ? `Imagen y nombre "${cleanTitle}" asignados` : "Imagen asignada al repuesto",
        "success"
      );
    } else {
      setProductForm({
        productId: null,
        initialImage: dataUrl,
        initialName: cleanTitle,
        initialFileName: rawName,
      });
      showToast(
        cleanTitle ? `Imagen y nombre "${cleanTitle}" asignados` : "Imagen asignada al repuesto",
        "success"
      );
    }
  };

  return (
    <>
      <AdminLoginModal />
      <AdminPanelModal onSelectGalleryImageForProduct={handleUseGalleryImage} />
      <AdminProductFormModal
        externalImage={selectedGalleryImage}
        clearExternalImage={() => setSelectedGalleryImage(null)}
      />
    </>
  );
}
