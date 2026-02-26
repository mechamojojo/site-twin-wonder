/**
 * Autenticação de clientes (JWT)
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_FALLBACK = "compraschina-secret-change-in-production";
const isProduction = process.env.NODE_ENV === "production";

function getJwtSecret(): string {
  if (JWT_SECRET && JWT_SECRET.length >= 32) return JWT_SECRET;
  if (isProduction) {
    throw new Error("JWT_SECRET obrigatório em produção. Defina uma chave de 32+ caracteres no .env (ex: openssl rand -base64 32)");
  }
  return JWT_FALLBACK;
}
const JWT_EXPIRES = "7d";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: { userId: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Faça login para continuar" });
    return;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    return;
  }
  (req as Request & { userId: string }).userId = decoded.userId;
  next();
}

/** Middleware opcional: se tiver token válido, define req.userId */
export function optionalUser(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) (req as Request & { userId?: string }).userId = decoded.userId;
  }
  next();
}
