import { json } from "express";
import { networkInterfaces } from "os";
import { drop } from "./drop";
import { migrate } from "./migrate";
import { triggers } from "./triggers";
import { websocketMiddleware } from "./websocket-middleware";

(async function () {
  const http = (await import("http")).default;
  const express = (await import("express")).default();

  const { WS, HTTP } = (await import("dotenv")).config({
    path: ".env",
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
    } catch (error) {
      console.error(`Исключение экспресс-сервера: ${error}`);
    }
  };

  const server = http.createServer(express);

  server.listen(HTTP, listener);
  server.listen(WS, () => websocketMiddleware(server));

  const { address } = Object.values(networkInterfaces())
    .flat()
    .find(({ family, internal }: any) => family === "IPv4" && !internal)!;

  console.table({
    ws: `ws://${address}:${WS}`,
    http: `http://${address}:${HTTP}`,
  });
})();
