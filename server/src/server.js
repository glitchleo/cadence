import http from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();
const server = http.createServer(app);

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;
server.maxHeadersCount = 100;

server.on("error", (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }

  if (error.code === "EACCES") {
    console.error(`Port ${env.PORT} requires elevated privileges`);
    process.exit(1);
  }

  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} is already in use by another process`);
    process.exit(1);
  }

  throw error;
});

server.on("clientError", (err, socket) => {
  console.warn(`Malformed client HTTP request (${err.code})`);
  if (socket.writable && !socket.destroyed) {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  } else {
    socket.destroy();
  }
});

server.listen(env.PORT, env.HOST, () => {
  console.log(
    `Cadence API listening on http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`,
  );
});

export { server };
