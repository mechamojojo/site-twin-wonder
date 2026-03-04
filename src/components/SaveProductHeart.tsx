import { Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSavedProducts } from "@/context/SavedProductsContext";
import { useState } from "react";

type Props = {
  slug: string;
  className?: string;
  /** Use on cards: absolute position in corner */
  variant?: "card" | "inline";
};

export function SaveProductHeart({ slug, className = "", variant = "card" }: Props) {
  const { user } = useAuth();
  const { isSaved, toggle } = useSavedProducts();
  const [busy, setBusy] = useState(false);

  if (!user || !slug) return null;

  const saved = isSaved(slug);
  const base =
    variant === "card"
      ? "absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm border-0 hover:bg-background transition-colors"
      : "inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-background hover:bg-muted transition-colors";

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    await toggle(slug);
    setBusy(false);
  };

  return (
    <button
      type="button"
      aria-label={saved ? "Remover dos salvos" : "Salvar produto"}
      onClick={handleClick}
      disabled={busy}
      className={`${base} ${className} disabled:opacity-60`}
    >
      <Heart
        className={`w-4 h-4 ${saved ? "fill-china-red text-china-red" : "text-muted-foreground hover:text-china-red"}`}
      />
    </button>
  );
}
