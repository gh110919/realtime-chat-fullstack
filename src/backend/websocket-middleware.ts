import { Server } from "http";
import { v4 } from "uuid";
import { orm } from "./orm";

export const websocketMiddleware = async (http: Server) => {
  const {
    WebSocket: { OPEN, Server },
  } = (await import("ws")).default;

  const server = new Server({ server: http });

  const applyChanges = async () => {
    const logs = await orm("trigger");

    const { action, _id } = logs[logs.length - 1];

    if (action === "INSERT") {
      server.clients.forEach(async (client) => {
        if (client.readyState === OPEN) {
          client.send(
            JSON.stringify({
              action,
              message: await orm("message").where({ _id }).first(),
            })
          );
        }
      });
    }

    if (action === "UPDATE") {
      server.clients.forEach(async (client) => {
        if (client.readyState === OPEN) {
          client.send(
            JSON.stringify({
              action,
              message: await orm("message").where({ _id }).first(),
            })
          );
        }
      });
    }

    if (action === "DELETE") {
      server.clients.forEach((client) => {
        if (client.readyState === OPEN) {
          client.send(JSON.stringify({ action, message: { _id } }));
        }
      });
    }
  };

  const count = async (column: string, table: string) => {
    const r = await orm.raw(
      `SELECT COUNT(${column}) AS ${column} FROM ${table}`
    );
    
    return r[0][`${column}`];
  };

  (async function recursive() {
    const previous = await count("_id", "trigger");

    (async function () {
      const current = await count("_id", "trigger");

      const apply = async () => {
        await applyChanges();
        await recursive();
      };

      current !== previous ? await apply() : await recursive();
    })();
  })();

  server.on("connection", async (socket) => {
    socket.send(
      JSON.stringify({
        action: "CONNECTING",
        messages: await orm("message")
          .where({ deleted: false })
          .orderBy("_created_at", "asc"),
      })
    );

    socket.on("message", async (data) => {
      const {
        action,
        message: { _id, content },
      } = JSON.parse(data.toString());

      if (action === "INSERT") {
        const message = {
          _id: v4(),
          content,
        };

        await orm("message").insert(message);

        await orm("trigger").insert({ action, ...message });

        server.clients.forEach(async (client) => {
          if (client.readyState === OPEN) {
            client.send(
              JSON.stringify({
                action,
                message: await orm("message")
                  .where({ _id: message._id })
                  .first(),
              })
            );
          }
        });
      }

      if (action === "UPDATE") {
        await orm("message").where({ _id }).update({
          content,
          updated: true,
        });

        await orm("trigger").insert({ action, _id, content });

        server.clients.forEach(async (client) => {
          if (client.readyState === OPEN) {
            client.send(
              JSON.stringify({
                action,
                message: await orm("message").where({ _id }).first(),
              })
            );
          }
        });
      }

      if (action === "DELETE") {
        await orm("message").where({ _id }).update({
          content,
          deleted: true,
        });

        await orm("trigger").insert({ action, _id, content });

        server.clients.forEach(async (client) => {
          if (client.readyState === OPEN) {
            client.send(
              JSON.stringify({
                action,
                message: await orm("message").where({ _id }).first(),
              })
            );
          }
        });
      }
    });

    socket.on("close", () => {
      console.warn("Connection closed");
    });

    socket.on("error", (error: any) => {
      console.error("WebSocket error:", error);
    });
  });
};
