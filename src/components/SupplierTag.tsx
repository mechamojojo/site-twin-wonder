import { supplierTagDisplay } from "@/lib/productDisplayTitle";
import { BadgeCheck, Store } from "lucide-react";

type SupplierTagProps = {
  supplierName: string;
  className?: string;
};

/**
 * Tag de fornecedor nos cards (Explorar / home). "Original" com destaque próprio.
 */
export function SupplierTag({ supplierName, className = "" }: SupplierTagProps) {
  const raw = supplierName.trim();
  if (!raw) return null;
  const { label, isOriginal } = supplierTagDisplay(raw);

  return (
    <span
      className={`inline-flex items-center gap-0.5 max-w-full min-w-0 px-2 py-0.5 rounded-md text-[10px] font-semibold border leading-tight truncate ${
        isOriginal
          ? "bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-400/35 shadow-sm shadow-sky-500/5"
          : "bg-china-red/[0.07] text-china-red dark:text-red-300/95 border-china-red/20"
      } ${className}`}
      title={raw}
    >
      {isOriginal ? (
        <BadgeCheck
          className="w-3 h-3 shrink-0 text-sky-600 dark:text-sky-400"
          aria-hidden
        />
      ) : (
        <Store
          className="w-2.5 h-2.5 shrink-0 opacity-80"
          aria-hidden
        />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
