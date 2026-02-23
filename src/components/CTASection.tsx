const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(0 78% 45%), hsl(0 78% 55%), hsl(45 90% 50%))' }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-white mb-4 leading-tight">
          Pronto para explorar o<br />Mercado Chinês?
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
          Cadastre-se gratuitamente e comece a comprar com atendimento em português e suporte brasileiro.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#"
            className="inline-block bg-white text-china-red px-8 py-4 rounded-full font-heading font-extrabold text-sm hover:bg-white/90 transition-colors shadow-lg"
          >
            Cadastre-se Grátis
          </a>
          <a
            href="#"
            className="inline-block border-2 border-white text-white px-8 py-4 rounded-full font-heading font-bold text-sm hover:bg-white/10 transition-colors"
          >
            Fale Conosco
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
