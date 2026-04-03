# Build do backend a partir da raiz do repo (para Railway sem Root Directory).
# Se o Railway estiver configurado com Root Directory = "backend", use backend/Dockerfile.
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 8080

# Migrações: rode depois (Railway Shell, CI ou deploy hook): npx prisma migrate deploy
CMD ["node", "dist/index.js"]
