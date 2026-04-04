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
import jwt from "jsonwebtoken";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { sendTelegram } from "./telegram";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderStatusEmail,
} from "./email";
import { verifyTurnstile } from "./turnstile";
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireUser,
  optionalUser,
} from "./auth";
import cors from "cors";
import { json } from "body-parser";
import { PrismaClient, OrderStatus, ShippingMethod } from "@prisma/client";
import { marketplaceToCssbuyUrl } from "./scraper/productPreview";

const prisma = new PrismaClient();
const app = express();

// Necessário quando o app está atrás de proxy (Railway, Vercel, etc.) para o rate-limit usar X-Forwarded-For
app.set("trust proxy", 1);

const defaultOrigins = [
  "https://compraschina.com.br",
  "https://www.compraschina.com.br",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];
const envOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const corsOrigins = envOrigins?.length
  ? [...new Set([...defaultOrigins, ...envOrigins])]
  : defaultOrigins;
app.use(cors({ origin: corsOrigins }));
app.use(json());

// Rate limit para rotas de auth (cadastro, login, esqueci senha)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
  standardHeaders: true,
});

const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === "production";

/** Mensagem de erro segura para o cliente (não vaza detalhes internos em produção) */
function safeErrorMessage(err: unknown, fallback: string): string {
  if (!isProduction && err instanceof Error) return err.message;
  return fallback;
}

const ADMIN_SECRET = (process.env.ADMIN_SECRET || "").trim();
const ADMIN_SESSIONS = new Map<string, number>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_CNY = 0.81;
/** Preço exibido = custo em R$ (CNY × taxa) × fator. 2 = dobro do custo. */
const DISPLAY_PRICE_MULTIPLIER = 2;

const ADMIN_JWT_EXPIRES = "7d";

function signAdminToken(): string {
  if (!ADMIN_SECRET) throw new Error("ADMIN_SECRET not set");
  return jwt.sign({ admin: true }, ADMIN_SECRET, {
    expiresIn: ADMIN_JWT_EXPIRES,
  });
}

/** Token é JWT se tiver 2 pontos (header.payload.signature). */
function looksLikeJwt(token: string): boolean {
  return typeof token === "string" && token.split(".").length === 3;
}

function verifyAdminToken(token: string): boolean {
  if (!ADMIN_SECRET || !token || !looksLikeJwt(token)) return false;
  try {
    jwt.verify(token, ADMIN_SECRET) as { admin: boolean };
    return true;
  } catch {
    return false;
  }
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, expires] of ADMIN_SESSIONS.entries()) {
    if (expires < now) ADMIN_SESSIONS.delete(token);
  }
}

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!ADMIN_SECRET) {
    return res
      .status(503)
      .json({ error: "Admin não configurado. Defina ADMIN_SECRET no .env" });
  }
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ")
    ? auth.slice(7).trim()
    : (req.headers["x-admin-token"] as string | undefined)?.trim();
  if (!token) {
    return res.status(401).json({ error: "Token de admin necessário" });
  }
  // JWT: válido após restart do servidor (token tem formato xxx.yyy.zzz)
  if (looksLikeJwt(token) && verifyAdminToken(token)) {
    return next();
  }
  // Fallback: sessão em memória (tokens antigos em hex)
  const expires = ADMIN_SESSIONS.get(token);
  if (expires && expires > Date.now()) {
    return next();
  }
  if (expires) ADMIN_SESSIONS.delete(token);
  return res
    .status(401)
    .json({ error: "Sessão expirada. Faça login novamente." });
}

// Root (alguns proxies fazem healthcheck em /)
app.get("/", (_req, res) =>
  res.json({ status: "ok", service: "compraschina-backend" }),
);

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "compraschina-backend" });
});

// ========== Auth (clientes) ==========

// Cadastro
app.post("/api/auth/register", authRateLimiter, async (req, res) => {
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
      termsAccepted,
      turnstileToken,
    } = req.body ?? {};

    if (!email?.trim())
      return res.status(400).json({ error: "E-mail obrigatório" });
    if (!password || String(password).length < 6)
      return res
        .status(400)
        .json({ error: "Senha deve ter pelo menos 6 caracteres" });
    if (!name?.trim())
      return res.status(400).json({ error: "Nome obrigatório" });
    if (!termsAccepted)
      return res
        .status(400)
        .json({
          error:
            "Você precisa aceitar os Termos de Serviço e a Política de Privacidade",
        });

    const turnstileOk = await verifyTurnstile(
      turnstileToken,
      req.ip || req.socket?.remoteAddress,
    );
    if (!turnstileOk)
      return res
        .status(400)
        .json({
          error:
            "Verificação de segurança falhou. Atualize a página e tente novamente.",
        });

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing)
      return res.status(400).json({ error: "E-mail já cadastrado" });

    const cpf =
      typeof customerCpf === "string" ? customerCpf.replace(/\D/g, "") : null;
    if (!cpf || cpf.length !== 11)
      return res.status(400).json({ error: "CPF inválido (11 dígitos)" });
    const wa =
      typeof customerWhatsapp === "string"
        ? customerWhatsapp.replace(/\D/g, "")
        : null;
    if (!wa) return res.status(400).json({ error: "WhatsApp obrigatório" });
    const cepClean = typeof cep === "string" ? cep.replace(/\D/g, "") : null;
    if (!cepClean || cepClean.length !== 8)
      return res.status(400).json({ error: "CEP inválido (8 dígitos)" });
    if (!addressStreet?.trim())
      return res.status(400).json({ error: "Endereço obrigatório" });
    if (!addressNumber?.trim())
      return res.status(400).json({ error: "Número obrigatório" });
    if (!addressCity?.trim())
      return res.status(400).json({ error: "Cidade obrigatória" });
    if (!addressState?.trim())
      return res.status(400).json({ error: "Estado obrigatório" });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashPassword(String(password)),
        name: name.trim(),
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: verificationExpires,
        termsAcceptedAt: new Date(),
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

    await sendVerificationEmail(user.email, user.name, verificationToken);

    const token = signToken({ userId: user.id });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
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
    console.error("[register]", err);
    const message =
      !isProduction && err instanceof Error
        ? err.message
        : "Erro ao criar conta";
    res.status(500).json({ error: message });
  }
});

