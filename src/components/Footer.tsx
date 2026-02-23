const Footer = () => {
  return (
    <footer className="bg-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="text-2xl font-heading font-bold">
              <span className="text-background">CSS</span>
              <span className="text-primary">Buy</span>
            </span>
            <p className="text-background/60 text-sm mt-3 leading-relaxed">
              Connecting the Chinese Market with the world. Your trusted shopping agent since day one.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-background font-heading font-bold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#" className="hover:text-primary transition-colors">Buy For Me</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ship For Me</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Drop Shipping</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FBA To Amazon</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-background font-heading font-bold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#" className="hover:text-primary transition-colors">Buyer's Guide</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Shipping Guide</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cost Calculator</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-background font-heading font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 text-center text-sm text-background/40">
          © 2024 CSSBuy. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
