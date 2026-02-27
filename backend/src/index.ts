import "./startup";
import "dotenv/config";

process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] unhandledRejection:", reason, promise);
  process.exit(1);
});

import crypto from "crypto";
import express from "express";
import { sendTelegram } from "./telegram";
import { hashPassword, verifyPassword, signToken, requireUser, optionalUser } from "./auth";
import cors from "cors";
import { json } from "body-parser";
import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

const defaultOrigins = [
  "https://compraschinatest.vercel.app",
  "https://compraschina.com.br",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];
const envOrigins = (process.env.CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
const corsOrigins = envOrigins?.length ? [...new Set([...defaultOrigins, ...envOrigins])] : defaultOrigins;
app.use(cors({ origin: corsOrigins }));
app.use(json());

const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === "production";

/** Mensagem de erro segura para o cliente (não vaza detalhes internos em produção) */
function safeErrorMessage(err: unknown, fallback: string): string {
  if (!isProduction && err instanceof Error) return err.message;
  return fallback;
}

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const ADMIN_SESSIONS = new Map<string, number>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_CNY = 0.75;

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, expires] of ADMIN_SESSIONS.entries()) {
    if (expires < now) ADMIN_SESSIONS.delete(token);
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!ADMIN_SECRET) {
    return res.status(503).json({ error: "Admin não configurado. Defina ADMIN_SECRET no .env" });
  }
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : req.headers["x-admin-token"] as string | undefined;
  if (!token) {
    return res.status(401).json({ error: "Token de admin necessário" });
  }
  const expires = ADMIN_SESSIONS.get(token);
  if (!expires || expires < Date.now()) {
    if (expires) ADMIN_SESSIONS.delete(token);
    return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  }
  next();
}

// Root (alguns proxies fazem healthcheck em /)
app.get("/", (_req, res) => res.json({ status: "ok", service: "compraschina-backend" }));

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "compraschina-backend" });
});

// ========== Auth (clientes) ==========