// Login
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email?.trim() || !password)
      return res.status(400).json({ error: "E-mail e senha obrigatórios" });

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
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
        emailVerified: user.emailVerified,
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

// Esqueci minha senha (envia e-mail com link)
app.post("/api/auth/forgot-password", authRateLimiter, async (req, res) => {
  try {
    const { email, turnstileToken } = req.body ?? {};
    if (!email?.trim())
      return res.status(400).json({ error: "E-mail obrigatório" });

    const turnstileOk = await verifyTurnstile(
      turnstileToken,
      req.ip || req.socket?.remoteAddress,
    );
    if (!turnstileOk)
      return res
        .status(400)
        .json({
          error:
            "Verificação de segurança falhou. Atualize a página e tente novamente.",
        });

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      });
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    }
    res.json({
      message:
        "Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

// Redefinir senha (com token do e-mail)
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (!token?.trim() || !newPassword || String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ error: "Token e nova senha (mín. 6 caracteres) obrigatórios" });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });
    if (!user)
      return res
        .status(400)
        .json({
          error:
            "Link inválido ou expirado. Solicite uma nova redefinição de senha.",
        });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashPassword(String(newPassword)),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    res.json({ message: "Senha alterada com sucesso. Faça login." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao redefinir senha" });
  }
});

// Confirmar e-mail (link clicado no e-mail)
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const rawToken = req.body?.token;
    const token = typeof rawToken === "string" ? rawToken.trim() : "";
    if (!token) return res.status(400).json({ error: "Token obrigatório" });

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpires: { gt: new Date() },
      },
    });
    if (!user)
      return res
        .status(400)
        .json({
          error:
            "Link inválido ou expirado. Solicite um novo e-mail de confirmação.",
        });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
      },
    });

    const jwt = signToken({ userId: user.id });
    res.json({
      token: jwt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
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
    res.status(500).json({ error: "Erro ao confirmar e-mail" });
  }
});

