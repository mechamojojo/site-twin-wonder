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
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import express from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { sendTelegram } from "./telegram";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderStatusEmail,
  sendWarehousePhotosEmail,
  sendSupportStaffReplyEmail,
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
import {
  PrismaClient,
  OrderStatus,
  ShippingMethod,
  SupportConversationStatus,
  SupportMessageSender,
} from "@prisma/client";
import { marketplaceToCssbuyUrl } from "./scraper/productPreview";
import { resyncCatalogPrices } from "./resyncCatalogPrices";
import { sellingPriceFromCostBrl } from "./pricing";
import { MAX_ORDER_LINE_QUANTITY } from "./quantityLimits";
import { MP_MAX_INSTALLMENTS_CARD } from "./mercadopago";

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
const frontendUrl = (process.env.FRONTEND_URL ?? "").trim().replace(/\/$/, "");
if (frontendUrl) defaultOrigins.push(frontendUrl);
const envOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const corsOrigins = envOrigins?.length
  ? [...new Set([...defaultOrigins, ...envOrigins])]
  : defaultOrigins;
app.use(cors({ origin: corsOrigins }));
app.use(json({ limit: "2mb" }));

const CATALOG_UPLOAD_DIR = path.join(process.cwd(), "uploads", "catalog");
fs.mkdirSync(CATALOG_UPLOAD_DIR, { recursive: true });

const catalogImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CATALOG_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname || "").toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) ext = ".jpg";
    cb(
      null,
      `cat-${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`,
    );
  },
});

const uploadCatalogImageMulter = multer({
  storage: catalogImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Formato inválido. Use JPG, PNG, WebP ou GIF."));
  },
});

app.use("/uploads/catalog", express.static(CATALOG_UPLOAD_DIR));

const ORDER_WAREHOUSE_DIR = path.join(process.cwd(), "uploads", "order-warehouse");
fs.mkdirSync(ORDER_WAREHOUSE_DIR, { recursive: true });

const orderWarehouseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ORDER_WAREHOUSE_DIR),
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname || "").toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) ext = ".jpg";
    cb(
      null,
      `wh-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`,
    );
  },
});

const uploadOrderWarehouseMulter = multer({
  storage: orderWarehouseStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Formato inválido. Use JPG, PNG, WebP ou GIF."));
  },
});

app.use("/uploads/order-warehouse", express.static(ORDER_WAREHOUSE_DIR));

const MAX_WAREHOUSE_PHOTOS_PER_ORDER = 24;

function parseWarehousePhotosJson(val: unknown): string[] {
  if (val == null) return [];
  if (!Array.isArray(val)) return [];
  return val.filter(
    (x): x is string =>
      typeof x === "string" &&
      x.startsWith("/uploads/order-warehouse/") &&
      !x.includes(".."),
  );
}

function isValidWarehousePhotoPath(p: string): boolean {
  return (
    typeof p === "string" &&
    /^\/uploads\/order-warehouse\/[a-zA-Z0-9._-]+$/.test(p)
  );
}

// Rate limit para rotas de auth (cadastro, login, esqueci senha)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
  standardHeaders: true,
});

const supportPostRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Muitas mensagens. Tente novamente em alguns minutos." },
  standardHeaders: true,
});

const SUPPORT_MSG_MAX_LEN = 4000;

function trimSupportText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function isSimpleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function supportVisitorTokenFromReq(
  req: express.Request,
  body: { visitorToken?: unknown },
): string | undefined {
  const q = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (q) return q.slice(0, 128);
  const b =
    typeof body.visitorToken === "string" ? body.visitorToken.trim() : "";
  if (b) return b.slice(0, 128);
  return undefined;
}

