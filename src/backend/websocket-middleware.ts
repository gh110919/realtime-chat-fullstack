import { Server } from "http";
import { v4 } from "uuid";
import { orm } from "./orm";

export const websocketMiddleware = async (http: Server) => {
  const { WebSocket } = (await import("ws")).default;

  const wsServer = new WebSocket.Server({ server: http });

  const timestamp = new Date().toISOString();

  const applyChanges = async () => {
    const logEntries = await orm.read("data_log");

    const latestLogEntry = logEntries[logEntries.length - 1];

    if (latestLogEntry.action === "INSERT") {
      const newMessage = await orm.filtering("data", {
        id: latestLogEntry.id,
      });
      wsServer.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "new", message: newMessage[0] }));
        }
      });
    } else if (latestLogEntry.action === "UPDATE") {
      const updatedMessage = await orm.filtering("data", {
        id: latestLogEntry.id,
      });
      wsServer.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({ type: "update", message: updatedMessage[0] })
          );
        }
      });
    } else if (latestLogEntry.action === "DELETE") {
      wsServer.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({ type: "delete", id: latestLogEntry.id })
          );
        }
      });
    }
  };

  (async function recursive() {
    let previous = await orm.count("data_log");

    (async function () {
      let current = await orm.count("data_log");

      const apply = async () => {
        await applyChanges();
        await recursive();
      };

      current !== previous ? await apply() : await recursive();
    })();
  })();

  wsServer.on("connection", async (ws: any) => {
    const existingMessages = await orm.sorting("data", "created_at", "asc");

    ws.send(JSON.stringify({ type: "init", messages: existingMessages }));

    ws.on("message", async (data: any) => {
      const { id, action, message } = JSON.parse(data.toString());

      if (action === "insert") {
        const newMessage = {
          id: v4(),
          message: message,
          created_at: timestamp,
        };

        await orm.create("data", newMessage);

        await orm.create("data_log", {
          id: newMessage.id,
          action: "INSERT",
          created_at: newMessage.created_at,
          message: newMessage.message,
        });

        wsServer.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "new", message: newMessage }));
          }
        });
      } else if (action === "update") {
        await orm.update("data", { id }, { message });

        await orm.create("data_log", {
          id,
          action: "UPDATE",
          created_at: timestamp,
          message,
        });

        wsServer.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "update",
                message: { id, action, message },
              })
            );
          }
        });
      } else if (action === "delete") {
        await orm.delete("data", { id });

        await orm.create("data_log", {
          id,
          action: "DELETE",
          created_at: timestamp,
          message,
        });

        wsServer.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "delete", id }));
          }
        });
      }
    });

    ws.on("close", () => {
      console.log("Connection closed");
    });

    ws.on("error", (error: any) => {
      console.error("WebSocket error:", error);
    });
  });
};