// Reenviar e-mail de confirmação (usuário logado)
app.post("/api/auth/resend-verification", requireUser, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    if (user.emailVerified)
      return res.status(400).json({ error: "E-mail já confirmado" });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: verificationExpires,
      },
    });
    await sendVerificationEmail(user.email, user.name, verificationToken);
    res.json({
      message:
        "E-mail de confirmação reenviado. Verifique sua caixa de entrada.",
    });
  } catch (err) {
    console.error("[resend-verification]", err);
    const message =
      !isProduction && err instanceof Error
        ? err.message
        : "Erro ao reenviar e-mail";
    res.status(500).json({ error: message });
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
      emailVerified: user.emailVerified,
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

// Atualizar perfil (usuário logado)
app.patch("/api/auth/me", requireUser, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      updates.name = body.name.trim().slice(0, 100);
    }
    if (typeof body.customerWhatsapp === "string") {
      const w = body.customerWhatsapp.replace(/\D/g, "");
      if (w.length >= 10) updates.customerWhatsapp = w;
    }
    if (typeof body.cep === "string") {
      const c = body.cep.replace(/\D/g, "");
      if (c.length === 8) updates.cep = c;
    }
    if (typeof body.addressStreet === "string" && body.addressStreet.trim()) {
      updates.addressStreet = body.addressStreet.trim().slice(0, 200);
    }
    if (typeof body.addressNumber === "string" && body.addressNumber.trim()) {
      updates.addressNumber = body.addressNumber.trim().slice(0, 20);
    }
    if (typeof body.addressComplement === "string") {
      updates.addressComplement =
        body.addressComplement.trim().slice(0, 100) || null;
    }
    if (
      typeof body.addressNeighborhood === "string" &&
      body.addressNeighborhood.trim()
    ) {
      updates.addressNeighborhood = body.addressNeighborhood
        .trim()
        .slice(0, 100);
    }
    if (typeof body.addressCity === "string" && body.addressCity.trim()) {
      updates.addressCity = body.addressCity.trim().slice(0, 100);
    }
    if (
      typeof body.addressState === "string" &&
      body.addressState.trim().length === 2
    ) {
      updates.addressState = body.addressState.trim().toUpperCase();
    }

    // Password change (optional)
    if (typeof body.newPassword === "string" && body.newPassword.length >= 6) {
      if (typeof body.currentPassword !== "string" || !body.currentPassword) {
        return res
          .status(400)
          .json({ error: "Senha atual obrigatória para alterar a senha" });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user)
        return res.status(404).json({ error: "Usuário não encontrado" });
      const valid = await verifyPassword(body.currentPassword, user.password);
      if (!valid)
        return res.status(400).json({ error: "Senha atual incorreta" });
      updates.password = hashPassword(body.newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ error: "Nenhum campo válido para atualizar" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      emailVerified: updated.emailVerified,
      customerCpf: updated.customerCpf,
      customerWhatsapp: updated.customerWhatsapp,
      cep: updated.cep,
      addressStreet: updated.addressStreet,
      addressNumber: updated.addressNumber,
      addressComplement: updated.addressComplement,
      addressNeighborhood: updated.addressNeighborhood,
      addressCity: updated.addressCity,
      addressState: updated.addressState,
    });
  } catch (err) {
    console.error("Update profile:", err);
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao atualizar perfil") });
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

// Produtos salvos (lista)
app.get("/api/auth/me/saved-products", requireUser, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const saved = await prisma.savedProduct.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const slugs = saved.map((s) => s.productSlug);
    if (slugs.length === 0) return res.json({ products: [] });
    const products = await prisma.product.findMany({
      where: { slug: { in: slugs } },
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const ordered = slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
    res.json({ products: ordered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar produtos salvos" });
  }
});

// Adicionar produto aos salvos
app.post("/api/auth/me/saved-products", requireUser, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const slug = typeof req.body?.slug === "string" ? req.body.slug.trim() : "";
    if (!slug)
      return res.status(400).json({ error: "Slug do produto obrigatório" });
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product)
      return res.status(404).json({ error: "Produto não encontrado" });
    await prisma.savedProduct.upsert({
      where: { userId_productSlug: { userId, productSlug: slug } },
      create: { userId, productSlug: slug },
      update: {},
    });
    res.status(201).json({ slug, message: "Produto salvo" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar produto" });
  }
});

// Remover dos salvos
app.delete(
  "/api/auth/me/saved-products/:slug",
  requireUser,
  async (req, res) => {
    try {
      const userId = (req as express.Request & { userId: string }).userId;
      const slug = decodeURIComponent(req.params.slug ?? "").trim();
      if (!slug) return res.status(400).json({ error: "Slug obrigatório" });
      await prisma.savedProduct.deleteMany({
        where: { userId, productSlug: slug },
      });
      res.json({ message: "Removido dos salvos" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao remover" });
    }
  },
);

// Verificar se um slug está salvo (para UI)
app.get(
  "/api/auth/me/saved-products/check/:slug",
  requireUser,
  async (req, res) => {
    try {
      const userId = (req as express.Request & { userId: string }).userId;
      const slug = decodeURIComponent(req.params.slug ?? "").trim();
      const saved = await prisma.savedProduct.findUnique({
        where: { userId_productSlug: { userId, productSlug: slug } },
      });
      res.json({ saved: !!saved });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao verificar" });
    }
  },
);

// Admin login (senha = ADMIN_SECRET do .env)
app.post("/api/admin/login", (req, res) => {
  const password = (
    req.body?.password != null ? String(req.body.password) : ""
  ).trim();
  if (!ADMIN_SECRET) {
    return res.status(503).json({ error: "Admin não configurado." });
  }
  if (password !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Senha incorreta" });
  }
  const token = signAdminToken();
  res.json({ token, expiresIn: 7 * 24 * 60 * 60 * 1000 });
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

// Admin: URL do produto no CSSBuy (para botão "Processar compra")
app.get("/api/admin/orders/:id/cssbuy-url", requireAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { originalUrl: true },
    });
    if (!order?.originalUrl)
      return res.status(404).json({ error: "Pedido ou URL não encontrado" });
    const cssbuyUrl = marketplaceToCssbuyUrl(order.originalUrl);
    res.json({ url: cssbuyUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao obter URL CSSBuy" });
  }
});

// Admin: atualizar envio (tracking) (protegido)
app.patch("/api/admin/orders/:id/shipment", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const trackingCode =
      typeof body.trackingCode === "string"
        ? body.trackingCode.trim() || null
        : null;
    const carrier =
      typeof body.carrier === "string" ? body.carrier.trim() || null : null;
    const status =
      typeof body.status === "string" &&
      ["PENDENTE", "EM_TRANSITO", "ENTREGUE"].includes(body.status)
        ? body.status
        : undefined;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    const shipmentData: Record<string, unknown> = {};
    if (trackingCode !== undefined) shipmentData.trackingCode = trackingCode;
    if (carrier !== undefined) shipmentData.carrier = carrier;
    if (status) shipmentData.status = status;
    if (
      status === "EM_TRANSITO" &&
      !(await prisma.shipment.findUnique({ where: { orderId: id } }))?.shippedAt
    ) {
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
        status:
          (status as "PENDENTE" | "EM_TRANSITO" | "ENTREGUE") ?? "PENDENTE",
        ...(status === "EM_TRANSITO" && { shippedAt: new Date() }),
        ...(status === "ENTREGUE" && { deliveredAt: new Date() }),
      },
    });

    res.json(shipment);
  } catch (err) {
    console.error("Admin update shipment:", err);
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao atualizar envio") });
  }
});

// Admin: atualizar pedido (status, cssbuyOrderId, internalNotes, títulos) (protegido)
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
    if (Object.prototype.hasOwnProperty.call(body, "productTitle")) {
      updates.productTitle =
        typeof body.productTitle === "string" &&
        body.productTitle.trim().length > 0
          ? body.productTitle.trim().slice(0, 300)
          : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "barDisplayTitle")) {
      updates.barDisplayTitle =
        typeof body.barDisplayTitle === "string" &&
        body.barDisplayTitle.trim().length > 0
          ? body.barDisplayTitle.trim().slice(0, 300)
          : null;
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ error: "Nenhum campo válido para atualizar" });
    }

    const order = await prisma.order.update({
      where: { id },
      data: updates,
      include: {
        quote: true,
        payment: true,
        shipment: true,
        user: { select: { email: true, name: true } },
      },
    });
    if (updates.status === OrderStatus.PAGO) {
      try {
        await ensureProductFromOrder({
          originalUrl: order.originalUrl,
          productTitle: order.productTitle,
          productDescription: order.productDescription,
          productImage: order.productImage,
        });
        if (order.orderItemsJson != null) {
          await ensureProductsFromOrderSnapshot(order.orderItemsJson);
        }
      } catch (err) {
        console.warn("Erro ao adicionar produto ao catálogo:", err);
      }
    }
    // Send status email if user is linked and status is user-relevant
    if (updates.status && order.user?.email) {
      sendOrderStatusEmail(
        order.user.email,
        order.user.name,
        order.id,
        updates.status as string,
        order.productTitle || order.productDescription,
      ).catch((err) => console.warn("[email] Order status email failed:", err));
    }
    res.json(order);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    console.error("Admin update order:", err);
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao atualizar pedido") });
  }
});