async function assertUserSupportAccess(
  conversationId: string,
  userId: string | undefined,
  visitorToken: string | undefined,
) {
  const conv = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conv) {
    return {
      ok: false as const,
      status: 404,
      error: "Conversa não encontrada.",
    };
  }
  if (userId && conv.userId === userId) {
    return { ok: true as const, conv };
  }
  if (conv.visitorToken && visitorToken && conv.visitorToken === visitorToken) {
    return { ok: true as const, conv };
  }
  return {
    ok: false as const,
    status: 403,
    error: "Acesso negado a esta conversa.",
  };
}

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
/** Frete estimado (R$) na cotação automática — igual ao POST /api/orders */
const FREIGHT_ESTIMATE_BRL = 45;

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
      return res.status(400).json({
        error:
          "Você precisa aceitar os Termos de Serviço e a Política de Privacidade",
      });

    const turnstileOk = await verifyTurnstile(
      turnstileToken,
      req.ip || req.socket?.remoteAddress,
    );
    if (!turnstileOk)
      return res.status(400).json({
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
      return res.status(400).json({
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
      return res.status(400).json({
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
      return res.status(400).json({
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

/**
 * Agrupa pedidos selecionados em um novo checkoutGroupId para um único pagamento em /pagar/:id
 * (ex.: cliente pagou só 1 de 6 — admin escolhe os 5 em aberto e gera o link).
 */
app.post("/api/admin/orders/payment-link", requireAdmin, async (req, res) => {
  try {
    const raw = req.body?.orderIds;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({
        error: "Informe orderIds: array com os IDs dos pedidos a incluir no link.",
      });
    }
    const uniqueIds = [
      ...new Set(
        raw
          .map((x: unknown) => String(x ?? "").trim())
          .filter((s: string) => s.length > 0),
      ),
    ];
    if (uniqueIds.length === 0) {
      return res.status(400).json({ error: "Nenhum ID de pedido válido." });
    }

    const rows = await prisma.order.findMany({
      where: { id: { in: uniqueIds } },
      include: { quote: true, payment: true },
    });
    if (rows.length !== uniqueIds.length) {
      return res.status(400).json({
        error: "Um ou mais pedidos não foram encontrados.",
      });
    }

    const emails = new Set(
      rows.map((r) => r.customerEmail?.trim().toLowerCase() ?? ""),
    );
    const emailArr = [...emails];
    if (emailArr.length !== 1 || !emailArr[0]) {
      return res.status(400).json({
        error:
          "Todos os pedidos devem ser do mesmo cliente (mesmo e-mail de contato).",
      });
    }

    for (const r of rows) {
      if (r.status !== OrderStatus.AGUARDANDO_PAGAMENTO) {
        return res.status(400).json({
          error: `O pedido …${r.id.slice(-8)} não está aguardando pagamento (status: ${r.status}).`,
        });
      }
      if (!r.quote || Number(r.quote.totalBrl) <= 0) {
        return res.status(400).json({
          error: `O pedido …${r.id.slice(-8)} não tem cotação em reais válida.`,
        });
      }
      if (
        r.payment &&
        (r.payment.status === "PAGO" || r.payment.status === "PENDENTE")
      ) {
        return res.status(400).json({
          error: `O pedido …${r.id.slice(-8)} já tem registro de pagamento no Mercado Pago.`,
        });
      }
    }

    const newGroupId = crypto.randomUUID();
    await prisma.$transaction(
      uniqueIds.map((id) =>
        prisma.order.update({
          where: { id },
          data: { checkoutGroupId: newGroupId },
        }),
      ),
    );

    const anchor = [...rows].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )[0]!;
    const totalBrl =
      Math.round(
        rows.reduce((s, r) => s + Number(r.quote!.totalBrl), 0) * 100,
      ) / 100;
    const siteBase = (
      process.env.SITE_URL || "https://compraschina.com.br"
    ).replace(/\/$/, "");
    const url = `${siteBase}/pagar/${anchor.id}`;

    res.json({
      url,
      checkoutGroupId: newGroupId,
      anchorOrderId: anchor.id,
      orderCount: rows.length,
      totalBrl,
    });
  } catch (err) {
    console.error("[admin payment-link]", err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao gerar link.") });
  }
});

// Admin: obter pedido único (protegido)
app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        quote: true,
        payment: true,
        shipment: true,
        user: { select: { email: true, name: true } },
      },
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

// Admin: upload de fotos do produto no armazém (QC)
app.post(
  "/api/admin/orders/:id/warehouse-photos",
  requireAdmin,
  (req, res, next) => {
    uploadOrderWarehouseMulter.array("photos", 12)(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof Error) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) {
        return res
          .status(400)
          .json({ error: "Envie ao menos uma imagem (campo photos)." });
      }
      const { id } = req.params;
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      const existing = parseWarehousePhotosJson(order.warehousePhotosJson);
      const room = MAX_WAREHOUSE_PHOTOS_PER_ORDER - existing.length;
      if (room <= 0) {
        return res.status(400).json({
          error: `Limite de ${MAX_WAREHOUSE_PHOTOS_PER_ORDER} fotos por pedido.`,
        });
      }
      const slice = files.slice(0, room);
      const newPaths = slice.map(
        (f) => `/uploads/order-warehouse/${f.filename}`,
      );
      const nextArr = [...existing, ...newPaths];
      const updated = await prisma.order.update({
        where: { id },
        data: { warehousePhotosJson: nextArr },
        include: {
          quote: true,
          payment: true,
          shipment: true,
          user: { select: { email: true, name: true } },
        },
      });
      res.json(updated);
    } catch (err) {
      console.error("Admin warehouse photos upload:", err);
      res.status(500).json({ error: "Erro ao salvar fotos" });
    }
  },
);

// Admin: remover uma foto do armazém
app.post(
  "/api/admin/orders/:id/warehouse-photos/remove",
  requireAdmin,
  async (req, res) => {
    try {
      const pathStr =
        typeof req.body?.path === "string" ? req.body.path.trim() : "";
      if (!isValidWarehousePhotoPath(pathStr)) {
        return res.status(400).json({ error: "Path inválido" });
      }
      const { id } = req.params;
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      const existing = parseWarehousePhotosJson(order.warehousePhotosJson);
      if (!existing.includes(pathStr)) {
        return res
          .status(404)
          .json({ error: "Foto não encontrada neste pedido" });
      }
      const nextArr = existing.filter((p) => p !== pathStr);
      const fn = path.basename(pathStr);
      const abs = path.join(ORDER_WAREHOUSE_DIR, fn);
      if (abs.startsWith(ORDER_WAREHOUSE_DIR) && fs.existsSync(abs)) {
        try {
          fs.unlinkSync(abs);
        } catch (e) {
          console.warn("warehouse photo unlink:", e);
        }
      }
      const updated = await prisma.order.update({
        where: { id },
        data: { warehousePhotosJson: nextArr },
        include: {
          quote: true,
          payment: true,
          shipment: true,
          user: { select: { email: true, name: true } },
        },
      });
      res.json(updated);
    } catch (err) {
      console.error("Admin warehouse photo remove:", err);
      res.status(500).json({ error: "Erro ao remover foto" });
    }
  },
);

// Admin: enviar e-mail ao cliente com links das fotos do armazém
app.post(
  "/api/admin/orders/:id/email-warehouse-photos",
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: { user: { select: { email: true, name: true } } },
      });
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      const photos = parseWarehousePhotosJson(order.warehousePhotosJson);
      if (photos.length === 0) {
        return res
          .status(400)
          .json({ error: "Adicione fotos do armazém antes de enviar o e-mail." });
      }
      const email =
        order.customerEmail?.trim() || order.user?.email?.trim() || "";
      if (!email) {
        return res
          .status(400)
          .json({ error: "Cliente sem e-mail (pedido ou conta)." });
      }
      const name =
        order.customerName?.trim() || order.user?.name?.trim() || "Cliente";
      const customNote =
        typeof req.body?.message === "string"
          ? req.body.message.trim().slice(0, 1000)
          : "";
      const ok = await sendWarehousePhotosEmail(
        email,
        name,
        order.id,
        order.productTitle || order.productDescription,
        photos,
        customNote || undefined,
      );
      if (!ok) {
        return res.status(500).json({
          error:
            "Não foi possível enviar o e-mail. Verifique RESEND_API_KEY e API_PUBLIC_URL (URL pública do backend para as imagens).",
        });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("Admin email warehouse photos:", err);
      res.status(500).json({ error: "Erro ao enviar e-mail" });
    }
  },
);

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
    if (Object.prototype.hasOwnProperty.call(body, "hideFromRecentPurchasesBar")) {
      updates.hideFromRecentPurchasesBar = Boolean(
        body.hideFromRecentPurchasesBar,
      );
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

/** Lista explícita — evita depender só de Object.values em runtime (bundlers / Prisma). */
const ORDER_STATUS_VALUES = new Set<string>([
  OrderStatus.AGUARDANDO_COTACAO,
  OrderStatus.AGUARDANDO_PAGAMENTO,
  OrderStatus.PAGO,
  OrderStatus.ENVIADO_PARA_CSSBUY,
  OrderStatus.COMPRADO,
  OrderStatus.NO_ESTOQUE,
  OrderStatus.AGUARDANDO_ENVIO,
  OrderStatus.EM_ENVIO,
  OrderStatus.CONCLUIDO,
  OrderStatus.CANCELADO,
]);

/** Preenche endereço do pedido com perfil do usuário quando o corpo omite. */
function orderShippingDefaultsFromUser(
  user: {
    name: string;
    email: string;
    customerCpf: string | null;
    customerWhatsapp: string | null;
    cep: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
  },
  body: Record<string, unknown>,
) {
  const s = (k: string): string | undefined =>
    typeof body[k] === "string" ? (body[k] as string).trim() : undefined;
  return {
    customerName: s("customerName") || user.name,
    customerEmail: s("customerEmail") || user.email,
    customerWhatsapp:
      (s("customerWhatsapp")?.replace(/\D/g, "") || user.customerWhatsapp) ??
      null,
    customerCpf:
      (s("customerCpf")?.replace(/\D/g, "") || user.customerCpf) ?? null,
    cep: (s("cep")?.replace(/\D/g, "") || user.cep) ?? "",
    addressStreet: s("addressStreet") || user.addressStreet || null,
    addressNumber: s("addressNumber") || user.addressNumber || null,
    addressComplement: s("addressComplement") || user.addressComplement || null,
    addressNeighborhood:
      s("addressNeighborhood") || user.addressNeighborhood || null,
    addressCity: s("addressCity") || user.addressCity || null,
    addressState: s("addressState") || user.addressState || null,
  };
}

type ManualOrderDb = Pick<PrismaClient, "order" | "orderQuote">;

async function createAdminManualOrder(
  db: ManualOrderDb,
  userId: string,
  userRow: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>,
  body: Record<string, unknown>,
) {
  const originalUrl =
    typeof body.originalUrl === "string" ? body.originalUrl.trim() : "";
  const productDescription =
    typeof body.productDescription === "string"
      ? body.productDescription.trim()
      : "";
  if (!originalUrl || !productDescription) {
    return {
      error: "originalUrl e productDescription são obrigatórios" as const,
    };
  }

  const qty = Number(body.quantity);
  if (!Number.isFinite(qty) || qty < 1 || qty > MAX_ORDER_LINE_QUANTITY) {
    return {
      error: `quantity inválida (1–${MAX_ORDER_LINE_QUANTITY})` as const,
    };
  }

  const statusRaw =
    typeof body.status === "string" && body.status.trim()
      ? body.status.trim()
      : "COMPRADO";
  if (!ORDER_STATUS_VALUES.has(statusRaw)) {
    return { error: `status inválido: ${statusRaw}` as const };
  }

  const ship = orderShippingDefaultsFromUser(userRow, body);
  if (!ship.cep || ship.cep.length !== 8) {
    return {
      error:
        "CEP do pedido inválido (8 dígitos). Preencha no pedido ou no perfil do cliente." as const,
    };
  }

  let createdAt: Date | undefined;
  if (body.createdAt != null) {
    const d = new Date(String(body.createdAt));
    if (!Number.isNaN(d.getTime())) createdAt = d;
  }

  const productTitle =
    typeof body.productTitle === "string" && body.productTitle.trim()
      ? body.productTitle.trim().slice(0, 300)
      : null;
  const productImage =
    typeof body.productImage === "string" && body.productImage.trim()
      ? body.productImage.trim().slice(0, 2000)
      : null;
  const productColor =
    typeof body.productColor === "string" && body.productColor.trim()
      ? body.productColor.trim().slice(0, 200)
      : null;
  const productSize =
    typeof body.productSize === "string" && body.productSize.trim()
      ? body.productSize.trim().slice(0, 500)
      : null;
  const productVariation =
    typeof body.productVariation === "string" && body.productVariation.trim()
      ? body.productVariation.trim().slice(0, 500)
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, 2000)
      : null;
  const cssbuyOrderId =
    typeof body.cssbuyOrderId === "string" && body.cssbuyOrderId.trim()
      ? body.cssbuyOrderId.trim().slice(0, 120)
      : null;
  const internalNotes =
    typeof body.internalNotes === "string" && body.internalNotes.trim()
      ? body.internalNotes.trim().slice(0, 2000)
      : null;

  const order = await db.order.create({
    data: {
      userId,
      originalUrl,
      productDescription,
      productTitle,
      productImage,
      productColor,
      productSize,
      productVariation,
      quantity: qty,
      cep: ship.cep,
      shippingMethod: ShippingMethod.FJ_BR_EXP,
      status: statusRaw as OrderStatus,
      notes,
      cssbuyOrderId,
      internalNotes,
      customerName: ship.customerName,
      customerEmail: ship.customerEmail,
      customerWhatsapp: ship.customerWhatsapp,
      customerCpf: ship.customerCpf,
      addressStreet: ship.addressStreet,
      addressNumber: ship.addressNumber,
      addressComplement: ship.addressComplement,
      addressNeighborhood: ship.addressNeighborhood,
      addressCity: ship.addressCity,
      addressState: ship.addressState,
      ...(createdAt ? { createdAt } : {}),
    },
  });

  const quoteTotal = Number(body.quoteTotalBrl);
  if (Number.isFinite(quoteTotal) && quoteTotal > 0) {
    const productsBrl = Math.max(1, quoteTotal - FREIGHT_ESTIMATE_BRL);
    const productsCny = productsBrl / (RATE_CNY * 1.25);
    const freightCny = FREIGHT_ESTIMATE_BRL / (RATE_CNY * 1.1);
    await db.orderQuote.create({
      data: {
        orderId: order.id,
        productsCny,
        freightCny,
        serviceFeeBrl: 10,
        taxesEstimatedBrl: 10,
        currencyRateCnyToBrl: RATE_CNY,
        totalBrl: quoteTotal,
      },
    });
  }

  return { order };
}

// Admin: criar conta de cliente + pedidos retroativos (sem Telegram / e-mail automático)
app.post("/api/admin/users/bootstrap", requireAdmin, async (req, res) => {
  try {
    const payload = req.body ?? {};
    const u = payload.user ?? payload;
    const ordersIn = Array.isArray(payload.orders) ? payload.orders : [];

    const email =
      typeof u.email === "string" ? u.email.trim().toLowerCase() : "";
    const name = typeof u.name === "string" ? u.name.trim() : "";
    if (!email || !name) {
      return res
        .status(400)
        .json({ error: "E-mail e nome do cliente são obrigatórios" });
    }

    let password =
      typeof u.password === "string" && u.password.length >= 6
        ? u.password
        : "";
    const generatedPassword = !password;
    if (!password) {
      password = crypto.randomBytes(12).toString("base64url").slice(0, 14);
      if (password.length < 6) password += "Aa1!xx";
    }

    const cpf =
      typeof u.customerCpf === "string" ? u.customerCpf.replace(/\D/g, "") : "";
    if (cpf.length !== 11) {
      return res.status(400).json({ error: "CPF inválido (11 dígitos)" });
    }
    const wa =
      typeof u.customerWhatsapp === "string"
        ? u.customerWhatsapp.replace(/\D/g, "")
        : "";
    if (!wa) {
      return res.status(400).json({ error: "WhatsApp obrigatório" });
    }
    const cepClean = typeof u.cep === "string" ? u.cep.replace(/\D/g, "") : "";
    if (cepClean.length !== 8) {
      return res.status(400).json({ error: "CEP inválido (8 dígitos)" });
    }
    if (
      typeof u.addressStreet !== "string" ||
      !u.addressStreet.trim() ||
      typeof u.addressNumber !== "string" ||
      !u.addressNumber.trim()
    ) {
      return res
        .status(400)
        .json({ error: "Rua e número do endereço são obrigatórios" });
    }
    if (
      typeof u.addressCity !== "string" ||
      !u.addressCity.trim() ||
      typeof u.addressState !== "string" ||
      !u.addressState.trim()
    ) {
      return res
        .status(400)
        .json({ error: "Cidade e estado são obrigatórios" });
    }

    if (ordersIn.length === 0) {
      return res
        .status(400)
        .json({ error: "Inclua ao menos um pedido em orders: [...]" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        error:
          "E-mail já cadastrado. Use POST /api/admin/users/:userId/orders com o userId deste cliente.",
        userId: existing.id,
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashPassword(password),
            name,
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationTokenExpires: null,
            termsAcceptedAt: new Date(),
            customerCpf: cpf,
            customerWhatsapp: wa,
            cep: cepClean,
            addressStreet: u.addressStreet.trim(),
            addressNumber: u.addressNumber.trim(),
            addressComplement:
              typeof u.addressComplement === "string"
                ? u.addressComplement.trim() || null
                : null,
            addressNeighborhood:
              typeof u.addressNeighborhood === "string"
                ? u.addressNeighborhood.trim() || null
                : null,
            addressCity: u.addressCity.trim(),
            addressState: u.addressState.trim(),
          },
        });

        const orderIds: string[] = [];
        for (const raw of ordersIn) {
          if (!raw || typeof raw !== "object") continue;
          const row = await createAdminManualOrder(
            tx,
            user.id,
            user,
            raw as Record<string, unknown>,
          );
          if ("error" in row) {
            throw new Error(row.error);
          }
          orderIds.push(row.order.id);
        }
        if (orderIds.length === 0) {
          throw new Error("Nenhum pedido válido em orders");
        }
        return { user, orderIds };
      },
      { maxWait: 15_000, timeout: 30_000 },
    );

    res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      orderIds: result.orderIds,
      ...(generatedPassword ? { temporaryPassword: password } : {}),
    });
  } catch (err) {
    const prismaCode =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (prismaCode === "P2002") {
      return res.status(409).json({
        error:
          "Registro duplicado (ex.: e-mail já existe). Use a aba “Só pedido” com o userId ou outro e-mail.",
      });
    }
    if (prismaCode === "P2028") {
      return res.status(503).json({
        error:
          "Tempo esgotado no banco de dados. Tente de novo em instantes ou com menos pedidos de uma vez.",
      });
    }
    const msg = err instanceof Error ? err.message : String(err);
    // Erros de validação vindos de createAdminManualOrder (inclui "inválida", não só "inválido")
    if (
      /inválid|obrigatório|originalUrl|quantity|CEP|status|Nenhum pedido/i.test(
        msg,
      )
    ) {
      return res.status(400).json({ error: msg });
    }
    console.error("Admin bootstrap user:", err);
    res
      .status(500)
      .json({
        error: safeErrorMessage(err, "Erro ao criar cliente e pedidos"),
      });
  }
});

