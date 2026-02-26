import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Order = lazy(() => import("./pages/Order"));
const OrderConfirmed = lazy(() => import("./pages/OrderConfirmed"));
const Login = lazy(() => import("./pages/Login"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const MeusPedidos = lazy(() => import("./pages/MeusPedidos"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Pagar = lazy(() => import("./pages/Pagar"));
const Servicos = lazy(() => import("./pages/Servicos"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const TermosServico = lazy(() => import("./pages/TermosServico"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminPedido = lazy(() => import("./pages/AdminPedido"));
const Explorar = lazy(() => import("./pages/Explorar"));
const Produto = lazy(() => import("./pages/Produto"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
  </div>
);

const App = () => (
  <TooltipProvider>
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pedido" element={<Order />} />
            <Route path="/pedido-confirmado/:id" element={<OrderConfirmed />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/meus-pedidos" element={<MeusPedidos />} />
            <Route path="/carrinho" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pagar/:id" element={<Pagar />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos-de-servico" element={<TermosServico />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/pedido/:id" element={<AdminPedido />} />
            <Route path="/explorar" element={<Explorar />} />
            <Route path="/produto/:slug" element={<Produto />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
