#!/usr/bin/env node
/**
 * Wrapper que captura erros de startup e loga antes de crashar.
 * Railway: o start usa "node server.js" em vez de "node dist/index.js"
 */
console.log("[server] iniciando...");
try {
  require("./dist/index.js");
  console.log("[server] index carregado");
} catch (err) {
  console.error("[server] ERRO FATAL:", err);
  process.exit(1);
}