// Admin: adicionar pedido retroativo a um usuário existente
app.post("/api/admin/users/:userId/orders", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRow = await prisma.user.findUnique({ where: { id: userId } });
    if (!userRow) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const body = req.body ?? {};
    const row = await createAdminManualOrder(
      prisma,
      userId,
      userRow,
      body as Record<string, unknown>,
    );
    if ("error" in row) {
      return res.status(400).json({ error: row.error });
    }

    res.status(201).json({
      id: row.order.id,
      status: row.order.status,
    });
  } catch (err) {
    console.error("Admin manual order:", err);
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao criar pedido") });
  }
});

// Admin: recalcular priceBrl a partir de priceCny (substitui script CLI em produção)
app.post(
  "/api/admin/catalog/resync-prices",
  requireAdmin,
  async (_req, res) => {
    try {
      const { updated, skipped } = await resyncCatalogPrices(prisma);
      res.json({ ok: true, updated, skipped });
    } catch (err) {
      console.error("Admin resync catalog prices:", err);
      res.status(500).json({
        error: safeErrorMessage(err, "Erro ao sincronizar preços do catálogo"),
      });
    }
  },
);

/** JSON: Prisma Decimal vira string — normaliza para número no cliente. */
function serializeCatalogProduct<
  P extends { priceCny: unknown; priceBrl: unknown },
