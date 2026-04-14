import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FreightCouponBanner from "@/components/FreightCouponBanner";
import HeroSection from "@/components/HeroSection";
import MarketplaceBanner from "@/components/MarketplaceBanner";
import RecentPurchasesBar from "@/components/RecentPurchasesBar";
import FeaturedProductsSection from "@/components/FeaturedProductsSection";
import HowItWorks from "@/components/HowItWorks";
import ShippingRates from "@/components/ShippingRates";
import AboutSection from "@/components/AboutSection";
import MobileAppSection from "@/components/MobileAppSection";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

/** Faixa CTA discreta entre seções */
function InlineCTA({
  text,
  linkTo,
  linkLabel,
  href,
}: {
  text: string;
  linkTo?: string;
  linkLabel: string;
  href?: string;
}) {
  return (
    <div className="bg-muted/40 border-y border-border py-4">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {text}
        </p>
        {linkTo ? (
          <Link
            to={linkTo}
            className="shrink-0 bg-china-red text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-china-red/90 transition-colors"
          >
            {linkLabel}
          </Link>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 bg-china-red text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-china-red/90 transition-colors"
          >
            {linkLabel}
          </a>
        )}
      </div>
    </div>
  );
}

const Index = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t = setTimeout(scroll, 100);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <FreightCouponBanner />

      {/* 1. Hero — proposta + busca */}
      <HeroSection />

      {/* 2. Marketplaces suportados */}
      <MarketplaceBanner />

      {/* 3. Compras recentes (exibe quando houver dados da API) */}
      <RecentPurchasesBar />

      {/* 4. Catálogo — aprovados por clientes */}
      <FeaturedProductsSection />

      {/* CTA: já tem o link? vai direto */}
      <InlineCTA
        text="Já encontrou o que quer? Cole o link e veja o preço em reais agora."
        linkTo="/pedido"
        linkLabel="Colar link do produto →"
      />

      {/* 5. Como funciona */}
      <HowItWorks />

      {/* Atendimento (chat + e-mail) — logo após “4 passos” */}
      <MobileAppSection />

      {/* 6. Entrega + estimador de frete */}
      <ShippingRates />

      {/* 7. Sobre / diferenciais */}
      <AboutSection />

      {/* 8. CTA final */}
      <CTASection />

      {/* 9. FAQ */}
      <FAQSection />

      <Footer />
    </div>
  );
};

export default Index;
