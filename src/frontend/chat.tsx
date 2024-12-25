import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const useWebSocket = (url: string) => {
  type TMessage = { id: string; message: string; created_at: string };

  const [messages, setMessages] = useState<TMessage[]>([]);

  const ws = useRef<WebSocket | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => setIsConnected(true);

      ws.current.onmessage = (event: { data: any }) => {
        const parsedData = JSON.parse(event.data);

        if (parsedData.type === "init") {
          setMessages(parsedData.messages);
        } else if (parsedData.type === "new") {
          setMessages((prevMessages) => {
            const exists = prevMessages.some(
              (msg) => msg.id === parsedData.message.id
            );
            if (!exists) {
              return [...prevMessages, parsedData.message];
            }
            return prevMessages;
          });
        } else if (parsedData.type === "update") {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === parsedData.message.id ? parsedData.message : msg
            )
          );
        } else if (parsedData.type === "delete") {
          setMessages((prevMessages) =>
            prevMessages.filter((msg) => msg.id !== parsedData.id)
          );
        }
      };

      ws.current.onerror = () => setIsConnected(false);

      ws.current.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 1000);
      };
    };

    connect();

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [url]);

  const sendMessage = (action: string, message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN && isConnected) {
      ws.current.send(JSON.stringify({ action, ...message }));
    }
  };

  return { messages, sendMessage };
};

export const Chat = () => {
  const { messages, sendMessage } = useWebSocket("ws://localhost:3180");
  const [input, setInput] = useState("");

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage("insert", { message: input });
      setInput("");
    }
  };

  const handleUpdateMessage = (id: string, message: string) => {
    sendMessage("update", { id, message });
  };

  const handleDeleteMessage = (id: string) => {
    sendMessage("delete", { id });
  };

  return (
    <Container>
      <ChatInputBox>
        <ChatBox>
          {messages.map((e) => (
            <div key={e.id}>
              {`${e.created_at}: ${e.message}`}
              <button
                onClick={() => handleUpdateMessage(e.id, "Updated message")}
              >
                Update
              </button>
              <button onClick={() => handleDeleteMessage(e.id)}>Delete</button>
            </div>
          ))}
        </ChatBox>
        <InputButtonBox>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Введите сообщение"
          />
          <Button onClick={handleSendMessage}>Отправить</Button>
        </InputButtonBox>
      </ChatInputBox>
    </Container>
  );
};

const ChatInputBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 50%;
  height: 60%;
`;

const InputButtonBox = styled.div`
  display: flex;
  gap: 8px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  justify-content: center;
  align-items: center;
`;

const ChatBox = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border: 1px solid #ccc;
  overflow: auto;
  padding: 20px;
  background-color: #f9f9f9;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;
