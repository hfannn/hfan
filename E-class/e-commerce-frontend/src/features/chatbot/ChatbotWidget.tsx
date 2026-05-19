import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Drawer,
  FloatButton,
  Input,
  Space,
  Tag,
  Typography,
  message as antdMessage,
} from "antd";
import {
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  chatbotService,
  ChatbotHistoryMessage,
} from "@/services/chatbot.service";

const { Paragraph, Text } = Typography;

type ChannelType = "WEB_USER" | "ADMIN";

interface ChatbotWidgetProps {
  channel?: ChannelType;
}

interface UiMessage {
  id: string | number;
  senderType: "USER" | "BOT";
  messageText: string;
  intent?: string;
  createdAt?: string;
}

const ChatbotWidget = ({ channel = "WEB_USER" }: ChatbotWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `chatbot_conversation_${channel}`;

  const defaultSuggestions = useMemo(() => {
    if (channel === "ADMIN") {
      return [
        "Mẫu nào sắp hết hàng?",
        "Có ưu đãi nào đang hoạt động?",
        "Đơn HD-0001 đang ở trạng thái nào?",
      ];
    }

    return [
      "Nike kích cỡ 42 còn hàng không?",
      "Shop đang có ưu đãi gì?",
      "Đơn hàng của tôi đang ở đâu?",
    ];
  }, [channel]);

  useEffect(() => {
    const storedConversationId = sessionStorage.getItem(storageKey);

    if (storedConversationId) {
      setConversationId(Number(storedConversationId));
    }
  }, [storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open || !conversationId) {
      return;
    }

    loadHistory(conversationId);
  }, [open, conversationId]);

  const loadHistory = async (id: number) => {
    try {
      const response = await chatbotService.getMessages(id);

      const history: UiMessage[] = response.data.map(
        (item: ChatbotHistoryMessage) => ({
          id: item.id,
          senderType: item.senderType,
          messageText: item.messageText,
          intent: item.intent,
          createdAt: item.createdAt,
        })
      );

      setMessages(history);
    } catch (error) {
      console.error("Không tải được lịch sử chatbot", error);
    }
  };

  const handleSend = async (customText?: string) => {
    const messageText = (customText ?? input).trim();

    if (!messageText || loading) {
      return;
    }

    const userMessage: UiMessage = {
      id: `user-${Date.now()}`,
      senderType: "USER",
      messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatbotService.ask({
        message: messageText,
        conversationId,
        channel,
      });

      const data = response.data;

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        sessionStorage.setItem(storageKey, String(data.conversationId));
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          senderType: "BOT",
          messageText: data.answer,
          intent: data.intent,
        },
      ]);

      setSuggestions(data.suggestions ?? []);
    } catch (error) {
      console.error(error);
      antdMessage.error("Chatbot đang bận, bạn thử lại sau nhé.");

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          senderType: "BOT",
          messageText:
            "Xin lỗi, hiện tại tôi chưa phản hồi được. Bạn thử lại giúp tôi nhé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetConversation = () => {
    sessionStorage.removeItem(storageKey);
    setConversationId(null);
    setMessages([]);
    setSuggestions([]);
    setInput("");
    antdMessage.success("Đã tạo phiên chat mới.");
  };

  const getIntentLabel = (intent?: string) => {
    switch (intent) {
      case "PRODUCT_LOOKUP":
        return "Sản phẩm";
      case "PROMOTION_LOOKUP":
        return "Khuyến mãi";
      case "ORDER_LOOKUP":
        return "Đơn hàng";
      case "LOW_STOCK":
        return "Tồn kho thấp";
      default:
        return "Hỗ trợ";
    }
  };

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        tooltip="Chat với trợ lý bán hàng"
        onClick={() => setOpen(true)}
      />

      <Drawer
        title={
          <Space>
            <RobotOutlined />
            <span>{channel === "ADMIN" ? "Trợ lý Admin" : "Trợ lý mua hàng"}</span>
          </Space>
        }
        open={open}
        onClose={() => setOpen(false)}
        width={420}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleResetConversation}
          >
            Phiên mới
          </Button>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              border: "1px solid #f0f0f0",
              borderRadius: 12,
              padding: 12,
              background: "#fafafa",
              minHeight: 420,
            }}
          >
            {messages.length === 0 ? (
              <div>
                <Paragraph>
                  Xin chào, tôi có thể hỗ trợ bạn tìm sản phẩm, kiểm tra tồn kho,
                  xem ưu đãi và tra cứu đơn hàng.
                </Paragraph>

                <Space wrap>
                  {defaultSuggestions.map((item) => (
                    <Button
                      key={item}
                      size="small"
                      onClick={() => handleSend(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </Space>
              </div>
            ) : (
              messages.map((item) => {
                const isUser = item.senderType === "USER";

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: isUser ? "#1677ff" : "#ffffff",
                        color: isUser ? "#ffffff" : "#000000d9",
                        border: isUser ? "none" : "1px solid #f0f0f0",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {!isUser && item.intent && (
                        <Tag color="blue" style={{ marginBottom: 8 }}>
                          {getIntentLabel(item.intent)}
                        </Tag>
                      )}

                      <Paragraph
                        style={{
                          marginBottom: 0,
                          color: isUser ? "#ffffff" : "#000000d9",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.messageText}
                      </Paragraph>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>

          <div>
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder="Nhập câu hỏi của bạn..."
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                gap: 8,
              }}
            >
              <Text type="secondary">
                Enter để gửi, Shift + Enter để xuống dòng
              </Text>

              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={loading}
                onClick={() => handleSend()}
              >
                Gửi
              </Button>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div>
              <Text strong>Gợi ý tiếp theo:</Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {suggestions.map((item) => (
                    <Button
                      key={item}
                      size="small"
                      onClick={() => handleSend(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </Space>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};

export default ChatbotWidget;
