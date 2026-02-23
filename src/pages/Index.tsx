import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarketplaceBanner from "@/components/MarketplaceBanner";
import NewsTicker from "@/components/NewsTicker";
import HowItWorks from "@/components/HowItWorks";
import ServicesSection from "@/components/ServicesSection";
import ShippingRates from "@/components/ShippingRates";
import AboutSection from "@/components/AboutSection";
import MobileAppSection from "@/components/MobileAppSection";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <MarketplaceBanner />
      <NewsTicker />
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
