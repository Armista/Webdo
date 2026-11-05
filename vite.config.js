import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Permite acceder al portal de administrador mediante rutas como:
 * /webdo.admin, /admin (incluso con punto en la URL)
 */
const adminRoutePlugin = () => ({
  name: "webdo-admin-route",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/(webdo\.admin|admin)(\/|\?|$)/i.test(req.url)) {
        req.url = "/";
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/(webdo\.admin|admin)(\/|\?|$)/i.test(req.url)) {
        req.url = "/";
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), adminRoutePlugin()],
});