// Catálogo de produtos — busca e listagem (ordem = mesma do admin, sortOrder)
app.get("/api/products", async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim().toLowerCase();
    const category = (req.query.category as string)?.trim();
    const featured = req.query.featured === "true";
    const limit = Math.min(Number(req.query.limit) || 48, 500);
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
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], // mesma ordem definida no admin (reordenar)
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    const withImageFallback = products.map((p) => {
      if (p.image) return p;
      try {
        const parsed = p.images ? JSON.parse(p.images) : null;
        const first = Array.isArray(parsed)
          ? parsed.find((x) => typeof x === "string" && x.startsWith("http"))
          : null;
        return { ...p, image: first ?? null };
      } catch {
        return p;
      }
    });

    res.json({ products: withImageFallback, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// Produtos mais salvos (por quantidade de usuários que salvaram) — para "Mais salvos" no site ou admin
app.get("/api/products/most-saved", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const grouped = await prisma.$queryRaw<
      { productSlug: string; saveCount: bigint }[]
    >`
      SELECT "productSlug", COUNT(*)::int AS "saveCount"
      FROM "SavedProduct"
      GROUP BY "productSlug"
      ORDER BY "saveCount" DESC
      LIMIT ${limit}
    `;
    const slugs = grouped.map((g) => g.productSlug);
    const countBySlug = new Map(
      grouped.map((g) => [g.productSlug, Number(g.saveCount)]),
    );
    if (slugs.length === 0) return res.json({ items: [], total: 0 });

    const products = await prisma.product.findMany({
      where: { slug: { in: slugs } },
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const items = slugs
      .map((slug) => {
        const product = bySlug.get(slug);
        if (!product) return null;
        return { product, saveCount: countBySlug.get(slug) ?? 0 };
      })
      .filter(
        (x): x is { product: (typeof products)[number]; saveCount: number } =>
          x !== null,
      );

    res.json({ items, total: items.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produtos mais salvos" });
  }
});

app.get("/api/products/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!product)
      return res.status(404).json({ error: "Produto não encontrado" });

    const saveCount = await prisma.savedProduct.count({
      where: { productSlug: product.slug },
    });

    let withImage = product;
    if (!product.image) {
      try {
        const parsed = product.images ? JSON.parse(product.images) : null;
        const first = Array.isArray(parsed)
          ? parsed.find((x) => typeof x === "string" && x.startsWith("http"))
          : null;
        withImage = { ...product, image: first ?? null };
      } catch {
        // keep product
      }
    }
    return res.json({ ...withImage, saveCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 80) || "produto"
  );
}

function getSourceFromUrl(url: string): string {
  const host = url.toLowerCase();
  if (host.includes("1688")) return "1688";
  if (host.includes("taobao")) return "Taobao";
  if (host.includes("weidian")) return "Weidian";
  if (host.includes("tmall")) return "TMALL";
  if (host.includes("jd.com") || host.includes("jd.")) return "JD.com";
  if (host.includes("pinduoduo") || host.includes("yangkeduo"))
    return "Pinduoduo";
  if (host.includes("goofish")) return "Goofish";
  if (host.includes("dangdang")) return "Dangdang";
  if (host.includes("vip.com") || host.includes("vipshop")) return "VIP Shop";
  if (host.includes("yupoo")) return "Yupoo";
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
  const existing = await prisma.product.findUnique({
    where: { originalUrl: u },
  });
  if (existing) return existing;
  const title = (order.productTitle || order.productDescription || "Produto")
    .trim()
    .slice(0, 300);
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

/** Catálogo: uma entrada por item do snapshot do carrinho (pedido pago). */
async function ensureProductsFromOrderSnapshot(orderItemsJson: unknown) {
  if (!Array.isArray(orderItemsJson)) return;
  for (const raw of orderItemsJson) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!url.startsWith("http")) continue;
    const titlePt = typeof row.titlePt === "string" ? row.titlePt : null;
    const title = typeof row.title === "string" ? row.title : null;
    const image = typeof row.image === "string" ? row.image : null;
    const qty = typeof row.quantity === "number" ? row.quantity : 1;
    const desc =
      [titlePt, title].filter(Boolean).join(" — ") || "Produto";
    try {
      await ensureProductFromOrder({
        originalUrl: url,
        productTitle: titlePt || title,
        productDescription:
          `${desc}${qty > 1 ? ` ×${qty}` : ""}`.slice(0, 2000),
        productImage: image,
      });
    } catch (err) {
      console.warn("ensureProductFromOrder (snapshot):", err);
    }
  }
}

// Admin: listar produtos do catálogo (protegido) — ordenação só por sortOrder para reordenar em qualquer posição
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 500);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const products = await prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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

// Admin: dados para resgate / backup (URLs de catálogo, pedidos, previews, usuários — sem senhas)
app.get("/api/admin/data-recovery", requireAdmin, async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        originalUrl: true,
        slug: true,
        title: true,
        titlePt: true,
        featured: true,
        sortOrder: true,
        createdAt: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const orderRows = await prisma.order.findMany({
      select: {
        originalUrl: true,
        productTitle: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const seenOrderUrls = new Set<string>();
    const orderUrls: {
      originalUrl: string;
      productTitle: string | null;
      createdAt: Date;
    }[] = [];
    for (const o of orderRows) {
      const u = o.originalUrl?.trim();
      if (!u) continue;
      if (seenOrderUrls.has(u)) continue;
      seenOrderUrls.add(u);
      orderUrls.push({
        originalUrl: u,
        productTitle: o.productTitle,
        createdAt: o.createdAt,
      });
    }

    const previewSnapshots = await prisma.productPreviewSnapshot.findMany({
      select: { urlKey: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        customerWhatsapp: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      products,
      orderUrls,
      previewSnapshots,
      users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar dados de resgate" });
  }
});

// Admin: atualizar produto (protegido)
app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string" && body.title.trim())
      updates.title = body.title.trim().slice(0, 300);
    if (typeof body.titlePt === "string")
      updates.titlePt = body.titlePt.trim().slice(0, 300) || null;
    if (typeof body.description === "string")
      updates.description = body.description.slice(0, 2000) || null;
    if (typeof body.category === "string" && body.category.trim())
      updates.category = body.category.trim();
    if (typeof body.featured === "boolean") updates.featured = body.featured;
    if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
    if (
      typeof body.originalUrl === "string" &&
      body.originalUrl.startsWith("http")
    )
      updates.originalUrl = body.originalUrl.trim();
    if (typeof body.source === "string" && body.source.trim())
      updates.source = body.source.trim();
    if (typeof body.image === "string")
      updates.image = body.image.trim() || null;
    if (Array.isArray(body.images)) {
      const urls = body.images.filter(
        (u: unknown) => typeof u === "string" && u.trim().startsWith("http"),
      );
      updates.images = urls.length ? JSON.stringify(urls) : null;
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ error: "Nenhum campo válido para atualizar" });
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
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao atualizar produto") });
  }
});

// Admin: reordenar produtos (protegido) — order = array de ids na ordem desejada
app.post("/api/admin/products/reorder", requireAdmin, async (req, res) => {
  try {
    const order = req.body?.order;
    if (!Array.isArray(order) || order.length === 0) {
      return res
        .status(400)
        .json({
          error: "Envie { order: string[] } com os ids na ordem desejada",
        });
    }
    const ids = order
      .filter((id: unknown) => id != null && String(id).length > 0)
      .map((id: unknown) => String(id));
    if (ids.length !== order.length) {
      return res
        .status(400)
        .json({ error: "Array 'order' contém ids inválidos" });
    }
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.product.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    res.json({ ok: true, count: ids.length });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    console.error("Admin reorder products:", err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao reordenar") });
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
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao excluir produto") });
  }
});

// Admin: importar múltiplos produtos em massa (sem scraping) — protegido
app.post("/api/admin/products/bulk-import", requireAdmin, async (req, res) => {
  try {
    const { products } = (req.body ?? {}) as { products?: unknown[] };
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Envie { products: [...] }" });
    }

    function makeSlug(s: string): string {
      return (
        (s || "produto")
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .replace(/-+/g, "-")
          .slice(0, 80) || "produto"
      );
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of products as Record<string, unknown>[]) {
      const url = String(item.url ?? "").trim();
      if (!url || !url.startsWith("http")) {
        errors.push(`URL inválida: ${url}`);
        continue;
      }

      // Skip duplicates
      const existing = await prisma.product.findUnique({
        where: { originalUrl: url },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Generate unique slug
      const baseSlug = makeSlug(
        String(item.titlePt || item.title || "produto"),
      );
      let slug = baseSlug;
      let attempt = 0;
      while (await prisma.product.findUnique({ where: { slug } })) {
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      try {
        await prisma.product.create({
          data: {
            originalUrl: url,
            title:
              String(item.title ?? "")
                .trim()
                .slice(0, 300) || "Produto",
            titlePt: item.titlePt
              ? String(item.titlePt).trim().slice(0, 300)
              : null,
            image: item.image ? String(item.image).trim() : null,
            priceCny: item.priceCny != null ? Number(item.priceCny) : null,
            priceBrl: item.priceBrl != null ? Number(item.priceBrl) : null,
            source: String(item.source ?? "1688").trim(),
            category: String(item.category ?? "outros").trim(),
            slug,
            featured: Boolean(item.featured),
          },
        });
        created++;
      } catch (err) {
        if ((err as { code?: string })?.code === "P2002") {
          skipped++;
        } else {
          errors.push(`Erro ${url}: ${String(err)}`);
        }
      }
    }

    res.json({ created, skipped, errors });
  } catch (err) {
    console.error("Bulk import:", err);
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao importar produtos") });
  }
});

// Admin: atualizar títulos em massa por slug (para sync local→prod)
app.post(
  "/api/admin/products/bulk-update-titles",
  requireAdmin,
  async (req, res) => {
    try {
      const { products } = (req.body ?? {}) as {
        products?: { slug: string; title: string; titlePt?: string | null }[];
      };
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "Array 'products' obrigatório" });
      }
      let updated = 0;
      let notFound = 0;
      const errors: string[] = [];
      for (const item of products) {
        if (!item.slug || !item.title) continue;
        try {
          const data: { title: string; titlePt?: string | null } = {
            title: item.title,
          };
          if (item.titlePt !== undefined)
            data.titlePt = item.titlePt?.trim() || null;
          const result = await prisma.product.updateMany({
            where: { slug: item.slug },
            data,
          });
          if (result.count > 0) updated++;
          else notFound++;
        } catch (err) {
          errors.push(`${item.slug}: ${String(err)}`);
        }
      }
      res.json({ updated, notFound, errors });
    } catch (err) {
      console.error("Bulk update titles:", err);
      res
        .status(500)
        .json({ error: safeErrorMessage(err, "Erro ao atualizar títulos") });
    }
  },
);

// Admin: adicionar produto ao catálogo (protegido)
app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const { url, category = "outros", featured = false } = req.body ?? {};
    const u = (url as string)?.trim();
    if (!u || !u.startsWith("http")) {
      return res.status(400).json({ error: "URL inválida" });
    }

    const existing = await prisma.product.findUnique({
      where: { originalUrl: u },
    });
    if (existing) return res.json(existing);

    const { getProductPreview } = await import("./scraper/productPreview");
    const preview = await getProductPreview(u);
    if (!preview) {
      return res
        .status(400)
        .json({ error: "Não foi possível obter os dados do produto" });
    }

    const title = (preview.titlePt || preview.title || "Produto")
      .trim()
      .slice(0, 300);
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
      priceBrl = Math.round(costBrl * DISPLAY_PRICE_MULTIPLIER * 100) / 100;
    }

    const maxSort = await prisma.product
      .aggregate({ _max: { sortOrder: true } })
      .then((r) => r._max.sortOrder ?? -1);
    const sortOrder = maxSort + 1;

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
        sortOrder,
      },
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Admin add product:", err);
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao adicionar produto") });
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
      checkoutGroupId: bodyCheckoutGroupId,
      orderItemsJson: bodyOrderItemsJson,
    } = req.body ?? {};

    if (!originalUrl || !productDescription || !quantity || !cep) {
      return res.status(400).json({
        error:
          "Campos obrigatórios: originalUrl, productDescription, quantity, cep",
      });
    }

    const checkoutGroupId =
      typeof bodyCheckoutGroupId === "string" &&
      bodyCheckoutGroupId.trim().length > 0
        ? bodyCheckoutGroupId.trim().slice(0, 120)
        : null;

    if (
      bodyOrderItemsJson != null &&
      !Array.isArray(bodyOrderItemsJson)
    ) {
      return res
        .status(400)
        .json({ error: "orderItemsJson deve ser um array quando enviado" });
    }
    const orderItemsJson =
      Array.isArray(bodyOrderItemsJson) && bodyOrderItemsJson.length > 0
        ? bodyOrderItemsJson
        : undefined;

    const totalBrlIncoming = Number(estimatedTotalBrl) || 0;
    if (orderItemsJson && orderItemsJson.length > 0) {
      let sumLineProducts = 0;
      for (const row of orderItemsJson) {
        if (row && typeof row === "object") {
          const v = (row as Record<string, unknown>).lineProductBrl;
          if (typeof v === "number" && Number.isFinite(v) && v >= 0)
            sumLineProducts += v;
        }
      }
      if (
        sumLineProducts > 0 &&
        totalBrlIncoming + 0.02 < sumLineProducts
      ) {
        return res.status(400).json({
          error:
            "Total menor que a soma dos produtos (dados inválidos). Atualize o site e tente novamente.",
        });
      }
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
        // Sempre expresso padrão (mesma base da estimativa no front). EMS/marítimo só pelo admin.
        shippingMethod: ShippingMethod.FJ_BR_EXP,
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
        checkoutGroupId,
        ...(orderItemsJson !== undefined
          ? { orderItemsJson }
          : {}),
      },
    });

    // Auto-quote: cria cotação imediata para o cliente poder pagar
    const totalBrl = totalBrlIncoming;
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
    const siteUrl = (
      process.env.SITE_URL || "https://compraschina.com.br"
    ).replace(/\/$/, "");
    const orderUrl = `${siteUrl}/admin/pedido/${order.id}`;
    const produto = (
      order.productTitle ||
      order.productDescription ||
      "Produto"
    ).slice(0, 50);
    sendTelegram(
      "Novo pedido\n" +
        "Pedido " +
        order.id.slice(-8) +
        "\n" +
        "Produto: " +
        produto +
        "\n" +
        "Cliente: " +
        (order.customerName || order.customerEmail || "—") +
        "\n" +
        "Status: " +
        (status === OrderStatus.AGUARDANDO_PAGAMENTO
          ? "Aguardando pagamento"
          : "Aguardando cotação") +
        "\n\n" +
        "Gerenciar: " +
        orderUrl,
    ).catch(() => {});

    res.status(201).json({ id: order.id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar pedido" });
  }
});