>(
  p: P,
): Omit<P, "priceCny" | "priceBrl"> & {
  priceCny: number | null;
  priceBrl: number | null;
} {
  const cnyRaw = p.priceCny;
  const brlRaw = p.priceBrl;
  const cny =
    cnyRaw != null && String(cnyRaw) !== ""
      ? Number(cnyRaw as string | number)
      : null;
  const brl =
    brlRaw != null && String(brlRaw) !== ""
      ? Number(brlRaw as string | number)
      : null;
  return {
    ...p,
    priceCny: cny != null && Number.isFinite(cny) ? cny : null,
    priceBrl: brl != null && Number.isFinite(brl) ? brl : null,
  };
}

function serializeProductForApi(
  p: Parameters<typeof serializeCatalogProduct>[0] & {
    supplier?: { name: string; slug: string } | null;
  },
) {
  const { supplier, ...rest } = p;
  return {
    ...serializeCatalogProduct(rest),
    supplierName: supplier?.name ?? null,
    supplierSlug: supplier?.slug ?? null,
  };
}

app.get("/api/suppliers", async (_req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { products: true } },
      },
    });
    res.json({
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        productCount: s._count.products,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar fornecedores" });
  }
});

// Catálogo de produtos — busca e listagem (ordem = mesma do admin, sortOrder)
app.get("/api/products", async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim().toLowerCase();
    const category = (req.query.category as string)?.trim();
    const featured = req.query.featured === "true";
    const fornecedor = (req.query.fornecedor as string)?.trim();
    const limit = Math.min(Number(req.query.limit) || 48, 500);
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const where: Record<string, unknown> = {};
    if (featured) where.featured = true;
    if (category) where.category = category;
    if (fornecedor) {
      where.supplier = { slug: fornecedor };
    }
    if (q && q.length >= 2) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { titlePt: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { originalUrl: { contains: q, mode: "insensitive" } },
        { supplier: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { supplier: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], // mesma ordem definida no admin (reordenar)
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    const withImageFallback = products.map((p) => {
      let row = p;
      if (!p.image) {
        try {
          const parsed = p.images ? JSON.parse(p.images) : null;
          const first = Array.isArray(parsed)
            ? parsed.find((x) => typeof x === "string" && x.startsWith("http"))
            : null;
          row = { ...p, image: first ?? null };
        } catch {
          row = p;
        }
      }
      return serializeProductForApi(row);
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
      include: { supplier: true },
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const items = slugs
      .map((slug) => {
        const product = bySlug.get(slug);
        if (!product) return null;
        return {
          product: serializeProductForApi(product),
          saveCount: countBySlug.get(slug) ?? 0,
        };
      })
      .filter(
        (
          x,
        ): x is {
          product: ReturnType<typeof serializeProductForApi>;
          saveCount: number;
        } => x !== null,
      );

    res.json({ items, total: items.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produtos mais salvos" });
  }
});

// Preço alinhado ao Explorar: mesmo link do catálogo (URL exata) — usado na página /pedido
app.get("/api/products/match-url", async (req, res) => {
  try {
    const raw = String(req.query.url ?? "").trim();
    if (!raw.startsWith("http")) {
      return res.status(400).json({ error: "Parâmetro url inválido" });
    }
    const product = await prisma.product.findFirst({
      where: { originalUrl: raw },
      select: { priceCny: true, priceBrl: true, slug: true },
    });
    if (!product) return res.json({ product: null });
    res.json({ product: serializeCatalogProduct(product) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

app.get("/api/products/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { supplier: true },
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
    return res.json({
      ...serializeProductForApi(withImage),
      saveCount,
    });
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

async function findOrCreateSupplier(name: string) {
  const n = name.trim().slice(0, 120);
  if (!n) return null;
  const existing = await prisma.supplier.findFirst({
    where: { name: { equals: n, mode: "insensitive" } },
  });
  if (existing) return existing;
  const baseSlug = slugify(n.normalize("NFD").replace(/\p{Diacritic}/gu, "")) || "fornecedor";
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.supplier.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
  return prisma.supplier.create({
    data: { name: n, slug, sortOrder: 0 },
  });
}

function getSourceFromUrl(url: string): string {
  const host = url.toLowerCase();
  if (host.includes("cssbuy") && host.includes("item-xianyu")) return "Goofish";
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
    const desc = [titlePt, title].filter(Boolean).join(" — ") || "Produto";
    try {
      await ensureProductFromOrder({
        originalUrl: url,
        productTitle: titlePt || title,
        productDescription: `${desc}${qty > 1 ? ` ×${qty}` : ""}`.slice(
          0,
          2000,
        ),
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
      include: { supplier: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: limit,
      skip: offset,
    });
    const total = await prisma.product.count();
    res.json({
      products: products.map((p) => serializeProductForApi(p)),
      total,
    });
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

// Admin: upload de imagem do catálogo (home / Explorar) — retorna path para compor URL pública
app.post(
  "/api/admin/products/upload-image",
  requireAdmin,
  (req, res, next) => {
    uploadCatalogImageMulter.single("image")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "Arquivo muito grande (máximo 5 MB)" });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({
          error:
            err instanceof Error ? err.message : "Erro ao processar arquivo",
        });
      }
      next();
    });
  },
  (req, res) => {
    const f = req.file;
    if (!f?.filename) {
      return res
        .status(400)
        .json({
          error: "Envie uma imagem (campo image). JPG, PNG, WebP ou GIF.",
        });
    }
    res.json({ path: `/uploads/catalog/${f.filename}` });
  },
);

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
    if (body.supplierId === null) {
      updates.supplierId = null;
    } else if (typeof body.supplierName === "string") {
      const sn = body.supplierName.trim();
      if (!sn) {
        updates.supplierId = null;
      } else {
        const s = await findOrCreateSupplier(sn);
        if (s) updates.supplierId = s.id;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ error: "Nenhum campo válido para atualizar" });
    }

    const product = await prisma.product.update({
      where: { id },
      data: updates,
      include: { supplier: true },
    });
    res.json(serializeProductForApi(product));
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
      return res.status(400).json({
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

// Admin: fornecedores (CRUD simples)
app.get("/api/admin/suppliers", requireAdmin, async (_req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    res.json({
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        sortOrder: s.sortOrder,
        productCount: s._count.products,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar fornecedores" });
  }
});

app.post("/api/admin/suppliers", requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body ?? {};
    const n = String(name ?? "").trim().slice(0, 120);
    if (!n) return res.status(400).json({ error: "Nome obrigatório" });
    const s = await findOrCreateSupplier(n);
    if (!s) return res.status(500).json({ error: "Erro ao criar fornecedor" });
    const desc =
      typeof description === "string"
        ? description.trim().slice(0, 8000) || null
        : null;
    if (desc !== null) {
      const updated = await prisma.supplier.update({
        where: { id: s.id },
        data: { description: desc },
      });
      return res.status(201).json(updated);
    }
    res.status(201).json(s);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao salvar") });
  }
});

app.patch("/api/admin/suppliers/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim().slice(0, 120);
    }
    if (typeof body.description === "string") {
      data.description = body.description.trim().slice(0, 8000) || null;
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.floor(body.sortOrder);
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Nada para atualizar" });
    }
    const s = await prisma.supplier.update({ where: { id }, data });
    res.json(s);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }
    console.error(err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao atualizar") });
  }
});

app.delete("/api/admin/suppliers/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await prisma.product.count({ where: { supplierId: id } });
    if (count > 0) {
      return res.status(400).json({
        error: `Não é possível excluir: ${count} produto(s) vinculado(s).`,
      });
    }
    await prisma.supplier.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }
    console.error(err);
    res.status(500).json({ error: safeErrorMessage(err, "Erro ao excluir") });
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
        let supplierId: string | null = null;
        if (
          typeof item.supplierName === "string" &&
          item.supplierName.trim()
        ) {
          const sup = await findOrCreateSupplier(item.supplierName.trim());
          if (sup) supplierId = sup.id;
        }
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
            supplierId,
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

// Admin: importar produtos em massa a partir de URLs (com scraping automático) — protegido
app.post(
  "/api/admin/products/bulk-import-urls",
  requireAdmin,
  async (req, res) => {
    const { urls, category = "outros", supplierName } = (req.body ?? {}) as {
      urls?: unknown;
      category?: string;
      supplierName?: string;
    };

    if (!Array.isArray(urls) || urls.length === 0) {
      return res
        .status(400)
        .json({ error: 'Envie { urls: ["https://...", ...] }' });
    }

    const MAX_URLS = 200;
    const urlList = (urls as unknown[])
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter((u) => u.startsWith("http"))
      .slice(0, MAX_URLS);

    if (urlList.length === 0) {
      return res.status(400).json({ error: "Nenhuma URL válida encontrada" });
    }

    let bulkSupplierId: string | null = null;
    if (typeof supplierName === "string" && supplierName.trim()) {
      const sup = await findOrCreateSupplier(supplierName.trim());
      if (sup) bulkSupplierId = sup.id;
    }

    console.log(
      `[bulk-import-urls] Iniciando importação de ${urlList.length} URL(s), categoria="${category}"`,
    );

    const { getProductPreview } = await import("./scraper/productPreview");

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { url: string; reason: string }[] = [];

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i]!;
      console.log(
        `[bulk-import-urls] [${i + 1}/${urlList.length}] Processando: ${url.slice(0, 80)}`,
      );

      // Skip duplicates by originalUrl
      const existing = await prisma.product.findUnique({
        where: { originalUrl: url },
      });
      if (existing) {
        console.log(
          `[bulk-import-urls] Já existe (slug=${existing.slug}), pulando.`,
        );
        skipped++;
        continue;
      }

      try {
        const preview = await getProductPreview(url);
        if (!preview) {
          console.warn(
            `[bulk-import-urls] Scrape retornou null para: ${url.slice(0, 80)}`,
          );
          failed++;
          errors.push({ url, reason: "Scrape não retornou dados" });
          continue;
        }

        const rawTitle = (preview.titlePt || preview.title || "Produto")
          .trim()
          .slice(0, 300);
        const baseSlug = slugify(rawTitle);
        let slug = baseSlug;
        let n = 0;
        while (await prisma.product.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${++n}`;
        }

        const priceCny = preview.priceCny ?? null;
        let priceBrl: number | null = null;
        if (priceCny != null && priceCny > 0) {
          const costBrl = priceCny * RATE_CNY;
          priceBrl = sellingPriceFromCostBrl(costBrl);
        }

        const maxSort = await prisma.product
          .aggregate({ _max: { sortOrder: true } })
          .then((r) => r._max.sortOrder ?? -1);

        await prisma.product.create({
          data: {
            originalUrl: url,
            title: preview.title || rawTitle,
            titlePt: preview.titlePt || rawTitle,
            description: preview.description?.slice(0, 2000) ?? null,
            image: preview.images?.[0] ?? null,
            images: preview.images?.length
              ? JSON.stringify(preview.images)
              : null,
            priceCny,
            priceBrl,
            source: getSourceFromUrl(url),
            category: (category as string) || "outros",
            slug,
            featured: false,
            sortOrder: maxSort + 1,
            supplierId: bulkSupplierId,
          },
        });

        console.log(
          `[bulk-import-urls] ✓ Importado: "${rawTitle.slice(0, 60)}" (slug=${slug})`,
        );
        imported++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(
          `[bulk-import-urls] ✗ Erro em ${url.slice(0, 80)}:`,
          reason,
        );
        failed++;
        errors.push({ url, reason });
      }

      // Small delay between requests to avoid hammering scrapers
      if (i < urlList.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(
      `[bulk-import-urls] Concluído — importados=${imported}, pulados=${skipped}, falhas=${failed}`,
    );
    res.json({ imported, skipped, failed, errors });
  },
);

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
    const {
      url,
      category = "outros",
      featured = false,
      supplierName,
    } = req.body ?? {};
    const u = (url as string)?.trim();
    if (!u || !u.startsWith("http")) {
      return res.status(400).json({ error: "URL inválida" });
    }

    const existing = await prisma.product.findFirst({
      where: { originalUrl: u },
      include: { supplier: true },
    });
    if (existing) return res.json(serializeProductForApi(existing));

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
      priceBrl = sellingPriceFromCostBrl(costBrl);
    }

    const maxSort = await prisma.product
      .aggregate({ _max: { sortOrder: true } })
      .then((r) => r._max.sortOrder ?? -1);
    const sortOrder = maxSort + 1;

    let supplierId: string | null = null;
    if (typeof supplierName === "string" && supplierName.trim()) {
      const s = await findOrCreateSupplier(supplierName);
      if (s) supplierId = s.id;
    }

    await prisma.product.create({
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
        supplierId,
      },
    });

    const created = await prisma.product.findFirst({
      where: { originalUrl: u },
      include: { supplier: true },
    });
    if (!created) {
      return res.status(500).json({ error: "Produto criado mas não encontrado" });
    }

    res.status(201).json(serializeProductForApi(created));
  } catch (err) {
    console.error("Admin add product:", err);
    res
      .status(500)
      .json({ error: safeErrorMessage(err, "Erro ao adicionar produto") });
  }
});

// Criar pedido (a partir da página /pedido) — com auto-quote para pagamento imediato
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
      /** Checkout: não avisar admin até o PIX ser gerado ou o pagamento aprovado. */
      silentOrderCreation,
      deliveryInBrazil: bodyDeliveryInBrazil,
      internationalAddressLines: bodyInternationalAddressLines,
    } = req.body ?? {};

    const deliveryInBrazil = bodyDeliveryInBrazil === false ? false : true;
    const intlRaw =
      typeof bodyInternationalAddressLines === "string"
        ? bodyInternationalAddressLines.trim()
        : "";

    if (!originalUrl || !productDescription || !quantity) {
      return res.status(400).json({
        error: "Campos obrigatórios: originalUrl, productDescription, quantity",
      });
    }

    if (!String(customerName ?? "").trim() || !String(customerEmail ?? "").trim()) {
      return res.status(400).json({ error: "Nome e e-mail do cliente são obrigatórios." });
    }

    const waDigits =
      typeof customerWhatsapp === "string"
        ? customerWhatsapp.replace(/\D/g, "")
        : "";
    if (waDigits.length < 8) {
      return res.status(400).json({
        error: "Informe um WhatsApp válido (inclua DDI se estiver fora do +55).",
      });
    }

    let cepFinal: string;
    let cpfFinal: string | null;
    let street: string | null;
    let num: string | null;
    let comp: string | null;
    let bairro: string | null;
    let city: string | null;
    let stateUf: string | null;
    let intlStored: string | null = null;

    if (deliveryInBrazil) {
      const cepClean = typeof cep === "string" ? cep.replace(/\D/g, "") : "";
      if (cepClean.length !== 8) {
        return res.status(400).json({ error: "CEP inválido. Use 8 dígitos." });
      }
      const cpfClean =
        typeof customerCpf === "string" ? customerCpf.replace(/\D/g, "") : "";
      if (cpfClean.length !== 11) {
        return res.status(400).json({
          error: "CPF inválido. São necessários 11 dígitos para envio ao Brasil.",
        });
      }
      if (!String(addressStreet ?? "").trim()) {
        return res.status(400).json({ error: "Informe o logradouro (rua/avenida)." });
      }
      if (!String(addressNumber ?? "").trim()) {
        return res.status(400).json({ error: "Informe o número do endereço." });
      }
      if (!String(addressNeighborhood ?? "").trim()) {
        return res.status(400).json({ error: "Informe o bairro." });
      }
      if (!String(addressCity ?? "").trim()) {
        return res.status(400).json({ error: "Informe a cidade." });
      }
      if (!String(addressState ?? "").trim()) {
        return res.status(400).json({ error: "Informe o estado (UF)." });
      }
      cepFinal = cepClean;
      cpfFinal = cpfClean;
      street = String(addressStreet).trim().slice(0, 200);
      num = String(addressNumber).trim().slice(0, 20);
      comp = addressComplement?.trim()
        ? String(addressComplement).trim().slice(0, 120)
        : null;
      bairro = String(addressNeighborhood).trim().slice(0, 120);
      city = String(addressCity).trim().slice(0, 120);
      stateUf = String(addressState).trim().slice(0, 4);
    } else {
      if (intlRaw.length < 15) {
        return res.status(400).json({
          error:
            "Descreva o endereço completo no exterior (mínimo 15 caracteres): país, cidade, código postal e linhas de endereço — como no CSSBuy / envio internacional.",
        });
      }
      cepFinal = "00000000";
      intlStored = intlRaw.slice(0, 4000);
      const cpfClean =
        typeof customerCpf === "string" ? customerCpf.replace(/\D/g, "") : "";
      cpfFinal = cpfClean.length === 11 ? cpfClean : null;
      street = null;
      num = null;
      comp = null;
      bairro = null;
      city = null;
      stateUf = null;
    }

    const orderQty = Number(quantity);
    if (
      !Number.isFinite(orderQty) ||
      orderQty < 1 ||
      orderQty > MAX_ORDER_LINE_QUANTITY
    ) {
      return res.status(400).json({
        error: `Quantidade inválida (1–${MAX_ORDER_LINE_QUANTITY}).`,
      });
    }

    const checkoutGroupId =
      typeof bodyCheckoutGroupId === "string" &&
      bodyCheckoutGroupId.trim().length > 0
        ? bodyCheckoutGroupId.trim().slice(0, 120)
        : null;

    if (bodyOrderItemsJson != null && !Array.isArray(bodyOrderItemsJson)) {
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
      const urlStr = String(originalUrl ?? "").trim();
      let lineProductForThisOrder = 0;
      for (const row of orderItemsJson) {
        if (row && typeof row === "object") {
          const rowUrl = (row as Record<string, unknown>).url;
          if (typeof rowUrl === "string" && rowUrl.trim() === urlStr) {
            const v = (row as Record<string, unknown>).lineProductBrl;
            if (typeof v === "number" && Number.isFinite(v) && v >= 0)
              lineProductForThisOrder = v;
            break;
          }
        }
      }
      if (lineProductForThisOrder <= 0 && orderItemsJson.length === 1) {
        const row0 = orderItemsJson[0] as Record<string, unknown>;
        const v = row0.lineProductBrl;
        if (typeof v === "number" && Number.isFinite(v) && v >= 0)
          lineProductForThisOrder = v;
      }
      if (
        lineProductForThisOrder > 0 &&
        totalBrlIncoming + 0.02 < lineProductForThisOrder
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
        quantity: orderQty,
        cep: cepFinal,
        deliveryInBrazil,
        internationalAddressLines: intlStored,
        // Sempre expresso padrão (mesma base da estimativa no front). EMS/marítimo só pelo admin.
        shippingMethod: ShippingMethod.FJ_BR_EXP,
        notes: notes ?? null,
        userId: authUserId ?? null,
        customerName: String(customerName).trim(),
        customerEmail: String(customerEmail).trim(),
        customerWhatsapp: waDigits,
        customerCpf: cpfFinal,
        addressStreet: street,
        addressNumber: num,
        addressComplement: comp,
        addressNeighborhood: bairro,
        addressCity: city,
        addressState: stateUf,
        checkoutGroupId,
        ...(orderItemsJson !== undefined ? { orderItemsJson } : {}),
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

    // Aviso ao admin: novo pedido (checkout imediato pode adiar até PIX/cartão)
    if (!silentOrderCreation) {
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
    }

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
        hideFromRecentPurchasesBar: false,
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
    const byNormKey = new Map<string, (typeof orders)[number]>();
    for (const o of orders) {
      const key = normalizeProductPreviewUrlKey(o.originalUrl);
      const prev = byNormKey.get(key);
      if (!prev || o.updatedAt > prev.updatedAt) byNormKey.set(key, o);
    }
    const uniqueOrders = [...byNormKey.values()]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 24);

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
      catalogByNormKey.set(normalizeProductPreviewUrlKey(p.originalUrl), p);
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

    let checkoutGroupPayableTotalBrl: number | null = null;
    let checkoutGroupPayableCount: number | null = null;
    if (order.checkoutGroupId && order.customerEmail?.trim()) {
      const groupOrders = await prisma.order.findMany({
        where: {
          checkoutGroupId: order.checkoutGroupId,
          customerEmail: order.customerEmail,
        },
        include: { quote: true },
      });
      const awaiting = groupOrders.filter(
        (o) =>
          o.status === OrderStatus.AGUARDANDO_PAGAMENTO &&
          o.quote &&
          Number(o.quote.totalBrl) > 0,
      );
      if (awaiting.length > 0) {
        checkoutGroupPayableCount = awaiting.length;
        checkoutGroupPayableTotalBrl =
          Math.round(
            awaiting.reduce((s, o) => s + Number(o.quote!.totalBrl), 0) * 100,
          ) / 100;
      }
    }

    res.json({
      ...order,
      checkoutGroupPayableTotalBrl,
      checkoutGroupPayableCount,
    });
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
      return res.status(400).json({
        error:
          "Body deve conter 'url' (URL do produto) e 'data' (objeto do preview).",
      });
    }
    if (!data || typeof data !== "object") {
      return res.status(400).json({
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
    const totalProductBrl = sellingPriceFromCostBrl(costBrl);
    const marginPercent =
      costBrl > 0
        ? Math.round((totalProductBrl / costBrl - 1) * 10000) / 100
        : null;

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

type OrderForMpCharge = {
  id: string;
  customerEmail: string | null;
  checkoutGroupId: string | null;
  status: OrderStatus;
  productTitle: string | null;
  productDescription: string;
  originalUrl: string;
  productImage: string | null;
  quote: { totalBrl: unknown } | null;
  payment: { status: string } | null;
};

/**
 * Vários itens no carrinho viram vários Orders com o mesmo checkoutGroupId.
 * O Mercado Pago deve cobrar a soma das cotações; o registro Payment fica no pedido da URL (âncora).
 */
async function resolveMercadoPagoChargeForOrder(
  order: OrderForMpCharge,
): Promise<
  | { ok: true; transactionAmount: number; mpDescription: string }
  | { ok: false; message: string }
> {
  if (!order.quote) {
    return { ok: false, message: "Cotação ainda não disponível." };
  }
  const anchorEmail = order.customerEmail?.trim().toLowerCase();
  if (!anchorEmail) {
    return { ok: false, message: "Pedido sem e-mail do cliente." };
  }
  if (!order.checkoutGroupId) {
    return {
      ok: true,
      transactionAmount: Number(order.quote.totalBrl),
      mpDescription: `ComprasChina - Pedido ${order.id}`,
    };
  }
  const siblings = await prisma.order.findMany({
    where: { checkoutGroupId: order.checkoutGroupId },
    include: { quote: true, payment: true },
    orderBy: { createdAt: "asc" },
  });
  const payable = siblings.filter((o) => {
    const em = o.customerEmail?.trim().toLowerCase();
    return (
      em === anchorEmail &&
      o.status === OrderStatus.AGUARDANDO_PAGAMENTO &&
      o.quote &&
      Number(o.quote.totalBrl) > 0
    );
  });
  if (payable.length === 0) {
    return {
      ok: false,
      message: "Nenhum item deste checkout está aguardando pagamento.",
    };
  }
  /** Só bloqueia PIX/cartão duplicado em andamento — pagamento já concluído (PAGO) em outro item do grupo é permitido (saldo restante após bug antigo ou retificações). */
  const blockingPending = siblings.find(
    (o) => o.payment && o.payment.status === "PENDENTE",
  );
  if (blockingPending) {
    return {
      ok: false,
      message:
        "Já existe um pagamento em andamento para este checkout. Aguarde a confirmação ou contate o suporte.",
    };
  }
  const transactionAmount =
    Math.round(
      payable.reduce((s, o) => s + Number(o.quote!.totalBrl), 0) * 100,
    ) / 100;
  const mpDescription =
    payable.length > 1
      ? `ComprasChina - ${payable.length} itens (${order.id.slice(-8)})`
      : `ComprasChina - Pedido ${order.id}`;
  return { ok: true, transactionAmount, mpDescription };
}

async function markOrdersPaidAfterMercadoPago(anchorOrderId: string) {
  const anchor = await prisma.order.findUnique({
    where: { id: anchorOrderId },
  });
  if (!anchor) return;
  if (!anchor.checkoutGroupId) {
    await prisma.order.update({
      where: { id: anchorOrderId },
      data: { status: OrderStatus.PAGO },
    });
    return;
  }
  await prisma.order.updateMany({
    where: {
      checkoutGroupId: anchor.checkoutGroupId,
      customerEmail: anchor.customerEmail,
      status: OrderStatus.AGUARDANDO_PAGAMENTO,
    },
    data: { status: OrderStatus.PAGO },
  });
}

async function ensureCatalogProductsForPaidCheckout(anchorOrderId: string) {
  const anchor = await prisma.order.findUnique({ where: { id: anchorOrderId } });
  if (!anchor) return;
  const orders = anchor.checkoutGroupId
    ? await prisma.order.findMany({
        where: {
          checkoutGroupId: anchor.checkoutGroupId,
          customerEmail: anchor.customerEmail,
        },
      })
    : [anchor];
  for (const o of orders) {
    try {
      await ensureProductFromOrder({
        originalUrl: o.originalUrl,
        productTitle: o.productTitle,
        productDescription: o.productDescription,
        productImage: o.productImage,
      });
    } catch (err) {
      console.warn("Erro ao adicionar produto ao catálogo:", err);
    }
  }
}

// Mercado Pago - Criar pagamento (Checkout Transparente)
app.post("/api/orders/:id/create-payment", async (req, res) => {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({
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
      return res.status(400).json({
        error: "Cotação ainda não disponível. Aguarde nosso contato.",
      });
    }

    if (order.payment?.status === "PAGO") {
      return res.status(400).json({ error: "Este pedido já foi pago." });
    }

    const charge = await resolveMercadoPagoChargeForOrder(order);
    if (!charge.ok) {
      return res.status(400).json({ error: charge.message });
    }
    const totalBrl = charge.transactionAmount;
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
      return res.status(400).json({
        error: "Token do cartão é obrigatório. Use o formulário de pagamento.",
      });
    }

    let installmentsForCard = 1;
    if (!isPix) {
      installmentsForCard = Number(installments);
      if (
        !Number.isFinite(installmentsForCard) ||
        !Number.isInteger(installmentsForCard) ||
        installmentsForCard < 1 ||
        installmentsForCard > MP_MAX_INSTALLMENTS_CARD
      ) {
        return res.status(400).json({
          error: `Escolha de 1 a ${MP_MAX_INSTALLMENTS_CARD} parcelas.`,
        });
      }
    }

    const { createPayment, extractPixTransactionData } = await import(
      "./mercadopago"
    );
    const idempotencyKey = `${order.id}-${crypto.randomUUID()}`;
    const result = await createPayment({
      accessToken,
      idempotencyKey,
      transactionAmount: totalBrl,
      token: token || undefined,
      paymentMethodId: isPix ? "pix" : payment_method_id || "visa",
      payerEmail,
      payerName: payer_name || order.customerName || undefined,
      description: charge.mpDescription,
      installments: isPix ? 1 : installmentsForCard,
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
      await markOrdersPaidAfterMercadoPago(order.id);
      await ensureCatalogProductsForPaidCheckout(order.id);
      const orderUrl =
        (process.env.SITE_URL || "https://compraschina.com.br").replace(
          /\/$/,
          "",
        ) +
        "/admin/pedido/" +
        order.id;
      const groupNote = order.checkoutGroupId
        ? "\n📎 Checkout com vários itens — todos os pedidos do grupo foram confirmados."
        : "";
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
          groupNote +
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
    const pixPayload = extractPixTransactionData(result.point_of_interaction);

    if (isPix && result.status === "pending" && !pixPayload) {
      console.error(
        "[MP] PIX pending sem QR/ticket",
        JSON.stringify(result.point_of_interaction),
      );
      return res.status(502).json({
        error:
          "O Mercado Pago não retornou o QR Code do PIX. Tente novamente em instantes.",
        paymentId: result.id,
        status: result.status,
      });
    }

    if (
      isPix &&
      result.status === "pending" &&
      pixPayload &&
      paymentStatus === "PENDENTE"
    ) {
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
        "PIX gerado — aguardando pagamento\n" +
          "Pedido " +
          order.id.slice(-8) +
          "\n" +
          "Produto: " +
          produto.slice(0, 50) +
          "\n" +
          "Cliente: " +
          (order.customerName || order.customerEmail || "—") +
          "\n" +
          "💰 R$ " +
          totalBrl.toFixed(2) +
          "\n\n" +
          "Gerenciar: " +
          orderUrl,
      ).catch(() => {});
    }

    res.json({
      paymentId: result.id,
      status: result.status,
      pix: pixPayload,
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

// --- Suporte: conversas site ↔ equipe ---
app.get("/api/support/conversations", requireUser, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId: string }).userId;
    const rows = await prisma.supportConversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    res.json({
      conversations: rows.map((c) => ({
        id: c.id,
        status: c.status,
        lastMessageAt: c.lastMessageAt.toISOString(),
        lastPreview:
          c.messages[0]?.body.slice(0, 120) +
          (c.messages[0] && c.messages[0].body.length > 120 ? "…" : ""),
      })),
    });
  } catch (err) {
    console.error("[support list]", err);
    res.status(500).json({ error: "Erro ao listar conversas." });
  }
});

app.post(
  "/api/support/conversations",
  supportPostRateLimiter,
  optionalUser,
  async (req, res) => {
    try {
      const userId = (req as express.Request & { userId?: string }).userId;
      const rawBody = req.body as {
        name?: unknown;
        email?: unknown;
        message?: unknown;
      };
      const message = trimSupportText(rawBody.message, SUPPORT_MSG_MAX_LEN);
      if (!message) {
        return res.status(400).json({ error: "Escreva uma mensagem." });
      }

      let guestName = trimStr(rawBody.name, 120);
      let guestEmail = trimStr(rawBody.email, 200).toLowerCase();

      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        if (!user) {
          return res.status(401).json({ error: "Sessão inválida." });
        }
        guestName = user.name;
        guestEmail = user.email;
      } else {
        if (!guestName || !guestEmail) {
          return res.status(400).json({
            error: "Informe nome e e-mail para iniciar a conversa.",
          });
        }
        if (!isSimpleEmail(guestEmail)) {
          return res.status(400).json({ error: "E-mail inválido." });
        }
      }

      const visitorToken = userId
        ? null
        : crypto.randomBytes(24).toString("hex");

      const conv = await prisma.supportConversation.create({
        data: {
          userId: userId ?? null,
          guestName,
          guestEmail,
          visitorToken,
          lastMessageAt: new Date(),
          messages: {
            create: {
              sender: SupportMessageSender.USER,
              body: message,
              readByStaff: false,
            },
          },
        },
      });

      const siteBase = (process.env.SITE_URL || "https://compraschina.com.br")
        .replace(/\/$/, "");
      const adminInbox = `${siteBase}/admin/conversas`;
      sendTelegram(
        "💬 Nova conversa no site\n" +
          guestName +
          " <" +
          guestEmail +
          ">\n" +
          message.slice(0, 280) +
          (message.length > 280 ? "…" : "") +
          "\n\n" +
          adminInbox,
      ).catch(() => {});

      res.json({
        id: conv.id,
        visitorToken: conv.visitorToken,
        status: conv.status,
      });
    } catch (err) {
      console.error("[support create]", err);
      const msg = err instanceof Error ? err.message : String(err);
      const hint = /does not exist|migrate|SupportConversation/i.test(msg)
        ? " Execute prisma migrate deploy no banco."
        : "";
      res.status(500).json({ error: `Erro ao abrir conversa.${hint}` });
    }
  },
);

function trimStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

app.get(
  "/api/support/conversations/:id",
  optionalUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as express.Request & { userId?: string }).userId;
      const visitorToken = supportVisitorTokenFromReq(req, {});
      const access = await assertUserSupportAccess(id, userId, visitorToken);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }
      const messages = await prisma.supportMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sender: true,
          body: true,
          createdAt: true,
        },
      });
      res.json({
        id: access.conv.id,
        status: access.conv.status,
        guestName: access.conv.guestName,
        guestEmail: access.conv.guestEmail,
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      console.error("[support get]", err);
      res.status(500).json({ error: "Erro ao carregar conversa." });
    }
  },
);

app.post(
  "/api/support/conversations/:id/messages",
  supportPostRateLimiter,
  optionalUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as express.Request & { userId?: string }).userId;
      const raw = req.body as { body?: unknown; visitorToken?: unknown };
      const text = trimSupportText(raw.body, SUPPORT_MSG_MAX_LEN);
      if (!text) {
        return res.status(400).json({ error: "Escreva uma mensagem." });
      }
      const visitorToken = supportVisitorTokenFromReq(req, raw);
      const access = await assertUserSupportAccess(id, userId, visitorToken);
      if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
      }

      const now = new Date();
      await prisma.$transaction([
        prisma.supportMessage.create({
          data: {
            conversationId: id,
            sender: SupportMessageSender.USER,
            body: text,
            readByStaff: false,
          },
        }),
        prisma.supportConversation.update({
          where: { id },
          data: {
            lastMessageAt: now,
            status: SupportConversationStatus.OPEN,
          },
        }),
      ]);

      const siteBase = (process.env.SITE_URL || "https://compraschina.com.br")
        .replace(/\/$/, "");
      sendTelegram(
        "💬 Nova mensagem (suporte)\n" +
          (access.conv.guestName || "Cliente") +
          "\n" +
          text.slice(0, 240) +
          (text.length > 240 ? "…" : "") +
          "\n\n" +
          siteBase +
          "/admin/conversas",
      ).catch(() => {});

      res.json({ ok: true });
    } catch (err) {
      console.error("[support message]", err);
      res.status(500).json({ error: "Erro ao enviar mensagem." });
    }
  },
);

/** Campos do cadastro (sem senha) — admin para suporte / lookup */
const ADMIN_USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  customerCpf: true,
  customerWhatsapp: true,
  cep: true,
  addressStreet: true,
  addressNumber: true,
  addressComplement: true,
  addressNeighborhood: true,
  addressCity: true,
  addressState: true,
  emailVerified: true,
  createdAt: true,
} as const;

app.get("/api/admin/users/lookup", requireAdmin, async (req, res) => {
  try {
    const email =
      typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
    if (!email || !isSimpleEmail(email)) {
      return res.status(400).json({ error: "Informe um e-mail válido." });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: ADMIN_USER_PROFILE_SELECT,
    });
    if (!user) {
      return res.status(404).json({ error: "Nenhum cadastro com este e-mail." });
    }
    res.json({ user });
  } catch (err) {
    console.error("[admin user lookup]", err);
    res.status(500).json({ error: "Erro ao buscar cadastro." });
  }
});

app.get("/api/admin/support/conversations", requireAdmin, async (_req, res) => {
  try {
    const list = await prisma.supportConversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const ids = list.map((c) => c.id);
    const unreadGroups =
      ids.length === 0
        ? []
        : await prisma.supportMessage.groupBy({
            by: ["conversationId"],
            where: {
              sender: SupportMessageSender.USER,
              readByStaff: false,
              conversationId: { in: ids },
            },
            _count: { _all: true },
          });
    const unreadMap = new Map(
      unreadGroups.map((g) => [g.conversationId, g._count._all]),
    );
    res.json({
      conversations: list.map((c) => ({
        id: c.id,
        status: c.status,
        guestName: c.guestName,
        guestEmail: c.guestEmail,
        user: c.user,
        lastMessageAt: c.lastMessageAt.toISOString(),
        lastPreview:
          (c.messages[0]?.body ?? "").slice(0, 140) +
          (c.messages[0] && c.messages[0].body.length > 140 ? "…" : ""),
        unreadFromUser: unreadMap.get(c.id) ?? 0,
      })),
    });
  } catch (err) {
    console.error("[admin support list]", err);
    res.status(500).json({ error: "Erro ao listar conversas." });
  }
});

app.get(
  "/api/admin/support/conversations/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const conv = await prisma.supportConversation.findUnique({
        where: { id },
        include: {
          user: { select: ADMIN_USER_PROFILE_SELECT },
        },
      });
      if (!conv) {
        return res.status(404).json({ error: "Conversa não encontrada." });
      }
      await prisma.supportMessage.updateMany({
        where: {
          conversationId: id,
          sender: SupportMessageSender.USER,
          readByStaff: false,
        },
        data: { readByStaff: true },
      });
      const messages = await prisma.supportMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "asc" },
      });
      res.json({
        id: conv.id,
        status: conv.status,
        guestName: conv.guestName,
        guestEmail: conv.guestEmail,
        user: conv.user,
        visitorToken: conv.visitorToken,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      console.error("[admin support get]", err);
      res.status(500).json({ error: "Erro ao carregar conversa." });
    }
  },
);

app.post(
  "/api/admin/support/conversations/:id/messages",
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const raw = req.body as { body?: unknown };
      const text = trimSupportText(raw.body, SUPPORT_MSG_MAX_LEN);
      if (!text) {
        return res.status(400).json({ error: "Escreva uma mensagem." });
      }
      const conv = await prisma.supportConversation.findUnique({
        where: { id },
        include: { user: { select: { email: true, name: true } } },
      });
      if (!conv) {
        return res.status(404).json({ error: "Conversa não encontrada." });
      }
      const now = new Date();
      await prisma.$transaction([
        prisma.supportMessage.create({
          data: {
            conversationId: id,
            sender: SupportMessageSender.STAFF,
            body: text,
            readByStaff: true,
          },
        }),
        prisma.supportConversation.update({
          where: { id },
          data: { lastMessageAt: now },
        }),
      ]);

      const notifyEmail =
        conv.user?.email?.trim() || conv.guestEmail?.trim() || "";
      const notifyName =
        conv.user?.name?.trim() || conv.guestName?.trim() || "Cliente";
      if (notifyEmail && isSimpleEmail(notifyEmail)) {
        sendSupportStaffReplyEmail(
          notifyEmail,
          notifyName,
          id,
          text,
        ).catch((e) => console.warn("[support reply email]", e));
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("[admin support reply]", err);
      res.status(500).json({ error: "Erro ao enviar resposta." });
    }
  },
);

app.patch(
  "/api/admin/support/conversations/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const raw = req.body as { status?: unknown };
      const st = raw.status;
      if (st !== "OPEN" && st !== "CLOSED") {
        return res.status(400).json({ error: "status deve ser OPEN ou CLOSED." });
      }
      const conv = await prisma.supportConversation.findUnique({
        where: { id },
      });
      if (!conv) {
        return res.status(404).json({ error: "Conversa não encontrada." });
      }
      await prisma.supportConversation.update({
        where: { id },
        data: {
          status:
            st === "OPEN"
              ? SupportConversationStatus.OPEN
              : SupportConversationStatus.CLOSED,
        },
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin support patch]", err);
      res.status(500).json({ error: "Erro ao atualizar conversa." });
    }
  },
);

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
  await markOrdersPaidAfterMercadoPago(dbPayment.orderId);
  await ensureCatalogProductsForPaidCheckout(dbPayment.orderId);
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
