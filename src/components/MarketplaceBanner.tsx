const marketplaces = [
  { name: "Taobao", color: "text-china-red" },
  { name: "1688", color: "text-gold" },
  { name: "Weidian", color: "text-china-red" },
  { name: "TMALL", color: "text-primary" },
  { name: "Pinduoduo", color: "text-gold" },
  { name: "JD.com", color: "text-china-red" },
];

const MarketplaceBanner = () => {
  return (
    <div className="bg-foreground py-4 overflow-hidden">
      <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap px-4">
        <span className="text-xs text-background/40 uppercase tracking-widest font-medium shrink-0">
          Marketplaces suportados
        </span>
        {marketplaces.map((mp, i) => (
          <span
            key={i}
            className="text-lg md:text-xl font-heading font-extrabold text-background/70 hover:text-background transition-colors cursor-pointer"
          >
            {mp.name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceBanner;
