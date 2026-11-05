import { useEffect, useState } from "react";
import { YEARS } from "../config/store";
import { useStore } from "../context/StoreContext";

export default function GarageModal() {
  const { vehicles, activeVehicle, setActiveVehicle, garageOpen, setGarageOpen, showToast } =
    useStore();

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (garageOpen) {
      setYear(activeVehicle?.year || "");
      setMake(activeVehicle?.make || "");
      setModel(activeVehicle?.model || "");
    }
  }, [garageOpen, activeVehicle]);

  if (!garageOpen) return null;

  const makes = Object.keys(vehicles);
  const models = make && vehicles[make] ? vehicles[make].models : [];

  const handleClose = () => setGarageOpen(false);

  const handleSave = () => {
    if (!year || !make || !model) return;
    setActiveVehicle({ year, make, model });
    handleClose();
    showToast(`Garaje actualizado: ${make} ${model} ${year}`, "success");
  };

  return (
    <div
      className="modal-backdrop active"
      id="garageModalBackdrop"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal-dialog garage-modal" role="dialog" aria-modal="true">
        <button type="button" className="modal-close-btn" onClick={handleClose}>
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="garage-modal-content">
          <div className="modal-icon-header">
            <i className="fa-solid fa-warehouse" />
            <h3>Mi Garaje Webdo</h3>
            <p>
              Configura tu vehículo para filtrar solo las piezas con ajuste exacto para tu modelo.
            </p>
          </div>

          <div className="current-vehicle-status">
            {activeVehicle ? (
              <>
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      display: "block",
                    }}
                  >
                    Vehículo actual:
                  </span>
                  <strong style={{ color: "var(--accent-color)", fontSize: "1.05rem" }}>
                    {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light"
                  onClick={() => {
                    setActiveVehicle(null);
                    showToast("Filtro de vehículo eliminado", "info");
                  }}
                >
                  <i className="fa-solid fa-trash-can" /> Quitar
                </button>
              </>
            ) : (
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  No has seleccionado ningún vehículo todavía.
                </span>
              </div>
            )}
          </div>

          <div className="garage-selector-form">
            <h4 className="form-section-title">Cambiar o Seleccionar Vehículo:</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="modalYmmYear">Año</label>
                <select
                  id="modalYmmYear"
                  className="form-control"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    if (!e.target.value) {
                      setMake("");
                      setModel("");
                    }
                  }}
                >
                  <option value="">Selecciona Año...</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modalYmmMake">Marca</label>
                <select
                  id="modalYmmMake"
                  className="form-control"
                  value={make}
                  onChange={(e) => {
                    setMake(e.target.value);
                    setModel("");
                  }}
                  disabled={!year}
                >
                  <option value="">
                    {makes.length === 0 ? "Sin marcas registradas..." : "Selecciona Marca..."}
                  </option>
                  {makes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modalYmmModel">Modelo</label>
                <select
                  id="modalYmmModel"
                  className="form-control"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!make}
                >
                  <option value="">Selecciona Modelo...</option>
                  {models.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={!year || !make || !model}
              onClick={handleSave}
            >
              <i className="fa-solid fa-save" /> Guardar en Mi Garaje y Filtrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
