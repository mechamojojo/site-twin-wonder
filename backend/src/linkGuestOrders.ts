import type { PrismaClient } from "@prisma/client";

/** E-mail normalizado para comparação e gravação. */
export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Associa pedidos de convidado (userId null) ao usuário quando o e-mail de contato coincide.
 * Retorna quantos pedidos foram vinculados.
 */
export async function linkGuestOrdersToUser(
  prisma: PrismaClient,
  userId: string,
  email: string,
): Promise<number> {
  const normalized = normalizeCustomerEmail(email);
  if (!normalized) return 0;

  const result = await prisma.order.updateMany({
    where: {
      userId: null,
      customerEmail: { equals: normalized, mode: "insensitive" },
    },
    data: { userId },
  });

  return result.count;
}
