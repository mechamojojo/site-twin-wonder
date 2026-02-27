# Imagem oficial Playwright: já inclui Chromium e dependências
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && echo '[railway] post-prisma' && node -e \"console.log('node-ok')\" && node dist/index.js"]
