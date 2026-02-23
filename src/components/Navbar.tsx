import { Search, ShoppingCart, User, ChevronDown, Globe, Camera } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex flex-col items-start shrink-0">
          <span className="text-2xl font-heading font-bold">
            <span className="text-foreground">CSS</span>
            <span className="text-primary">Buy</span>
          </span>
          <span className="text-[10px] text-muted-foreground -mt-1">Beijing Time 02/23 21:29</span>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
          <div className="relative w-full flex items-center bg-muted rounded-full border border-border overflow-hidden">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Bar - Website URLs or Keywords"
              className="w-full py-2 pl-10 pr-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-2 p-1.5 rounded-full hover:bg-accent transition-colors">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-foreground">
          <button className="flex items-center gap-1 hover:text-primary transition-colors">
            Services <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1 hover:text-primary transition-colors">
            Resources <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1 hover:text-primary transition-colors">
            Company <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-4">
          <button className="hidden sm:flex items-center gap-1.5 text-xs border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors">
            <Globe className="w-3.5 h-3.5" />
            English - USD
          </button>
          <button className="p-2 rounded-full hover:bg-muted transition-colors text-primary">
            <span className="text-lg">🌙</span>
          </button>
          <button className="p-2 rounded-full hover:bg-muted transition-colors text-foreground">
            <ShoppingCart className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-muted transition-colors text-foreground">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
