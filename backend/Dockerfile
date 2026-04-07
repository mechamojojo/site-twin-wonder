# Imagem oficial Playwright - Chromium incluído para /api/product/preview
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
# Railway injeta PORT em runtime (geralmente 8080). Não sobrescrever aqui.
EXPOSE 8080

# Migrações no start (Railway). Se falhar, o processo encerra e o deploy fica visível nos logs.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
