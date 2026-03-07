import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section
      id="cta"
      className="py-24 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, hsl(0 78% 45%), hsl(0 78% 55%), hsl(45 90% 50%))' }}
    >
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      <div className="container mx-auto px-4 text-center relative z-10">
        <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-3">
          Milhões de produtos · Preços de fábrica
        </p>
        <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-white mb-4 leading-tight">
          Comece a comprar agora.<br />
          <span className="text-gold">Sem complicação.</span>
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
          Escolha o produto, pague em reais e receba no Brasil. Menos de 3 minutos para fazer seu primeiro pedido.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/explorar"
            className="inline-block bg-white text-china-red px-8 py-4 rounded-full font-heading font-extrabold text-sm hover:bg-white/90 transition-colors shadow-lg"
          >
            Ver produtos agora
          </Link>
          <Link
            to="/#how-it-works"
            className="inline-block border-2 border-white text-white px-8 py-4 rounded-full font-heading font-bold text-sm hover:bg-white/10 transition-colors"
          >
            Como funciona
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
