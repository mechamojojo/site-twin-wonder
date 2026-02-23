import { Search, Camera } from "lucide-react";
import { useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative min-h-[480px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <img
        src={heroBg}
        alt="Chinese marketplace products"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-hero-overlay" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-primary-foreground leading-tight mb-4">
          Connecting the Chinese Market with the world
        </h1>
        <p className="text-primary-foreground/80 text-base md:text-lg mb-8 max-w-xl mx-auto">
          No matter where you're from, our services are here to help you purchase safely and effectively from the Chinese Market.
        </p>

        {/* Search */}
        <div className="relative max-w-lg mx-auto flex items-center">
          <div className="w-full flex items-center bg-background rounded-full overflow-hidden shadow-lg">
            <Search className="ml-4 w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Paste item link or search keywords"
              className="flex-1 py-3.5 px-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="p-2 mr-1 rounded-full hover:bg-muted transition-colors">
              <Camera className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