/** Título exibido: prioriza titlePt (não vazio), senão title — alinhado ao site. */
function catalogProductDisplayTitle(
  titlePt: string | null | undefined,
  title: string,
): string {
  const pt = typeof titlePt === "string" ? titlePt.trim() : "";
  if (pt.length > 0) return pt;
  const t = typeof title === "string" ? title.trim() : "";
  if (t.length > 0) return t;
  return "";
}

// Produtos comprados recentemente (para barra "O que estão comprando" na home)
app.get("/api/recent-purchases", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.PAGO,
            OrderStatus.EM_ENVIO,
            OrderStatus.CONCLUIDO,
            OrderStatus.ENVIADO_PARA_CSSBUY,
            OrderStatus.COMPRADO,
            OrderStatus.NO_ESTOQUE,
            OrderStatus.AGUARDANDO_ENVIO,
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      // Amostra maior: depois dedup por URL canônica ainda sobram ~24 itens únicos
      take: 100,
      select: {
        id: true,
        updatedAt: true,
        originalUrl: true,
        productTitle: true,
        barDisplayTitle: true,
        productImage: true,
        productDescription: true,
      },
    });

    // Mesmo produto em vários pedidos: um só card. Quem foi salvo por último no admin
    // (updatedAt) vence — aí o título editado em "Nomes na loja" aparece.
    const byNormKey = new Map<
      string,
      (typeof orders)[number]
    >();
    for (const o of orders) {
      const key = normalizeProductPreviewUrlKey(o.originalUrl);
      const prev = byNormKey.get(key);
      if (!prev || o.updatedAt > prev.updatedAt) byNormKey.set(key, o);
    }
    const uniqueOrders = [...byNormKey.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    ).slice(0, 24);

    const urlCandidates = new Set<string>();
    for (const o of uniqueOrders) {
      const u = o.originalUrl.trim();
      if (u) urlCandidates.add(u);
      urlCandidates.add(normalizeProductPreviewUrlKey(o.originalUrl));
    }
    const productsInCatalog = await prisma.product.findMany({
      where: { originalUrl: { in: [...urlCandidates] } },
      select: {
        originalUrl: true,
        slug: true,
        title: true,
        titlePt: true,
        image: true,
      },
    });
    const catalogByNormKey = new Map<
      string,
      (typeof productsInCatalog)[number]
    >();
    for (const p of productsInCatalog) {
      catalogByNormKey.set(
        normalizeProductPreviewUrlKey(p.originalUrl),
        p,
      );
    }

    const items = uniqueOrders.map((o) => {
      const norm = normalizeProductPreviewUrlKey(o.originalUrl);
      const cat = catalogByNormKey.get(norm);
      const fromCatalog = cat
        ? catalogProductDisplayTitle(cat.titlePt, cat.title)
        : "";
      const barOverride = (o.barDisplayTitle ?? "").trim();
      const orderTitle = (o.productTitle ?? "").trim();
      const title =
        barOverride ||
        orderTitle ||
        fromCatalog ||
        (o.productDescription && o.productDescription.trim()) ||
        "Produto";
      const catalogImg =
        cat?.image && String(cat.image).trim()
          ? String(cat.image).trim()
          : null;
      const image = catalogImg || o.productImage || null;
      return {
        url: o.originalUrl,
        title,
        image,
        slug: cat?.slug ?? null,
      };
    });
    res.set("Cache-Control", "no-store");
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