// Cadastro
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      customerCpf,
      customerWhatsapp,
      cep,
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCity,
      addressState,
    } = req.body ?? {};

    if (!email?.trim()) return res.status(400).json({ error: "E-mail obrigatório" });
    if (!password || String(password).length < 6) return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório" });

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(400).json({ error: "E-mail já cadastrado" });

    const cpf = typeof customerCpf === "string" ? customerCpf.replace(/\D/g, "") : null;
    if (!cpf || cpf.length !== 11) return res.status(400).json({ error: "CPF inválido (11 dígitos)" });
    const wa = typeof customerWhatsapp === "string" ? customerWhatsapp.replace(/\D/g, "") : null;
    if (!wa) return res.status(400).json({ error: "WhatsApp obrigatório" });
    const cepClean = typeof cep === "string" ? cep.replace(/\D/g, "") : null;
    if (!cepClean || cepClean.length !== 8) return res.status(400).json({ error: "CEP inválido (8 dígitos)" });
    if (!addressStreet?.trim()) return res.status(400).json({ error: "Endereço obrigatório" });
    if (!addressNumber?.trim()) return res.status(400).json({ error: "Número obrigatório" });
    if (!addressCity?.trim()) return res.status(400).json({ error: "Cidade obrigatória" });
    if (!addressState?.trim()) return res.status(400).json({ error: "Estado obrigatório" });

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashPassword(String(password)),
        name: name.trim(),
        customerCpf: cpf,
        customerWhatsapp: wa,
        cep: cepClean,
        addressStreet: addressStreet.trim(),
        addressNumber: addressNumber.trim(),
        addressComplement: addressComplement?.trim() || null,
        addressNeighborhood: addressNeighborhood?.trim() || null,
        addressCity: addressCity.trim(),
        addressState: addressState.trim(),
      },
    });

    const token = signToken({ userId: user.id });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        customerCpf: user.customerCpf,
        customerWhatsapp: user.customerWhatsapp,
        cep: user.cep,
        addressStreet: user.addressStreet,
        addressNumber: user.addressNumber,
        addressComplement: user.addressComplement,
        addressNeighborhood: user.addressNeighborhood,
        addressCity: user.addressCity,
        addressState: user.addressState,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email?.trim() || !password) return res.status(400).json({ error: "E-mail e senha obrigatórios" });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !verifyPassword(String(password), user.password)) {
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    const token = signToken({ userId: user.id });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        customerCpf: user.customerCpf,
        customerWhatsapp: user.customerWhatsapp,
        cep: user.cep,
        addressStreet: user.addressStreet,
        addressNumber: user.addressNumber,
        addressComplement: user.addressComplement,
        addressNeighborhood: user.addressNeighborhood,
        addressCity: user.addressCity,
        addressState: user.addressState,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// Me (dados do usuário logado)
app.get("/api/auth/me", requireUser, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      customerCpf: user.customerCpf,
      customerWhatsapp: user.customerWhatsapp,
      cep: user.cep,
      addressStreet: user.addressStreet,
      addressNumber: user.addressNumber,
      addressComplement: user.addressComplement,
      addressNeighborhood: user.addressNeighborhood,
      addressCity: user.addressCity,
      addressState: user.addressState,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// Meus pedidos (usuário logado)
app.get("/api/auth/me/orders", requireUser, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { quote: true, shipment: true },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
});

// Admin login
app.post("/api/admin/login", (req, res) => {
  const password = req.body?.password;
  if (!ADMIN_SECRET) {
    return res.status(503).json({ error: "Admin não configurado." });
  }
  if (password !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Senha incorreta" });
  }
  cleanupExpiredSessions();
  const token = crypto.randomBytes(32).toString("hex");
  ADMIN_SESSIONS.set(token, Date.now() + SESSION_TTL_MS);
  res.json({ token, expiresIn: SESSION_TTL_MS });
});

// Admin: listar pedidos (protegido)
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status: status as OrderStatus } : {};

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { quote: true, payment: true, shipment: true },
    });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar pedidos" });
  }
});

// Admin: obter pedido único (protegido)
app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { quote: true, payment: true, shipment: true },
    });
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
});

// Admin: atualizar envio (tracking) (protegido)
app.patch("/api/admin/orders/:id/shipment", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const trackingCode = typeof body.trackingCode === "string" ? body.trackingCode.trim() || null : null;
    const carrier = typeof body.carrier === "string" ? body.carrier.trim() || null : null;
    const status = typeof body.status === "string" && ["PENDENTE", "EM_TRANSITO", "ENTREGUE"].includes(body.status)
      ? body.status
      : undefined;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    const shipmentData: Record<string, unknown> = {};
    if (trackingCode !== undefined) shipmentData.trackingCode = trackingCode;
    if (carrier !== undefined) shipmentData.carrier = carrier;
    if (status) shipmentData.status = status;
    if (status === "EM_TRANSITO" && !(await prisma.shipment.findUnique({ where: { orderId: id } }))?.shippedAt) {
      shipmentData.shippedAt = new Date();
    }
    if (status === "ENTREGUE") shipmentData.deliveredAt = new Date();

    const shipment = await prisma.shipment.upsert({
      where: { orderId: id },
      update: shipmentData,
      create: {
        orderId: id,
        trackingCode: trackingCode ?? undefined,
        carrier: carrier ?? undefined,
        status: (status as "PENDENTE" | "EM_TRANSITO" | "ENTREGUE") ?? "PENDENTE",
        ...(status === "EM_TRANSITO" && { shippedAt: new Date() }),
        ...(status === "ENTREGUE" && { deliveredAt: new Date() }),
      },
    });

    res.json(shipment);
  } catch (err) {
    console.error("Admin update shipment:", err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao atualizar envio") });
  }
});

