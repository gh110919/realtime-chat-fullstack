import { json } from "express";
import { networkInterfaces } from "os";
import { websocketMiddleware } from "./websocket-middleware";
import { migrate } from "./migrate";
import { drop } from "./drop";
import { triggers } from "./triggers";
import { orm } from "./orm";

(async function () {
  const http = (await import("http")).default;
  const https = (await import("https")).default;
  const express = (await import("express")).default();

  const { parsed } = (await import("dotenv")).config({
    path: process.env.secret,
  });

  const cors = (await import("cors")).default({
    origin: "http://localhost:3000",
    credentials: true,
  });

  const listener = () => {
    try {
      express
        .use(cors)
        .use(json())
        .put("/api", (req, res) => {
          orm.update("data", req.query, req.body).then(async () => {
            const data = await orm.filtering("data", req.query);
            res.status(200).json(data);
          });
        })
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
    .listen(parsed!.ws, () => websocketMiddleware(server));

  const ssl = {};

  http.createServer(express).listen(parsed!.http, listener);

  https.createServer(ssl, express).listen(parsed!.https, listener);

  const host = (() => {
    const interfaces = Object.values(networkInterfaces()).flat();
    const ip = interfaces.find((e) => e?.family === "IPv4" && !e?.internal);
    return {
      ws: `ws://${ip?.address}:${parsed!.ws}`,
      http: `http://${ip?.address}:${parsed!.http}`,
      https: `https://${ip?.address}:${parsed!.https}`,
    };
  })();

  console.log(host);
})();
