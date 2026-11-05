import AdminModals from "./components/AdminModals";
import CartDrawer from "./components/CartDrawer";
import Catalog from "./components/Catalog";
import Footer from "./components/Footer";
import GarageModal from "./components/GarageModal";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ProductModal from "./components/ProductModal";
import WhatsAppCaptchaModal from "./components/WhatsAppCaptchaModal";
import { StoreProvider } from "./context/StoreContext";

export default function App() {
  return (
    <StoreProvider>
      <Header />
      <Hero />
      <Catalog />
      <Footer />
      <CartDrawer />
      <ProductModal />
      <GarageModal />
      <AdminModals />
      <WhatsAppCaptchaModal />
    </StoreProvider>
  );
}
