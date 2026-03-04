const marketplaces = [
  { name: "Taobao", color: "text-china-red", url: "https://www.taobao.com" },
  { name: "1688", color: "text-gold", url: "https://www.1688.com" },
  { name: "Weidian", color: "text-china-red", url: "https://www.weidian.com" },
  { name: "TMALL", color: "text-primary", url: "https://www.tmall.com" },
  { name: "Pinduoduo", color: "text-gold", url: "https://www.pinduoduo.com" },
  { name: "JD.com", color: "text-china-red", url: "https://www.jd.com" },
];

const MarketplaceBanner = () => {
  return (
    <div className="bg-foreground py-4 overflow-hidden">
      <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap px-4">
        <span className="text-xs text-background/40 uppercase tracking-widest font-medium shrink-0">
          Marketplaces suportados
        </span>
        {marketplaces.map((mp, i) => (
          <a
            key={i}
            href={mp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg md:text-xl font-heading font-extrabold text-background/70 hover:text-background transition-colors cursor-pointer"
            title={`Visitar ${mp.name}`}
          >
            {mp.name}
          </a>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceBanner;
