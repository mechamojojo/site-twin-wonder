import { Megaphone } from "lucide-react";

const newsItems = [
  "🔥 Frete grátis para compras acima de ¥500",
  "📦 Nosso NOVO armazém está online",
  "🎉 Promoção: Taxa de serviço reduzida este mês",
  "⏰ Feriado do Ano Novo Chinês 2024: Atualização Operacional",
  "✅ Novo método de envio FJ-BR-EXP disponível",
];

const NewsTicker = () => {
  return (
    <div className="bg-accent border-b border-border py-2.5 overflow-hidden">
      <div className="container mx-auto flex items-center gap-3 px-4">
        <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shrink-0 uppercase tracking-wide">
          Novidades
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex gap-12 animate-scroll-left whitespace-nowrap">
            {[...newsItems, ...newsItems].map((item, i) => (
              <span key={i} className="text-xs text-foreground/70 hover:text-primary cursor-pointer transition-colors">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
