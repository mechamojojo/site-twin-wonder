# Imagem oficial Playwright - Chromium incluído para /api/product/preview
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# TESTE: servidor minimalista para isolar se o problema é o app ou a infra Railway
# Se retornar 200 em /, o problema está no nosso código. Depois voltar para: node dist/index.js
CMD ["sh", "-c", "npx prisma migrate deploy && echo 'POST-PRISMA' && node -e \"require('http').createServer((q,s)=>{s.end(JSON.stringify({ok:1}))}).listen(process.env.PORT||4000,'0.0.0.0',()=>console.log('MINIMAL SERVER ON',process.env.PORT||4000))\""]
