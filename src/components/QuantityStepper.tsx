import { useRef, useState } from "react";

type QuantityStepperProps = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  /** Controles colados (− | campo | +), estilo pedido/carrinho */
  variant?: "inline" | "spaced";
  ariaLabel?: string;
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  variant = "inline",
  ariaLabel = "Quantidade",
  className = "",
}: QuantityStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const valueAtFocus = useRef(value);

  const bump = (delta: number) => {
    setDraft(null);
    onChange(Math.max(min, Math.min(max, value + delta)));
  };

  const commitDraft = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      onChange(valueAtFocus.current);
      return;
    }
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n)) {
      onChange(valueAtFocus.current);
      return;
    }
    onChange(Math.max(min, Math.min(max, n)));
  };

  const handleBlur = () => {
    if (draft !== null) commitDraft(draft);
    setDraft(null);
  };

  const showDraft = draft !== null;
  const displayValue = showDraft ? draft : String(value);

  const minusDisabled = value <= min;
  const plusDisabled = value >= max;

  if (variant === "spaced") {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={minusDisabled}
          className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-foreground hover:border-china-red/40 transition-colors font-bold disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Diminuir quantidade"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          className="w-12 h-9 shrink-0 rounded-lg border border-border bg-background text-center text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-china-red/30 tabular-nums"
          value={displayValue}
          onFocus={() => {
            valueAtFocus.current = value;
            setDraft(String(value));
          }}
          onChange={(e) =>
            setDraft(e.target.value.replace(/\D/g, ""))
          }
          onBlur={handleBlur}
        />
        <button
          type="button"
          onClick={() => bump(1)}
          disabled={plusDisabled}
          className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-foreground hover:border-china-red/40 transition-colors font-bold disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0 w-fit ${className}`}>
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={minusDisabled}
        className="touch-target min-w-[44px] min-h-[44px] rounded-l-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        className="min-h-[44px] min-w-[3rem] max-w-[4.5rem] px-2 text-center border-y border-border bg-background text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-china-red/40 focus:relative focus:z-10 tabular-nums"
        value={displayValue}
        onFocus={() => {
          valueAtFocus.current = value;
          setDraft(String(value));
        }}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <button
        type="button"
        onClick={() => bump(1)}
        disabled={plusDisabled}
        className="touch-target min-w-[44px] min-h-[44px] rounded-r-lg border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
}
