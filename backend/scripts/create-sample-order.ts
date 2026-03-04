/**
 * Cria um pedido de exemplo na API para visualizar no admin.
 * Uso: npx ts-node scripts/create-sample-order.ts
 * Requer: backend rodando em http://localhost:4000
 */
const API = process.env.API_URL || "http://localhost:4000";
const ORDER_URL =
  "https://weidian.com/item.html?itemID=7425303732";

const body = {
  originalUrl: ORDER_URL,
  productDescription: "Produto Weidian — item 7425303732 (exemplo para teste no admin)",
  productTitle: "Produto Weidian 7425303732",
  productImage: "https://img.alicdn.com/imgextra/i1/O1CN01example.jpg",
  quantity: 1,
  cep: "01310100",
  shippingMethod: "FJ_BR_EXP",
  customerName: "Cliente Teste Admin",
  customerEmail: "teste@compraschina.com.br",
  customerWhatsapp: "5511999999999",
  customerCpf: "12345678909",
  addressStreet: "Av. Paulista",
  addressNumber: "1000",
  addressComplement: "Sala 1",
  addressNeighborhood: "Bela Vista",
  addressCity: "São Paulo",
  addressState: "SP",
  notes: "Pedido criado pelo script create-sample-order para visualizar no admin.",
  estimatedTotalBrl: 180,
};

async function main() {
  console.log("Criando pedido de exemplo...");
  const res = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Erro:", res.status, data);
    process.exit(1);
  }
  console.log("Pedido criado:", data.id);
  console.log("Status:", data.status);
  console.log("Ver no admin: http://localhost:8080/admin (ou seu domínio) → abra o pedido", data.id);
  process.exit(0);
}

main();