// Cache simples para preview de produto (URL -> { data, expires }). Tamanho limitado para evitar OOM.
const productPreviewCache = new Map<
  string,
  {
    data: Awaited<
      ReturnType<typeof import("./scraper/productPreview").getProductPreview>
    >;
    expires: number;
  }
>();
const PRODUCT_PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min (permite re-scrape após ajustes)
const PRODUCT_PREVIEW_CACHE_MAX_SIZE = 80; // evita crescimento ilimitado em memória

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

/** Normaliza URL de produto para uma chave única (mesmo link = mesma chave para snapshot). */
function normalizeProductPreviewUrlKey(url: string): string {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    // Weidian: canonical = https://weidian.com/item.html?itemID=XXX
    if (host.includes("weidian")) {
      const itemID =
        u.searchParams.get("itemID") || u.searchParams.get("itemid");
      if (itemID) return `https://weidian.com/item.html?itemID=${itemID}`;
    }
    // Taobao/Tmall: id no path ou query
    if (host.includes("taobao") || host.includes("tmall")) {
      const id =
        u.searchParams.get("id") ||
        u.searchParams.get("item_id") ||
        u.pathname.match(/\/item\/(\d+)/)?.[1];
      if (id) return `https://${host}/item.htm?id=${id}`;
    }
    // 1688: offerId ou id
    if (host.includes("1688")) {
      const id =
        u.searchParams.get("offerId") ||
        u.searchParams.get("id") ||
        u.pathname.match(/\/offer\/(\d+)/)?.[1];
      if (id) return `https://${host}/offer/${id}.html`;
    }
    // Default: origin + pathname + sorted query (estável para mesmo produto)
    const params = Array.from(u.searchParams.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const qs = new URLSearchParams(params).toString();
    return `${u.origin}${u.pathname}${qs ? `?${qs}` : ""}`;
  } catch {
    return url;
  }
}

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

    const urlKey = normalizeProductPreviewUrlKey(url);
    const nocache = (req.query.nocache as string) === "1";

    // 1) Snapshot salvo pelo admin: sempre serve esse para todos (a menos que nocache=1 para forçar re-scrape)
    if (!nocache) {
      const snapshot = await prisma.productPreviewSnapshot.findUnique({
        where: { urlKey },
      });
      if (snapshot?.data) {
        const data = snapshot.data as object;
        return res.json(data);
      }
    }

    const cached = nocache ? null : productPreviewCache.get(url);
    if (cached && cached.expires > Date.now()) {
      return res.json(cached.data);
    }

    const { getProductPreview } = await import("./scraper/productPreview");
    const data = await getProductPreview(url);
    if (data) {
      if (productPreviewCache.size >= PRODUCT_PREVIEW_CACHE_MAX_SIZE) {
        const oldestKey = productPreviewCache.keys().next().value;
        if (oldestKey != null) productPreviewCache.delete(oldestKey);
      }
      productPreviewCache.set(url, {
        data,
        expires: Date.now() + PRODUCT_PREVIEW_CACHE_TTL_MS,
      });
      return res.json(data);
    }
    // Scrape falhou: retorna 200 com dados vazios para a página não quebrar
    return res.json({ ...emptyProductPreview, rawUrl: url });
  } catch (err) {
    console.error("[preview] ERROR", err);
    res.status(500).json({ error: "Erro ao buscar preview do produto." });
  }
});

