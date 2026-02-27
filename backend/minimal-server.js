#!/usr/bin/env node
/**
 * Servidor mínimo - zero dependências. Usado para validar que a infra responde.
 * Se este funcionar, o problema está no carregamento do app principal.
 */
const http = require("http");
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  const body = JSON.stringify({ status: "ok", service: "compraschina-backend" });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(body);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("MINIMAL SERVER LISTENING ON", PORT);
});
