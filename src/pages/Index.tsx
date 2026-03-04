import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarketplaceBanner from "@/components/MarketplaceBanner";
import RecentPurchasesBar from "@/components/RecentPurchasesBar";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProductsSection from "@/components/FeaturedProductsSection";
import ServicesSection from "@/components/ServicesSection";
import ShippingRates from "@/components/ShippingRates";
import AboutSection from "@/components/AboutSection";
import MobileAppSection from "@/components/MobileAppSection";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

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
      <HeroSection />
      <MarketplaceBanner />
      <RecentPurchasesBar />
      <FeaturedProductsSection />
      <HowItWorks />
      <ServicesSection />
      <ShippingRates />
      <AboutSection />
      <MobileAppSection />
      <CTASection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
