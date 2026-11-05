import { useState } from "react";
import { formatRD, openWhatsApp } from "../config/store";
import { useStore } from "../context/StoreContext";
import { buildOrderMessage } from "../utils/products";

export default function CartDrawer() {
  const {
    cart,
    cartSubtotal,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartOpen,
    setCartOpen,
    activeVehicle,
    showToast,
  } = useStore();

  const [name, setName] = useState("");
  const [deliveryOption, setDeliveryOption] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState({ name: false, delivery: false, location: false });

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast("Tu carrito está vacío. Agrega repuestos primero.", "info");
      return;
    }

    const cleanName = name.trim();
    const cleanLocation = location.trim();

    const nextErrors = {
      name: !cleanName,
      delivery: !deliveryOption,
      location: deliveryOption === "delivery" && !cleanLocation,
    };
    setErrors(nextErrors);

    if (nextErrors.name) {
      showToast("Por favor ingresa tu nombre completo", "info");
      return;
    }
    if (nextErrors.delivery) {
      showToast("Selecciona si deseas Envío a domicilio o Retiro en tienda", "info");
      return;
    }
    if (nextErrors.location) {
      showToast("Ingresa tu dirección o sector para el envío", "info");
      return;
    }

    const message = buildOrderMessage({
      name: cleanName,
      deliveryOption,
      location: cleanLocation,
      vehicle: activeVehicle,
      cart,
    });
    openWhatsApp(message);
  };

  return (
    <>
      <div
        className={`cart-overlay ${cartOpen ? "active" : ""}`}
        id="cartOverlay"
        onClick={() => setCartOpen(false)}
      />

      <aside
        className={`cart-drawer ${cartOpen ? "active" : ""}`}
        id="cartDrawer"
        aria-label="Carrito de compras"
      >
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <i className="fa-solid fa-cart-shopping" />
            <h3>Tu Carrito de Repuestos</h3>
          </div>
          <button
            type="button"
            className="cart-close-btn"
            onClick={() => setCartOpen(false)}
            aria-label="Cerrar Carrito"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div className="empty-cart-state">
              <i className="fa-solid fa-cart-arrow-down" />
              <h4 style={{ color: "#ffffff" }}>Tu carrito está vacío</h4>
              <p style={{ fontSize: "0.85rem" }}>
                Selecciona repuestos para tu vehículo en el catálogo.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-img" />
                <div className="cart-item-details">
                  <span className="cart-item-title">{item.name}</span>
                  <span className="cart-item-oem">OEM: {item.oem}</span>
                  <span className="cart-item-price">{formatRD(item.price)}</span>
                </div>
                <div className="cart-item-actions">
                  <button
                    type="button"
                    className="cart-item-delete"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <i className="fa-regular fa-trash-can" />
                  </button>
                  <div className="cart-item-qty-selector">
                    <button
                      type="button"
                      className="cart-qty-btn"
                      onClick={() => updateCartQty(item.id, -1)}
                    >
                      <i className="fa-solid fa-minus" />
                    </button>
                    <span className="cart-qty-val">{item.quantity}</span>
                    <button
                      type="button"
                      className="cart-qty-btn"
                      onClick={() => updateCartQty(item.id, 1)}
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-drawer-footer">
          <div className="cart-summary-box">
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{formatRD(cartSubtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Envío estimado (Santo Domingo)</span>
              <span className="free-shipping-tag">RD$ 0.00 (Gratis)</span>
            </div>
            <div className="summary-line total-line">
              <span>Total a Pagar</span>
              <span className="total-amount">{formatRD(cartSubtotal)}</span>
            </div>
          </div>

          {/* Formulario Obligatorio de Pedido */}
          <div className="cart-checkout-form">
            <div className="cart-field-group">
              <label htmlFor="orderCustomerName" className="cart-field-label">
                <i className="fa-solid fa-user" /> Tu Nombre Completo{" "}
                <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="orderCustomerName"
                className={`form-control-sm ${errors.name ? "input-error" : ""}`}
                placeholder="Ej: Carlos Santana"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: false }));
                }}
              />
              {errors.name && (
                <span className="field-error-text">Ingresa tu nombre para continuar</span>
              )}
            </div>

            <div className="cart-field-group">
              <label htmlFor="orderDeliveryOption" className="cart-field-label">
                <i className="fa-solid fa-truck" /> Método de Entrega{" "}
                <span className="required-star">*</span>
              </label>
              <select
                id="orderDeliveryOption"
                className={`form-control-sm custom-select-sm ${
                  errors.delivery ? "input-error" : ""
                }`}
                value={deliveryOption}
                onChange={(e) => {
                  setDeliveryOption(e.target.value);
                  setErrors((p) => ({ ...p, delivery: false, location: false }));
                }}
              >
                <option value="">Selecciona cómo recibir tu pedido...</option>
                <option value="delivery">
                  Envío a domicilio / Taller (Gran Santo Domingo o Interior)
                </option>
                <option value="pickup">Retiro en tienda física (Piantini, Santo Domingo)</option>
              </select>
              {errors.delivery && (
                <span className="field-error-text">Elige si deseas envío o retiro</span>
              )}
            </div>

            {deliveryOption === "delivery" && (
              <div className="cart-field-group">
                <label htmlFor="orderCustomerLocation" className="cart-field-label">
                  <i className="fa-solid fa-location-dot" /> Dirección o Sector de Entrega{" "}
                  <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="orderCustomerLocation"
                  className={`form-control-sm ${errors.location ? "input-error" : ""}`}
                  placeholder="Sector, calle, # casa o taller (ej: Piantini, C. Fantino Falco #12)..."
                  autoComplete="street-address"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (errors.location) setErrors((p) => ({ ...p, location: false }));
                  }}
                />
                {errors.location && (
                  <span className="field-error-text">
                    Ingresa tu dirección o sector para el envío
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-whatsapp w-100 btn-checkout"
            onClick={handleCheckout}
          >
            <i className="fa-brands fa-whatsapp" /> Finalizar Pedido por WhatsApp
          </button>

          <div className="cart-guarantee-note">
            <i className="fa-solid fa-lock" /> Compra 100% segura. Despacho coordinado con asesor
            técnico.
          </div>

          <button type="button" className="btn-text-danger" onClick={clearCart}>
            <i className="fa-solid fa-trash-can" /> Vaciar Carrito
          </button>
        </div>
      </aside>
    </>
  );
}
