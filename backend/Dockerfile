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

# Migrações: rode na Railway (Shell) ou em "Deploy" com: npx prisma migrate deploy
# Não encadear aqui — se migrate falhar, o container nunca escuta e o healthcheck quebra.
CMD ["node", "server.js"]
