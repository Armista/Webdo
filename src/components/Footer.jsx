import { getWhatsAppUrl, scrollToCatalog, STORE_CONFIG } from "../config/store";
import { useStore } from "../context/StoreContext";

const FLOAT_WA_MSG = "Hola Webdo Autopartes, quiero cotizar un repuesto en Santo Domingo";

const FOOTER_CATEGORIES = [
  { label: "Sistemas de Motor", slug: "Motor" },
  { label: "Pastillas y Discos de Freno", slug: "Frenos" },
  { label: "Amortiguadores y Tren Delantero", slug: "Suspensión" },
  { label: "Alternadores y Bobinas", slug: "Electricidad" },
  { label: "Kits de Embrague / Clutch", slug: "Transmisión" },
  { label: "Radiadores y Enfriamiento", slug: "Cuerpo/Enfriamiento" },
];

export default function Footer() {
  const { updateFilters, openAdminPortal, toasts } = useStore();

  const handleCatClick = (e, slug) => {
    e.preventDefault();
    updateFilters({ category: slug });
    scrollToCatalog();
  };

  return (
    <>
      {/* Toast Notificaciones */}
      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={
              t.leaving
                ? { opacity: 0, transform: "translateX(40px)", transition: "0.3s ease" }
                : undefined
            }
          >
            <i
              className={`fa-solid ${
                t.type === "success" ? "fa-circle-check" : "fa-circle-info"
              }`}
            />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Botón Flotante de WhatsApp */}
      <a
        href={getWhatsAppUrl(FLOAT_WA_MSG)}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp-btn"
        aria-label="Contacto por WhatsApp"
        title="Habla con un asesor técnico por WhatsApp"
      >
        <i className="fa-brands fa-whatsapp" />
        <span className="floating-tooltip">¿Preguntas sobre una pieza? ¡Escríbenos!</span>
      </a>

      {/* Footer */}
      <footer className="main-footer" id="contacto">
        <div className="container footer-grid">
          <div className="footer-col brand-col">
            <a href="#hero" className="brand-logo footer-logo">
              <i className="fa-solid fa-gears logo-icon" />
              <span className="logo-text">
                Web<span className="logo-accent">do</span>
              </span>
            </a>
            <p className="footer-about-text">
              Webdo Autopartes es la plataforma líder en venta de piezas y repuestos automotrices
              OEM y Aftermarket de alta gama en Santo Domingo, República Dominicana.
            </p>
            <div className="company-badge-rd">
              <i className="fa-solid fa-building-shield" />
              <span>RNC Registrado: 131-98745-2 • Santo Domingo, D.N.</span>
            </div>
            <div className="footer-socials">
              <a href="#" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
                <i className="fa-brands fa-facebook-f" />
              </a>
              <a href="#" aria-label="Instagram" onClick={(e) => e.preventDefault()}>
                <i className="fa-brands fa-instagram" />
              </a>
              <a href="#" aria-label="YouTube" onClick={(e) => e.preventDefault()}>
                <i className="fa-brands fa-youtube" />
              </a>
              <a
                href={getWhatsAppUrl("Hola Webdo Autopartes")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <i className="fa-brands fa-whatsapp" />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Categorías Principales</h4>
            <ul className="footer-links">
              {FOOTER_CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <a href="#catalogo" onClick={(e) => handleCatClick(e, c.slug)}>
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Servicios</h4>
            <ul className="footer-services-list">
              <li>
                <i className="fa-solid fa-truck" /> Envíos en Santo Domingo e Interior
              </li>
              <li>
                <i className="fa-solid fa-headset" /> Asesoría Técnica Especializada
              </li>
              <li>
                <i className="fa-solid fa-wrench" /> Red de Talleres Mecánicos Aliados
              </li>
              <li>
                <i className="fa-solid fa-file-invoice-dollar" /> Facturación con Comprobante Fiscal
                (NCF)
              </li>
            </ul>
          </div>

          <div className="footer-col contact-col">
            <h4 className="footer-heading">Ubicación y Contacto</h4>
            <div className="footer-contact-item">
              <i className="fa-solid fa-location-dot" />
              <div>
                <strong>Tienda Central:</strong>
                <p className="js-address-text">{STORE_CONFIG.address}</p>
              </div>
            </div>
            <div className="footer-contact-item">
              <i className="fa-solid fa-phone" />
              <div>
                <strong>Teléfono Central:</strong>
                <p>
                  <span className="js-phone-display">{STORE_CONFIG.displayPhone}</span>
                </p>
              </div>
            </div>
            <div className="footer-contact-item">
              <i className="fa-solid fa-clock" />
              <div>
                <strong>Horario Comercial:</strong>
                <p>
                  Lunes a Viernes: 8:00 AM - 6:00 PM
                  <br />
                  Sábados: 8:00 AM - 3:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa Interactivo Google Maps */}
        <div className="container footer-map-container">
          <div className="map-label">
            <i className="fa-solid fa-map-location-dot" /> Visítanos en nuestra sucursal de Santo
            Domingo:
          </div>
          <div className="map-iframe-wrapper">
            <iframe
              title="Ubicación Webdo Autopartes Santo Domingo"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15136.216393529457!2d-69.94002365451662!3d18.471694770284718!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8eaf89e7c5b6ffbb%3A0xc3412b322a36b5ec!2sAv.%2027%20de%20Febrero%2C%20Santo%20Domingo!5e0!3m2!1ses!2sdo!4v1700000000000!5m2!1ses!2sdo"
              width="100%"
              height="220"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* Barra Inferior */}
        <div className="footer-bottom">
          <div className="container footer-bottom-content">
            <p className="copyright-text">
              &copy; 2026 <strong>Webdo Autopartes SRL</strong>. RNC 131-98745-2. Todos los derechos
              reservados. Santo Domingo, República Dominicana.
            </p>
            <button type="button" className="footer-admin-btn" onClick={openAdminPortal}>
              <i className="fa-solid fa-user-shield" /> Portal de Administrador
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
