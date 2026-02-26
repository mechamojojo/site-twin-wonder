/**
 * Testa o envio de notificação para o Telegram
 * Rode: cd backend && npx ts-node scripts/test-telegram.ts
 */
import "dotenv/config";
import { sendTelegram } from "../src/telegram";

async function main() {
  const orderUrl = (process.env.SITE_URL || "https://compraschina.com.br").replace(/\/$/, "") + "/admin/pedido/test-order-id";
  const msg =
    "✅ Pedido confirmado\n" +
    "Pedido abc12345\n" +
    "📦 Teste - Produto simulado\n" +
    "💰 R$ 150,00\n" +
    "👤 Cliente Teste\n\n" +
    "🔗 Gerenciar: " + orderUrl;

  console.log("Enviando mensagem de teste para o Telegram...");
  await sendTelegram(msg);
  console.log("Pronto! Verifique seu Telegram.");
}

main().catch(console.error);