// Admin: atualizar pedido (status, cssbuyOrderId, internalNotes) (protegido)
app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (typeof body.status === "string" && body.status.trim()) {
      updates.status = body.status.trim() as OrderStatus;
    }
    if (typeof body.cssbuyOrderId === "string") {
      updates.cssbuyOrderId = body.cssbuyOrderId.trim() || null;
    }
    if (typeof body.internalNotes === "string") {
      updates.internalNotes = body.internalNotes.trim().slice(0, 2000) || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum campo válido para atualizar" });
    }

    const order = await prisma.order.update({
      where: { id },
      data: updates,
      include: { quote: true, payment: true, shipment: true },
    });
    if (updates.status === OrderStatus.PAGO) {
      try {
        await ensureProductFromOrder({
          originalUrl: order.originalUrl,
          productTitle: order.productTitle,
          productDescription: order.productDescription,
          productImage: order.productImage,
        });
      } catch (err) {
        console.warn("Erro ao adicionar produto ao catálogo:", err);
      }
    }
    res.json(order);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    console.error("Admin update order:", err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao atualizar pedido") });
  }
});

// Catálogo de produtos — busca e listagem
app.get("/api/products", async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim().toLowerCase();
    const category = (req.query.category as string)?.trim();
    const featured = req.query.featured === "true";
    const limit = Math.min(Number(req.query.limit) || 48, 100);
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const where: Record<string, unknown> = {};
    if (featured) where.featured = true;
    if (category) where.category = category;
    if (q && q.length >= 2) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { titlePt: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { originalUrl: { contains: q, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

app.get("/api/products/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!product) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80) || "produto";
}

function getSourceFromUrl(url: string): string {
  const host = url.toLowerCase();
  if (host.includes("1688")) return "1688";
  if (host.includes("taobao")) return "Taobao";
  if (host.includes("weidian")) return "Weidian";
  if (host.includes("tmall")) return "TMALL";
  if (host.includes("jd.com")) return "JD.com";
  if (host.includes("pinduoduo")) return "Pinduoduo";
  if (host.includes("goofish")) return "Goofish";
  if (host.includes("dangdang")) return "Dangdang";
  if (host.includes("vip.com") || host.includes("vipshop")) return "VIP Shop";
  return "China";
}

/** Adiciona produto ao catálogo a partir de um pedido pago (para busca e barra) */
async function ensureProductFromOrder(order: {
  originalUrl: string;
  productTitle: string | null;
  productDescription: string;
  productImage: string | null;
}) {
  const u = order.originalUrl?.trim();
  if (!u || !u.startsWith("http")) return null;
  const existing = await prisma.product.findUnique({ where: { originalUrl: u } });
  if (existing) return existing;
  const title = (order.productTitle || order.productDescription || "Produto").trim().slice(0, 300);
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let n = 0;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }
  return prisma.product.create({
    data: {
      originalUrl: u,
      title: order.productDescription?.slice(0, 300) || title,
      titlePt: order.productTitle || title,
      description: null,
      image: order.productImage,
      images: order.productImage ? JSON.stringify([order.productImage]) : null,
      priceCny: null,
      priceBrl: null,
      source: getSourceFromUrl(u),
      category: "outros",
      slug,
      featured: false,
    },
  });
}

// Admin: listar produtos do catálogo (protegido)
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const products = await prisma.product.findMany({
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    });
    const total = await prisma.product.count();
    res.json({ products, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

// Admin: atualizar produto (protegido)
app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim().slice(0, 300);
    if (typeof body.titlePt === "string") updates.titlePt = body.titlePt.trim().slice(0, 300) || null;
    if (typeof body.description === "string") updates.description = body.description.slice(0, 2000) || null;
    if (typeof body.category === "string" && body.category.trim()) updates.category = body.category.trim();
    if (typeof body.featured === "boolean") updates.featured = body.featured;
    if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
    if (typeof body.originalUrl === "string" && body.originalUrl.startsWith("http")) updates.originalUrl = body.originalUrl.trim();
    if (typeof body.source === "string" && body.source.trim()) updates.source = body.source.trim();
    if (typeof body.image === "string") updates.image = body.image.trim() || null;
    if (Array.isArray(body.images)) {
      const urls = body.images.filter((u: unknown) => typeof u === "string" && u.trim().startsWith("http"));
      updates.images = urls.length ? JSON.stringify(urls) : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum campo válido para atualizar" });
    }

    const product = await prisma.product.update({
      where: { id },
      data: updates,
    });
    res.json(product);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    console.error("Admin update product:", err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao atualizar produto") });
  }
});

// Admin: excluir produto (protegido)
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    console.error("Admin delete product:", err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao excluir produto") });
  }
});

// Admin: adicionar produto ao catálogo (protegido)
app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const { url, category = "outros", featured = false } = req.body ?? {};
    const u = (url as string)?.trim();
    if (!u || !u.startsWith("http")) {
      return res.status(400).json({ error: "URL inválida" });
    }

    const existing = await prisma.product.findUnique({ where: { originalUrl: u } });
    if (existing) return res.json(existing);

    const { getProductPreview } = await import("./scraper/productPreview");
    const preview = await getProductPreview(u);
    if (!preview) {
      return res.status(400).json({ error: "Não foi possível obter os dados do produto" });
    }

    const title = (preview.titlePt || preview.title || "Produto").trim().slice(0, 300);
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let n = 0;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++n}`;
    }

    const priceCny = preview.priceCny ?? null;
    let priceBrl: number | null = null;
    if (priceCny != null && priceCny > 0) {
      const costBrl = priceCny * RATE_CNY;
      const margin = costBrl < 40 ? 0.35 : 0.25;
      priceBrl = Math.round(costBrl * (1 + margin) * 100) / 100;
    }

    const product = await prisma.product.create({
      data: {
        originalUrl: u,
        title: preview.title || title,
        titlePt: preview.titlePt || title,
        description: preview.description?.slice(0, 2000) ?? null,
        image: preview.images?.[0] ?? null,
        images: preview.images?.length ? JSON.stringify(preview.images) : null,
        priceCny: priceCny,
        priceBrl: priceBrl,
        source: getSourceFromUrl(u),
        category: (category as string) || "outros",
        slug,
        featured: !!featured,
      },
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Admin add product:", err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao adicionar produto") });
  }
});

// Criar pedido (a partir da página /pedido) — com auto-quote para pagamento imediato
const FREIGHT_ESTIMATE_BRL = 45;

app.post("/api/orders", optionalUser, async (req, res) => {
  try {
    const reqWithUser = req as express.Request & { userId?: string };
    const authUserId = reqWithUser.userId;

    const {
      originalUrl,
      productDescription,
      productTitle,
      productImage,
      productColor,
      productSize,
      productVariation,
      quantity,
      cep,
      shippingMethod,
      notes,
      customerName,
      customerEmail,
      customerWhatsapp,
      customerCpf,
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCity,
      addressState,
      estimatedTotalBrl,
    } = req.body ?? {};

    if (!originalUrl || !productDescription || !quantity || !cep) {
      return res.status(400).json({
        error:
          "Campos obrigatórios: originalUrl, productDescription, quantity, cep",
      });
    }

    const order = await prisma.order.create({
      data: {
        originalUrl,
        productDescription,
        productTitle: productTitle ?? null,
        productImage: productImage ?? null,
        productColor: productColor ?? null,
        productSize: productSize ?? null,
        productVariation: productVariation ?? null,
        quantity: Number(quantity),
        cep,
        shippingMethod: shippingMethod ?? null,
        notes: notes ?? null,
        userId: authUserId ?? null,
        customerName: customerName ?? null,
        customerEmail: customerEmail ?? null,
        customerWhatsapp: customerWhatsapp ?? null,
        customerCpf: customerCpf ?? null,
        addressStreet: addressStreet ?? null,
        addressNumber: addressNumber ?? null,
        addressComplement: addressComplement ?? null,
        addressNeighborhood: addressNeighborhood ?? null,
        addressCity: addressCity ?? null,
        addressState: addressState ?? null,
      },
    });

    // Auto-quote: cria cotação imediata para o cliente poder pagar
    const totalBrl = Number(estimatedTotalBrl) || 0;
    let status = order.status;

    if (totalBrl > 0) {
      const productsBrl = Math.max(1, totalBrl - FREIGHT_ESTIMATE_BRL);
      const productsCny = productsBrl / (RATE_CNY * 1.25);
      const freightCny = FREIGHT_ESTIMATE_BRL / (RATE_CNY * 1.1);

      await prisma.orderQuote.upsert({
        where: { orderId: order.id },
        update: {
          productsCny,
          freightCny,
          serviceFeeBrl: 10,
          taxesEstimatedBrl: 10,
          currencyRateCnyToBrl: RATE_CNY,
          totalBrl: totalBrl,
        },
        create: {
          orderId: order.id,
          productsCny,
          freightCny,
          serviceFeeBrl: 10,
          taxesEstimatedBrl: 10,
          currencyRateCnyToBrl: RATE_CNY,
          totalBrl: totalBrl,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.AGUARDANDO_PAGAMENTO },
      });
      status = OrderStatus.AGUARDANDO_PAGAMENTO;
    }

    // Aviso ao admin: novo pedido
    const siteUrl = (process.env.SITE_URL || "https://compraschina.com.br").replace(/\/$/, "");
    const orderUrl = `${siteUrl}/admin/pedido/${order.id}`;
    const produto = (order.productTitle || order.productDescription || "Produto").slice(0, 50);
    sendTelegram(
      "Novo pedido\n" +
      "Pedido " + order.id.slice(-8) + "\n" +
      "Produto: " + produto + "\n" +
      "Cliente: " + (order.customerName || order.customerEmail || "—") + "\n" +
      "Status: " + (status === OrderStatus.AGUARDANDO_PAGAMENTO ? "Aguardando pagamento" : "Aguardando cotação") + "\n\n" +
      "Gerenciar: " + orderUrl
    ).catch(() => {});

    res.status(201).json({ id: order.id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar pedido" });
  }
});

// Produtos comprados recentemente (para barra "O que estão comprando" na home)
app.get("/api/recent-purchases", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: [OrderStatus.PAGO, OrderStatus.EM_ENVIO, OrderStatus.CONCLUIDO, OrderStatus.ENVIADO_PARA_CSSBUY, OrderStatus.COMPRADO, OrderStatus.NO_ESTOQUE, OrderStatus.AGUARDANDO_ENVIO] } },
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: { originalUrl: true, productTitle: true, productImage: true, productDescription: true },
    });
    const urls = orders.map((o) => o.originalUrl);
    const productsInCatalog = await prisma.product.findMany({
      where: { originalUrl: { in: urls } },
      select: { originalUrl: true, slug: true },
    });
    const slugByUrl = new Map(productsInCatalog.map((p) => [p.originalUrl, p.slug]));
    const items = orders.map((o) => ({
      url: o.originalUrl,
      title: o.productTitle || o.productDescription || "Produto",
      image: o.productImage || null,
      slug: slugByUrl.get(o.originalUrl) ?? null,
    }));
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar compras recentes" });
  }
});

// Buscar um pedido com detalhes (para tela de acompanhamento)
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { quote: true, payment: true, shipment: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
});

// Cache simples para preview de produto (URL -> { data, expires })
const productPreviewCache = new Map<
  string,
  { data: Awaited<ReturnType<typeof import("./scraper/productPreview").getProductPreview>>; expires: number }
>();
const PRODUCT_PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

// Resposta vazia quando o scrape não consegue dados (frontend ainda mostra a página)
const emptyProductPreview = {
  title: null,
  titlePt: null,
  priceCny: null,
  images: [] as string[],
  variants: {} as { color?: string[]; size?: string[]; colorImages?: string[] },
  optionGroups: [] as { name: string; values: string[]; images: string[] }[],
  specs: [] as { key: string; value: string }[],
  description: null,
  rawUrl: "",
  _previewUnavailable: true,
};

// Preview do produto (scraping): título, preço, imagens, variantes
app.get("/api/product/preview", async (req, res) => {
  const url = (req.query.url as string)?.trim() || "";
  console.log("[preview] request received", url.slice(0, 80));
  try {
    if (!url) {
      return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return res.status(400).json({ error: "URL inválida." });
    }

    const cached = productPreviewCache.get(url);
    if (cached && cached.expires > Date.now()) {
      return res.json(cached.data);
    }

    const { getProductPreview } = await import("./scraper/productPreview");
    const data = await getProductPreview(url);
    if (data) {
      productPreviewCache.set(url, { data, expires: Date.now() + PRODUCT_PREVIEW_CACHE_TTL_MS });
      return res.json(data);
    }
    // Scrape falhou: retorna 200 com dados vazios para a página não quebrar
    return res.json({ ...emptyProductPreview, rawUrl: url });
  } catch (err) {
    console.error("[preview] ERROR", err);
    res.status(500).json({ error: "Erro ao buscar preview do produto." });
  }
});

// Taxa de câmbio base (custo para nós) — em produção usar API de câmbio
const RATE_CNY_TO_BRL = 0.75;
const MARGEM_THRESHOLD_BRL = 40;   // abaixo disso: margem maior
const MARGEM_BAIXA_PERCENT = 35;   // produto < R$ 40: +35%
const MARGEM_ALTA_PERCENT = 25;    // produto >= R$ 40: +25%

// Preview de preço: custo em yuan → conversão → margem ComprasChina → preço final em reais
app.get("/api/price/preview", async (req, res) => {
  try {
    const url = (req.query.url as string)?.trim() || "";
    if (!url) {
      return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });
    }

    let productPriceCny: number;
    const cached = productPreviewCache.get(url);
    if (cached?.data?.priceCny != null && typeof cached.data.priceCny === "number") {
      productPriceCny = cached.data.priceCny;
    } else {
      productPriceCny = 128;
    }

    // Custo em reais (nosso custo com o produto em yuan convertido)
    const costBrl = productPriceCny * RATE_CNY_TO_BRL;
    const marginPercent = costBrl < MARGEM_THRESHOLD_BRL ? MARGEM_BAIXA_PERCENT : MARGEM_ALTA_PERCENT;
    const totalProductBrl = costBrl * (1 + marginPercent / 100);

    return res.json({
      originalUrl: url,
      productPriceCny,
      rateCnyToBrl: RATE_CNY_TO_BRL,
      costBrl,
      marginPercent,
      totalProductBrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular preço." });
  }
});

// Atualizar status do pedido (ex.: quando pagamento é confirmado → PAGO)
app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body ?? {};
    const valid = ["AGUARDANDO_COTACAO", "AGUARDANDO_PAGAMENTO", "PAGO", "EM_ENVIO", "CONCLUIDO", "CANCELADO"];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: status as OrderStatus },
    });
    res.json({ id: order.id, status: order.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// Criar/atualizar cotação (fluxo interno/admin - sem auth por enquanto)
app.post("/api/orders/:id/quote", async (req, res) => {
  try {
    const { productsCny, freightCny, serviceFeeBrl, taxesEstimatedBrl, currencyRateCnyToBrl } =
      req.body ?? {};

    if (
      productsCny === undefined ||
      freightCny === undefined ||
      serviceFeeBrl === undefined ||
      taxesEstimatedBrl === undefined ||
      currencyRateCnyToBrl === undefined
    ) {
      return res.status(400).json({
        error:
          "Campos obrigatórios: productsCny, freightCny, serviceFeeBrl, taxesEstimatedBrl, currencyRateCnyToBrl",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const products = Number(productsCny);
    const freight = Number(freightCny);
    const serviceFee = Number(serviceFeeBrl);
    const taxes = Number(taxesEstimatedBrl);
    const rate = Number(currencyRateCnyToBrl);

    const totalBrl = serviceFee + taxes + (products + freight) * rate;

    const quote = await prisma.orderQuote.upsert({
      where: { orderId: order.id },
      update: {
        productsCny: products,
        freightCny: freight,
        serviceFeeBrl: serviceFee,
        taxesEstimatedBrl: taxes,
        currencyRateCnyToBrl: rate,
        totalBrl,
      },
      create: {
        orderId: order.id,
        productsCny: products,
        freightCny: freight,
        serviceFeeBrl: serviceFee,
        taxesEstimatedBrl: taxes,
        currencyRateCnyToBrl: rate,
        totalBrl,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.AGUARDANDO_PAGAMENTO },
    });

    res.json({ quote });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar cotação" });
  }
});

// Mercado Pago - Criar pagamento (Checkout Transparente)
app.post("/api/orders/:id/create-payment", async (req, res) => {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: "Mercado Pago não configurado. Defina MP_ACCESS_TOKEN no .env" });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { quote: true, payment: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    if (order.status !== "AGUARDANDO_PAGAMENTO") {
      return res.status(400).json({
        error: order.status === "PAGO" ? "Este pedido já foi pago." : "Aguardando cotação. O valor será enviado em breve.",
      });
    }

    if (!order.quote) {
      return res.status(400).json({ error: "Cotação ainda não disponível. Aguarde nosso contato." });
    }

    if (order.payment?.status === "PAGO") {
      return res.status(400).json({ error: "Este pedido já foi pago." });
    }

    const totalBrl = Number(order.quote.totalBrl);
    if (totalBrl <= 0) {
      return res.status(400).json({ error: "Valor inválido para pagamento." });
    }

    const {
      token,
      payment_method_id,
      payer_email,
      payer_name,
      installments = 1,
      issuer_id,
      identification_type,
      identification_number,
    } = req.body ?? {};

    const payerEmail = payer_email || order.customerEmail;
    if (!payerEmail) {
      return res.status(400).json({ error: "E-mail do pagador é obrigatório." });
    }

    const isPix = payment_method_id?.toLowerCase() === "pix";
    if (!isPix && !token) {
      return res.status(400).json({ error: "Token do cartão é obrigatório. Use o formulário de pagamento." });
    }

    const { createPayment } = await import("./mercadopago");
    const result = await createPayment({
      accessToken,
      transactionAmount: totalBrl,
      token: token || undefined,
      paymentMethodId: isPix ? "pix" : payment_method_id || "visa",
      payerEmail,
      payerName: payer_name || order.customerName || undefined,
      description: `ComprasChina - Pedido ${order.id}`,
      installments: isPix ? 1 : Number(installments),
      issuerId: issuer_id,
      identificationType: identification_type,
      identificationNumber: identification_number,
    });

    const paymentStatus = result.status === "approved" ? "PAGO" : result.status === "pending" ? "PENDENTE" : "FALHOU";

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        providerPaymentId: String(result.id),
        status: paymentStatus as "PENDENTE" | "PAGO" | "FALHOU" | "ESTORNADO",
        amountBrl: totalBrl,
      },
      create: {
        orderId: order.id,
        provider: "MERCADO_PAGO",
        providerPaymentId: String(result.id),
        status: paymentStatus as "PENDENTE" | "PAGO" | "FALHOU" | "ESTORNADO",
        amountBrl: totalBrl,
      },
    });

    if (result.status === "approved") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAGO },
      });
      try {
        await ensureProductFromOrder({
          originalUrl: order.originalUrl,
          productTitle: order.productTitle,
          productDescription: order.productDescription,
          productImage: order.productImage,
        });
      } catch (err) {
        console.warn("Erro ao adicionar produto ao catálogo:", err);
      }
      const orderUrl = (process.env.SITE_URL || "https://compraschina.com.br").replace(/\/$/, "") + "/admin/pedido/" + order.id;
      sendTelegram(
        "✅ Pedido confirmado\n" +
        "Pedido " + order.id.slice(-8) + "\n" +
        "📦 " + (order.productTitle || order.productDescription).slice(0, 60) + "\n" +
        "💰 R$ " + totalBrl.toFixed(2) + "\n" +
        "👤 " + (order.customerName || order.customerEmail || "—") + "\n\n" +
        "🔗 Gerenciar: " + orderUrl
      ).catch(() => {});
    }

    const poi = result.point_of_interaction as { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } } | undefined;
    res.json({
      paymentId: result.id,
      status: result.status,
      point_of_interaction: poi?.transaction_data ? { transaction_data: poi.transaction_data } : result.point_of_interaction,
      orderStatus: result.status === "approved" ? "PAGO" : order.status,
    });
  } catch (err) {
    console.error("Erro MP:", err);
    res.status(500).json({
      error: safeErrorMessage(err, "Erro ao processar pagamento."),
    });
  }
});

// Webhook Mercado Pago (PIX e pagamentos assíncronos)
app.get("/api/webhooks/mercadopago", async (req, res) => {
  const topic = req.query.topic as string;
  const id = req.query.id as string;
  if (topic !== "payment" || !id) {
    res.status(400).send("Invalid webhook");
    return;
  }
  res.status(200).send("OK");
  processWebhookPayment(id).catch((e) => console.error("Webhook MP:", e));
});

app.post("/api/webhooks/mercadopago", async (req, res) => {
  const body = req.body ?? {};
  const topic = body.topic || req.query.topic;
  const id = String(body.data?.id ?? req.query.id ?? "");
  if (topic !== "payment" || !id) {
    res.status(400).send("Invalid webhook");
    return;
  }
  res.status(200).send("OK");
  processWebhookPayment(id).catch((e) => console.error("Webhook MP:", e));
});

async function processWebhookPayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payment = await res.json().catch(() => null);
  if (!payment || payment.status !== "approved") return;
  const dbPayment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentId },
    include: { order: true },
  });
  if (!dbPayment || dbPayment.order.status === "PAGO") return;
  await prisma.order.update({
    where: { id: dbPayment.orderId },
    data: { status: OrderStatus.PAGO },
  });
  try {
    await ensureProductFromOrder({
      originalUrl: dbPayment.order.originalUrl,
      productTitle: dbPayment.order.productTitle,
      productDescription: dbPayment.order.productDescription,
      productImage: dbPayment.order.productImage,
    });
  } catch (err) {
    console.warn("Erro ao adicionar produto ao catálogo:", err);
  }
  const totalBrl = Number(dbPayment.amountBrl);
  const orderUrl = (process.env.SITE_URL || "https://compraschina.com.br").replace(/\/$/, "") + "/admin/pedido/" + dbPayment.order.id;
  sendTelegram(
    "✅ Pedido confirmado\n" +
    "Pedido " + dbPayment.order.id.slice(-8) + "\n" +
    "📦 " + (dbPayment.order.productTitle || dbPayment.order.productDescription).slice(0, 60) + "\n" +
    "💰 R$ " + totalBrl.toFixed(2) + "\n" +
    "👤 " + (dbPayment.order.customerName || dbPayment.order.customerEmail || "—") + "\n\n" +
    "🔗 Gerenciar: " + orderUrl
  ).catch(() => {});
}

console.log("[startup] binding to port", PORT);
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(isProduction ? `Backend rodando na porta ${PORT}` : `Backend rodando em http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("[FATAL] app.listen error:", err);
  process.exit(1);
});

