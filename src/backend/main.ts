import { json } from "express";
import { networkInterfaces } from "os";
import { websocketMiddleware } from "./websocket-middleware";
import { migrate } from "./migrate";
import { drop } from "./drop";
import { triggers } from "./triggers";

(async function () {
  const http = (await import("http")).default;
  const https = (await import("https")).default;
  const express = (await import("express")).default();

  const { WS, HTTP, HTTPS } = (await import("dotenv")).config({
    path: ".local/.env",
  }).parsed!;

  const cors = (await import("cors")).default;

  const listener = () => {
    try {
      express
        .options("*", cors({ origin: "*" }))
        .use(cors())
        .use(json())
        .patch("/api/triggers", triggers)
        .delete("/api/drop", drop)
        .post("/api/migrate", migrate)
        .get("/", (_, res) => {
          res.send("Сервер работает в штатном режиме");
        });

      console.log(true);
    } catch (error) {
      console.error(`Исключение экспресс-сервера: ${error}`);
    }
  };

  const server = http
    .createServer(express)
    .listen(WS, () => websocketMiddleware(server));

  const ssl = {};

  http.createServer(express).listen(HTTP, listener);

  https.createServer(ssl, express).listen(HTTPS, listener);

  const host = (() => {
    const interfaces = Object.values(networkInterfaces()).flat();
    const ip = interfaces.find((e) => e?.family === "IPv4" && !e?.internal);
    return {
      ws: `ws://${ip?.address}:${WS}`,
      http: `http://${ip?.address}:${HTTP}`,
      https: `https://${ip?.address}:${HTTPS}`,
    };
  })();

  console.log(host);
})();
