const CTASection = () => {
  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-primary-foreground mb-3">
          Pronto para começar? 🚀
        </h2>
        <p className="text-primary-foreground/80 text-base mb-8 max-w-lg mx-auto">
          Cadastre-se gratuitamente e comece a comprar da China com atendimento em português e suporte brasileiro.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#"
            className="inline-block bg-background text-foreground px-8 py-3 rounded-lg font-heading font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Criar Conta Grátis
          </a>
          <a
            href="#"
            className="inline-block border-2 border-primary-foreground text-primary-foreground px-8 py-3 rounded-lg font-heading font-bold text-sm hover:bg-primary-foreground/10 transition-colors"
          >
            Como Funciona?
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
