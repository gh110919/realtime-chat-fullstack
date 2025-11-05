import { useEffect, useRef, useState } from "react";
import { styled } from "styled-components";

const useWebSocket = (url: string) => {
  type Message = Partial<{
    _id: string;
    _created_at: string;
    _updated_at: string;
    readed: boolean;
    edited: boolean;
    deleted: boolean;
    content: string;
  }>;

  type Data =
    | {
        action: "CONNECTING";
        messages: {
          _id: string;
          _created_at: string;
          _updated_at: string;
          readed: boolean;
          edited: boolean;
          deleted: boolean;
          content: string;
        }[];
      }
    | {
        action: "INSERT";
        message: {
          _id: string;
          content?: string;
        };
      }
    | {
        action: "UPDATE";
        message: {
          _id: string;
          content: string;
        };
      }
    | {
        action: "DELETE";
        message: {
          _id: string;
        };
      };

  const [messages, setMessages] = useState<Message[]>([]);

  const socket = useRef<WebSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connect = () => {
      socket.current = new WebSocket(url);

      socket.current.onopen = () => setIsConnected(true);

      socket.current.onmessage = (event: { data: any }) => {
        const parsed: Data = JSON.parse(event.data);
        console.log("parsed", parsed);

        const CONNECTING = () => {
          if (parsed.action === "CONNECTING") {
            setMessages(parsed.messages);
          }
        };

        const INSERT = () => {
          if (parsed.action === "INSERT") {
            setMessages((p) =>
              !p.some((m) => m._id === parsed.message._id)
                ? [...p, parsed.message]
                : p
            );
          }
        };

        const UPDATE = () => {
          if (parsed.action === "UPDATE") {
            setMessages((p) =>
              p.map((msg) =>
                msg._id === parsed.message._id ? parsed.message : msg
              )
            );
          }
        };

        const DELETE = () => {
          if (parsed.action === "DELETE") {
            setMessages((p) =>
              p.filter((msg) => msg._id !== parsed.message._id)
            );
          }
        };

        (
          ({
            CONNECTING,
            INSERT,
            UPDATE,
            DELETE,
          }) as { [x: string]: () => void }
        )[parsed.action]();
      };

      socket.current.onerror = () => setIsConnected(false);

      socket.current.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 1000);
      };
    };

    connect();

    return () => {
      if (socket.current && socket.current.readyState === 1) {
        socket.current.close();
      }
    };
  }, [url]);

  const sendMessage = ({ action, message }: any) => {
    if (socket.current?.readyState === 1 && isConnected) {
      socket.current.send(JSON.stringify({ action, message }));
    }
  };

  return { messages, sendMessage };
};

export const Chat = () => {
  const { messages, sendMessage } = useWebSocket("ws://localhost:3180");
  const [input, setInput] = useState("");

  const handleSendMessage = () => {
    sendMessage({
      action: "INSERT",
      message: { content: input },
    });
    setInput("");
  };

  const handleUpdateMessage = (_id: string) => {
    sendMessage({
      action: "UPDATE",
      message: { _id, content: input },
    });
    setInput("");
  };

  const handleDeleteMessage = (_id: string) => {
    sendMessage({
      action: "DELETE",
      message: { _id },
    });
  };

  return (
    <Container>
      <ChatInputBox>
        <ChatBox>
          {messages.map((e) => (
            <Message key={e._id}>
              <Content>
                <p>ID: {e._id}</p>
                <Text>{e.content}</Text>
                <p>Дата: {e._created_at}</p>
              </Content>
              <Buttons>
                <Button onClick={() => handleUpdateMessage(e._id!)}>
                  Update
                </Button>
                <Button onClick={() => handleDeleteMessage(e._id!)}>
                  Delete
                </Button>
              </Buttons>
            </Message>
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

const Text = styled.div<{}>`
  ${(p) => (p.className = "Text")};
  word-break: break-all;
  white-space: pre-line;
  width: 95%;
  height: fit-content;
`;

const Buttons = styled.div<{}>`
  ${(p) => (p.className = "Buttons")};
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Content = styled.div<{}>`
  ${(p) => (p.className = "Content")};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Message = styled.div<{}>`
  ${(p) => (p.className = "Message")};
  border: 1px solid;
  padding: 8px;
  display: flex;
  justify-content: space-between;
`;

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
  gap: 8px;
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
