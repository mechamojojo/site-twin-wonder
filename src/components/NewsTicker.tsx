import { Volume2 } from "lucide-react";

const newsItems = [
  "Nosso NOVO armazém está online",
  "Feriados do Dia do Trabalho na CSSBuy",
  "Atualização do tempo de armazenamento gratuito",
  "Feriado do Ano Novo Chinês 2024: Atualização Operacional da CSSBuy",
  "O feriado nacional está programado da seguinte forma",
];

const NewsTicker = () => {
  return (
    <div className="bg-background border-b border-border py-3 overflow-hidden">
      <div className="container mx-auto flex items-center gap-4 px-4">
        <Volume2 className="w-5 h-5 text-primary shrink-0" />
        <div className="overflow-hidden flex-1">
          <div className="flex gap-12 animate-scroll-left whitespace-nowrap">
            {[...newsItems, ...newsItems].map((item, i) => (
              <span key={i} className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                {item}
              </span>
            ))}
          </div>
        </div>
        <a href="#" className="text-primary text-sm font-medium shrink-0 hover:underline">
          Mais &gt;&gt;
        </a>
      </div>
    </div>
  );
};

export default NewsTicker;
