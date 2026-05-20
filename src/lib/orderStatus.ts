const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_COTACAO: "Aguardando cotação",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  ENVIADO_PARA_CSSBUY: "Enviado para a China",
  COMPRADO: "Comprado",
  NO_ESTOQUE: "No armazém",
  AGUARDANDO_ENVIO: "Aguardando envio",
  EM_ENVIO: "Em envio",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_COTACAO: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  AGUARDANDO_PAGAMENTO:
    "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  PAGO: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  ENVIADO_PARA_CSSBUY:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300",
  COMPRADO: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
  NO_ESTOQUE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  AGUARDANDO_ENVIO:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  EM_ENVIO:
    "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  CONCLUIDO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CANCELADO: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase();
}

export function orderStatusBadgeClass(status: string): string {
  return (
    STATUS_COLORS[status] ??
    "bg-muted text-muted-foreground"
  );
}
