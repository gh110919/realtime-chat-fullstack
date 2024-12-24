import { Server } from "http";
import { v4 } from "uuid";
import { orm } from "./orm";

export const websocketMiddleware = async (http: Server) => {
  const { WebSocket } = (await import("ws")).default;

  const wsServer = new WebSocket.Server({ server: http });

  const applyChanges = async () => {
    const logEntries = await orm.read("data_log");

    // Определение последних изменений
    const latestLogEntry = logEntries[logEntries.length - 1];

    // В зависимости от действия, отправляем соответствующие обновления клиентам
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

  (async function monitor() {
    let previousCount = await orm.count("data_log");

    (async function () {
      let currentCount = await orm.count("data_log");

      if (currentCount !== previousCount) {
        previousCount = currentCount;

        await applyChanges();
        await monitor();
      } else {
        await monitor();
      }
    })();
  })();

  wsServer.on("connection", async (ws: any) => {
    // Загрузка существующих сообщений из базы данных
    const existingMessages = await orm.sorting("data", "created_at", "asc");

    // Отправка существующих сообщений клиенту
    ws.send(JSON.stringify({ type: "init", messages: existingMessages }));

    ws.on("message", async (data: any) => {
      const parsedData = JSON.parse(data.toString());

      if (parsedData.action === "insert") {
        const newMessage = {
          id: v4(),
          message: parsedData.message,
          created_at: orm.fn.now(),
        };

        // Вставка сообщения в базу данных
        await orm.create("data", newMessage);

        // Добавление записи в data_log
        await orm.create("data_log", {
          id: newMessage.id,
          action: "INSERT",
          created_at: newMessage.created_at,
          message: newMessage.message,
        });

        // Отправка нового сообщения всем подключенным клиентам
        wsServer.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "new", message: newMessage }));
          }
        });
      } else if (parsedData.action === "update") {
        // Обновление сообщения в базе данных
        await orm.update(
          "data",
          {
            id: parsedData.id,
          },
          {
            message: parsedData.message,
          }
        );

        // Добавление записи в data_log
        await orm.create("data_log", {
          id: parsedData.id,
          action: "UPDATE",
          created_at: orm.fn.now(),
          message: parsedData.message,
        });

        // Отправка обновленного сообщения всем подключенным клиентам
        wsServer.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "update", message: parsedData })
            );
          }
        });
      } else if (parsedData.action === "delete") {
        // Удаление сообщения из базы данных
        await orm.delete("data", { id: parsedData.id });

        // Добавление записи в data_log
        await orm.create("data_log", {
          id: parsedData.id,
          action: "DELETE",
          created_at: orm.fn.now(),
          message: parsedData.message,
        });

        // Отправка уведомления о удалении всем подключенным клиентам
        wsServer.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "delete", id: parsedData.id }));
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