// Admin: salvar snapshot da página de produto para que todos os usuários vejam a mesma página (sem rodar scrape de novo)
app.post("/api/admin/product-preview/save", requireAdmin, async (req, res) => {
  try {
    const { url: rawUrl, data } = req.body as { url?: string; data?: unknown };
    const url = rawUrl && typeof rawUrl === "string" ? rawUrl.trim() : "";
    if (!url || !url.startsWith("http")) {
      return res
        .status(400)
        .json({
          error:
            "Body deve conter 'url' (URL do produto) e 'data' (objeto do preview).",
        });
    }
    if (!data || typeof data !== "object") {
      return res
        .status(400)
        .json({
          error: "Body deve conter 'data' (objeto do preview do produto).",
        });
    }
    const urlKey = normalizeProductPreviewUrlKey(url);
    await prisma.productPreviewSnapshot.upsert({
      where: { urlKey },
      create: { urlKey, data: data as object },
      update: { data: data as object, updatedAt: new Date() },
    });
    return res.json({ ok: true, urlKey });
  } catch (err) {
    console.error("[admin product-preview save] ERROR", err);
    const msg = err instanceof Error ? err.message : String(err);
    const hint = /does not exist|migrate|ProductPreviewSnapshot/i.test(msg)
      ? " Execute a migration no banco de produção: npx prisma migrate deploy"
      : "";
    res.status(500).json({ error: `Erro ao salvar snapshot.${hint}` });
  }
});

