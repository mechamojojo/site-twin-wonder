const CTASection = () => {
  return (
    <section className="py-20 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-foreground mb-4">
          Ready to start diving into the Chinese Market?
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
          Don't wait any longer! Sign up for free today and start buying from the Chinese Market like thousands of other customers.
        </p>
        <a
          href="#"
          className="inline-block bg-background text-foreground px-8 py-3 rounded-full font-heading font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Join Today
        </a>
      </div>
    </section>
  );
};

export default CTASection;
