const CTASection = () => {
  return (
    <section className="py-20 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-foreground mb-4">
          Pronto para começar a explorar o Mercado Chinês?
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
          Não espere mais! Cadastre-se gratuitamente hoje e comece a comprar do Mercado Chinês como milhares de outros clientes brasileiros.
        </p>
        <a
          href="#"
          className="inline-block bg-background text-foreground px-8 py-3 rounded-full font-heading font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Cadastre-se Hoje
        </a>
      </div>
    </section>
  );
};

export default CTASection;
