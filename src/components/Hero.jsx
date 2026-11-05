import { useEffect, useState } from "react";
import { scrollToCatalog, YEARS } from "../config/store";
import { useStore } from "../context/StoreContext";

export default function Hero() {
  const { vehicles, activeVehicle, setActiveVehicle, showToast } = useStore();

  const [year, setYear] = useState(activeVehicle?.year || "");
  const [make, setMake] = useState(activeVehicle?.make || "");
  const [model, setModel] = useState(activeVehicle?.model || "");

  useEffect(() => {
    setYear(activeVehicle?.year || "");
    setMake(activeVehicle?.make || "");
    setModel(activeVehicle?.model || "");
  }, [activeVehicle]);

  const makes = Object.keys(vehicles);
  const models = make && vehicles[make] ? vehicles[make].models : [];

  const handleYearChange = (e) => {
    setYear(e.target.value);
    if (!e.target.value) {
      setMake("");
      setModel("");
    }
  };

  const handleMakeChange = (e) => {
    setMake(e.target.value);
    setModel("");
  };

  const handleApply = () => {
    if (!year || !make || !model) return;
    setActiveVehicle({ year, make, model });
    showToast(`Vehículo guardado: ${make} ${model} ${year}`, "success");
    scrollToCatalog();
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section" id="hero">
        <div className="hero-overlay" />
        <div className="container hero-container">
          <div className="hero-content">
            <h1 className="hero-title">Encuentra la pieza exacta para tu vehículo</h1>
            <p className="hero-subtitle">
              Catálogo técnico especializado con números de parte originales, compatibilidad
              milimétrica y envíos a todo Santo Domingo y provincias.
            </p>

            {/* Selector YMM en Hero */}
            <div className="hero-ymm-box">
              <div className="ymm-box-header">
                <span className="ymm-title">
                  <i className="fa-solid fa-car-tunnel" /> Filtro Rápido YMM (Año / Marca / Modelo)
                </span>
                <span className="ymm-badge">Ajuste Preciso</span>
              </div>
              <div className="ymm-selectors-grid">
                <div className="ymm-select-group">
                  <label htmlFor="ymmYear">
                    <i className="fa-solid fa-calendar-days" /> Año
                  </label>
                  <select
                    id="ymmYear"
                    className="ymm-select"
                    value={year}
                    onChange={handleYearChange}
                  >
                    <option value="">Selecciona Año...</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ymm-select-group">
                  <label htmlFor="ymmMake">
                    <i className="fa-solid fa-industry" /> Marca
                  </label>
                  <select
                    id="ymmMake"
                    className="ymm-select"
                    value={make}
                    onChange={handleMakeChange}
                    disabled={!year}
                  >
                    <option value="">
                      {!year
                        ? "Primero selecciona Año..."
                        : makes.length === 0
                        ? "Sin marcas registradas..."
                        : "Selecciona Marca..."}
                    </option>
                    {makes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ymm-select-group">
                  <label htmlFor="ymmModel">
                    <i className="fa-solid fa-car-side" /> Modelo
                  </label>
                  <select
                    id="ymmModel"
                    className="ymm-select"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={!make}
                  >
                    <option value="">
                      {!make ? "Primero selecciona Marca..." : "Selecciona Modelo..."}
                    </option>
                    {models.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ymm-action-group">
                  <button
                    type="button"
                    className="btn btn-primary ymm-submit-btn"
                    disabled={!year || !make || !model}
                    onClick={handleApply}
                  >
                    <i className="fa-solid fa-filter" /> Filtrar Piezas
                  </button>
                </div>
              </div>
            </div>

            {/* Botones Hero */}
            <div className="hero-cta-buttons">
              <a href="#catalogo" className="btn btn-primary btn-lg">
                <i className="fa-solid fa-magnifying-glass" /> Explorar Catálogo Completo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Activo de Mi Garaje */}
      {activeVehicle && (
        <section className="active-garage-banner">
          <div className="container active-garage-container">
            <div className="active-garage-info">
              <i className="fa-solid fa-circle-check garage-check-icon" />
              <span>
                Mostrando repuestos compatibles con:{" "}
                <strong>
                  {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
                </strong>
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={() => {
                setActiveVehicle(null);
                showToast("Filtro de vehículo eliminado", "info");
              }}
            >
              <i className="fa-solid fa-xmark" /> Quitar Filtro de Vehículo
            </button>
          </div>
        </section>
      )}
    </>
  );
}
