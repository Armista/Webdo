import { useCallback, useEffect, useRef, useState } from "react";
import { openWhatsAppDirect, registerWhatsAppHandler } from "../config/store";

const CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateCaptchaCode(length = 5) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return code;
}

export default function WhatsAppCaptchaModal() {
  const [open, setOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [userInput, setUserInput] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  const [botTrap, setBotTrap] = useState(""); // Honeypot oculto contra bots
  const [errorMsg, setErrorMsg] = useState("");
  const canvasRef = useRef(null);

  const drawCaptcha = useCallback((code) => {
    const canvas = canvasRef.current;
    if (!canvas || !code) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Fondo azul oscuro estilizado
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#172554");
    grad.addColorStop(1, "#0b1120");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Líneas de interferencia anti-OCR
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height
      );
      ctx.strokeStyle =
        i % 2 === 0 ? "rgba(255, 107, 53, 0.35)" : "rgba(96, 165, 250, 0.35)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Puntos de ruido anti-bots
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle =
        i % 2 === 0 ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 107, 53, 0.28)";
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dibujar caracteres distorsionados
    const colors = ["#ff6b35", "#ffffff", "#60a5fa", "#fbbf24", "#34d399"];
    const step = width / (code.length + 1);

    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      const x = step * (i + 1);
      const y = height / 2 + (Math.random() * 8 - 4);
      const angle = (Math.random() - 0.5) * 0.42;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = "800 26px Montserrat, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 4;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  }, []);

  const openCaptchaWithMsg = useCallback((msg = "") => {
    setPendingMessage(msg);
    setNotRobot(false);
    setBotTrap("");
    const newCode = generateCaptchaCode(5);
    setCaptchaCode(newCode);
    setUserInput("");
    setErrorMsg("");
    setOpen(true);
  }, []);

  const refreshCaptcha = useCallback(() => {
    const newCode = generateCaptchaCode(5);
    setCaptchaCode(newCode);
    setUserInput("");
    setErrorMsg("");
  }, []);

  useEffect(() => {
    // 1. Registrar manejador directo en store.js
    const unregister = registerWhatsAppHandler((msg) => {
      openCaptchaWithMsg(msg);
    });

    // 2. Escuchar evento global window
    const handleRequestWhatsApp = (e) => {
      openCaptchaWithMsg(e.detail?.message ?? "");
    };
    window.addEventListener("webdo:request-whatsapp", handleRequestWhatsApp);

    // 3. Interceptar cualquier clic en enlaces directos a wa.me o botones flotantes
    const handleGlobalClick = (e) => {
      const anchor = e.target.closest?.('a[href*="wa.me"], a[href*="whatsapp.com"]');
      if (anchor) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const url = new URL(anchor.href);
          const text = url.searchParams.get("text") || "Hola Webdo Autopartes";
          openCaptchaWithMsg(text);
        } catch {
          openCaptchaWithMsg("Hola Webdo Autopartes");
        }
      }
    };
    document.addEventListener("click", handleGlobalClick, true);

    return () => {
      unregister();
      window.removeEventListener("webdo:request-whatsapp", handleRequestWhatsApp);
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, [openCaptchaWithMsg]);

  useEffect(() => {
    if (open && captchaCode) {
      drawCaptcha(captchaCode);
    }
  }, [open, captchaCode, drawCaptcha]);

  if (!open) return null;

  const handleClose = () => {
    setOpen(false);
    setErrorMsg("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (botTrap.trim() !== "") {
      return;
    }

    if (!notRobot) {
      setErrorMsg("Por favor marca la casilla 'No soy un robot'");
      return;
    }

    if (userInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setErrorMsg("El código ingresado no coincide. Intenta de nuevo.");
      refreshCaptcha();
      return;
    }

    const msgToSend = pendingMessage;
    setOpen(false);
    openWhatsAppDirect(msgToSend);
  };

  return (
    <div
      className="modal-backdrop active"
      id="whatsappCaptchaBackdrop"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal-dialog captcha-modal-dialog" role="dialog" aria-modal="true">
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleClose}
          aria-label="Cerrar verificación"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="captcha-modal-content">
          <div className="modal-icon-header">
            <div className="captcha-shield-icon">
              <i className="fa-solid fa-shield-halved" />
            </div>
            <h3>Verificación de Seguridad</h3>
            <p>
              Confirma que no eres un robot para continuar al chat de <strong>WhatsApp</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Honeypot oculto para atrapar bots */}
            <input
              type="text"
              name="website_url_trap"
              value={botTrap}
              onChange={(e) => setBotTrap(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
              aria-hidden="true"
            />

            {/* Casilla interactiva "No soy un robot" */}
            <button
              type="button"
              className={`captcha-robot-box ${notRobot ? "checked" : ""}`}
              onClick={() => {
                setNotRobot((v) => !v);
                setErrorMsg("");
              }}
            >
              <span className="robot-checkbox-indicator">
                {notRobot && <i className="fa-solid fa-check" />}
              </span>
              <span className="robot-checkbox-text">No soy un robot</span>
              <i className="fa-solid fa-shield-halved robot-badge-icon" />
            </button>

            {/* Imagen Canvas con Código Distorsionado */}
            <div className="captcha-canvas-row">
              <canvas
                ref={canvasRef}
                width={210}
                height={58}
                className="captcha-canvas"
                title="Código de seguridad"
              />
              <button
                type="button"
                className="captcha-refresh-btn"
                onClick={refreshCaptcha}
                title="Generar otro código"
              >
                <i className="fa-solid fa-arrows-rotate" />
                <span>Cambiar</span>
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: "10px" }}>
              <label htmlFor="captchaInputCode" style={{ textAlign: "center", display: "block" }}>
                Escribe los 5 caracteres de la imagen:
              </label>
              <input
                type="text"
                id="captchaInputCode"
                className="form-control captcha-code-input"
                maxLength={5}
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value.toUpperCase());
                  setErrorMsg("");
                }}
                placeholder="EJ: A7K9P"
                required
                autoComplete="off"
              />
            </div>

            {errorMsg && (
              <span
                className="field-error-text"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                <i className="fa-solid fa-triangle-exclamation" /> {errorMsg}
              </span>
            )}

            <div className="captcha-actions">
              <button type="button" className="btn btn-outline-light" onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-whatsapp captcha-submit-btn">
                <i className="fa-brands fa-whatsapp" /> Ir a WhatsApp
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
