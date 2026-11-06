import { useEffect, useState } from "react";
import { formatRD } from "../config/store";
import { useStore } from "../context/StoreContext";
import { checkVehicleMatch } from "../utils/products";

export default function ProductModal() {
  const {
    products,
    productModalId,
    setProductModalId,
    activeVehicle,
    addToCart,
    setCartOpen,
  } = useStore();

  const prod = products.find((p) => p.id === productModalId) || null;
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState("specs");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setActiveImg(0);
    setActiveTab("specs");
    setQty(1);
  }, [productModalId]);

  if (!prod) return null;

  const images = prod.images?.length ? prod.images : [""];
  const isCompatible = activeVehicle ? checkVehicleMatch(prod, activeVehicle) : false;

  const handleClose = () => setProductModalId(null);

  const handleAdd = () => {
    addToCart(prod.id, qty);
    handleClose();
    setCartOpen(true);
  };

  return (
    <div
      className="modal-backdrop active"
      id="productModalBackdrop"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal-dialog product-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleClose}
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="modal-body">
          <div className="modal-product-layout">
            {/* Galería de Fotos Limpia */}
            <div className="modal-gallery">
              <div className="modal-main-image-box">
                <img
                  src={images[activeImg]}
                  alt={prod.name}
                  className="modal-main-image"
                />
              </div>
              <div className="modal-thumbnails-row">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`modal-thumb-btn ${idx === activeImg ? "active" : ""}`}
                    onClick={() => setActiveImg(idx)}
                  >
                    <img
                      src={img}
                      alt={`Vista ${idx + 1}`}
                      className="modal-thumb-img"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-info">
              <div className="modal-meta-badges">
                <span className={`stock-badge ${prod.inStock ? "in-stock" : "low-stock"}`}>
                  <i className={`fa-solid ${prod.inStock ? "fa-check" : "fa-ban"}`} />{" "}
                  {prod.inStock ? "En Stock (Despacho Inmediato)" : "Agotado"}
                </span>
                <span className="oem-number">OEM: {prod.oem}</span>
                <span className="sku-badge">
                  <i className="fa-solid fa-barcode" /> SKU: {prod.sku || "N/A"}
                </span>
              </div>

              <h2 className="modal-product-title">{prod.name}</h2>
              <p
                style={{
                  fontSize: "0.88rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                }}
              >
                {prod.shortDesc || prod.description || ""}
              </p>

              <div className="modal-price-box">
                <span className="modal-price-amount">{formatRD(prod.price)}</span>
                <span className="modal-price-note">ITBIS incluido • Santo Domingo</span>
              </div>

              {isCompatible && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid var(--color-success)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.84rem",
                    color: "#a7f3d0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i
                    className="fa-solid fa-circle-check"
                    style={{ color: "var(--color-success)" }}
                  />
                  <span>
                    <strong>¡Compatible!</strong> Esta pieza calza en tu{" "}
                    <strong>
                      {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
                    </strong>
                  </span>
                </div>
              )}

              <div className="modal-tabs">
                <div className="tabs-nav">
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === "specs" ? "active" : ""}`}
                    onClick={() => setActiveTab("specs")}
                  >
                    Ficha Técnica
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === "compat" ? "active" : ""}`}
                    onClick={() => setActiveTab("compat")}
                  >
                    Compatibilidad Exacta
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === "cross" ? "active" : ""}`}
                    onClick={() => setActiveTab("cross")}
                  >
                    Cross-Reference OEM
                  </button>
                </div>

                {activeTab === "specs" && (
                  <div className="tab-content-panel active">
                    <table className="technical-table">
                      <tbody>
                        <tr>
                          <td className="spec-name">Número de Parte OEM</td>
                          <td className="spec-val">
                            <strong>{prod.oem}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td className="spec-name">Código de Almacén (SKU)</td>
                          <td className="spec-val">
                            <code className="sku-number">{prod.sku || "N/A"}</code>
                          </td>
                        </tr>
                        {Object.entries(prod.specs || {})
                          .filter(
                            ([k]) =>
                              k !== "Fabricante" &&
                              k !== "Código Interno" &&
                              k !== "Código Interno / SKU" &&
                              k !== "Ubicación Almacén" &&
                              k !== "Ubicación en Almacén" &&
                              k !== "Condición" &&
                              k !== "Condicion"
                          )
                          .map(([k, v]) => (
                            <tr key={k}>
                              <td className="spec-name">{k}</td>
                              <td className="spec-val">{v}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "compat" && (
                  <div className="tab-content-panel active">
                    <div className="compat-list">
                      {(prod.compatibility || []).map((c, idx) => (
                        <div key={idx} className="compat-item">
                          <i className="fa-solid fa-check" />
                          <span>
                            <strong>
                              {c.make} {c.model}
                            </strong>{" "}
                            (
                            {c.years?.length
                              ? `${c.years[0]} - ${c.years[c.years.length - 1]}`
                              : "Varios años"}
                            ) &bull; {c.engine || "Estándar"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "cross" && (
                  <div className="tab-content-panel active">
                    <div className="cross-ref-tags">
                      {(prod.crossReferences || [prod.oem]).map((ref, idx) => (
                        <span key={idx} className="cross-badge">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions-area">
                <div className="modal-qty-cart-row">
                  <div className="qty-counter">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      <i className="fa-solid fa-minus" />
                    </button>
                    <span className="qty-number">{qty}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setQty((q) => Math.min(20, q + 1))}
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAdd}
                    style={{ flex: 1 }}
                  >
                    <i className="fa-solid fa-cart-shopping" /> Agregar al Carrito
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