// Taxa de câmbio base (custo para nós) — em produção usar API de câmbio
const RATE_CNY_TO_BRL = RATE_CNY;

// Preview de preço: custo em yuan → conversão → preço ao cliente (custo em R$ × multiplicador)
// Query opcional: priceCny — quando informado (ex.: preço da variante no CSSBuy), usa esse valor em vez do cache
app.get("/api/price/preview", async (req, res) => {
  try {
    const url = (req.query.url as string)?.trim() || "";
    if (!url) {
      return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });
    }
    const paramPrice =
      req.query.priceCny != null
        ? parseFloat(String(req.query.priceCny))
        : null;
    const productPriceCny =
      paramPrice != null && Number.isFinite(paramPrice) && paramPrice > 0
        ? paramPrice
        : (() => {
            const cached = productPreviewCache.get(url);
            return cached?.data?.priceCny != null &&
              typeof cached.data.priceCny === "number"
              ? cached.data.priceCny
              : null;
          })();

    if (productPriceCny == null) {
      return res.json({
        originalUrl: url,
        productPriceCny: null,
        rateCnyToBrl: RATE_CNY_TO_BRL,
        costBrl: null,
        marginPercent: null,
        totalProductBrl: null,
      });
    }

    const costBrl = productPriceCny * RATE_CNY_TO_BRL;
    const marginPercent = (DISPLAY_PRICE_MULTIPLIER - 1) * 100; // ex.: 2× → +100% sobre o custo
    const totalProductBrl = costBrl * DISPLAY_PRICE_MULTIPLIER;

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
    const valid = [
      "AGUARDANDO_COTACAO",
      "AGUARDANDO_PAGAMENTO",
      "PAGO",
      "EM_ENVIO",
      "CONCLUIDO",
      "CANCELADO",
    ];
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
    const {
      productsCny,
      freightCny,
      serviceFeeBrl,
      taxesEstimatedBrl,
      currencyRateCnyToBrl,
    } = req.body ?? {};

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
      return res
        .status(500)
        .json({
          error: "Mercado Pago não configurado. Defina MP_ACCESS_TOKEN no .env",
        });
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
        error:
          order.status === "PAGO"
            ? "Este pedido já foi pago."
            : "Aguardando cotação. O valor será enviado em breve.",
      });
    }

    if (!order.quote) {
      return res
        .status(400)
        .json({
          error: "Cotação ainda não disponível. Aguarde nosso contato.",
        });
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
      return res
        .status(400)
        .json({ error: "E-mail do pagador é obrigatório." });
    }

    const isPix = payment_method_id?.toLowerCase() === "pix";
    if (!isPix && !token) {
      return res
        .status(400)
        .json({
          error:
            "Token do cartão é obrigatório. Use o formulário de pagamento.",
        });
    }

    const { createPayment } = await import("./mercadopago");
    const idempotencyKey = `${order.id}-${crypto.randomUUID()}`;
    const result = await createPayment({
      accessToken,
      idempotencyKey,
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

    const paymentStatus =
      result.status === "approved"
        ? "PAGO"
        : result.status === "pending"
          ? "PENDENTE"
          : "FALHOU";

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
      const orderUrl =
        (process.env.SITE_URL || "https://compraschina.com.br").replace(
          /\/$/,
          "",
        ) +
        "/admin/pedido/" +
        order.id;
      sendTelegram(
        "✅ Pedido confirmado\n" +
          "Pedido " +
          order.id.slice(-8) +
          "\n" +
          "📦 " +
          (order.productTitle || order.productDescription).slice(0, 60) +
          "\n" +
          "💰 R$ " +
          totalBrl.toFixed(2) +
          "\n" +
          "👤 " +
          (order.customerName || order.customerEmail || "—") +
          "\n\n" +
          "🔗 Gerenciar: " +
          orderUrl,
      ).catch(() => {});
    }

    const poi = result.point_of_interaction as
      | {
          transaction_data?: {
            qr_code?: string;
            qr_code_base64?: string;
            ticket_url?: string;
          };
        }
      | undefined;
    res.json({
      paymentId: result.id,
      status: result.status,
      point_of_interaction: poi?.transaction_data
        ? { transaction_data: poi.transaction_data }
        : result.point_of_interaction,
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
  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
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
  const orderUrl =
    (process.env.SITE_URL || "https://compraschina.com.br").replace(/\/$/, "") +
    "/admin/pedido/" +
    dbPayment.order.id;
  sendTelegram(
    "✅ Pedido confirmado\n" +
      "Pedido " +
      dbPayment.order.id.slice(-8) +
      "\n" +
      "📦 " +
      (
        dbPayment.order.productTitle || dbPayment.order.productDescription
      ).slice(0, 60) +
      "\n" +
      "💰 R$ " +
      totalBrl.toFixed(2) +
      "\n" +
      "👤 " +
      (dbPayment.order.customerName || dbPayment.order.customerEmail || "—") +
      "\n\n" +
      "🔗 Gerenciar: " +
      orderUrl,
  ).catch(() => {});
}

console.log("[startup] binding to port", PORT);
app
  .listen(Number(PORT), "0.0.0.0", () => {
    console.log(
      isProduction
        ? `Backend rodando na porta ${PORT}`
        : `Backend rodando em http://localhost:${PORT}`,
    );
  })
  .on("error", (err) => {
    console.error("[FATAL] app.listen error:", err);
    process.exit(1);
  });
